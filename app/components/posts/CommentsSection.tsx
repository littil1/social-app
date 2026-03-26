"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { FeedComment } from "@/types/feed";

type CommentsSectionProps = {
  postId: number;
  onCommentCreated: () => void;
  onCommentsLoaded?: (count: number) => void;
  onCommentDeleted?: () => void;
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

function getHallOfFameCategoryLabel(category: string) {
  if (category === "likes") return "Top Likes";
  if (category === "relevance") return "Top Relevance";
  if (category === "comments") return "Top Comments";
  return "Hall of Fame";
}

export default function CommentsSection({
  postId,
  onCommentCreated,
  onCommentsLoaded,
}: CommentsSectionProps) {
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<number | null>(
    null
  );
  const [content, setContent] = useState("");

  const hasLoadedInitiallyRef = useRef(false);

  useEffect(() => {
    let active = true;

    async function loadComments() {
      try {
        setLoading(true);

        const res = await fetch(`/api/posts/${postId}/comments`, {
          method: "GET",
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error("Kommentare konnten nicht geladen werden.");
        }

        const data: FeedComment[] = await res.json();

        if (active) {
          setComments(data);
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    hasLoadedInitiallyRef.current = false;
    loadComments();

    return () => {
      active = false;
    };
  }, [postId]);

  useEffect(() => {
    if (loading) return;

    if (!hasLoadedInitiallyRef.current) {
      hasLoadedInitiallyRef.current = true;
    }

    onCommentsLoaded?.(comments.length);
  }, [comments.length, loading, onCommentsLoaded]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const trimmed = content.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);

    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: trimmed }),
      });

      if (!res.ok) {
        throw new Error("Kommentar konnte nicht gespeichert werden.");
      }

      const newComment: FeedComment = await res.json();

      setComments((prev) => [...prev, newComment]);
      setContent("");
      onCommentCreated();
    } catch (error) {
      console.error(error);
      alert("Kommentar konnte nicht gespeichert werden.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteComment(commentId: number) {
    if (deletingCommentId !== null) return;

    const confirmed = window.confirm("Diesen Kommentar wirklich löschen?");
    if (!confirmed) return;

    setDeletingCommentId(commentId);

    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Kommentar konnte nicht gelöscht werden.");
      }

      setComments((prev) =>
        prev.filter((comment) => comment.id !== commentId)
      );
    } catch (error) {
      console.error(error);
      alert("Kommentar konnte nicht gelöscht werden.");
    } finally {
      setDeletingCommentId(null);
    }
  }

  return (
    <section className="rounded-xl border bg-gray-50 p-4">
      <h3 className="mb-4 text-lg font-medium">Comments ({comments.length})</h3>

      {loading ? (
        <p className="mb-4 text-gray-500">Kommentare werden geladen ...</p>
      ) : comments.length === 0 ? (
        <p className="mb-4 text-gray-500">No comments yet.</p>
      ) : (
        <div className="mb-4 space-y-3">
          {comments.map((comment) => (
            <div key={comment.id} className="rounded-lg bg-white p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-sm font-semibold text-gray-600">
                      {comment.author_avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={comment.author_avatar_url}
                          alt={`${comment.author_username ?? "User"} avatar`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        (comment.author_username ?? "U").charAt(0).toUpperCase()
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {comment.author_username ? (
                          <Link
                            href={`/u/${encodeURIComponent(comment.author_username)}`}
                            className="truncate text-sm font-semibold text-gray-700 hover:underline"
                          >
                            @{comment.author_username}
                          </Link>
                        ) : (
                          <p className="truncate text-sm font-semibold text-gray-700">
                            Unbekannt
                          </p>
                        )}

                        {(comment.author_hall_of_fame_count ?? 0) > 0 && (
                          <span className="rounded-full bg-indigo-100 px-2 py-1 text-[11px] font-medium text-indigo-700">
                            Hall of Fame
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-xs text-gray-400">
                        {formatDate(comment.created_at)}
                      </p>
                    </div>
                  </div>

                  {(comment.author_hall_of_fame_categories?.length ?? 0) > 0 && (
                    <div className="mb-2 flex flex-wrap gap-2">
                      {comment.author_hall_of_fame_categories!.map((category) => (
                        <span
                          key={category}
                          className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-medium text-indigo-700"
                        >
                          {getHallOfFameCategoryLabel(category)}
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="whitespace-pre-wrap break-words text-gray-900">
                    {comment.content}
                  </p>
                </div>

                {comment.can_delete && (
                  <button
                    type="button"
                    onClick={() => handleDeleteComment(comment.id)}
                    disabled={deletingCommentId === comment.id}
                    className="rounded-lg border border-red-300 px-3 py-1 text-sm text-red-600 disabled:opacity-50"
                  >
                    {deletingCommentId === comment.id ? "Deleting..." : "Delete"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write a comment..."
          maxLength={300}
          disabled={submitting}
          className="flex-1 rounded-lg border px-4 py-2 outline-none"
        />
        <button
          type="submit"
          disabled={submitting || !content.trim()}
          className="rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {submitting ? "Sending..." : "Comment"}
        </button>
      </form>
    </section>
  );
}