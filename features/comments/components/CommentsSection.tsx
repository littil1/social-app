"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { FeedComment, ReactionType } from "@/shared/types/feed";
import { useAuthModal } from "@/features/auth/components/AuthModalProvider";
import CommentReportButton from "@/features/comments/components/CommentReportButton";

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

const REACTIONS: Array<{
  value: ReactionType;
  emoji: string;
  countKey: keyof FeedComment["reaction_counts"];
}> = [
  { value: "like", emoji: "❤️", countKey: "like" },
  { value: "funny", emoji: "😂", countKey: "funny" },
  { value: "wow", emoji: "🤯", countKey: "wow" },
  { value: "fire", emoji: "🔥", countKey: "fire" },
];

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
    if (!node) {
      continue;
    }

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
  if (previousReaction === nextReaction) {
    return comment;
  }

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

function markCommentAsDeleted(comment: FeedComment, deletedAt: string) {
  return {
    ...comment,
    content: "",
    deleted_at: deletedAt,
    is_deleted: true,
    can_delete: false,
    reactions_count: 0,
    reaction_counts: {
      like: 0,
      funny: 0,
      wow: 0,
      fire: 0,
    },
    viewer_reaction: null,
  };
}

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

        {isLoggedIn && !node.can_delete && !node.is_deleted && (
          <div className="absolute right-4 top-4">
            <CommentReportButton commentId={node.id} />
          </div>
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
                {node.author_username ? (
                  <Link
                    href={`/u/${encodeURIComponent(node.author_username)}`}
                    className="truncate text-sm font-black text-neutral-950 hover:underline"
                  >
                    @{node.author_username}
                  </Link>
                ) : (
                  <span className="truncate text-sm font-black text-neutral-950">
                    @anonymous
                  </span>
                )}

                {node.author_badges?.[0] && (
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest shadow-sm ${node.author_badges[0].className}`}
                    title={node.author_badges[0].description}
                  >
                    <span aria-hidden="true" className="mr-1">
                      {node.author_badges[0].icon}
                    </span>
                    {node.author_badges[0].label}
                  </span>
                )}
              </div>

              <p className="text-[10px] font-bold uppercase tracking-tighter text-neutral-400">
                {formatDate(node.created_at)}
              </p>
            </div>

            {node.is_deleted ? (
              <p className="whitespace-pre-wrap break-words text-[15px] font-medium italic leading-relaxed text-neutral-400">
                Comment deleted.
              </p>
            ) : (
              <p className="whitespace-pre-wrap break-words text-[15px] font-medium leading-relaxed text-neutral-800">
                {node.content}
              </p>
            )}

            {!node.is_deleted && (
              <div className="mt-5 flex flex-wrap items-center gap-2">
                {REACTIONS.map((reaction) => {
                  const isActive = node.viewer_reaction === reaction.value;

                  return (
                    <button
                      key={reaction.value}
                      type="button"
                      onClick={() =>
                        void onReactionClick(node.id, reaction.value)
                      }
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
            )}

            {!node.is_deleted && replyParentId === node.id && (
              <form
                onSubmit={async (event) => {
                  event.preventDefault();
                  await onReplySubmit(node.id);
                }}
                className="animate-in slide-in-from-top-2 mt-5 flex flex-col gap-2 border-t border-neutral-50 pt-4 duration-300 fade-in"
              >
                <input
                  type="text"
                  autoFocus
                  value={replyContent}
                  onChange={(event) => onReplyContentChange(event.target.value)}
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
  const loadRequestIdRef = useRef(0);

  const effectiveIsLoggedIn = authReady ? isAuthenticated : isLoggedIn;
  const commentTree = useMemo(() => buildCommentTree(comments), [comments]);
  const visibleCommentsCount = useMemo(
    () => comments.filter((comment) => !comment.is_deleted).length,
    [comments]
  );

  async function loadComments(requestPostId: number) {
    const freshUrl = `/api/posts/${requestPostId}/comments?_=${Date.now()}`;
    const res = await fetch(freshUrl, {
      method: "GET",
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    });

    if (!res.ok) {
      throw new Error("Comments request failed.");
    }

    const data: FeedComment[] = await res.json();
    return data;
  }

  async function refreshCommentsForPost(requestPostId: number) {
    const requestId = ++loadRequestIdRef.current;
    const data = await loadComments(requestPostId);

    if (requestId !== loadRequestIdRef.current) {
      return;
    }

    setComments(data);
  }

  useEffect(() => {
    let active = true;

    async function loadCommentsForPost() {
      try {
        setLoading(true);
        const requestId = ++loadRequestIdRef.current;
        const data = await loadComments(postId);

        if (active && requestId === loadRequestIdRef.current) {
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

    void loadCommentsForPost();

    return () => {
      active = false;
      loadRequestIdRef.current += 1;
    };
  }, [postId]);

  useEffect(() => {
    onCommentsLoaded?.(visibleCommentsCount);
  }, [onCommentsLoaded, visibleCommentsCount]);

  async function createComment(textToSubmit?: string) {
    const trimmed = (textToSubmit || content).trim();
    if (!trimmed || submitting) {
      return;
    }

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

      if (!res.ok) {
        throw new Error("Comment creation failed.");
      }

      const newComment: FeedComment = await res.json();

      setComments((prev) => [newComment, ...prev]);
      setContent("");
      onCommentCreated();
    } catch {
      alert("Comment could not be saved.");
    } finally {
      setSubmitting(false);
    }
  }

  async function createReply(parentId: number, textToSubmit?: string) {
    const trimmed = (textToSubmit || replyContent).trim();
    if (!trimmed || replySubmitting) {
      return;
    }

    setReplySubmitting(true);

    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed, parentId }),
      });

      if (res.status === 401 || res.status === 403) {
        requireLoginAndResume(
          () => void createReply(parentId, trimmed),
          pathname
        );
        return;
      }

      if (!res.ok) {
        throw new Error("Reply creation failed.");
      }

      const newComment: FeedComment = await res.json();

      setComments((prev) => [...prev, newComment]);
      setReplyContent("");
      setReplyParentId(null);
      onCommentCreated();
    } catch {
      alert("Reply could not be saved.");
    } finally {
      setReplySubmitting(false);
    }
  }

  async function submitReaction(commentId: number, reaction: ReactionType) {
    if (reactingCommentId !== null) {
      return;
    }

    const existing = comments.find((comment) => comment.id === commentId);
    if (!existing) {
      return;
    }

    const nextReaction =
      existing.viewer_reaction === reaction ? null : reaction;

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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reaction: nextReaction }),
      });

      if (res.status === 401 || res.status === 403) {
        setComments((prev) =>
          prev.map((comment) => (comment.id === commentId ? existing : comment))
        );
        requireLoginAndResume(
          () => void submitReaction(commentId, reaction),
          pathname
        );
        return;
      }

      if (!res.ok) {
        throw new Error("Comment reaction failed.");
      }
    } catch {
      setComments((prev) =>
        prev.map((comment) => (comment.id === commentId ? existing : comment))
      );
    } finally {
      setReactingCommentId(null);
    }
  }

  async function handleDeleteComment(commentId: number) {
    if (!window.confirm("Delete this comment?")) {
      return;
    }

    if (deletingCommentId !== null) {
      return;
    }

    const existing = comments.find((comment) => comment.id === commentId);
    if (!existing || existing.is_deleted) {
      return;
    }

    const previousComments = comments;
    const optimisticDeletedAt = new Date().toISOString();

    setDeletingCommentId(commentId);
    setComments((prev) =>
      prev.map((comment) =>
        comment.id === commentId
          ? markCommentAsDeleted(comment, optimisticDeletedAt)
          : comment
      )
    );

    if (replyParentId === commentId) {
      setReplyParentId(null);
      setReplyContent("");
    }

    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Comment deletion failed.");
      }

      const data: { deletedAt?: string } = await res.json().catch(() => ({}));

      if (data.deletedAt) {
        await refreshCommentsForPost(postId);
      }
    } catch {
      setComments(previousComments);
      alert("Comment could not be deleted.");
    } finally {
      setDeletingCommentId(null);
    }
  }

  return (
    <section className="rounded-[32px] border border-neutral-100 bg-neutral-50/50 p-5 sm:p-8">
      <div className="mb-8 flex items-center justify-between">
        <h3 className="text-xs font-black uppercase tracking-[0.25em] text-neutral-900">
          Comments ({visibleCommentsCount})
        </h3>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();

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
            onChange={(event) => setContent(event.target.value)}
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

