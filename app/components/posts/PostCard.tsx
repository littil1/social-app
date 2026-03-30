"use client";

import Link from "next/link";
import { memo, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { FeedPost, ReactionType } from "@/types/feed";
import CommentsSection from "@/app/components/posts/CommentsSection";

type PostCardProps = {
  post: FeedPost;
  onReactionUpdated: (
    postId: number,
    nextReaction: ReactionType | null
  ) => void;
  onCommentCreated?: (postId: number) => void;
  onCommentsCountChange?: (postId: number, count: number) => void;
  onPostDeleted: (postId: number) => void;
  showAuthor?: boolean;
  dailyRank?: 1 | 2 | 3;
  detailHref?: string;
};

const REACTIONS: Array<{
  value: ReactionType;
  emoji: string;
  label: string;
  countKey: keyof NonNullable<FeedPost["reaction_counts"]>;
}> = [
  { value: "like", emoji: "❤️", label: "Gefällt mir", countKey: "like" },
  { value: "funny", emoji: "😂", label: "Lustig", countKey: "funny" },
  { value: "wow", emoji: "😮", label: "Wow", countKey: "wow" },
  { value: "fire", emoji: "🔥", label: "Stark", countKey: "fire" },
];

// =====================================================
// Helpers
// =====================================================

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

function getRankStyles(dailyRank?: 1 | 2 | 3) {
  if (dailyRank === 1) {
    return {
      articleClass:
        "border border-amber-300/80 bg-gradient-to-br from-amber-50 via-white to-white shadow-[0_10px_30px_rgba(245,158,11,0.10)]",
      badgeClass:
        "border border-amber-200 bg-amber-100/80 text-amber-800",
      badgeText: "🏆 #1 Today",
      accentClass: "bg-amber-400",
    };
  }

  if (dailyRank === 2) {
    return {
      articleClass:
        "border border-slate-300 bg-gradient-to-br from-slate-50 via-white to-white shadow-[0_10px_24px_rgba(100,116,139,0.08)]",
      badgeClass:
        "border border-slate-200 bg-slate-100 text-slate-700",
      badgeText: "✨ #2 Today",
      accentClass: "bg-slate-400",
    };
  }

  if (dailyRank === 3) {
    return {
      articleClass:
        "border border-orange-300/80 bg-gradient-to-br from-orange-50 via-white to-white shadow-[0_10px_24px_rgba(249,115,22,0.08)]",
      badgeClass:
        "border border-orange-200 bg-orange-100/80 text-orange-800",
      badgeText: "🔥 #3 Today",
      accentClass: "bg-orange-400",
    };
  }

  return {
    articleClass: "border border-gray-100 bg-white shadow",
    badgeClass: "",
    badgeText: "",
    accentClass: "bg-transparent",
  };
}

// =====================================================
// Component
// =====================================================

function PostCardComponent({
  post,
  onReactionUpdated,
  onCommentCreated,
  onCommentsCountChange,
  onPostDeleted,
  showAuthor = false,
  dailyRank,
  detailHref,
}: PostCardProps) {
  // =====================================================
  // State
  // =====================================================

  const [reactionLoading, setReactionLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [localCommentsCount, setLocalCommentsCount] = useState(
    post.comments_count
  );

  const router = useRouter();
  const rankStyles = getRankStyles(dailyRank);

  const reactionCounts = {
    like: post.reaction_counts?.like ?? 0,
    funny: post.reaction_counts?.funny ?? 0,
    wow: post.reaction_counts?.wow ?? 0,
    fire: post.reaction_counts?.fire ?? 0,
  };

  // =====================================================
  // Effects
  // =====================================================

  useEffect(() => {
    setLocalCommentsCount(post.comments_count);
  }, [post.comments_count]);

  // =====================================================
  // Actions
  // =====================================================

  async function handleReactionClick(reaction: ReactionType) {
    if (reactionLoading) return;

    const previousReaction = post.viewer_reaction;
    const nextReaction = previousReaction === reaction ? null : reaction;

    onReactionUpdated(post.id, nextReaction);
    setReactionLoading(true);

    try {
      const res = await fetch(`/api/posts/${post.id}/like`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reaction: nextReaction }),
      });

      if (!res.ok) {
        throw new Error("Reaction konnte nicht gespeichert werden.");
      }

      const data = (await res.json()) as {
        success: boolean;
        reaction: ReactionType | null;
      };

      onReactionUpdated(post.id, data.reaction);
    } catch (error) {
      console.error(error);
      onReactionUpdated(post.id, previousReaction);
      alert("Reaction konnte nicht gespeichert werden.");
    } finally {
      setReactionLoading(false);
    }
  }

  async function handleDeletePost() {
    if (deleteLoading) return;

    const confirmed = window.confirm("Diesen Post wirklich löschen?");
    if (!confirmed) return;

    setDeleteLoading(true);

    try {
      const res = await fetch(`/api/posts/${post.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Post konnte nicht gelöscht werden.");
      }

      onPostDeleted(post.id);
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Post konnte nicht gelöscht werden.");
    } finally {
      setDeleteLoading(false);
    }
  }

  function handleCommentCreatedLocal() {
    onCommentCreated?.(post.id);
  }

  function handleCommentsLoaded(count: number) {
    setLocalCommentsCount(count);
    onCommentsCountChange?.(post.id, count);
  }

  // =====================================================
  // Render
  // =====================================================

  return (
    <article
      className={`relative overflow-hidden rounded-2xl p-6 ${rankStyles.articleClass}`}
    >
      {dailyRank && (
        <div
          className={`absolute inset-y-0 left-0 w-1.5 ${rankStyles.accentClass}`}
          aria-hidden="true"
        />
      )}

      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          {showAuthor && post.author_username ? (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-sm font-semibold text-gray-600">
                {post.author_avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={post.author_avatar_url}
                    alt={`${post.author_username} avatar`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  post.author_username.charAt(0).toUpperCase()
                )}
              </div>

              <div className="min-w-0">
                <Link
                  href={`/u/${post.author_username}`}
                  className="block truncate text-sm font-semibold text-gray-700 hover:underline"
                >
                  @{post.author_username}
                </Link>
                <p className="mt-1 text-xs text-gray-400">
                  {formatDate(post.created_at)}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400">{formatDate(post.created_at)}</p>
          )}
        </div>

        <div className="flex shrink-0 items-start gap-2">
          {dailyRank && (
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${rankStyles.badgeClass}`}
            >
              {rankStyles.badgeText}
            </span>
          )}

          {post.can_delete && (
            <button
              type="button"
              onClick={handleDeletePost}
              disabled={deleteLoading}
              className="rounded-xl border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
            >
              {deleteLoading ? "Deleting..." : "Delete"}
            </button>
          )}
        </div>
      </div>

      <div className="mb-6">
        {detailHref ? (
          <Link
            href={detailHref}
            className="block rounded-xl transition hover:opacity-90"
          >
            <p className="whitespace-pre-wrap break-words text-[17px] leading-8 text-gray-900">
              {post.content}
            </p>
          </Link>
        ) : (
          <p className="whitespace-pre-wrap break-words text-[17px] leading-8 text-gray-900">
            {post.content}
          </p>
        )}
      </div>

      <div className="mb-4 rounded-2xl border border-gray-100 bg-gray-50/80 p-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {REACTIONS.map((reaction) => {
            const isActive = post.viewer_reaction === reaction.value;

            return (
              <button
                key={reaction.value}
                type="button"
                onClick={() => handleReactionClick(reaction.value)}
                disabled={reactionLoading}
                className={`rounded-full px-3 py-1.5 transition disabled:opacity-50 ${
                  isActive
                    ? "border border-amber-200 bg-amber-50 text-amber-800 ring-1 ring-amber-200"
                    : "bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-100"
                }`}
                aria-pressed={isActive}
                title={reaction.label}
              >
                <span className="mr-1">{reaction.emoji}</span>
                {reactionCounts[reaction.countKey]}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setShowComments((prev) => !prev)}
            className="rounded-full bg-white px-3 py-1.5 text-gray-700 ring-1 ring-gray-200 transition hover:bg-gray-100"
          >
            <span className="mr-1">💬</span>
            {localCommentsCount}{" "}
            {showComments ? "Hide comments" : "Show comments"}
          </button>
        </div>
      </div>

      {showComments && (
        <CommentsSection
          postId={post.id}
          onCommentCreated={handleCommentCreatedLocal}
          onCommentsLoaded={handleCommentsLoaded}
        />
      )}
    </article>
  );
}

const PostCard = memo(PostCardComponent);
export default PostCard;