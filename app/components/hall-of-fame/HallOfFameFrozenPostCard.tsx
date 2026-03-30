"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
};

type HallOfFameFrozenPostCardProps = {
  post: FrozenHallOfFamePost | null;
  position?: 1 | 2 | 3;
  archiveLabel?: string;
};

function formatDate(dateString: string) {
  const date = new Date(dateString);

  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getPodiumCardClass(position?: 1 | 2 | 3) {
  if (position === 1) {
    return "border-yellow-300 bg-yellow-50";
  }

  if (position === 2) {
    return "border-gray-300 bg-gray-50";
  }

  if (position === 3) {
    return "border-orange-300 bg-orange-50";
  }

  return "border-gray-200 bg-white";
}

function getPodiumHeightClass(position?: 1 | 2 | 3) {
  if (position === 1) return "min-h-[320px]";
  if (position === 2) return "min-h-[260px]";
  if (position === 3) return "min-h-[220px]";
  return "";
}

function getPodiumEmoji(position?: 1 | 2 | 3) {
  if (position === 1) return "🥇";
  if (position === 2) return "🥈";
  if (position === 3) return "🥉";
  return "🏆";
}

function getPodiumLabel(position?: 1 | 2 | 3) {
  if (position === 1) return "Gold";
  if (position === 2) return "Silber";
  if (position === 3) return "Bronze";
  return "Hall of Fame";
}

export default function HallOfFameFrozenPostCard({
  post,
  position,
  archiveLabel,
}: HallOfFameFrozenPostCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [localCommentsCount, setLocalCommentsCount] = useState(
    post?.comments_count ?? 0
  );

  useEffect(() => {
    setLocalCommentsCount(post?.comments_count ?? 0);
  }, [post?.comments_count]);

  if (!post) {
    return (
      <article
        className={`rounded-2xl border p-5 shadow ${getPodiumCardClass(
          position
        )} ${getPodiumHeightClass(position)}`}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-2xl">{getPodiumEmoji(position)}</p>
            <p className="mt-2 text-lg font-bold">{getPodiumLabel(position)}</p>
          </div>

          {position && (
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-700">
              Platz {position}
            </span>
          )}
        </div>

        <p className="text-sm text-gray-500">
          Für diesen Platz gibt es keinen gespeicherten Post.
        </p>
      </article>
    );
  }

  return (
    <article
      className={`rounded-2xl border p-5 shadow ${getPodiumCardClass(
        position
      )} ${getPodiumHeightClass(position)}`}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-2xl">{getPodiumEmoji(position)}</p>
          <p className="mt-2 text-lg font-bold">
            {archiveLabel ?? getPodiumLabel(position)}
          </p>
        </div>

        {position ? (
          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-700">
            Platz {position}
          </span>
        ) : (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">
            Hall of Fame
          </span>
        )}
      </div>

      <p className="mb-3 whitespace-pre-wrap break-words text-gray-900">
        {post.post_content}
      </p>

      <div className="mb-3 space-y-1 text-sm text-gray-600">
        <p>
          <span className="font-medium text-gray-800">Autor:</span>{" "}
          {post.author_username ? (
            <Link
              href={`/u/${encodeURIComponent(post.author_username)}`}
              className="hover:underline"
            >
              @{post.author_username}
            </Link>
          ) : (
            "Unbekannt"
          )}
        </p>

        <p>
          <span className="font-medium text-gray-800">Erstellt:</span>{" "}
          {formatDate(post.post_created_at)}
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded-full bg-white px-3 py-1.5 text-gray-700 ring-1 ring-gray-200">
          ❤️ {post.reaction_counts.like}
        </span>
        <span className="rounded-full bg-white px-3 py-1.5 text-gray-700 ring-1 ring-gray-200">
          😂 {post.reaction_counts.funny}
        </span>
        <span className="rounded-full bg-white px-3 py-1.5 text-gray-700 ring-1 ring-gray-200">
          😮 {post.reaction_counts.wow}
        </span>
        <span className="rounded-full bg-white px-3 py-1.5 text-gray-700 ring-1 ring-gray-200">
          🔥 {post.reaction_counts.fire}
        </span>

        <button
          type="button"
          onClick={() => setShowComments((prev) => !prev)}
          className="rounded-full bg-white px-3 py-1.5 text-gray-700 ring-1 ring-gray-200 transition hover:bg-gray-100"
        >
          <span className="mr-1">💬</span>
          {localCommentsCount} {showComments ? "Hide comments" : "Show comments"}
        </button>
      </div>

      <div className="mb-1 flex flex-wrap items-center gap-3 text-sm text-gray-700">
        <span>{post.reactions_count} Reactions</span>
        <span>{localCommentsCount} Kommentare</span>
        <span>Relevanz {Number(post.relevance_score).toFixed(1)}</span>
      </div>

      {showComments && (
        <div className="mt-4">
          <CommentsSection
            postId={post.id}
            onCommentCreated={() => {}}
            onCommentsLoaded={setLocalCommentsCount}
          />
        </div>
      )}
    </article>
  );
}