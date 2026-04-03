"use client";

import Link from "next/link";
import { memo, useEffect, useMemo, useState } from "react";
import type { FeedPost, ReactionType } from "@/types/feed";
import CommentsSection from "@/app/components/posts/CommentsSection";
import { useAuthModal } from "@/app/components/auth/AuthModalProvider";

// =====================================================
// Types
// =====================================================

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
  isLoggedIn?: boolean;
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
      badgeText: "🏆 #1 heute",
      accentClass: "bg-amber-400",
    };
  }

  if (dailyRank === 2) {
    return {
      articleClass:
        "border border-slate-300 bg-gradient-to-br from-slate-50 via-white to-white shadow-[0_10px_24px_rgba(100,116,139,0.08)]",
      badgeClass:
        "border border-slate-200 bg-slate-100 text-slate-700",
      badgeText: "✨ #2 heute",
      accentClass: "bg-slate-400",
    };
  }

  if (dailyRank === 3) {
    return {
      articleClass:
        "border border-orange-300/80 bg-gradient-to-br from-orange-50 via-white to-white shadow-[0_10px_24px_rgba(249,115,22,0.08)]",
      badgeClass:
        "border border-orange-200 bg-orange-100/80 text-orange-800",
      badgeText: "🔥 #3 heute",
      accentClass: "bg-orange-400",
    };
  }

  return {
    articleClass: "border border-gray-100 bg-white shadow-sm",
    badgeClass: "",
    badgeText: "",
    accentClass: "bg-transparent",
  };
}

function getResumePath() {
  if (typeof window === "undefined") return "/";
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
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
  isLoggedIn = false,
}: PostCardProps) {
  // =====================================================
  // Hooks
  // =====================================================

  const { requireLoginAndResume, isAuthenticated, authReady } = useAuthModal();

  // =====================================================
  // State
  // =====================================================

  const [reactionLoading, setReactionLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [localCommentsCount, setLocalCommentsCount] = useState(
    post.comments_count
  );

  // =====================================================
  // Derived Values
  // =====================================================

  const effectiveIsLoggedIn = useMemo(() => {
    return authReady ? isAuthenticated : isLoggedIn;
  }, [authReady, isAuthenticated, isLoggedIn]);

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

  async function submitReaction(reaction: ReactionType) {
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

      if (res.status === 401 || res.status === 403) {
        onReactionUpdated(post.id, previousReaction);

        requireLoginAndResume(() => {
          void submitReaction(reaction);
        }, getResumePath());
        return;
      }

      if (!res.ok) {
        throw new Error("Reaktion konnte nicht gespeichert werden.");
      }

      const data = (await res.json()) as {
        success: boolean;
        reaction: ReactionType | null;
      };

      onReactionUpdated(post.id, data.reaction);
    } catch (error) {
      console.error(error);
      onReactionUpdated(post.id, previousReaction);
      alert("Reaktion konnte nicht gespeichert werden.");
    } finally {
      setReactionLoading(false);
    }
  }

  async function handleReactionClick(reaction: ReactionType) {
    if (!effectiveIsLoggedIn) {
      requireLoginAndResume(() => {
        void submitReaction(reaction);
      }, getResumePath());
      return;
    }

    await submitReaction(reaction);
  }

  async function deletePost() {
    if (deleteLoading) return;

    setDeleteLoading(true);

    try {
      const res = await fetch(`/api/posts/${post.id}`, {
        method: "DELETE",
      });

      if (res.status === 401 || res.status === 403) {
        requireLoginAndResume(() => {
          void deletePost();
        }, getResumePath());
        return;
      }

      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Beitrag konnte nicht gelöscht werden.");
      }

      onPostDeleted(post.id);
    } catch (error) {
      console.error(error);
      alert("Beitrag konnte nicht gelöscht werden.");
    } finally {
      setDeleteLoading(false);
    }
  }

  async function handleDeletePost() {
    if (deleteLoading) return;

    if (!effectiveIsLoggedIn) {
      requireLoginAndResume(() => {
        void handleDeletePost();
      }, getResumePath());
      return;
    }

    const confirmed = window.confirm("Diesen Beitrag wirklich löschen?");
    if (!confirmed) return;

    await deletePost();
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
      className={`relative overflow-hidden rounded-2xl p-4 sm:p-6 ${rankStyles.articleClass}`}
    >
      {dailyRank && (
        <div
          className={`absolute inset-y-0 left-0 w-1.5 ${rankStyles.accentClass}`}
          aria-hidden="true"
        />
      )}

      <div className="mb-4 flex flex-col gap-3 sm:mb-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {showAuthor && post.author_username ? (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-sm font-semibold text-gray-600">
                  {post.author_avatar_url ? (
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

          {post.can_delete && (
            <button
              type="button"
              onClick={() => void handleDeletePost()}
              disabled={deleteLoading}
              className="inline-flex shrink-0 items-center justify-center rounded-xl border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
            >
              {deleteLoading ? "Lösche..." : "Löschen"}
            </button>
          )}
        </div>

        {dailyRank && (
          <div className="flex justify-start">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${rankStyles.badgeClass}`}
            >
              {rankStyles.badgeText}
            </span>
          </div>
        )}
      </div>

      <div className="mb-5 sm:mb-6">
        {detailHref ? (
          <Link
            href={detailHref}
            className="block rounded-xl transition hover:opacity-90"
          >
            <p className="whitespace-pre-wrap break-words text-[15px] leading-7 text-gray-900 sm:text-[17px] sm:leading-8">
              {post.content}
            </p>
          </Link>
        ) : (
          <p className="whitespace-pre-wrap break-words text-[15px] leading-7 text-gray-900 sm:text-[17px] sm:leading-8">
            {post.content}
          </p>
        )}
      </div>

      <div className="mb-4 rounded-2xl border border-gray-100 bg-gray-50/80 p-3">
        <div className="flex flex-col gap-2">
          <div className="overflow-x-auto">
            <div className="flex min-w-max items-center gap-2">
              {REACTIONS.map((reaction) => {
                const isActive = post.viewer_reaction === reaction.value;

                return (
                  <button
                    key={reaction.value}
                    type="button"
                    onClick={() => void handleReactionClick(reaction.value)}
                    disabled={reactionLoading}
                    className={`inline-flex min-h-[40px] shrink-0 items-center justify-center rounded-full px-3 py-1.5 text-sm transition disabled:opacity-50 ${
                      isActive
                        ? "border border-amber-200 bg-amber-50 text-amber-800 ring-1 ring-amber-200"
                        : "bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-100"
                    }`}
                    aria-pressed={isActive}
                    title={reaction.label}
                  >
                    <span className="mr-1.5">{reaction.emoji}</span>
                    <span className="font-medium">
                      {reactionCounts[reaction.countKey]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={() => setShowComments((prev) => !prev)}
              className="inline-flex min-h-[40px] items-center justify-center rounded-full bg-white px-3 py-1.5 text-sm text-gray-700 ring-1 ring-gray-200 transition hover:bg-gray-100"
            >
              <span className="mr-1.5">💬</span>
              <span className="font-medium">
                {localCommentsCount}{" "}
                {showComments ? "Kommentare ausblenden" : "Kommentare anzeigen"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {showComments && (
        <CommentsSection
          postId={post.id}
          onCommentCreated={handleCommentCreatedLocal}
          onCommentsLoaded={handleCommentsLoaded}
          isLoggedIn={effectiveIsLoggedIn}
        />
      )}
    </article>
  );
}

const PostCard = memo(PostCardComponent);
export default PostCard;