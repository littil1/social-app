"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import CommentsSection from "@/components/posts/CommentsSection";
import { getLiveScore } from "@/lib/winners/daily-ranking";
import { useAuthModal } from "@/components/auth/AuthModalProvider";
import type { ReactionCounts, ReactionType } from "@/types/feed";

type LeaderboardPost = {
  id: number;
  post_content: string;
  post_created_at: string;
  comments_count: number;
  relevance_score: number;
  author_username: string | null;
  reactions_count: number;
  reaction_counts: ReactionCounts;
  viewer_reaction: ReactionType | null;
  points_to_higher_rank: number | null;
  lead_over_next_rank: number | null;
};

type ChangeType = "up" | "down" | "new" | null;

type LeaderboardPodiumCardProps = {
  position: 1 | 2 | 3;
  post: LeaderboardPost | null;
  changeType?: ChangeType;
  isLoggedIn?: boolean;
  isCommentsOpen?: boolean;
  onToggleComments?: () => void;
};

function getPodiumStyles(position: 1 | 2 | 3) {
  if (position === 1) {
    return {
      articleClass:
        "relative flex h-full min-h-[360px] flex-col overflow-hidden rounded-[40px] border border-amber-300/80 bg-gradient-to-br from-amber-50 via-white to-white p-6 shadow-[0_22px_60px_-40px_rgba(245,158,11,0.34)] transition hover:-translate-y-0.5",
      accentClass: "bg-amber-400",
      badgeClass:
        "rounded-full border border-amber-200 bg-white/95 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-amber-900 shadow-sm",
      badgeText: "🏆 Winner",
      emoji: "🥇",
      contentClamp:
        "[display:-webkit-box] overflow-hidden whitespace-pre-wrap break-words [-webkit-box-orient:vertical] [-webkit-line-clamp:10]",
      contentText: "text-base leading-7 sm:text-lg sm:leading-8 text-amber-950",
      summaryBox: "border-amber-100 bg-amber-50/60",
      scoreBox: "border-amber-200/80 bg-white/90",
      reactionPill: "border-amber-100 bg-white/90",
      previewLength: 350,
    };
  }

  if (position === 2) {
    return {
      articleClass:
        "relative flex h-full min-h-[340px] flex-col overflow-hidden rounded-[40px] border border-slate-300 bg-gradient-to-br from-slate-50 via-white to-white p-6 shadow-[0_20px_55px_-40px_rgba(100,116,139,0.24)] transition hover:-translate-y-0.5",
      accentClass: "bg-slate-400",
      badgeClass:
        "rounded-full border border-slate-200 bg-white/95 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-800 shadow-sm",
      badgeText: "✨ Second",
      emoji: "🥈",
      contentClamp:
        "[display:-webkit-box] overflow-hidden whitespace-pre-wrap break-words [-webkit-box-orient:vertical] [-webkit-line-clamp:9]",
      contentText: "text-base leading-7 text-slate-900",
      summaryBox: "border-slate-100 bg-slate-50/70",
      scoreBox: "border-slate-200/80 bg-white/90",
      reactionPill: "border-slate-100 bg-white/90",
      previewLength: 300,
    };
  }

  return {
    articleClass:
      "relative flex h-full min-h-[340px] flex-col overflow-hidden rounded-[40px] border border-orange-300/80 bg-gradient-to-br from-orange-50 via-white to-white p-6 shadow-[0_20px_55px_-40px_rgba(249,115,22,0.22)] transition hover:-translate-y-0.5",
    accentClass: "bg-orange-400",
    badgeClass:
      "rounded-full border border-orange-200 bg-white/95 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-orange-900 shadow-sm",
    badgeText: "🔥 Third",
    emoji: "🥉",
    contentClamp:
      "[display:-webkit-box] overflow-hidden whitespace-pre-wrap break-words [-webkit-box-orient:vertical] [-webkit-line-clamp:9]",
    contentText: "text-base leading-7 text-orange-950",
    summaryBox: "border-orange-100 bg-orange-50/70",
    scoreBox: "border-orange-200/80 bg-white/90",
    reactionPill: "border-orange-100 bg-white/90",
    previewLength: 280,
  };
}

function applyReactionUpdate(
  counts: ReactionCounts,
  current: ReactionType | null,
  next: ReactionType | null
) {
  const nextCounts = { ...counts };
  if (current) nextCounts[current] = Math.max(0, nextCounts[current] - 1);
  if (next) nextCounts[next] += 1;
  return nextCounts;
}

function getDisplayEchoScore(score: number | null | undefined) {
  return Math.round(score ?? 0);
}

function getRaceMessage(position: 1 | 2 | 3, post: LeaderboardPost) {
  if (position === 1) {
    if (post.lead_over_next_rank === null) return "Defending the Crown.";
    if (post.lead_over_next_rank === 0) return "Neck and neck.";
    return `${post.lead_over_next_rank} Points ahead.`;
  }
  if (post.points_to_higher_rank === null) return "Chasing the lead.";
  return `${post.points_to_higher_rank} Points to next rank.`;
}

function getChangeUi(changeType: ChangeType) {
  const base = {
    up: {
      label: "⬆ Rank up",
      badge: "border-emerald-200 bg-emerald-50 text-emerald-800",
      anim: "animate-[leaderboardCardRise_1.1s_ease-out]",
    },
    down: {
      label: "⬇ Rank down",
      badge: "border-orange-200 bg-orange-50 text-orange-800",
      anim: "animate-[leaderboardCardShift_1.1s_ease-out]",
    },
    new: {
      label: "✨ Rising",
      badge: "border-sky-200 bg-sky-50 text-sky-800",
      anim: "animate-[leaderboardCardRise_1.1s_ease-out]",
    },
  };
  return changeType ? base[changeType] : { label: null, badge: "", anim: "" };
}

function useAnimatedNumber(target: number, duration = 450) {
  const [displayValue, setDisplayValue] = useState(target);
  const previousTargetRef = useRef(target);

  useEffect(() => {
    const startValue = previousTargetRef.current;
    const endValue = target;
    if (startValue === endValue) return;

    let frameId = 0;
    const startTime = performance.now();

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(
        Math.round(startValue + (endValue - startValue) * eased)
      );

      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
      } else {
        previousTargetRef.current = endValue;
      }
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [duration, target]);

  return displayValue;
}

export default function LeaderboardPodiumCard({
  position,
  post,
  changeType = null,
  isLoggedIn = false,
  isCommentsOpen,
  onToggleComments,
}: LeaderboardPodiumCardProps) {
  const { requireLoginAndResume, isAuthenticated, authReady } = useAuthModal();
  const [expanded, setExpanded] = useState(false);
  const [showCommentsDrawer, setShowCommentsDrawer] = useState(false);
  const [reactionLoading, setReactionLoading] = useState(false);
  const [localCommentsCount, setLocalCommentsCount] = useState(
    post?.comments_count ?? 0
  );
  const [localReactionCounts, setLocalReactionCounts] = useState<ReactionCounts>(
    post?.reaction_counts ?? { like: 0, funny: 0, wow: 0, fire: 0 }
  );
  const [viewerReaction, setViewerReaction] = useState<ReactionType | null>(
    post?.viewer_reaction ?? null
  );
  const [localEchoScore, setLocalEchoScore] = useState(
    getDisplayEchoScore(post?.relevance_score)
  );

  const router = useRouter();
  const pathname = usePathname();
  const styles = getPodiumStyles(position);
  const changeUi = getChangeUi(changeType);

  const effectiveIsLoggedIn = useMemo(() => {
    return authReady ? isAuthenticated : isLoggedIn;
  }, [authReady, isAuthenticated, isLoggedIn]);

  const commentsOpen =
    typeof isCommentsOpen === "boolean" ? isCommentsOpen : showCommentsDrawer;

  useEffect(() => {
    setLocalCommentsCount(post?.comments_count ?? 0);
    setLocalReactionCounts(
      post?.reaction_counts ?? { like: 0, funny: 0, wow: 0, fire: 0 }
    );
    setViewerReaction(post?.viewer_reaction ?? null);
    setLocalEchoScore(getDisplayEchoScore(post?.relevance_score));
  }, [post]);

  function handleCommentsToggle() {
    if (onToggleComments) {
      onToggleComments();
      return;
    }

    setShowCommentsDrawer((current) => !current);
  }

  const handleCommentCreated = () => {
    setLocalCommentsCount((prev) => {
      const nextCommentsCount = prev + 1;

      if (post) {
        setLocalEchoScore(
          Math.round(
            getLiveScore({
              reactionsTotal: totalReactions,
              commentsCount: nextCommentsCount,
              createdAt: post.post_created_at,
            })
          )
        );
      }

      return nextCommentsCount;
    });
  };

  const handleCommentsLoaded = (count: number) => {
    setLocalCommentsCount(count);

    if (!post) {
      return;
    }

    setLocalEchoScore(
      Math.round(
        getLiveScore({
          reactionsTotal: totalReactions,
          commentsCount: count,
          createdAt: post.post_created_at,
        })
      )
    );
  };

  const totalReactions = useMemo(() => {
    return (
      localReactionCounts.like +
      localReactionCounts.funny +
      localReactionCounts.wow +
      localReactionCounts.fire
    );
  }, [localReactionCounts]);

  const animatedScore = useAnimatedNumber(localEchoScore);
  const animatedComments = useAnimatedNumber(localCommentsCount);
  const animatedLike = useAnimatedNumber(localReactionCounts.like);
  const animatedFunny = useAnimatedNumber(localReactionCounts.funny);
  const animatedWow = useAnimatedNumber(localReactionCounts.wow);
  const animatedFire = useAnimatedNumber(localReactionCounts.fire);

  async function submitReaction(reaction: ReactionType) {
    if (!post || reactionLoading) return;

    const previousReaction = viewerReaction;
    const nextReaction = previousReaction === reaction ? null : reaction;
    const nextReactionCounts = applyReactionUpdate(
      localReactionCounts,
      previousReaction,
      nextReaction
    );
    const nextTotalReactions =
      nextReactionCounts.like +
      nextReactionCounts.funny +
      nextReactionCounts.wow +
      nextReactionCounts.fire;

    setViewerReaction(nextReaction);
    setLocalReactionCounts(nextReactionCounts);

    setLocalEchoScore(
      Math.round(
        getLiveScore({
          reactionsTotal: nextTotalReactions,
          commentsCount: localCommentsCount,
          createdAt: post.post_created_at,
        })
      )
    );

    setReactionLoading(true);

    try {
      const res = await fetch(`/api/posts/${post.id}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reaction: nextReaction }),
      });

      if (res.status === 401 || res.status === 403) {
        setViewerReaction(previousReaction);
        setLocalReactionCounts(post.reaction_counts);
        setLocalEchoScore(getDisplayEchoScore(post.relevance_score));

        requireLoginAndResume(() => {
          void submitReaction(reaction);
        }, pathname);
        return;
      }

      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setViewerReaction(previousReaction);
      setLocalReactionCounts(post.reaction_counts);
      setLocalEchoScore(getDisplayEchoScore(post.relevance_score));
    } finally {
      setReactionLoading(false);
    }
  }

  async function handleReactionClick(
    e: React.MouseEvent,
    reaction: ReactionType
  ) {
    e.stopPropagation();
    if (!effectiveIsLoggedIn) {
      requireLoginAndResume(() => {
        void submitReaction(reaction);
      }, pathname);
      return;
    }
    await submitReaction(reaction);
  }

  if (!post) {
    return (
      <article className={styles.articleClass}>
        <div
          className={`absolute inset-y-0 left-0 w-1.5 ${styles.accentClass}`}
        />
        <div className="mb-4 flex items-center justify-between">
          <p className="text-4xl">{styles.emoji}</p>
          <span className={styles.badgeClass}>{styles.badgeText}</span>
        </div>
        <div className="rounded-3xl border border-dashed border-neutral-200 bg-white/50 p-6 text-center text-sm font-medium text-neutral-400">
          Rank available.
        </div>
      </article>
    );
  }

  return (
    <>
      <article className={`${styles.articleClass} ${changeUi.anim}`}>
        <div
          className={`absolute inset-y-0 left-0 w-1.5 ${styles.accentClass}`}
          aria-hidden="true"
        />
        <div className="mb-6 flex items-center justify-between">
          <p className="text-4xl">{styles.emoji}</p>
          <span className={styles.badgeClass}>{styles.badgeText}</span>
        </div>
        <div className="mb-6 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-xl font-black tracking-tight text-neutral-950">
              Anonymous
            </h3>
            <p className="mt-1 text-xs font-bold uppercase tracking-widest text-neutral-400">
              {getRaceMessage(position, post)}
            </p>
          </div>
          <div
            className={`shrink-0 rounded-[24px] border px-5 py-3 text-center shadow-sm ${styles.scoreBox}`}
          >
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-400">
              Echo
            </p>
            <p className="mt-1 text-3xl font-black leading-none tracking-tighter text-neutral-950 tabular-nums">
              {animatedScore}
            </p>
          </div>
        </div>
        <div className={`mb-6 rounded-[32px] border p-5 shadow-sm ${styles.summaryBox}`}>
          <Link href={`/posts/${post.id}`} className="block">
            <p
              className={`font-medium text-neutral-900 ${
                expanded
                  ? "whitespace-pre-wrap break-words text-base leading-relaxed"
                  : `${styles.contentClamp} ${styles.contentText}`
              }`}
            >
              {post.post_content}
            </p>
          </Link>
          {post.post_content.length > styles.previewLength && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
              className="mt-3 text-xs font-black uppercase tracking-widest text-neutral-400 hover:text-neutral-950"
            >
              {expanded ? "Less" : "Read more"}
            </button>
          )}
        </div>
        <div className="mt-auto space-y-3">
          <div className="grid grid-cols-4 gap-2">
            {(["like", "funny", "wow", "fire"] as ReactionType[]).map((r) => (
              <button
                key={r}
                onClick={(e) => handleReactionClick(e, r)}
                disabled={reactionLoading}
                className={`flex flex-col items-center justify-center rounded-2xl border py-2 transition active:scale-95 ${
                  viewerReaction === r
                    ? "border-neutral-950 bg-neutral-950 text-white shadow-md"
                    : `${styles.reactionPill} text-neutral-600`
                }`}
              >
                <span className="text-base">
                  {r === "like"
                    ? "❤️"
                    : r === "funny"
                      ? "😂"
                      : r === "wow"
                        ? "🤯"
                        : "🔥"}
                </span>
                <span className="mt-1 text-[10px] font-black tabular-nums">
                  {r === "like"
                    ? animatedLike
                    : r === "funny"
                      ? animatedFunny
                      : r === "wow"
                        ? animatedWow
                        : animatedFire}
                </span>
              </button>
            ))}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCommentsToggle();
            }}
            className={`w-full rounded-2xl border py-3.5 text-xs font-black uppercase tracking-[0.2em] shadow-sm transition ${
              position === 1
                ? "border-amber-200 bg-amber-100 text-amber-900"
                : "border-neutral-200 bg-neutral-50 text-neutral-900"
            }`}
          >
            💬 {animatedComments} Comments
          </button>
        </div>
      </article>

      {commentsOpen && (
        <div
          role="dialog"
          aria-modal="true"
          data-comments-panel-open="true"
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md"
          onClick={handleCommentsToggle}
        >
          <div className="flex h-full w-full justify-end">
            <div
              className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b p-6">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">
                    Discussion
                  </p>
                  <h3 className="text-2xl font-black tracking-tight">
                    Live Echo
                  </h3>
                </div>
                <button
                  onClick={handleCommentsToggle}
                  aria-label="Close comments"
                  className="h-10 w-10 rounded-full bg-neutral-100 text-2xl font-light hover:bg-neutral-200"
                >
                  ×
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <CommentsSection
                  key={post.id}
                  postId={post.id}
                  onCommentCreated={handleCommentCreated}
                  onCommentsLoaded={handleCommentsLoaded}
                  isLoggedIn={effectiveIsLoggedIn}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
