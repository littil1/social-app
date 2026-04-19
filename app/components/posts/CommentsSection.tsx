"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { FeedComment, ReactionType } from "@/types/feed";
import { useAuthModal } from "@/app/components/auth/AuthModalProvider";

// =====================================================
// Types & Constants
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
  onReactionClick: (commentId: number, reaction: ReactionType) => Promise<void>;
};

const REACTIONS: Array<{
  value: ReactionType;
  emoji: string;
  label: string;
  countKey: keyof FeedComment["reaction_counts"];
}> = [
  { value: "like", emoji: "❤️", label: "Impact", countKey: "like" },
  { value: "funny", emoji: "😂", label: "Funny", countKey: "funny" },
  { value: "wow", emoji: "🤯", label: "Wow", countKey: "wow" },
  { value: "fire", emoji: "🔥", label: "Strong", countKey: "fire" },
];

// =====================================================
// Helpers
// =====================================================

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function buildCommentTree(comments: FeedComment[]) {
  const nodes = new Map<number, CommentNode>();
  const roots: CommentNode[] = [];

  for (const comment of comments) {
    nodes.set(comment.id, { ...comment, children: [] });
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

function applyReactionUpdate(
  comment: FeedComment,
  nextReaction: ReactionType | null
): FeedComment {
  const previousReaction = comment.viewer_reaction;
  if (previousReaction === nextReaction) return comment;

  const nextReactionCounts = { ...comment.reaction_counts };
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

function getCommentSubtreeIds(comments: FeedComment[], rootId: number) {
  const idsToRemove = new Set<number>([rootId]);
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

// =====================================================
// Comment Item Component
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

  return (
    <div
      className={
        effectiveDepth > 0
          ? "mt-3 border-l-2 border-neutral-100 pl-3 sm:pl-4"
          : "mt-4"
      }
      style={{
        marginLeft: effectiveDepth > 0 ? `${effectiveDepth * 8}px` : undefined,
      }}
    >
      <div className="relative rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm transition-all hover:border-neutral-200 sm:p-5">
        {node.can_delete && (
          <button
            type="button"
            onClick={() => void onDeleteComment(node.id)}
            disabled={deletingCommentId === node.id}
            className="absolute right-4 top-4 text-[10px] font-black uppercase tracking-widest text-neutral-300 transition-colors hover:text-red-500 disabled:opacity-30"
          >
            {deletingCommentId === node.id ? "..." : "Delete"}
          </button>
        )}

        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-100 text-xs font-bold text-neutral-400 shadow-inner">
            {node.author_avatar_url ? (
              <img
                src={node.author_avatar_url}
                alt="avatar"
                className="h-full w-full object-cover"
              />
            ) : (
              (node.author_username ?? "A").charAt(0).toUpperCase()
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-2">
              <div className="flex flex-wrap items-center gap-2 pr-12">
                <Link
                  href={`/u/${encodeURIComponent(node.author_username ?? "")}`}
                  className="truncate text-sm font-black text-neutral-950 hover:underline"
                >
                  @{node.author_username ?? "anonymous"}
                </Link>

                {(node.author_badges ?? []).map((badge) => (
                  <span
                    key={badge.key}
                    className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest shadow-sm ${badge.className}`}
                    title={badge.description}
                  >
                    <span aria-hidden="true" className="mr-1">
                      {badge.icon}
                    </span>
                    {badge.label}
                  </span>
                ))}
              </div>

              <p className="text-[10px] font-bold uppercase tracking-tighter text-neutral-400">
                {formatDate(node.created_at)}
              </p>
            </div>

            <p className="whitespace-pre-wrap break-words text-[15px] font-medium leading-relaxed text-neutral-800">
              {node.content}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              {REACTIONS.map((reaction) => {
                const isActive = node.viewer_reaction === reaction.value;

                return (
                  <button
                    key={reaction.value}
                    type="button"
                    onClick={() => void onReactionClick(node.id, reaction.value)}
                    disabled={reactingCommentId === node.id}
                    className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold transition-all active:scale-90 disabled:opacity-50 ${
                      isActive
                        ? "scale-105 bg-neutral-950 text-white shadow-md"
                        : "bg-neutral-50 text-neutral-500 hover:bg-neutral-100"
                    }`}
                  >
                    <span>{reaction.emoji}</span>
                    <span
                      className={isActive ? "text-white" : "text-neutral-900"}
                    >
                      {node.reaction_counts[reaction.countKey]}
                    </span>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => onReplyOpen(node.id)}
                className="ml-2 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 transition-colors hover:text-neutral-950"
              >
                Reply
              </button>
            </div>

            {replyParentId === node.id && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await onReplySubmit(node.id);
                }}
                className="animate-in slide-in-from-top-2 mt-5 flex flex-col gap-2 border-t border-neutral-50 pt-4 duration-300 fade-in"
              >
                <input
                  type="text"
                  autoFocus
                  value={replyContent}
                  onChange={(e) => onReplyContentChange(e.target.value)}
                  placeholder={`Reply to @${node.author_username ?? "anonymous"}...`}
                  maxLength={200}
                  disabled={replySubmitting}
                  className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-neutral-950 focus:bg-white"
                />

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={onReplyCancel}
                    className="text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:text-neutral-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={replySubmitting || !replyContent.trim()}
                    className="rounded-xl bg-neutral-950 px-5 py-2 text-[10px] font-black uppercase tracking-widest text-white shadow-lg transition-all active:scale-95 disabled:opacity-20"
                  >
                    Send
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {node.children.length > 0 && (
        <div className="space-y-1">
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
// Main Section Component
// =====================================================

export default function CommentsSection({
  postId,
  onCommentCreated,
  onCommentsLoaded,
  isLoggedIn = false,
}: CommentsSectionProps) {
  const { requireLoginAndResume, isAuthenticated, authReady } = useAuthModal();
  const pathname = usePathname();

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

  const effectiveIsLoggedIn = authReady ? isAuthenticated : isLoggedIn;
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

        if (!res.ok) throw new Error();

        const data: FeedComment[] = await res.json();

        if (active) {
          setComments(data);
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadComments();

    return () => {
      active = false;
    };
  }, [postId]);

  useEffect(() => {
    onCommentsLoaded?.(comments.length);
  }, [comments.length, onCommentsLoaded]);

  async function createComment(textToSubmit?: string) {
    const trimmed = (textToSubmit || content).trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);

    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      });

      if (res.status === 401 || res.status === 403) {
        requireLoginAndResume(() => void createComment(trimmed), pathname);
        return;
      }

      if (!res.ok) throw new Error();

      const newComment: FeedComment = await res.json();

      setComments((prev) => [newComment, ...prev]);
      setContent("");
      onCommentCreated();
    } catch {
      alert("Error saving comment.");
    } finally {
      setSubmitting(false);
    }
  }

  async function createReply(parentId: number, textToSubmit?: string) {
    const trimmed = (textToSubmit || replyContent).trim();
    if (!trimmed || replySubmitting) return;

    setReplySubmitting(true);

    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed, parentId }),
      });

      if (res.status === 401 || res.status === 403) {
        requireLoginAndResume(() => void createReply(parentId, trimmed), pathname);
        return;
      }

      if (!res.ok) throw new Error();

      const newComment: FeedComment = await res.json();

      setComments((prev) => [...prev, newComment]);
      setReplyContent("");
      setReplyParentId(null);
      onCommentCreated();
    } catch {
      alert("Error saving reply.");
    } finally {
      setReplySubmitting(false);
    }
  }

  async function submitReaction(commentId: number, reaction: ReactionType) {
    if (reactingCommentId !== null) return;

    const existing = comments.find((c) => c.id === commentId);
    if (!existing) return;

    const nextReaction = existing.viewer_reaction === reaction ? null : reaction;

    setReactingCommentId(commentId);
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId ? applyReactionUpdate(c, nextReaction) : c
      )
    );

    try {
      const res = await fetch(`/api/comments/${commentId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reaction: nextReaction }),
      });

      if (res.status === 401 || res.status === 403) {
        setComments((prev) =>
          prev.map((c) => (c.id === commentId ? existing : c))
        );
        requireLoginAndResume(
          () => void submitReaction(commentId, reaction),
          pathname
        );
        return;
      }

      if (!res.ok) {
        throw new Error();
      }
    } catch {
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? existing : c))
      );
    } finally {
      setReactingCommentId(null);
    }
  }

  async function handleDeleteComment(commentId: number) {
    if (!window.confirm("Delete this comment?")) return;
    if (deletingCommentId !== null) return;

    const previousComments = comments;
    const idsToRemove = getCommentSubtreeIds(previousComments, commentId);

    setDeletingCommentId(commentId);
    setComments((prev) =>
      prev.filter((comment) => !idsToRemove.has(comment.id))
    );

    if (replyParentId !== null && idsToRemove.has(replyParentId)) {
      setReplyParentId(null);
      setReplyContent("");
    }

    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error();
      }

      onCommentCreated();
    } catch {
      setComments(previousComments);
      alert("Error deleting comment.");
    } finally {
      setDeletingCommentId(null);
    }
  }

  return (
    <section className="rounded-[32px] border border-neutral-100 bg-neutral-50/50 p-5 sm:p-8">
      <div className="mb-8 flex items-center justify-between">
        <h3 className="text-xs font-black uppercase tracking-[0.25em] text-neutral-900">
          Comments ({comments.length})
        </h3>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();

          if (!effectiveIsLoggedIn) {
            requireLoginAndResume(() => void createComment(content), pathname);
          } else {
            void createComment();
          }
        }}
        className="mb-10"
      >
        <div className="group relative">
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share a thought..."
            maxLength={200}
            disabled={submitting}
            className="w-full rounded-2xl border border-neutral-200 bg-white py-5 pl-6 pr-32 text-[15px] font-medium outline-none transition-all shadow-sm group-hover:border-neutral-300 focus:border-neutral-950"
          />
          <button
            type="submit"
            disabled={submitting || !content.trim()}
            className="absolute right-2.5 top-2.5 rounded-xl bg-neutral-950 px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-white shadow-lg transition-all active:scale-95 disabled:opacity-20"
          >
            {submitting ? "..." : "Post"}
          </button>
        </div>

        <p className="mt-3 text-right text-[10px] font-bold uppercase tracking-widest text-neutral-400">
          {200 - content.length} chars left
        </p>
      </form>

      {loading ? (
        <div className="animate-pulse py-16 text-center text-[10px] font-black uppercase tracking-[0.3em] text-neutral-300">
          Loading comments...
        </div>
      ) : comments.length === 0 ? (
        <div className="py-16 text-center text-[10px] font-black uppercase tracking-[0.3em] text-neutral-300">
          No comments yet.
        </div>
      ) : (
        <div className="space-y-2">
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
              onReplyOpen={(id) => {
                setReplyParentId(id);
                setReplyContent("");
              }}
              onReplyCancel={() => {
                setReplyParentId(null);
                setReplyContent("");
              }}
              onReplyContentChange={setReplyContent}
              onReplySubmit={(id) => createReply(id)}
              onDeleteComment={handleDeleteComment}
              onReactionClick={submitReaction}
            />
          ))}
        </div>
      )}
    </section>
  );
}