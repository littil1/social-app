"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { FeedComment } from "@/types/feed";

type CommentsSectionProps = {
  postId: number;
  onCommentCreated: () => void;
  onCommentsLoaded?: (count: number) => void;
  onCommentDeleted?: () => void;
};

type CommentNode = FeedComment & {
  children: CommentNode[];
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

function buildCommentTree(comments: FeedComment[]) {
  const nodes = new Map<number, CommentNode>();
  const roots: CommentNode[] = [];

  for (const comment of comments) {
    nodes.set(comment.id, {
      ...comment,
      children: [],
    });
  }

  for (const comment of comments) {
    const node = nodes.get(comment.id);
    if (!node) continue;

    if (comment.parent_id === null) {
      roots.push(node);
      continue;
    }

    const parentNode = nodes.get(comment.parent_id);

    if (!parentNode) {
      roots.push(node);
      continue;
    }

    parentNode.children.push(node);
  }

  return roots;
}

function collectCommentIdsToRemove(
  commentId: number,
  comments: FeedComment[]
): Set<number> {
  const idsToRemove = new Set<number>([commentId]);
  let changed = true;

  while (changed) {
    changed = false;

    for (const comment of comments) {
      if (
        comment.parent_id !== null &&
        idsToRemove.has(comment.parent_id) &&
        !idsToRemove.has(comment.id)
      ) {
        idsToRemove.add(comment.id);
        changed = true;
      }
    }
  }

  return idsToRemove;
}

type CommentItemProps = {
  node: CommentNode;
  depth: number;
  deletingCommentId: number | null;
  likingCommentId: number | null;
  replyParentId: number | null;
  replyContent: string;
  replySubmitting: boolean;
  onReplyOpen: (commentId: number) => void;
  onReplyCancel: () => void;
  onReplyContentChange: (value: string) => void;
  onReplySubmit: (parentId: number) => Promise<void>;
  onDeleteComment: (commentId: number) => Promise<void>;
  onToggleLike: (commentId: number) => Promise<void>;
};

function CommentItem({
  node,
  depth,
  deletingCommentId,
  likingCommentId,
  replyParentId,
  replyContent,
  replySubmitting,
  onReplyOpen,
  onReplyCancel,
  onReplyContentChange,
  onReplySubmit,
  onDeleteComment,
  onToggleLike,
}: CommentItemProps) {
  const maxIndentLevel = 6;
  const effectiveDepth = Math.min(depth, maxIndentLevel);

  return (
    <div
      className={effectiveDepth > 0 ? "border-l border-gray-200 pl-4" : ""}
      style={{
        marginLeft: effectiveDepth > 0 ? `${effectiveDepth * 12}px` : undefined,
      }}
    >
      <div className="rounded-lg bg-white p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-sm font-semibold text-gray-600">
                {node.author_avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={node.author_avatar_url}
                    alt={`${node.author_username ?? "User"} avatar`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  (node.author_username ?? "U").charAt(0).toUpperCase()
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {node.author_username ? (
                    <Link
                      href={`/u/${encodeURIComponent(node.author_username)}`}
                      className="truncate text-sm font-semibold text-gray-700 hover:underline"
                    >
                      @{node.author_username}
                    </Link>
                  ) : (
                    <p className="truncate text-sm font-semibold text-gray-700">
                      Unbekannt
                    </p>
                  )}

                  {(node.author_hall_of_fame_count ?? 0) > 0 && (
                    <span className="rounded-full bg-indigo-100 px-2 py-1 text-[11px] font-medium text-indigo-700">
                      Hall of Fame
                    </span>
                  )}
                </div>

                <p className="mt-1 text-xs text-gray-400">
                  {formatDate(node.created_at)}
                </p>
              </div>
            </div>

            {(node.author_hall_of_fame_categories?.length ?? 0) > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {node.author_hall_of_fame_categories!.map((category) => (
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
              {node.content}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-500">
                {node.likes_count} {node.likes_count === 1 ? "Like" : "Likes"}
              </span>

              <button
                type="button"
                onClick={() => onToggleLike(node.id)}
                disabled={likingCommentId === node.id}
                className="rounded-lg border px-3 py-1 text-sm text-gray-700 disabled:opacity-50"
              >
                {node.viewer_has_liked ? "♥ Liked" : "♡ Like"}
              </button>

              <button
                type="button"
                onClick={() => onReplyOpen(node.id)}
                className="rounded-lg border px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
              >
                Reply
              </button>

              {node.can_delete && (
                <button
                  type="button"
                  onClick={() => onDeleteComment(node.id)}
                  disabled={deletingCommentId === node.id}
                  className="rounded-lg border border-red-300 px-3 py-1 text-sm text-red-600 disabled:opacity-50"
                >
                  {deletingCommentId === node.id ? "Deleting..." : "Delete"}
                </button>
              )}
            </div>

            {replyParentId === node.id && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await onReplySubmit(node.id);
                }}
                className="mt-3 flex flex-col gap-2"
              >
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={replyContent}
                    onChange={(e) => onReplyContentChange(e.target.value)}
                    placeholder={`Reply to @${
                      node.author_username ?? "user"
                    }...`}
                    maxLength={200}
                    disabled={replySubmitting}
                    className="flex-1 rounded-lg border px-4 py-2 outline-none"
                  />

                  <button
                    type="submit"
                    disabled={replySubmitting || !replyContent.trim()}
                    className="rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50"
                  >
                    {replySubmitting ? "Sending..." : "Reply"}
                  </button>

                  <button
                    type="button"
                    onClick={onReplyCancel}
                    disabled={replySubmitting}
                    className="rounded-lg border px-4 py-2 text-gray-700 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>

                <span className="text-right text-xs text-gray-400">
                  {200 - replyContent.length} characters remaining
                </span>
              </form>
            )}
          </div>
        </div>
      </div>

      {node.children.length > 0 && (
        <div className="mt-3 space-y-3">
          {node.children.map((child) => (
            <CommentItem
              key={child.id}
              node={child}
              depth={depth + 1}
              deletingCommentId={deletingCommentId}
              likingCommentId={likingCommentId}
              replyParentId={replyParentId}
              replyContent={replyContent}
              replySubmitting={replySubmitting}
              onReplyOpen={onReplyOpen}
              onReplyCancel={onReplyCancel}
              onReplyContentChange={onReplyContentChange}
              onReplySubmit={onReplySubmit}
              onDeleteComment={onDeleteComment}
              onToggleLike={onToggleLike}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CommentsSection({
  postId,
  onCommentCreated,
  onCommentsLoaded,
  onCommentDeleted,
}: CommentsSectionProps) {
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<number | null>(
    null
  );
  const [likingCommentId, setLikingCommentId] = useState<number | null>(null);
  const [content, setContent] = useState("");
  const [replyParentId, setReplyParentId] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [replySubmitting, setReplySubmitting] = useState(false);

  const hasLoadedInitiallyRef = useRef(false);

  const commentTree = useMemo(() => buildCommentTree(comments), [comments]);

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

  async function handleReplySubmit(parentId: number) {
    const trimmed = replyContent.trim();
    if (!trimmed || replySubmitting) return;

    setReplySubmitting(true);

    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: trimmed,
          parentId,
        }),
      });

      if (!res.ok) {
        throw new Error("Antwort konnte nicht gespeichert werden.");
      }

      const newComment: FeedComment = await res.json();

      setComments((prev) => [...prev, newComment]);
      setReplyContent("");
      setReplyParentId(null);
      onCommentCreated();
    } catch (error) {
      console.error(error);
      alert("Antwort konnte nicht gespeichert werden.");
    } finally {
      setReplySubmitting(false);
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

      const idsToRemove = collectCommentIdsToRemove(commentId, comments);

      setComments((prev) =>
        prev.filter((comment) => !idsToRemove.has(comment.id))
      );

      if (replyParentId !== null && idsToRemove.has(replyParentId)) {
        setReplyParentId(null);
        setReplyContent("");
      }

      onCommentDeleted?.();
    } catch (error) {
      console.error(error);
      alert("Kommentar konnte nicht gelöscht werden.");
    } finally {
      setDeletingCommentId(null);
    }
  }

  async function handleToggleLike(commentId: number) {
    if (likingCommentId !== null) return;

    const existingComment = comments.find((comment) => comment.id === commentId);
    if (!existingComment) return;

    const nextLiked = !existingComment.viewer_has_liked;

    setLikingCommentId(commentId);
    setComments((prev) =>
      prev.map((comment) =>
        comment.id === commentId
          ? {
              ...comment,
              viewer_has_liked: nextLiked,
              likes_count: nextLiked
                ? comment.likes_count + 1
                : Math.max(0, comment.likes_count - 1),
            }
          : comment
      )
    );

    try {
      const res = await fetch(`/api/comments/${commentId}/like`, {
        method: "POST",
      });

      if (!res.ok) {
        throw new Error("Kommentar-Like konnte nicht gespeichert werden.");
      }
    } catch (error) {
      console.error(error);

      setComments((prev) =>
        prev.map((comment) =>
          comment.id === commentId
            ? {
                ...comment,
                viewer_has_liked: existingComment.viewer_has_liked,
                likes_count: existingComment.likes_count,
              }
            : comment
        )
      );

      alert("Kommentar-Like konnte nicht gespeichert werden.");
    } finally {
      setLikingCommentId(null);
    }
  }

  function handleReplyOpen(commentId: number) {
    setReplyParentId(commentId);
    setReplyContent("");
  }

  function handleReplyCancel() {
    setReplyParentId(null);
    setReplyContent("");
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
          {commentTree.map((comment) => (
            <CommentItem
              key={comment.id}
              node={comment}
              depth={0}
              deletingCommentId={deletingCommentId}
              likingCommentId={likingCommentId}
              replyParentId={replyParentId}
              replyContent={replyContent}
              replySubmitting={replySubmitting}
              onReplyOpen={handleReplyOpen}
              onReplyCancel={handleReplyCancel}
              onReplyContentChange={setReplyContent}
              onReplySubmit={handleReplySubmit}
              onDeleteComment={handleDeleteComment}
              onToggleLike={handleToggleLike}
            />
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <div className="flex gap-3">
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write a comment..."
            maxLength={200}
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
        </div>

        <span className="text-right text-xs text-gray-400">
          {200 - content.length} characters remaining
        </span>
      </form>
    </section>
  );
}