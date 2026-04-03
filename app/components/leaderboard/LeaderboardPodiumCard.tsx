"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import CommentsSection from "@/app/components/posts/CommentsSection";
import type { ReactionCounts, ReactionType } from "@/types/feed";

// =====================================================
// Types
// =====================================================

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

// =====================================================
// Helpers
// =====================================================

function getPodiumStyles(position: 1 | 2 | 3) {
  if (position === 1) {
    return {
      articleClass:
        "relative flex h-full min-h-[420px] flex-col overflow-hidden rounded-[28px] border border-amber-300/80 bg-gradient-to-br from-amber-50 via-white to-white p-4 shadow-[0_22px_60px_-40px_rgba(245,158,11,0.34)] transition hover:-translate-y-0.5 sm:p-5 lg:min-h-[500px]",
      accentClass: "bg-amber-400",
      badgeClass:
        "rounded-full border border-amber-200 bg-white/90 px-3 py-1 text-xs font-semibold text-amber-900",
      badgeText: "🏆 Platz 1",
      title: "Gold",
      emoji: "🥇",
      titleClass: "text-3xl sm:text-[2.1rem]",
      contentClamp:
        "[display:-webkit-box] overflow-hidden whitespace-pre-wrap break-words [-webkit-box-orient:vertical] [-webkit-line-clamp:7]",
      contentText: "text-lg leading-8",
      summaryBox: "border-amber-100 bg-amber-50/60",
      scoreBox: "border-amber-200/80 bg-white/90",
      reactionPill: "border-amber-100 bg-white/90",
      previewLength: 280,
    };
  }

  if (position === 2) {
    return {
      articleClass:
        "relative flex h-full min-h-[390px] flex-col overflow-hidden rounded-[28px] border border-slate-300 bg-gradient-to-br from-slate-50 via-white to-white p-4 shadow-[0_20px_55px_-40px_rgba(100,116,139,0.24)] transition hover:-translate-y-0.5 sm:p-5 lg:min-h-[450px]",
      accentClass: "bg-slate-400",
      badgeClass:
        "rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-xs font-semibold text-slate-800",
      badgeText: "✨ Platz 2",
      title: "Silber",
      emoji: "🥈",
      titleClass: "text-2xl sm:text-3xl",
      contentClamp:
        "[display:-webkit-box] overflow-hidden whitespace-pre-wrap break-words [-webkit-box-orient:vertical] [-webkit-line-clamp:5]",
      contentText: "text-base leading-7",
      summaryBox: "border-slate-100 bg-slate-50/70",
      scoreBox: "border-slate-200/80 bg-white/90",
      reactionPill: "border-slate-100 bg-white/90",
      previewLength: 200,
    };
  }

  return {
    articleClass:
      "relative flex h-full min-h-[380px] flex-col overflow-hidden rounded-[28px] border border-orange-300/80 bg-gradient-to-br from-orange-50 via-white to-white p-4 shadow-[0_20px_55px_-40px_rgba(249,115,22,0.22)] transition hover:-translate-y-0.5 sm:p-5 lg:min-h-[430px]",
    accentClass: "bg-orange-400",
    badgeClass:
      "rounded-full border border-orange-200 bg-white/90 px-3 py-1 text-xs font-semibold text-orange-900",
    badgeText: "🔥 Platz 3",
    title: "Bronze",
    emoji: "🥉",
    titleClass: "text-2xl sm:text-3xl",
    contentClamp:
      "[display:-webkit-box] overflow-hidden whitespace-pre-wrap break-words [-webkit-box-orient:vertical] [-webkit-line-clamp:4]",
    contentText: "text-base leading-7",
    summaryBox: "border-orange-100 bg-orange-50/70",
    scoreBox: "border-orange-200/80 bg-white/90",
    reactionPill: "border-orange-100 bg-white/90",
    previewLength: 150,
  };
}

function applyReactionUpdate(
  reactionCounts: ReactionCounts,
  currentReaction: ReactionType | null,
  nextReaction: ReactionType | null
) {
  const nextCounts = { ...reactionCounts };

  if (currentReaction) {
    nextCounts[currentReaction] = Math.max(0, nextCounts[currentReaction] - 1);
  }

  if (nextReaction) {
    nextCounts[nextReaction] += 1;
  }

  return nextCounts;
}

function getRaceMessage(position: 1 | 2 | 3, post: LeaderboardPost) {
  if (position === 1) {
    if (post.lead_over_next_rank === null) {
      return "Alleine an der Spitze.";
    }

    if (post.lead_over_next_rank === 0) {
      return "Gleichstand an der Spitze.";
    }

    if (post.lead_over_next_rank === 1) {
      return "1 Punkt Vorsprung.";
    }

    return `${post.lead_over_next_rank} Punkte Vorsprung.`;
  }

  if (position === 2) {
    if (post.points_to_higher_rank === null) {
      return "Direkt hinter Gold.";
    }

    if (post.points_to_higher_rank === 1) {
      return "1 Punkt bis Gold.";
    }

    return `${post.points_to_higher_rank} Punkte bis Gold.`;
  }

  if (post.points_to_higher_rank === null) {
    return "Noch im Rennen.";
  }

  if (post.points_to_higher_rank === 1) {
    return "1 Punkt bis Silber.";
  }

  return `${post.points_to_higher_rank} Punkte bis Silber.`;
}

function getChangeUi(changeType: ChangeType) {
  if (changeType === "up") {
    return {
      label: "⬆ Platz verbessert",
      badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-800",
      overlayClass: "from-emerald-300/25 via-emerald-200/10 to-transparent",
      articleAnim:
        "animate-[leaderboardCardRise_1.1s_ease-out,leaderboardGlowGreen_2.1s_ease-out]",
    };
  }

  if (changeType === "down") {
    return {
      label: "⬇ Platz verloren",
      badgeClass: "border-orange-200 bg-orange-50 text-orange-800",
      overlayClass: "from-orange-300/20 via-orange-200/10 to-transparent",
      articleAnim:
        "animate-[leaderboardCardShift_1.1s_ease-out,leaderboardGlowOrange_2.1s_ease-out]",
    };
  }

  if (changeType === "new") {
    return {
      label: "✨ Neu im Podium",
      badgeClass: "border-sky-200 bg-sky-50 text-sky-800",
      overlayClass: "from-sky-300/25 via-sky-200/10 to-transparent",
      articleAnim:
        "animate-[leaderboardCardRise_1.1s_ease-out,leaderboardGlowBlue_2.1s_ease-out]",
    };
  }

  return {
    label: null,
    badgeClass: "",
    overlayClass: "",
    articleAnim: "",
  };
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
      const nextValue = Math.round(
        startValue + (endValue - startValue) * eased
      );

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

// =====================================================
// Component
// =====================================================

export default function LeaderboardPodiumCard({
  position,
  post,
  changeType = null,
  isLoggedIn = false,
}: LeaderboardPodiumCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showCommentsDrawer, setShowCommentsDrawer] = useState(false);
  const [reactionLoading, setReactionLoading] = useState(false);
  const [localCommentsCount, setLocalCommentsCount] = useState(
    post?.comments_count ?? 0
  );
  const [localReactionCounts, setLocalReactionCounts] = useState<ReactionCounts>(
    post?.reaction_counts ?? {
      like: 0,
      funny: 0,
      wow: 0,
      fire: 0,
    }
  );
  const [viewerReaction, setViewerReaction] = useState<ReactionType | null>(
    post?.viewer_reaction ?? null
  );

  const router = useRouter();
  const styles = getPodiumStyles(position);
  const changeUi = getChangeUi(changeType);

  useEffect(() => {
    setExpanded(false);
    setShowCommentsDrawer(false);
    setLocalCommentsCount(post?.comments_count ?? 0);
    setLocalReactionCounts(
      post?.reaction_counts ?? {
        like: 0,
        funny: 0,
        wow: 0,
        fire: 0,
      }
    );
    setViewerReaction(post?.viewer_reaction ?? null);
  }, [post]);

  const isLongPost = useMemo(() => {
    if (!post) return false;
    return post.post_content.length > styles.previewLength;
  }, [post, styles.previewLength]);

  const totalLiveReactions = useMemo(() => {
    return (
      localReactionCounts.like +
      localReactionCounts.funny +
      localReactionCounts.wow +
      localReactionCounts.fire
    );
  }, [localReactionCounts]);

  const animatedScore = useAnimatedNumber(post?.relevance_score ?? 0);
  const animatedComments = useAnimatedNumber(localCommentsCount);
  const animatedTotalReactions = useAnimatedNumber(totalLiveReactions);
  const animatedLike = useAnimatedNumber(localReactionCounts.like);
  const animatedFunny = useAnimatedNumber(localReactionCounts.funny);
  const animatedWow = useAnimatedNumber(localReactionCounts.wow);
  const animatedFire = useAnimatedNumber(localReactionCounts.fire);

  async function handleReactionClick(
    e: React.MouseEvent<HTMLButtonElement>,
    reaction: ReactionType
  ) {
    e.stopPropagation();

    if (!post || reactionLoading) return;

    const previousReaction = viewerReaction;
    const nextReaction = previousReaction === reaction ? null : reaction;
    const optimisticCounts = applyReactionUpdate(
      localReactionCounts,
      previousReaction,
      nextReaction
    );

    setReactionLoading(true);
    setViewerReaction(nextReaction);
    setLocalReactionCounts(optimisticCounts);

    try {
      const res = await fetch(`/api/posts/${post.id}/like`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reaction }),
      });

      if (!res.ok) {
        throw new Error("Reaction konnte nicht gespeichert werden. Bitte logge dich vorher ein");
      }

      const data = (await res.json()) as {
        success: boolean;
        reaction: ReactionType | null;
      };

      setViewerReaction(data.reaction);
      router.refresh();
    } catch (error) {
      console.error(error);
      setViewerReaction(previousReaction);
      setLocalReactionCounts(post.reaction_counts);
      alert("Reaction konnte nicht gespeichert werden. Bitte logge dich vorher ein.");
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
        <div
          className={`absolute inset-y-0 left-0 w-1.5 ${styles.accentClass}`}
          aria-hidden="true"
        />

        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-3xl leading-none sm:text-4xl">{styles.emoji}</p>
            <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
              Live-Rennen
            </p>
            <h3
              className={`mt-1 font-bold tracking-tight text-gray-950 ${styles.titleClass}`}
            >
              {styles.title}
            </h3>
          </div>

          <span className={styles.badgeClass}>{styles.badgeText}</span>
        </div>

        <div className="rounded-3xl border border-dashed border-gray-300 bg-white/70 p-4 text-sm text-gray-600">
          Für diesen Platz gibt es aktuell noch keinen Beitrag.
        </div>
      </article>
    );
  }

  return (
    <>
      <style jsx global>{`
        @keyframes leaderboardCardRise {
          0% {
            transform: translateY(18px) scale(0.975);
            opacity: 0.7;
          }
          60% {
            transform: translateY(-4px) scale(1.01);
            opacity: 1;
          }
          100% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }

        @keyframes leaderboardCardShift {
          0% {
            transform: translateY(10px) scale(0.985);
            opacity: 0.75;
          }
          50% {
            transform: translateY(-2px) scale(1.005);
            opacity: 1;
          }
          100% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }

        @keyframes leaderboardGlowGreen {
          0% {
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.34);
          }
          45% {
            box-shadow: 0 0 0 18px rgba(16, 185, 129, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
          }
        }

        @keyframes leaderboardGlowOrange {
          0% {
            box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.28);
          }
          45% {
            box-shadow: 0 0 0 18px rgba(249, 115, 22, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(249, 115, 22, 0);
          }
        }

        @keyframes leaderboardGlowBlue {
          0% {
            box-shadow: 0 0 0 0 rgba(14, 165, 233, 0.3);
          }
          45% {
            box-shadow: 0 0 0 18px rgba(14, 165, 233, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(14, 165, 233, 0);
          }
        }

        @keyframes leaderboardBadgePulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.04);
          }
        }
      `}</style>

      <article className={`${styles.articleClass} ${changeUi.articleAnim}`}>
        <div
          className={`absolute inset-y-0 left-0 w-1.5 ${styles.accentClass}`}
          aria-hidden="true"
        />

        {changeUi.label && (
          <>
            <div
              className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${changeUi.overlayClass}`}
            />
            <div
              className={`absolute right-4 top-16 z-10 rounded-full border px-3 py-1 text-xs font-semibold shadow-lg animate-[leaderboardBadgePulse_1.2s_ease-in-out_2] sm:right-5 sm:top-[4.5rem] ${changeUi.badgeClass}`}
            >
              {changeUi.label}
            </div>
          </>
        )}

        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-3xl leading-none sm:text-4xl">{styles.emoji}</p>
            <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
              Live-Rennen
            </p>
            <h3
              className={`mt-1 font-bold tracking-tight text-gray-950 ${styles.titleClass}`}
            >
              {styles.title}
            </h3>
          </div>

          <span className={styles.badgeClass}>{styles.badgeText}</span>
        </div>

        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
              Vorne mit
            </p>
            <Link
              href={`/u/${encodeURIComponent(post.author_username ?? "")}`}
              className="mt-1 block truncate text-base font-bold tracking-tight text-gray-950 hover:opacity-75 sm:text-lg"
            >
              {post.author_username ? `@${post.author_username}` : "Unbekannt"}
            </Link>
          </div>

          <div
            className={`shrink-0 rounded-3xl border px-4 py-2.5 shadow-sm ${styles.scoreBox}`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
              Echo
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-gray-950 tabular-nums">
              {animatedScore}
            </p>
          </div>
        </div>

        <p className="mb-3 text-sm leading-6 text-gray-600">
          {getRaceMessage(position, post)}
        </p>

        <div
          className={`mb-3 rounded-[26px] border p-4 shadow-sm ${styles.summaryBox}`}
        >
          <Link href={`/posts/${post.id}`} className="block">
            <p
              className={`text-gray-900 ${
                expanded
                  ? "whitespace-pre-wrap break-words text-base leading-8"
                  : `${styles.contentClamp} ${styles.contentText}`
              }`}
            >
              {post.post_content}
            </p>
          </Link>

          {isLongPost && (
            <button
              type="button"
              onClick={handleToggleExpanded}
              className="mt-3 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              {expanded ? "Weniger anzeigen" : "Mehr anzeigen"}
            </button>
          )}
        </div>

        <div className="mt-auto rounded-3xl border border-gray-100 bg-gray-50/80 p-3">
          <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <button
              type="button"
              onClick={(e) => handleReactionClick(e, "like")}
              disabled={reactionLoading}
              className={`inline-flex min-w-0 items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-sm leading-none transition disabled:opacity-50 ${
                viewerReaction === "like"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : styles.reactionPill
              }`}
              aria-pressed={viewerReaction === "like"}
              title="Gefällt mir"
            >
              <span className="text-[16px] leading-none">❤️</span>
              <span className="tabular-nums">{animatedLike}</span>
            </button>

            <button
              type="button"
              onClick={(e) => handleReactionClick(e, "funny")}
              disabled={reactionLoading}
              className={`inline-flex min-w-0 items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-sm leading-none transition disabled:opacity-50 ${
                viewerReaction === "funny"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : styles.reactionPill
              }`}
              aria-pressed={viewerReaction === "funny"}
              title="Lustig"
            >
              <span className="text-[16px] leading-none">😂</span>
              <span className="tabular-nums">{animatedFunny}</span>
            </button>

            <button
              type="button"
              onClick={(e) => handleReactionClick(e, "wow")}
              disabled={reactionLoading}
              className={`inline-flex min-w-0 items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-sm leading-none transition disabled:opacity-50 ${
                viewerReaction === "wow"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : styles.reactionPill
              }`}
              aria-pressed={viewerReaction === "wow"}
              title="Wow"
            >
              <span className="text-[16px] leading-none">😮</span>
              <span className="tabular-nums">{animatedWow}</span>
            </button>

            <button
              type="button"
              onClick={(e) => handleReactionClick(e, "fire")}
              disabled={reactionLoading}
              className={`inline-flex min-w-0 items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-sm leading-none transition disabled:opacity-50 ${
                viewerReaction === "fire"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : styles.reactionPill
              }`}
              aria-pressed={viewerReaction === "fire"}
              title="Stark"
            >
              <span className="text-[16px] leading-none">🔥</span>
              <span className="tabular-nums">{animatedFire}</span>
            </button>
          </div>

          <div className="flex flex-col gap-2">
  <button
    type="button"
    onClick={handleOpenComments}
    className={`
      w-full rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition
      border ring-1 ring-black/5
      ${
        position === 1
          ? "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100"
          : position === 2
          ? "border-slate-200 bg-slate-100 text-slate-900 hover:bg-slate-200"
          : "border-orange-200 bg-orange-50 text-orange-900 hover:bg-orange-100"
      }
      ${animatedComments > 0 ? "animate-pulse" : ""}
    `}
    style={{
      animation:
        animatedComments > 0
          ? "leaderboardBadgePulse 1.6s ease-in-out infinite, pulse 2s ease-in-out infinite"
          : "leaderboardBadgePulse 1.6s ease-in-out infinite",
    }}
  >
    💬 {animatedComments}{" "}
    {animatedComments === 1 ? "Kommentar" : "Kommentare"}
  </button>
</div>
        </div>
      </article>

      {showCommentsDrawer && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          onClick={handleCloseComments}
        >
          <div className="flex h-full w-full items-end justify-end md:items-stretch">
            <div
              className="flex h-[86vh] w-full flex-col rounded-t-[28px] bg-white shadow-2xl md:h-full md:max-w-xl md:rounded-none md:rounded-l-[28px]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                    Kommentare
                  </p>
                  <h3 className="mt-1 text-xl font-bold tracking-tight text-gray-950">
                    Live-Diskussion
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={handleCloseComments}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-lg text-gray-700 transition hover:bg-gray-50"
                  aria-label="Kommentare schliessen"
                >
                  ×
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
                <CommentsSection
                  postId={post.id}
                  onCommentCreated={handleCommentCreated}
                  onCommentsLoaded={handleCommentsLoaded}
                  isLoggedIn={isLoggedIn}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}