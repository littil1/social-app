"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import CommentsSection from "@/features/comments/components/CommentsSection";
import type { ReactionCounts } from "@/shared/types/feed";
import LegendBadgeMarker from "@/features/badges/components/LegendBadgeMarker";
import { scheduleScrollIntoViewIfNeeded } from "@/shared/lib/scroll-into-view-if-needed";

type FrozenHallOfFamePost = {
  id: number;
  post_content: string;
  post_created_at: string;
  comments_count: number;
  relevance_score: number;
  author_username: string | null;
  reactions_count: number;
  boost_count: number;
  reaction_counts: ReactionCounts;
  winner_date: string;
};

type HallOfFameFrozenPostCardProps = {
  post: FrozenHallOfFamePost | null;
  dayLabel?: string;
  variant?: "featured" | "archive";
};

function formatEchoScore(score: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(score);
}

function getCardStyles(variant: "featured" | "archive") {
  if (variant === "featured") {
    return {
      outer:
        "border-yellow-300/80 bg-[radial-gradient(circle_at_20%_0%,rgba(251,191,36,0.18),transparent_32%),linear-gradient(145deg,#fff8db,#ffffff_54%,#fffbeb)] shadow-[0_28px_90px_-42px_rgba(245,158,11,0.42)]",
      accentText: "text-amber-700",
      authorBox: "border-yellow-200/80 bg-white/90",
      contentBox: "border-yellow-100 bg-white/95",
      contentText: "text-base leading-7 sm:text-lg sm:leading-8",
      padding: "p-5 sm:p-6",
    };
  }

  return {
    outer:
      "border-gray-200 bg-white shadow-[0_20px_55px_-40px_rgba(15,23,42,0.24)]",
    accentText: "text-amber-700",
    authorBox: "border-gray-200 bg-white",
    contentBox: "border-gray-100 bg-white",
    contentText: "text-base leading-7",
    padding: "p-5 sm:p-6",
  };
}

function getCommentsStorageKey(postId: number) {
  return `app_hof_comments_open_${postId}`;
}

function formatBoostLabel(count: number) {
  return `${count} ${count === 1 ? "BOOST" : "BOOSTS"}`;
}

export default function HallOfFameFrozenPostCard({
  post,
  dayLabel,
  variant = "archive",
}: HallOfFameFrozenPostCardProps) {
  const styles = useMemo(() => getCardStyles(variant), [variant]);

  if (!post) {
    return (
      <article
        className={`rounded-[28px] border ${styles.outer} ${styles.padding}`}
      >
        <div>
          <p
            className={`text-xs font-semibold uppercase tracking-[0.18em] ${styles.accentText}`}
          >
            Hall of Fame
          </p>
          <h3 className="mt-2 text-2xl font-bold tracking-tight text-gray-950">
            No post found
          </h3>
        </div>

        <div className="mt-6 rounded-3xl border border-dashed border-gray-300 bg-white/70 p-4 text-sm text-gray-600">
          No post found.
        </div>
      </article>
    );
  }

  return (
    <HallOfFameFrozenPostCardContent
      key={post.id}
      post={post}
      dayLabel={dayLabel}
      styles={styles}
      variant={variant}
    />
  );
}

function HallOfFameFrozenPostCardContent({
  post,
  dayLabel,
  styles,
  variant,
}: {
  post: FrozenHallOfFamePost;
  dayLabel?: string;
  styles: ReturnType<typeof getCardStyles>;
  variant: "featured" | "archive";
}) {
  const [showComments, setShowComments] = useState(false);
  const [localCommentsCount, setLocalCommentsCount] = useState(
    post.comments_count
  );
  const commentsContainerRef = useRef<HTMLDivElement | null>(null);
  const shouldScrollToCommentsRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.sessionStorage.setItem(
      getCommentsStorageKey(post.id),
      String(showComments)
    );
  }, [post.id, showComments]);

  useEffect(() => {
    if (!showComments || !shouldScrollToCommentsRef.current) return;

    shouldScrollToCommentsRef.current = false;
    scheduleScrollIntoViewIfNeeded(commentsContainerRef.current);
  }, [showComments]);

  function toggleComments() {
    setShowComments((prev) => {
      const next = !prev;
      if (next) {
        shouldScrollToCommentsRef.current = true;
      }
      return next;
    });
  }

  return (
    <article
      className={`overflow-hidden rounded-[28px] border ${styles.outer} ${styles.padding}`}
    >
      <div className="flex h-full flex-col">
        <div className="flex flex-col gap-3 border-b border-black/5 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold tracking-normal text-neutral-600">
              {dayLabel ?? "Hall of Fame"}
            </p>
            {variant === "featured" && (
              <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-amber-700">
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-black uppercase tracking-[0.16em] shadow-sm ${
                variant === "featured"
                  ? "border-amber-200 bg-amber-100 text-amber-950"
                  : "border-amber-200 bg-amber-50 text-amber-800"
              }`}
            >
              <span>ECHO</span>
              <span className="text-sm tabular-nums">
                {formatEchoScore(post.relevance_score)}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <div className="min-w-0">
            {post.author_username ? (
              <div className="flex items-center gap-2">
                <span className="relative inline-flex min-w-0 max-w-full items-baseline pr-[0.7em] sm:pr-[0.75em]">
                  <Link
                    href={`/u/${encodeURIComponent(post.author_username)}`}
                    className="truncate text-2xl font-black tracking-tight text-gray-950 transition hover:opacity-75 sm:text-3xl"
                  >
                    @{post.author_username}
                  </Link>
                  <LegendBadgeMarker
                    variant="nameOverlayLarge"
                    className="text-[0.98em] sm:text-[1.02em]"
                  />
                </span>
              </div>
            ) : (
              <h3 className="text-2xl font-black tracking-tight text-gray-950 sm:text-3xl">
                Unknown
              </h3>
            )}
          </div>
        </div>

        <div
          className={`mt-4 rounded-[24px] border p-4 shadow-sm ring-1 ring-white/60 sm:p-5 ${styles.contentBox}`}
        >
          <p
            className={`min-h-[4rem] whitespace-pre-wrap break-words font-medium tracking-tight text-gray-900 ${styles.contentText}`}
          >
            {post.post_content}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-1.5 rounded-[24px] border border-neutral-100 bg-white/70 p-1.5 sm:gap-2">
          <span
            aria-label={`Impact reactions, ${post.reaction_counts.like}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-neutral-50 px-3 py-2 text-sm font-bold text-neutral-500 sm:gap-2 sm:px-4"
          >
            <span>{"\u2764\uFE0F"}</span>
            <span className="text-neutral-900">{post.reaction_counts.like}</span>
          </span>
          <span
            aria-label={`Funny reactions, ${post.reaction_counts.funny}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-neutral-50 px-3 py-2 text-sm font-bold text-neutral-500 sm:gap-2 sm:px-4"
          >
            <span>{"\uD83D\uDE02"}</span>
            <span className="text-neutral-900">
              {post.reaction_counts.funny}
            </span>
          </span>
          <span
            aria-label={`Wow reactions, ${post.reaction_counts.wow}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-neutral-50 px-3 py-2 text-sm font-bold text-neutral-500 sm:gap-2 sm:px-4"
          >
            <span>{"\uD83E\uDD2F"}</span>
            <span className="text-neutral-900">{post.reaction_counts.wow}</span>
          </span>
          <span
            aria-label={`Strong reactions, ${post.reaction_counts.fire}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-neutral-50 px-3 py-2 text-sm font-bold text-neutral-500 sm:gap-2 sm:px-4"
          >
            <span>{"\uD83D\uDD25"}</span>
            <span className="text-neutral-900">{post.reaction_counts.fire}</span>
          </span>
          <button
            type="button"
            onClick={toggleComments}
            aria-label={`${showComments ? "Hide" : "Show"} comments, ${localCommentsCount} comments`}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-bold transition-all sm:gap-2 sm:px-4 ${
              showComments
                ? "bg-neutral-200 text-neutral-900"
                : "bg-neutral-50 text-neutral-500 hover:bg-neutral-100"
            }`}
          >
            <span>{"\uD83D\uDCAC"}</span>
            <span className="text-neutral-900">{localCommentsCount}</span>
          </button>
          {post.boost_count > 0 && (
            <span
              aria-label={`${post.boost_count} historical BOOST${post.boost_count === 1 ? "" : "S"}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/70 bg-amber-50/80 px-3 py-2 text-sm font-black text-amber-900 shadow-sm sm:gap-2 sm:px-4"
            >
              <span>{"\uD83D\uDE80"}</span>
              <span>{formatBoostLabel(post.boost_count)}</span>
            </span>
          )}
        </div>

        {showComments && (
          <div
            ref={commentsContainerRef}
            className="mt-4 rounded-3xl border border-gray-200 bg-white/80 p-3 shadow-sm sm:p-4"
          >
            <CommentsSection
              postId={post.id}
              onCommentCreated={() => {}}
              onCommentsLoaded={setLocalCommentsCount}
            />
          </div>
        )}
      </div>
    </article>
  );
}
