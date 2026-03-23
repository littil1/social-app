"use client";

import Link from "next/link";
import { memo, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { FeedPost } from "@/types/feed";
import CommentsSection from "@/app/components/feed/CommentsSection";

type PostCardProps = {
  post: FeedPost;
  onLikeUpdated: (postId: number, liked: boolean) => void;
  onCommentCreated: (postId: number) => void;
  onPostDeleted: (postId: number) => void;
  showAuthor?: boolean;
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

function PostCardComponent({
  post,
  onLikeUpdated,
  onCommentCreated,
  onPostDeleted,
  showAuthor = false,
}: PostCardProps) {
  const [likeLoading, setLikeLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [localCommentsCount, setLocalCommentsCount] = useState(
    post.comments_count
  );
  const router = useRouter();

  useEffect(() => {
    setLocalCommentsCount(post.comments_count);
  }, [post.comments_count]);

  async function handleToggleLike() {
    if (likeLoading) return;

    const nextLiked = !post.viewer_has_liked;
    onLikeUpdated(post.id, nextLiked);
    setLikeLoading(true);

    try {
      const res = await fetch(`/api/posts/${post.id}/like`, {
        method: "POST",
      });

      if (!res.ok) {
        throw new Error("Like konnte nicht gespeichert werden.");
      }
    } catch (error) {
      console.error(error);
      onLikeUpdated(post.id, !nextLiked);
      alert("Like konnte nicht gespeichert werden.");
    } finally {
      setLikeLoading(false);
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
    setLocalCommentsCount((prev) => prev + 1);
    onCommentCreated(post.id);
  }

  function handleCommentsLoaded(count: number) {
    setLocalCommentsCount(count);
  }

  function handleCommentDeleted() {
    setLocalCommentsCount((prev) => Math.max(0, prev - 1));
  }

  return (
    <article className="rounded-xl bg-white p-6 shadow">
      <div className="mb-4">
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
          <>
            <p className="text-sm font-semibold text-gray-700">
              Anonymous Post #{post.id}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              {formatDate(post.created_at)}
            </p>
          </>
        )}
      </div>

      <p className="mb-5 whitespace-pre-wrap break-words text-gray-900">
        {post.content}
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-gray-600">
        <span>{post.likes_count} Likes</span>
        <span>{localCommentsCount} Comments</span>

        <button
          type="button"
          onClick={handleToggleLike}
          disabled={likeLoading}
          className="rounded-lg border px-4 py-2 disabled:opacity-50"
        >
          {post.viewer_has_liked ? "♥ Liked" : "♡ Like"}
        </button>

        <button
          type="button"
          onClick={() => setShowComments((prev) => !prev)}
          className="rounded-lg border px-4 py-2"
        >
          {showComments ? "Hide comments" : "Show comments"}
        </button>

        {post.can_delete && (
          <button
            type="button"
            onClick={handleDeletePost}
            disabled={deleteLoading}
            className="rounded-lg border border-red-300 px-4 py-2 text-red-600 disabled:opacity-50"
          >
            {deleteLoading ? "Deleting..." : "Delete"}
          </button>
        )}
      </div>

      {showComments && (
        <CommentsSection
          postId={post.id}
          onCommentCreated={handleCommentCreatedLocal}
          onCommentsLoaded={handleCommentsLoaded}
          onCommentDeleted={handleCommentDeleted}
        />
      )}
    </article>
  );
}

const PostCard = memo(PostCardComponent);
export default PostCard;