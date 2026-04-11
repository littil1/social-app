"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { FeedComment, ReactionType } from "@/types/feed";
import { useAuthModal } from "@/app/components/auth/AuthModalProvider";

// =====================================================
// Types
// =====================================================

type CommentsSectionProps = {
  postId: number;
  onCommentCreated: () => void;
  onCommentsLoaded?: (count: number) => void;
  isLoggedIn?: boolean;
};

type CommentNode = FeedComment & {
  children: CommentNode[];
};

type CommentItemProps = {
  node: CommentNode;
  depth: number;
  isLoggedIn: boolean;
  deletingCommentId: number | null;
  reactingCommentId: number | null;
  replyParentId: number | null;
  replyContent: string;
  replySubmitting: boolean;
  onReplyOpen: (commentId: number) => void;
  onReplyCancel: () => void;
  onReplyContentChange: (value: string) => void;
  onReplySubmit: (parentId: number) => Promise<void>;
  onDeleteComment: (commentId: number) => Promise<void>;
  onReactionClick: (
    commentId: number,
    reaction: ReactionType
  ) => Promise<void>;
};

// =====================================================
// Constants
// =====================================================

const REACTIONS: Array<{
  value: ReactionType;
  emoji: string;
  label: string;
  countKey: keyof FeedComment["reaction_counts"];
}> = [
  { value: "like", emoji: "❤️", label: "Gefällt mir", countKey: "like" },
  { value: "funny", emoji: "😂", label: "Lustig", countKey: "funny" },
  { value: "wow", emoji: "🤯", label: "Wow", countKey: "wow" },
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

function applyReactionUpdate(
  comment: FeedComment,
  nextReaction: ReactionType | null
): FeedComment {
  const previousReaction = comment.viewer_reaction;

  if (previousReaction === nextReaction) {
    return comment;
  }

  const nextReactionCounts = {
    ...comment.reaction_counts,
  };

  let nextReactionsCount = comment.reactions_count;

  if (previousReaction) {
    nextReactionCounts[previousReaction] = Math.max(
      0,
      nextReactionCounts[previousReaction] - 1
    );
    nextReactionsCount = Math.max(0, nextReactionsCount - 1);
  }

  if (nextReaction) {
    nextReactionCounts[nextReaction] += 1;
    nextReactionsCount += 1;
  }

  return {
    ...comment,
    viewer_reaction: nextReaction,
    reaction_counts: nextReactionCounts,
    reactions_count: nextReactionsCount,
  };
}

function getResumePath() {
  if (typeof window === "undefined") return "/";
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

// =====================================================
// Comment Item
// =====================================================

function CommentItem({
  node,
  depth,
  isLoggedIn,
  deletingCommentId,
  reactingCommentId,
  replyParentId,
  replyContent,
  replySubmitting,
  onReplyOpen,
  onReplyCancel,
  onReplyContentChange,
  onReplySubmit,
  onDeleteComment,
  onReactionClick,
}: CommentItemProps) {
  const maxIndentLevel = 4;
  const effectiveDepth = Math.min(depth, maxIndentLevel);
  const hallOfFameCategories = node.author_hall_of_fame_categories ?? [];

  return (
    <div
      className={effectiveDepth > 0 ? "border-l border-gray-200 pl-3 sm:pl-4" : ""}
      style={{
        marginLeft: effectiveDepth > 0 ? `${effectiveDepth * 10}px` : undefined,
      }}
    >
      <div className="rounded-xl border border-gray-200 bg-white p-3 sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-sm font-semibold text-gray-600">
                {node.author_avatar_url ? (
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
                      Unbekannter Nutzer
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

            {hallOfFameCategories.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {hallOfFameCategories.map((category) => (
                  <span
                    key={category}
                    className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-medium text-indigo-700"
                  >
                    {getHallOfFameCategoryLabel(category)}
                  </span>
                ))}
              </div>
            )}

            <p className="whitespace-pre-wrap break-words text-sm text-gray-900 sm:text-[15px]">
              {node.content}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {REACTIONS.map((reaction) => {
                const isActive = node.viewer_reaction === reaction.value;

                return (
                  <button
                    key={reaction.value}
                    type="button"
                    onClick={() => void onReactionClick(node.id, reaction.value)}
                    disabled={reactingCommentId === node.id}
                    className={`rounded-full px-3 py-1.5 text-sm transition disabled:opacity-50 ${
                      isActive
                        ? "border border-amber-200 bg-amber-50 text-amber-800 ring-1 ring-amber-200"
                        : "bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-100"
                    }`}
                    aria-pressed={isActive}
                    title={reaction.label}
                  >
                    <span className="mr-1">{reaction.emoji}</span>
                    {node.reaction_counts[reaction.countKey]}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => onReplyOpen(node.id)}
                className="rounded-full bg-white px-3 py-1.5 text-sm text-gray-700 ring-1 ring-gray-200 transition hover:bg-gray-100"
              >
                Antworten
              </button>

              {node.can_delete && (
                <button
                  type="button"
                  onClick={() => void onDeleteComment(node.id)}
                  disabled={deletingCommentId === node.id}
                  className="rounded-full border border-red-300 bg-white px-3 py-1.5 text-sm text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                >
                  {deletingCommentId === node.id ? "Lösche..." : "Löschen"}
                </button>
              )}
            </div>

            {replyParentId === node.id && isLoggedIn && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await onReplySubmit(node.id);
                }}
                className="mt-3 flex flex-col gap-2"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                  <input
                    type="text"
                    value={replyContent}
                    onChange={(e) => onReplyContentChange(e.target.value)}
                    placeholder={`Antwort an @${
                      node.author_username ?? "user"
                    } ...`}
                    maxLength={200}
                    disabled={replySubmitting}
                    className="flex-1 rounded-xl border border-gray-300 px-4 py-2 outline-none"
                  />

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={replySubmitting || !replyContent.trim()}
                      className="rounded-xl bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
                    >
                      {replySubmitting ? "Sende..." : "Antworten"}
                    </button>

                    <button
                      type="button"
                      onClick={onReplyCancel}
                      disabled={replySubmitting}
                      className="rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-700 disabled:opacity-50"
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>

                <span className="text-right text-xs text-gray-400">
                  {200 - replyContent.length} Zeichen übrig
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
              isLoggedIn={isLoggedIn}
              deletingCommentId={deletingCommentId}
              reactingCommentId={reactingCommentId}
              replyParentId={replyParentId}
              replyContent={replyContent}
              replySubmitting={replySubmitting}
              onReplyOpen={onReplyOpen}
              onReplyCancel={onReplyCancel}
              onReplyContentChange={onReplyContentChange}
              onReplySubmit={onReplySubmit}
              onDeleteComment={onDeleteComment}
              onReactionClick={onReactionClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// =====================================================
// Component
// =====================================================

export default function CommentsSection({
  postId,
  onCommentCreated,
  onCommentsLoaded,
  isLoggedIn = false,
}: CommentsSectionProps) {
  // =====================================================
  // Hooks
  // =====================================================

  const { requireLoginAndResume, isAuthenticated, authReady } = useAuthModal();

  // =====================================================
  // State
  // =====================================================

  const [comments, setComments] = useState<FeedComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<number | null>(
    null
  );
  const [reactingCommentId, setReactingCommentId] = useState<number | null>(
    null
  );
  const [content, setContent] = useState("");
  const [replyParentId, setReplyParentId] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [replySubmitting, setReplySubmitting] = useState(false);

  // =====================================================
  // Derived Values
  // =====================================================

  const effectiveIsLoggedIn = authReady ? isAuthenticated : isLoggedIn;
  const commentTree = useMemo(() => buildCommentTree(comments), [comments]);

  // =====================================================
  // Effects
  // =====================================================

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

    void loadComments();

    return () => {
      active = false;
    };
  }, [postId]);

  useEffect(() => {
    if (loading) return;
    onCommentsLoaded?.(comments.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comments.length, loading]);

  useEffect(() => {
    if (!effectiveIsLoggedIn && replyParentId !== null) {
      setReplyParentId(null);
      setReplyContent("");
    }
  }, [effectiveIsLoggedIn, replyParentId]);

  // =====================================================
  // Actions
  // =====================================================

  async function createComment() {
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

      if (res.status === 401 || res.status === 403) {
        requireLoginAndResume(() => {
          void createComment();
        }, getResumePath());
        return;
      }

      if (!res.ok) {
        throw new Error("Kommentar konnte nicht gespeichert werden.");
      }

      const newComment: FeedComment = await res.json();

      setComments((prev) => [newComment, ...prev]);
      setContent("");
      onCommentCreated();
    } catch (error) {
      console.error(error);
      alert("Kommentar konnte nicht gespeichert werden.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!effectiveIsLoggedIn) {
      requireLoginAndResume(() => {
        void createComment();
      }, getResumePath());
      return;
    }

    await createComment();
  }

  function openReply(commentId: number) {
    setReplyParentId(commentId);
    setReplyContent("");
  }

  function handleReplyOpen(commentId: number) {
    if (!effectiveIsLoggedIn) {
      requireLoginAndResume(() => {
        openReply(commentId);
      }, getResumePath());
      return;
    }

    openReply(commentId);
  }

  async function createReply(parentId: number) {
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

      if (res.status === 401 || res.status === 403) {
        requireLoginAndResume(() => {
          void createReply(parentId);
        }, getResumePath());
        return;
      }

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

  async function handleReplySubmit(parentId: number) {
    if (!effectiveIsLoggedIn) {
      requireLoginAndResume(() => {
        void createReply(parentId);
      }, getResumePath());
      return;
    }

    await createReply(parentId);
  }

  async function deleteComment(commentId: number) {
    if (deletingCommentId !== null) return;

    setDeletingCommentId(commentId);

    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: "DELETE",
      });

      if (res.status === 401 || res.status === 403) {
        requireLoginAndResume(() => {
          void deleteComment(commentId);
        }, getResumePath());
        return;
      }

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
    } catch (error) {
      console.error(error);
      alert("Kommentar konnte nicht gelöscht werden.");
    } finally {
      setDeletingCommentId(null);
    }
  }

  async function handleDeleteComment(commentId: number) {
    if (deletingCommentId !== null) return;

    if (!effectiveIsLoggedIn) {
      requireLoginAndResume(() => {
        void handleDeleteComment(commentId);
      }, getResumePath());
      return;
    }

    const confirmed = window.confirm("Diesen Kommentar wirklich löschen?");
    if (!confirmed) return;

    await deleteComment(commentId);
  }

  async function submitReaction(commentId: number, reaction: ReactionType) {
    if (reactingCommentId !== null) return;

    const existingComment = comments.find((comment) => comment.id === commentId);
    if (!existingComment) return;

    const previousReaction = existingComment.viewer_reaction;
    const nextReaction = previousReaction === reaction ? null : reaction;

    setReactingCommentId(commentId);
    setComments((prev) =>
      prev.map((comment) =>
        comment.id === commentId
          ? applyReactionUpdate(comment, nextReaction)
          : comment
      )
    );

    try {
      const res = await fetch(`/api/comments/${commentId}/like`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reaction: nextReaction }),
      });

      if (res.status === 401 || res.status === 403) {
        setComments((prev) =>
          prev.map((comment) =>
            comment.id === commentId
              ? {
                  ...comment,
                  viewer_reaction: existingComment.viewer_reaction,
                  reaction_counts: { ...existingComment.reaction_counts },
                  reactions_count: existingComment.reactions_count,
                }
              : comment
          )
        );

        requireLoginAndResume(() => {
          void submitReaction(commentId, reaction);
        }, getResumePath());

        return;
      }

      if (!res.ok) {
        throw new Error("Kommentar-Reaktion konnte nicht gespeichert werden.");
      }

      const data = (await res.json()) as {
        success: boolean;
        reaction: ReactionType | null;
      };

      setComments((prev) =>
        prev.map((comment) =>
          comment.id === commentId
            ? applyReactionUpdate(comment, data.reaction)
            : comment
        )
      );
    } catch (error) {
      console.error(error);

      setComments((prev) =>
        prev.map((comment) =>
          comment.id === commentId
            ? {
                ...comment,
                viewer_reaction: existingComment.viewer_reaction,
                reaction_counts: { ...existingComment.reaction_counts },
                reactions_count: existingComment.reactions_count,
              }
            : comment
        )
      );

      alert("Kommentar-Reaktion konnte nicht gespeichert werden.");
    } finally {
      setReactingCommentId(null);
    }
  }

  async function handleReactionClick(
    commentId: number,
    reaction: ReactionType
  ) {
    if (!effectiveIsLoggedIn) {
      requireLoginAndResume(() => {
        void submitReaction(commentId, reaction);
      }, getResumePath());
      return;
    }

    await submitReaction(commentId, reaction);
  }

  function handleReplyCancel() {
    setReplyParentId(null);
    setReplyContent("");
  }

  // =====================================================
  // Render
  // =====================================================

  return (
    <section className="rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-base font-medium text-gray-900">
          Kommentare ({comments.length})
        </h3>
      </div>

      <form onSubmit={handleSubmit} className="mb-4 flex flex-col gap-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Kommentar schreiben ..."
            maxLength={200}
            disabled={submitting}
            className="flex-1 rounded-xl border border-gray-300 px-4 py-2 outline-none"
          />

          <button
            type="submit"
            disabled={submitting || !content.trim()}
            className="rounded-xl bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {submitting ? "Sende..." : "Kommentieren"}
          </button>
        </div>

        <span className="text-right text-xs text-gray-400">
          {200 - content.length} Zeichen übrig
        </span>
      </form>

      {loading ? (
        <p className="mb-4 text-sm text-gray-500">Kommentare werden geladen ...</p>
      ) : comments.length === 0 ? (
        <p className="mb-4 text-sm text-gray-500">
          Sei der Erste, der kommentiert.
        </p>
      ) : (
        <div className="space-y-3">
          {commentTree.map((comment) => (
            <CommentItem
              key={comment.id}
              node={comment}
              depth={0}
              isLoggedIn={effectiveIsLoggedIn}
              deletingCommentId={deletingCommentId}
              reactingCommentId={reactingCommentId}
              replyParentId={replyParentId}
              replyContent={replyContent}
              replySubmitting={replySubmitting}
              onReplyOpen={handleReplyOpen}
              onReplyCancel={handleReplyCancel}
              onReplyContentChange={setReplyContent}
              onReplySubmit={handleReplySubmit}
              onDeleteComment={handleDeleteComment}
              onReactionClick={handleReactionClick}
            />
          ))}
        </div>
      )}
    </section>
  );
}