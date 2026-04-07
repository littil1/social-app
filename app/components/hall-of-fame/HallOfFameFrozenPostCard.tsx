"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ReactionCounts } from "@/types/feed";
import CommentsSection from "@/app/components/posts/CommentsSection";

type FrozenHallOfFamePost = {
  id: number;
  post_content: string;
  post_created_at: string;
  comments_count: number;
  relevance_score: number;
  author_username: string | null;
  reactions_count: number;
  reaction_counts: ReactionCounts;
  winner_date: string;
};

type HallOfFameFrozenPostCardProps = {
  post: FrozenHallOfFamePost | null;
  archiveLabel?: string;
  variant?: "featured" | "archive";
};

function getCardStyles(variant: "featured" | "archive") {
  if (variant === "featured") {
    return {
      outer:
        "border-yellow-300/80 bg-gradient-to-br from-yellow-50 via-amber-50 to-white shadow-[0_28px_90px_-42px_rgba(245,158,11,0.42)]",
      accentText: "text-amber-700",
      badge: "border-yellow-200 bg-white/90 text-yellow-950",
      authorBox: "border-yellow-200/80 bg-white/90",
      contentBox: "border-yellow-100 bg-white/95",
      reactionPill: "border-yellow-100 bg-white/90",
      contentText: "text-lg leading-8 sm:text-xl sm:leading-9",
      padding: "p-5 sm:p-7",
    };
  }

  return {
    outer:
      "border-gray-200 bg-white shadow-[0_20px_55px_-40px_rgba(15,23,42,0.24)]",
    accentText: "text-amber-700",
    badge: "border-amber-200 bg-amber-50 text-amber-950",
    authorBox: "border-gray-200 bg-white",
    contentBox: "border-gray-100 bg-white",
    reactionPill: "border-gray-100 bg-white",
    contentText: "text-base leading-7 sm:text-lg sm:leading-8",
    padding: "p-5 sm:p-6",
  };
}

export default function HallOfFameFrozenPostCard({
  post,
  archiveLabel,
  variant = "archive",
}: HallOfFameFrozenPostCardProps) {
  // =====================================================
  // State
  // =====================================================

  const [showComments, setShowComments] = useState(false);
  const [localCommentsCount, setLocalCommentsCount] = useState(
    post?.comments_count ?? 0
  );

  // =====================================================
  // Derived state
  // =====================================================

  const styles = useMemo(() => getCardStyles(variant), [variant]);

  // =====================================================
  // Effects
  // =====================================================

  useEffect(() => {
    setLocalCommentsCount(post?.comments_count ?? 0);
  }, [post?.comments_count]);

  // =====================================================
  // Empty state
  // =====================================================

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
            {archiveLabel ?? "Tagessieger"}
          </h3>
        </div>

        <div className="mt-6 rounded-3xl border border-dashed border-gray-300 bg-white/70 p-4 text-sm text-gray-600">
          Für diesen Eintrag gibt es keinen gespeicherten Beitrag.
        </div>
      </article>
    );
  }

  // =====================================================
  // Render
  // =====================================================

  return (
    <article
      className={`rounded-[28px] border ${styles.outer} ${styles.padding}`}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p
              className={`text-xs font-semibold uppercase tracking-[0.18em] ${styles.accentText}`}
            >
              Hall of Fame
            </p>
            <h3 className="mt-2 text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl">
              {archiveLabel ?? "Tagessieger"}
            </h3>
          </div>

          <span
            className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold sm:px-4 sm:text-sm ${styles.badge}`}
          >
            Ausgezeichnet
          </span>
        </div>

        <div
          className={`mt-5 inline-flex w-fit max-w-full items-center gap-3 rounded-2xl border px-4 py-3 ${styles.authorBox}`}
        >
          <span
            className={`text-xs font-semibold uppercase tracking-[0.18em] ${styles.accentText}`}
          >
            Ausgezeichnet
          </span>

          {post.author_username ? (
            <Link
              href={`/u/${encodeURIComponent(post.author_username)}`}
              className="truncate text-xl font-bold text-gray-950 transition hover:opacity-75"
            >
              @{post.author_username}
            </Link>
          ) : (
            <span className="text-xl font-bold text-gray-950">Unbekannt</span>
          )}
        </div>

        <div
          className={`mt-5 rounded-[28px] border p-5 shadow-sm sm:p-6 ${styles.contentBox}`}
        >
          <p
            className={`whitespace-pre-wrap break-words text-gray-900 ${styles.contentText}`}
          >
            {post.post_content}
          </p>
        </div>

        <div className="mt-5 flex flex-wrap gap-2.5">
          <div
            className={`rounded-full border px-4 py-2.5 text-sm ${styles.reactionPill}`}
          >
            ❤️ {post.reaction_counts.like}
          </div>
          <div
            className={`rounded-full border px-4 py-2.5 text-sm ${styles.reactionPill}`}
          >
            😂 {post.reaction_counts.funny}
          </div>
          <div
            className={`rounded-full border px-4 py-2.5 text-sm ${styles.reactionPill}`}
          >
            🤯 {post.reaction_counts.wow}
          </div>
          <div
            className={`rounded-full border px-4 py-2.5 text-sm ${styles.reactionPill}`}
          >
            🔥 {post.reaction_counts.fire}
          </div>
        </div>

        <div className="mt-5">
          <button
            type="button"
            onClick={() => setShowComments((prev) => !prev)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 shadow-sm transition hover:bg-gray-50 sm:w-auto"
          >
            💬 {localCommentsCount}{" "}
            {localCommentsCount === 1 ? "Kommentar" : "Kommentare"}{" "}
            {showComments ? "ausblenden" : "anzeigen"}
          </button>
        </div>

        {showComments && (
          <div className="mt-4 rounded-3xl border border-gray-200 bg-white/80 p-3 shadow-sm sm:p-4">
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