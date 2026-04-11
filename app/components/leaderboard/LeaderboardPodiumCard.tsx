"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import CommentsSection from "@/app/components/posts/CommentsSection";
import { setAutoRefreshPaused } from "@/lib/auto-refresh";
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
};

function getPodiumStyles(position: 1 | 2 | 3) {
  if (position === 1) {
    return {
      articleClass:
        "relative flex h-full min-h-[360px] flex-col overflow-hidden rounded-[28px] border border-amber-300/80 bg-gradient-to-br from-amber-50 via-white to-white p-4 shadow-[0_22px_60px_-40px_rgba(245,158,11,0.34)] transition hover:-translate-y-0.5 sm:min-h-[380px] sm:p-5 xl:min-h-[430px] xl:p-6",
      accentClass: "bg-amber-400",
      badgeClass:
        "rounded-full border border-amber-200 bg-white/95 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-amber-900 shadow-sm",
      badgeText: "🏆 Leader",
      title: "",
      emoji: "🥇",
      titleClass: "hidden",
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
        "relative flex h-full min-h-[340px] flex-col overflow-hidden rounded-[28px] border border-slate-300 bg-gradient-to-br from-slate-50 via-white to-white p-4 shadow-[0_20px_55px_-40px_rgba(100,116,139,0.24)] transition hover:-translate-y-0.5 sm:min-h-[370px] sm:p-5 xl:min-h-[410px] xl:p-6",
      accentClass: "bg-slate-400",
      badgeClass:
        "rounded-full border border-slate-200 bg-white/95 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-800 shadow-sm",
      badgeText: "✨ Challenger",
      title: "",
      emoji: "🥈",
      titleClass: "hidden",
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
      "relative flex h-full min-h-[340px] flex-col overflow-hidden rounded-[28px] border border-orange-300/80 bg-gradient-to-br from-orange-50 via-white to-white p-4 shadow-[0_20px_55px_-40px_rgba(249,115,22,0.22)] transition hover:-translate-y-0.5 sm:min-h-[370px] sm:p-5 xl:min-h-[410px] xl:p-6",
    accentClass: "bg-orange-400",
    badgeClass:
      "rounded-full border border-orange-200 bg-white/95 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-orange-900 shadow-sm",
    badgeText: "🔥 Contender",
    title: "",
    emoji: "🥉",
    titleClass: "hidden",
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
  reactionCounts: ReactionCounts,
  currentReaction: ReactionType | null,
  nextReaction: ReactionType | null
) {
  const nextCounts = { ...reactionCounts };
  if (currentReaction) nextCounts[currentReaction] = Math.max(0, nextCounts[currentReaction] - 1);
  if (nextReaction) nextCounts[nextReaction] += 1;
  return nextCounts;
}

function getRaceMessage(position: 1 | 2 | 3, post: LeaderboardPost) {
  if (position === 1) {
    if (post.lead_over_next_rank === null) return "King of the hill.";
    if (post.lead_over_next_rank === 0) return "Battle for the top.";
    if (post.lead_over_next_rank === 1) return "Leading by 1.";
    return `${post.lead_over_next_rank} Points ahead.`;
  }
  if (position === 2) {
    if (post.points_to_higher_rank === null) return "Closing in.";
    if (post.points_to_higher_rank === 1) return "1 Point to the top.";
    return `${post.points_to_higher_rank} Points to the top`;
  }
  if (post.points_to_higher_rank === null) return "Still racing.";
  if (post.points_to_higher_rank === 1) return "Chasing silver";
  return `${post.points_to_higher_rank} Points to silver.`;
}

function getChangeUi(changeType: ChangeType) {
  if (changeType === "up") {
    return {
      label: "⬆ Rank up",
      badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-800",
      overlayClass: "from-emerald-300/25 via-emerald-200/10 to-transparent",
      articleAnim: "animate-[leaderboardCardRise_1.1s_ease-out,leaderboardGlowGreen_2.1s_ease-out]",
    };
  }
  if (changeType === "down") {
    return {
      label: "⬇ Rank down",
      badgeClass: "border-orange-200 bg-orange-50 text-orange-800",
      overlayClass: "from-orange-300/20 via-orange-200/10 to-transparent",
      articleAnim: "animate-[leaderboardCardShift_1.1s_ease-out,leaderboardGlowOrange_2.1s_ease-out]",
    };
  }
  if (changeType === "new") {
    return {
      label: "✨ Rising up",
      badgeClass: "border-sky-200 bg-sky-50 text-sky-800",
      overlayClass: "from-sky-300/25 via-sky-200/10 to-transparent",
      articleAnim: "animate-[leaderboardCardRise_1.1s_ease-out,leaderboardGlowBlue_2.1s_ease-out]",
    };
  }
  return { label: null, badgeClass: "", overlayClass: "", articleAnim: "" };
}

function useAnimatedNumber(target: number, duration = 450) {
  const [displayValue, setDisplayValue] = useState(target);
  const previousTargetRef = useRef(target);
  useEffect(() => {
    const startValue = previousTargetRef.current;
    const endValue = target;
    if (startValue === endValue) {
      setDisplayValue(endValue);
      return;
    }
    let frameId = 0;
    const startTime = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const nextValue = Math.round(startValue + (endValue - startValue) * eased);
      setDisplayValue(nextValue);
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
}: LeaderboardPodiumCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showCommentsDrawer, setShowCommentsDrawer] = useState(false);
  const [reactionLoading, setReactionLoading] = useState(false);
  const [localCommentsCount, setLocalCommentsCount] = useState(post?.comments_count ?? 0);
  const [localReactionCounts, setLocalReactionCounts] = useState<ReactionCounts>(
    post?.reaction_counts ?? { like: 0, funny: 0, wow: 0, fire: 0 }
  );
  const [viewerReaction, setViewerReaction] = useState<ReactionType | null>(post?.viewer_reaction ?? null);

  const router = useRouter();
  const styles = getPodiumStyles(position);
  const changeUi = getChangeUi(changeType);

  useEffect(() => {
    setExpanded(false);
    setShowCommentsDrawer(false);
    setLocalCommentsCount(post?.comments_count ?? 0);
    setLocalReactionCounts(post?.reaction_counts ?? { like: 0, funny: 0, wow: 0, fire: 0 });
    setViewerReaction(post?.viewer_reaction ?? null);
  }, [post]);

  useEffect(() => {
    setAutoRefreshPaused(showCommentsDrawer);
    return () => setAutoRefreshPaused(false);
  }, [showCommentsDrawer]);

  const isLongPost = useMemo(() => {
    if (!post) return false;
    return post.post_content.length > styles.previewLength;
  }, [post, styles.previewLength]);

  const totalLiveReactions = useMemo(() => {
    return localReactionCounts.like + localReactionCounts.funny + localReactionCounts.wow + localReactionCounts.fire;
  }, [localReactionCounts]);

  const animatedScore = useAnimatedNumber(post?.relevance_score ?? 0);
  const animatedComments = useAnimatedNumber(localCommentsCount);
  const animatedLike = useAnimatedNumber(localReactionCounts.like);
  const animatedFunny = useAnimatedNumber(localReactionCounts.funny);
  const animatedWow = useAnimatedNumber(localReactionCounts.wow);
  const animatedFire = useAnimatedNumber(localReactionCounts.fire);

  async function handleReactionClick(e: React.MouseEvent<HTMLButtonElement>, reaction: ReactionType) {
    e.stopPropagation();
    if (!post || reactionLoading) return;
    const previousReaction = viewerReaction;
    const nextReaction = previousReaction === reaction ? null : reaction;
    const optimisticCounts = applyReactionUpdate(localReactionCounts, previousReaction, nextReaction);
    setReactionLoading(true);
    setViewerReaction(nextReaction);
    setLocalReactionCounts(optimisticCounts);
    try {
      const res = await fetch(`/api/posts/${post.id}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reaction: nextReaction }),
      });
      if (!res.ok) throw new Error("Login required.");
      const data = (await res.json()) as { success: boolean; reaction: ReactionType | null };
      setViewerReaction(data.reaction);
      router.refresh();
    } catch (error) {
      setViewerReaction(previousReaction);
      setLocalReactionCounts(post.reaction_counts);
      alert("Login required.");
    } finally {
      setReactionLoading(false);
    }
  }

  function handleToggleExpanded(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    setExpanded((prev) => !prev);
  }

  function handleOpenComments(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    setShowCommentsDrawer(true);
  }

  function handleCloseComments() {
    setShowCommentsDrawer(false);
  }

  function handleCommentCreated() {
    setLocalCommentsCount((prev) => prev + 1);
    router.refresh();
  }

  function handleCommentsLoaded(count: number) {
    setLocalCommentsCount(count);
  }

  if (!post) {
    return (
      <article className={styles.articleClass}>
        <div className={`absolute inset-y-0 left-0 w-1.5 ${styles.accentClass}`} aria-hidden="true" />
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-3xl leading-none sm:text-4xl">{styles.emoji}</p>
          </div>
          <span className={styles.badgeClass}>{styles.badgeText}</span>
        </div>
        <div className="rounded-3xl border border-dashed border-gray-300 bg-white/70 p-4 text-sm text-gray-600">
          No entry yet. Claim this rank.
        </div>
      </article>
    );
  }

  return (
    <>
      <style jsx global>{`
        @keyframes leaderboardCardRise { 0% { transform: translateY(18px) scale(0.975); opacity: 0.7; } 60% { transform: translateY(-4px) scale(1.01); opacity: 1; } 100% { transform: translateY(0) scale(1); opacity: 1; } }
        @keyframes leaderboardCardShift { 0% { transform: translateY(10px) scale(0.985); opacity: 0.75; } 50% { transform: translateY(-2px) scale(1.005); opacity: 1; } 100% { transform: translateY(0) scale(1); opacity: 1; } }
        @keyframes leaderboardGlowGreen { 0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.34); } 45% { box-shadow: 0 0 0 18px rgba(16, 185, 129, 0); } 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); } }
        @keyframes leaderboardGlowOrange { 0% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.28); } 45% { box-shadow: 0 0 0 18px rgba(249, 115, 22, 0); } 100% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0); } }
        @keyframes leaderboardGlowBlue { 0% { box-shadow: 0 0 0 0 rgba(14, 165, 233, 0.3); } 45% { box-shadow: 0 0 0 18px rgba(14, 165, 233, 0); } 100% { box-shadow: 0 0 0 0 rgba(14, 165, 233, 0); } }
        @keyframes leaderboardBadgePulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.04); } }
      `}</style>

      <article className={`${styles.articleClass} ${changeUi.articleAnim}`}>
        <div className={`absolute inset-y-0 left-0 w-1.5 ${styles.accentClass}`} aria-hidden="true" />

        {changeUi.label && (
          <>
            <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${changeUi.overlayClass}`} />
            <div className={`absolute right-4 top-16 z-10 rounded-full border px-3 py-1 text-xs font-semibold shadow-lg animate-[leaderboardBadgePulse_1.2s_ease-in-out_2] sm:right-5 sm:top-[4.5rem] ${changeUi.badgeClass}`}>
              {changeUi.label}
            </div>
          </>
        )}

        <div className="mb-4 flex items-start justify-between gap-3">
          <p className="text-3xl leading-none sm:text-4xl">{styles.emoji}</p>
          <span className={styles.badgeClass}>{styles.badgeText}</span>
        </div>

        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-lg font-bold tracking-tight text-gray-950 sm:text-xl">
              Anonymous
            </p>
            <p className="text-xs font-medium text-gray-500">
              {getRaceMessage(position, post)}
            </p>
          </div>

          <div className={`shrink-0 rounded-2xl border px-4 py-2 shadow-sm text-center ${styles.scoreBox}`}>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400">Echo</p>
            <p className="text-2xl font-black tracking-tight text-gray-950 tabular-nums leading-none mt-1">
              {animatedScore}
            </p>
          </div>
        </div>

        <div className={`mb-4 rounded-[26px] border p-4 shadow-sm ${styles.summaryBox}`}>
          <Link href={`/posts/${post.id}`} className="block">
            <p className={`text-gray-900 ${expanded ? "whitespace-pre-wrap break-words text-base leading-8" : `${styles.contentClamp} ${styles.contentText}`}`}>
              {post.post_content}
            </p>
          </Link>
          {isLongPost && (
            <button type="button" onClick={handleToggleExpanded} className="mt-3 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50">
              {expanded ? "Show less" : "Show more"}
            </button>
          )}
        </div>

        <div className="mt-auto rounded-3xl border border-gray-100 bg-gray-50/80 p-3">
          <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <button type="button" onClick={(e) => handleReactionClick(e, "like")} disabled={reactionLoading} className={`inline-flex items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-sm transition disabled:opacity-50 ${viewerReaction === "like" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : styles.reactionPill}`}>
              <span className="text-[16px]">❤️</span><span className="tabular-nums">{animatedLike}</span>
            </button>
            <button type="button" onClick={(e) => handleReactionClick(e, "funny")} disabled={reactionLoading} className={`inline-flex items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-sm transition disabled:opacity-50 ${viewerReaction === "funny" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : styles.reactionPill}`}>
              <span className="text-[16px]">😂</span><span className="tabular-nums">{animatedFunny}</span>
            </button>
            <button type="button" onClick={(e) => handleReactionClick(e, "wow")} disabled={reactionLoading} className={`inline-flex items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-sm transition disabled:opacity-50 ${viewerReaction === "wow" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : styles.reactionPill}`}>
              <span className="text-[16px]">🤯</span><span className="tabular-nums">{animatedWow}</span>
            </button>
            <button type="button" onClick={(e) => handleReactionClick(e, "fire")} disabled={reactionLoading} className={`inline-flex items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-sm transition disabled:opacity-50 ${viewerReaction === "fire" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : styles.reactionPill}`}>
              <span className="text-[16px]">🔥</span><span className="tabular-nums">{animatedFire}</span>
            </button>
          </div>
          <button
            type="button"
            onClick={handleOpenComments}
            className={`w-full rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition border ring-1 ring-black/5 ${position === 1 ? "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100" : position === 2 ? "border-slate-200 bg-slate-100 text-slate-900 hover:bg-slate-200" : "border-orange-200 bg-orange-50 text-orange-900 hover:bg-orange-100"} ${animatedComments > 0 ? "animate-pulse" : ""}`}
            style={{ animation: animatedComments > 0 ? "leaderboardBadgePulse 1.6s ease-in-out infinite, pulse 2s ease-in-out infinite" : "leaderboardBadgePulse 1.6s ease-in-out infinite" }}
          >
            💬 {animatedComments} {animatedComments === 1 ? "Comment" : "Comments"}
          </button>
        </div>
      </article>

      {showCommentsDrawer && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={handleCloseComments}>
          <div className="flex h-full w-full items-end justify-end md:items-stretch">
            <div className="flex h-[86vh] w-full flex-col rounded-t-[28px] bg-white shadow-2xl md:h-full md:max-w-xl md:rounded-none md:rounded-l-[28px]" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Comments</p>
                  <h3 className="mt-1 text-xl font-bold tracking-tight text-gray-950">Live Echo</h3>
                </div>
                <button type="button" onClick={handleCloseComments} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-lg text-gray-700 transition hover:bg-gray-50">×</button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
                <CommentsSection postId={post.id} onCommentCreated={handleCommentCreated} onCommentsLoaded={handleCommentsLoaded} isLoggedIn={isLoggedIn} />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}