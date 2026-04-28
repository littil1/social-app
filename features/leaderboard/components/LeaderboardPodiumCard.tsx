"use client";

import { memo } from "react";
import { useAuthModal } from "@/features/auth/components/AuthModalProvider";
import type { ReactionCounts, ReactionType } from "@/shared/types/feed";

type LeaderboardPost = {
  id: number;
  post_content: string;
  post_created_at: string;
  comments_count: number;
  relevance_score: number;
  author_username: string | null;
  author_avatar_url: string | null;
  reactions_count: number;
  reaction_counts: ReactionCounts;
  viewer_reaction: ReactionType | null;
  can_delete: boolean;
  points_to_higher_rank: number | null;
  lead_over_next_rank: number | null;
};

type LeaderboardPodiumCardProps = {
  position: 1 | 2 | 3;
  post: LeaderboardPost | null;
  isLoggedIn?: boolean;
  onOpenPost?: () => void;
  onOpenComments?: () => void;
  onReactionUpdated?: (
    postId: number,
    nextReaction: ReactionType | null
  ) => void;
  onMutationCommitted?: () => void;
};

const REACTION_SUMMARY: Array<{
  key: ReactionType;
  emoji: string;
  label: string;
}> = [
  { key: "like", emoji: "\u2764\uFE0F", label: "Impact" },
  { key: "funny", emoji: "\uD83D\uDE02", label: "Funny" },
  { key: "wow", emoji: "\uD83E\uDD2F", label: "Wow" },
  { key: "fire", emoji: "\uD83D\uDD25", label: "Strong" },
];

function getDisplayEchoScore(score: number | null | undefined) {
  return Math.round(score ?? 0);
}

function getRankStyles(position: 1 | 2 | 3) {
  if (position === 1) {
    return {
      shell:
        "min-h-[248px] rounded-[34px] border-amber-300/90 bg-[radial-gradient(circle_at_50%_-8%,rgba(251,191,36,0.52),transparent_42%),radial-gradient(circle_at_100%_15%,rgba(245,158,11,0.24),transparent_30%),linear-gradient(145deg,#fff8db,#ffffff_52%,#fffbeb)] p-5 shadow-[0_36px_110px_-46px_rgba(245,158,11,0.88),0_18px_52px_-40px_rgba(120,53,15,0.72)] ring-1 ring-amber-200/70 sm:min-h-[300px] sm:p-6 md:scale-[1.035]",
      glow: "bg-amber-300/55",
      rankPill: "border-amber-200 bg-amber-100 text-amber-950",
      score: "text-amber-950",
      accent: "from-amber-300 via-yellow-300 to-orange-400",
      medal: "\uD83E\uDD47",
      medalSize: "h-[84px] w-[84px] text-6xl",
      preview: "text-lg leading-7 sm:text-xl sm:leading-8",
    };
  }

  if (position === 2) {
    return {
      shell:
        "min-h-[190px] rounded-[30px] border-slate-200 bg-[radial-gradient(circle_at_50%_0%,rgba(203,213,225,0.34),transparent_36%),linear-gradient(145deg,#ffffff,#f8fafc)] p-4 shadow-[0_22px_58px_-44px_rgba(100,116,139,0.48)] sm:min-h-[240px] sm:p-5",
      glow: "bg-slate-300/30",
      rankPill: "border-slate-200 bg-slate-100 text-slate-900",
      score: "text-slate-950",
      accent: "from-slate-200 via-slate-300 to-slate-500",
      medal: "\uD83E\uDD48",
      medalSize: "h-[76px] w-[76px] text-5xl",
      preview: "text-sm leading-6 sm:text-base sm:leading-7",
    };
  }

  return {
    shell:
      "min-h-[190px] rounded-[30px] border-orange-200 bg-[radial-gradient(circle_at_50%_0%,rgba(251,146,60,0.26),transparent_36%),linear-gradient(145deg,#ffffff,#fff7ed)] p-4 shadow-[0_22px_58px_-44px_rgba(194,65,12,0.42)] sm:min-h-[240px] sm:p-5",
    glow: "bg-orange-300/30",
    rankPill: "border-orange-200 bg-orange-100 text-orange-950",
    score: "text-orange-950",
    accent: "from-orange-200 via-orange-300 to-amber-600",
    medal: "\uD83E\uDD49",
    medalSize: "h-[76px] w-[76px] text-5xl",
    preview: "text-sm leading-6 sm:text-base sm:leading-7",
  };
}

function LeaderboardPodiumCard({
  position,
  post,
  isLoggedIn = false,
  onOpenPost,
  onOpenComments,
  onReactionUpdated,
  onMutationCommitted,
}: LeaderboardPodiumCardProps) {
  const { requireLoginAndResume, isAuthenticated, authReady } = useAuthModal();
  const styles = getRankStyles(position);
  const effectiveIsLoggedIn = authReady ? isAuthenticated : isLoggedIn;

  if (!post) {
    return (
      <button
        type="button"
        onClick={() =>
          window.dispatchEvent(new CustomEvent("open-create-post"))
        }
        className={`relative flex h-full w-full flex-col justify-between overflow-hidden border text-left transition duration-300 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 ${styles.shell}`}
        aria-label={`Create a post for rank ${position}`}
      >
        <div className="absolute inset-x-8 top-0 h-16 rounded-full bg-neutral-200/40 blur-2xl" />
        <div className="relative">
          <span
            className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${styles.rankPill}`}
          >
            Rank #{position}
          </span>
          <p className="mt-8 text-sm font-bold text-neutral-400">
            Your spot. Take it.
          </p>
        </div>
      </button>
    );
  }

  const score = getDisplayEchoScore(post.relevance_score);

  async function submitReaction(reaction: ReactionType) {
    if (!post) return;

    const previousReaction = post.viewer_reaction;
    const nextReaction = previousReaction === reaction ? null : reaction;

    onReactionUpdated?.(post.id, nextReaction);

    try {
      const res = await fetch(`/api/posts/${post.id}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reaction: nextReaction }),
      });

      if (res.status === 401 || res.status === 403 || !effectiveIsLoggedIn) {
        onReactionUpdated?.(post.id, previousReaction);
        requireLoginAndResume(
          () => void submitReaction(reaction),
          window.location.pathname
        );
        return;
      }

      if (!res.ok) {
        throw new Error("Post reaction failed.");
      }

      onMutationCommitted?.();
    } catch {
      onReactionUpdated?.(post.id, previousReaction);
    }
  }

  return (
    <article
      className={`group relative block h-full w-full transform-gpu overflow-hidden border text-left transition duration-300 hover:-translate-y-1 ${
        position === 1 ? "z-10" : "z-0"
      } ${styles.shell}`}
    >
      <div
        className={`absolute -right-10 -top-10 h-28 w-28 rounded-full blur-3xl transition group-hover:opacity-80 ${styles.glow}`}
      />
      {position === 1 && (
        <div className="pointer-events-none absolute inset-x-6 -top-10 h-28 rounded-full bg-amber-300/30 blur-3xl" />
      )}
      <div
        className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${styles.accent}`}
      />

      <div className="relative flex h-full flex-col">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span
              className={`inline-flex items-center justify-center leading-none ${styles.medalSize}`}
            >
              {styles.medal}
            </span>
          </div>

          <div className="grid min-w-[76px] place-items-center rounded-[22px] border border-white/80 bg-white/85 px-4 py-2 text-center shadow-sm backdrop-blur">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-neutral-400">
              Echo
            </p>
            <p
              className={`mt-1 text-3xl font-black leading-none tabular-nums ${styles.score}`}
            >
              {score}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenPost}
          className="relative mt-5 flex-1 overflow-hidden rounded-[26px] border border-white/80 bg-white/72 p-4 text-left shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950"
        >
          <p
            className={`[display:-webkit-box] overflow-hidden whitespace-pre-wrap break-words font-semibold tracking-tight text-neutral-950 [-webkit-box-orient:vertical] [-webkit-line-clamp:2] ${styles.preview}`}
          >
            {post.post_content}
          </p>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white via-white/80 to-transparent" />
        </button>

        <div className="mt-4 grid grid-cols-5 items-center gap-1.5 sm:gap-2">
          {REACTION_SUMMARY.map((reaction) => {
            const isActive = post.viewer_reaction === reaction.key;

            return (
              <button
                key={reaction.key}
                type="button"
                onClick={() => void submitReaction(reaction.key)}
                aria-label={`React with ${reaction.label}, ${
                  post.reaction_counts[reaction.key] ?? 0
                } reactions`}
                className={`inline-flex min-w-0 items-center justify-center gap-1 rounded-full px-2 py-2 text-xs font-bold transition-all active:scale-90 sm:gap-1.5 sm:px-2.5 ${
                  isActive
                    ? "bg-neutral-950 text-white shadow-lg"
                    : "bg-neutral-50 text-neutral-500 hover:bg-neutral-100"
                }`}
              >
                <span>{reaction.emoji}</span>
                <span
                  className={`tabular-nums ${
                    isActive ? "text-white" : "text-neutral-900"
                  }`}
                >
                  {post.reaction_counts[reaction.key] ?? 0}
                </span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={onOpenComments}
            aria-label={`Open comments, ${post.comments_count} comments`}
            className="inline-flex min-w-0 items-center justify-center gap-1 rounded-full bg-neutral-50 px-2 py-2 text-xs font-bold text-neutral-500 transition-all hover:bg-neutral-100 sm:gap-1.5 sm:px-2.5"
          >
            <span>{"\uD83D\uDCAC"}</span>
            <span className="tabular-nums text-neutral-900">
              {post.comments_count}
            </span>
          </button>
        </div>
      </div>
    </article>
  );
}

export default memo(LeaderboardPodiumCard);
