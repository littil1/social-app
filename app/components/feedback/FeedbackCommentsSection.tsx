"use client";

import Link from "next/link";
import { useRef, useState, useMemo, useEffect, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthModal } from "@/app/components/auth/AuthModalProvider";
import {
  addFeatureRequestComment,
  deleteFeatureRequestComment,
} from "@/app/actions/feedback";
import type { FeedbackComment } from "@/lib/feedback-data";

type FeedbackCommentsSectionProps = {
  requestId: number;
  comments: FeedbackComment[];
  currentUserId: string | null;
  currentUserIsAdmin: boolean;
};

type ReactionValue = "like" | "funny" | "wow" | "fire";

type CommentNode = FeedbackComment & {
  children: CommentNode[];
  author_hall_of_fame_count?: number;
  is_legend?: boolean;
};

const REACTIONS: Array<{
  label: string;
  emoji: string;
  value: ReactionValue;
}> = [
  { label: "Impact", emoji: "❤️", value: "like" },
  { label: "Funny", emoji: "😂", value: "funny" },
  { label: "Wow", emoji: "🤯", value: "wow" },
  { label: "Strong", emoji: "🔥", value: "fire" },
];

function getCommentSignature(comments: FeedbackComment[]) {
  return JSON.stringify(
    comments.map((comment) => ({
      id: comment.id,
      parent_id: comment.parent_id ?? null,
      viewer_reaction: comment.viewer_reaction ?? null,
      reaction_counts: comment.reaction_counts,
      content: comment.content,
    }))
  );
}

function getCommentSubtreeIds(comments: FeedbackComment[], rootId: number) {
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

function buildCommentTree(comments: FeedbackComment[]) {
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

    if (comment.parent_id !== null) {
      const parentNode = nodes.get(comment.parent_id);

      if (parentNode) {
        parentNode.children.push(node);
        continue;
      }
    }

    roots.push(node);
  }

  return roots;
}

export default function FeedbackCommentsSection({
  requestId,
  comments: serverComments,
  currentUserId,
  currentUserIsAdmin,
}: FeedbackCommentsSectionProps) {
  const { requireLoginAndResume } = useAuthModal();
  const pathname = usePathname();
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();

  const [localComments, setLocalComments] =
    useState<FeedbackComment[]>(serverComments);
  const [activeReplyId, setActiveReplyId] = useState<number | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<number | null>(
    null
  );

  const lastServerSignatureRef = useRef(getCommentSignature(serverComments));

  useEffect(() => {
    const nextSignature = getCommentSignature(serverComments);

    if (nextSignature !== lastServerSignatureRef.current) {
      lastServerSignatureRef.current = nextSignature;
      setLocalComments(serverComments);
    }
  }, [serverComments]);

  const commentTree = useMemo(
    () => buildCommentTree(localComments),
    [localComments]
  );

  async function handleReaction(commentId: number, type: ReactionValue) {
    if (!currentUserId) {
      requireLoginAndResume(() => handleReaction(commentId, type), pathname);
      return;
    }

    const previousComments = localComments;

    setLocalComments((prev) =>
      prev.map((comment) => {
        if (comment.id !== commentId) return comment;

        const currentReaction = comment.viewer_reaction ?? null;
        const nextReaction = currentReaction === type ? null : type;

        const reactionCounts: Record<ReactionValue, number> = {
          like: comment.reaction_counts.like ?? 0,
          funny: comment.reaction_counts.funny ?? 0,
          wow: comment.reaction_counts.wow ?? 0,
          fire: comment.reaction_counts.fire ?? 0,
        };

        if (currentReaction) {
          reactionCounts[currentReaction] = Math.max(
            0,
            reactionCounts[currentReaction] - 1
          );
        }

        if (nextReaction) {
          reactionCounts[nextReaction] += 1;
        }

        return {
          ...comment,
          viewer_reaction: nextReaction,
          reaction_counts: reactionCounts,
        };
      })
    );

    try {
      const response = await fetch(`/api/feedback/comments/${commentId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reaction: type }),
      });

      if (!response.ok) {
        throw new Error("Reaction request failed");
      }

      startTransition(() => {
        router.refresh();
      });
    } catch {
      setLocalComments(previousComments);
    }
  }

  async function handleDeleteComment(commentId: number) {
    if (!window.confirm("Delete this comment?")) return;
    if (deletingCommentId !== null) return;

    const previousComments = localComments;
    const idsToRemove = getCommentSubtreeIds(previousComments, commentId);

    setDeletingCommentId(commentId);
    setLocalComments((prev) =>
      prev.filter((comment) => !idsToRemove.has(comment.id))
    );

    if (activeReplyId !== null && idsToRemove.has(activeReplyId)) {
      setActiveReplyId(null);
    }

    try {
      const formData = new FormData();
      formData.set("comment_id", String(commentId));

      await deleteFeatureRequestComment(formData);

      startTransition(() => {
        router.refresh();
      });
    } catch {
      setLocalComments(previousComments);
    } finally {
      setDeletingCommentId(null);
    }
  }

  const renderComment = (node: CommentNode, depth = 0) => {
    const isLegend =
      (node.author_hall_of_fame_count ?? 0) > 0 || !!node.is_legend;
    const canDelete =
      (!!currentUserId && currentUserId === node.user_id) || currentUserIsAdmin;

    const reactionCounts: Record<ReactionValue, number> = {
      like: node.reaction_counts.like ?? 0,
      funny: node.reaction_counts.funny ?? 0,
      wow: node.reaction_counts.wow ?? 0,
      fire: node.reaction_counts.fire ?? 0,
    };

    const card = (
      <div className="group relative rounded-[24px] border border-neutral-100 bg-white p-5 shadow-sm transition-all hover:border-neutral-200">
        {canDelete && (
          <button
            type="button"
            onClick={() => void handleDeleteComment(node.id)}
            disabled={deletingCommentId === node.id}
            className="absolute right-5 top-5 text-[10px] font-black uppercase tracking-widest text-neutral-300 transition-colors hover:text-red-500 disabled:opacity-30"
          >
            {deletingCommentId === node.id ? "..." : "Delete"}
          </button>
        )}

        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-100 text-xs font-bold text-neutral-400">
            {node.avatar_url ? (
              <img
                src={node.avatar_url}
                alt="avatar"
                className="h-full w-full object-cover"
              />
            ) : (
              (node.username ?? "A").charAt(0).toUpperCase()
            )}
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/u/${node.username}`}
              className="text-sm font-black text-neutral-900 hover:underline"
            >
              @{node.username ?? "anonymous"}
            </Link>

            {isLegend && (
              <span className="rounded-full border border-amber-200/50 bg-amber-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-amber-600 shadow-sm">
                Legend
              </span>
            )}
          </div>
        </div>

        <p className="mb-6 pr-10 text-[16px] font-medium leading-relaxed text-neutral-800">
          {node.content}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          {REACTIONS.map((reaction) => {
            const isActive = node.viewer_reaction === reaction.value;

            return (
              <button
                key={reaction.value}
                type="button"
                onClick={() => void handleReaction(node.id, reaction.value)}
                disabled={isRefreshing}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-bold transition-all active:scale-90 ${
                  isActive
                    ? "scale-105 bg-neutral-950 text-white shadow-lg"
                    : "bg-neutral-50 text-neutral-500 hover:bg-neutral-100"
                }`}
              >
                <span>{reaction.emoji}</span>
                <span className={isActive ? "text-white" : "text-neutral-900"}>
                  {reactionCounts[reaction.value]}
                </span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() =>
              setActiveReplyId(activeReplyId === node.id ? null : node.id)
            }
            className="ml-3 text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:text-neutral-950"
          >
            Reply
          </button>
        </div>

        {activeReplyId === node.id && (
          <form
            action={async (fd) => {
              await addFeatureRequestComment(fd);
              setActiveReplyId(null);
              startTransition(() => {
                router.refresh();
              });
            }}
            className="animate-in slide-in-from-top-2 mt-6 border-t border-neutral-50 pt-6 duration-300 fade-in"
          >
            <input type="hidden" name="request_id" value={requestId} />
            <input type="hidden" name="parent_id" value={node.id} />
            <div className="group relative">
              <input
                autoFocus
                name="content"
                placeholder={`Reply to @${node.username}...`}
                required
                className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-5 py-4 text-sm font-medium outline-none transition-all shadow-inner focus:border-neutral-950 focus:bg-white"
              />
              <button
                type="submit"
                className="absolute right-2 top-2 rounded-xl bg-neutral-950 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-white shadow-md"
              >
                Reply
              </button>
            </div>
          </form>
        )}
      </div>
    );

    return (
      <div
        key={node.id}
        className={depth === 0 ? "mt-8" : "mt-4 ml-6 sm:ml-12"}
      >
        {depth > 0 ? (
          <div className="mb-4 border-l-2 border-neutral-100 pl-4 sm:pl-8">
            {card}
          </div>
        ) : (
          card
        )}

        {node.children.length > 0 && (
          <div className="space-y-2">
            {node.children.map((child) => renderComment(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-12">
      <form
        action={async (fd) => {
          await addFeatureRequestComment(fd);
          startTransition(() => {
            router.refresh();
          });
        }}
      >
        <input type="hidden" name="request_id" value={requestId} />
        <div className="group relative">
          <input
            name="content"
            placeholder="Share a thought..."
            required
            disabled={!currentUserId}
            className="w-full rounded-[24px] border border-neutral-200 bg-white py-6 pl-8 pr-40 text-base font-medium outline-none transition-all shadow-sm focus:border-neutral-950"
          />
          <button
            type="submit"
            className="absolute right-3 top-3 rounded-2xl bg-neutral-950 px-8 py-4 text-[11px] font-black uppercase tracking-widest text-white shadow-xl transition-all active:scale-95"
          >
            Post
          </button>
        </div>
      </form>

      <div className="border-t border-neutral-100 pt-8">
        <div className="mb-6 px-2">
          <span className="text-[11px] font-black uppercase tracking-[0.3em] text-neutral-400">
            Discussion ({localComments.length})
          </span>
        </div>

        <div className="space-y-4">
          {commentTree.map((node) => renderComment(node))}

          {localComments.length === 0 && (
            <div className="py-20 text-center">
              <span className="text-[11px] font-black uppercase tracking-[0.4em] text-neutral-200">
                No thoughts yet.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}