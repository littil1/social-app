"use client";

import Link from "next/link";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import type { FeedPost, ReactionType } from "@/shared/types/feed";
import CommentsSection from "@/features/comments/components/CommentsSection";
import PostReportButton from "@/features/posts/components/PostReportButton";
import PostBoostButton from "@/features/posts/components/PostBoostButton";
import { useAuthModal } from "@/features/auth/components/AuthModalProvider";
import { useRouter } from "next/navigation";
import { scheduleRefresh } from "@/lib/refresh-batcher";
import ConfirmDialog from "@/shared/components/ui/ConfirmDialog";
import FormError from "@/shared/components/ui/FormError";
import { scheduleScrollIntoViewIfNeeded } from "@/shared/lib/scroll-into-view-if-needed";

type PostCardProps = {
  post: FeedPost;
  onReactionUpdated: (
    postId: number,
    nextReaction: ReactionType | null
  ) => void;
  onCommentCreated?: (postId: number) => void;
  onCommentsCountChange?: (postId: number, count: number) => void;
  onPostDeleted: (postId: number) => void;
  onBoosted?: (postId: number, boostCount: number) => void;
  dailyRank?: 1 | 2 | 3;
  detailHref?: string;
  isLoggedIn?: boolean;
  disableRouterRefresh?: boolean;
  initialShowComments?: boolean;
  onMutationCommitted?: () => void;
};

const REACTIONS: Array<{
  value: ReactionType;
  emoji: string;
  label: string;
  countKey: keyof NonNullable<FeedPost["reaction_counts"]>;
}> = [
  { value: "like", emoji: "❤️", label: "Impact", countKey: "like" },
  { value: "funny", emoji: "😂", label: "Funny", countKey: "funny" },
  { value: "wow", emoji: "🤯", label: "Wow", countKey: "wow" },
  { value: "fire", emoji: "🔥", label: "Strong", countKey: "fire" },
];

type OptimisticReactionState = {
  viewerReaction: ReactionType | null;
  reactionCounts: NonNullable<FeedPost["reaction_counts"]>;
};

function getReactionStateFromPost(post: FeedPost): OptimisticReactionState {
  return {
    viewerReaction: post.viewer_reaction,
    reactionCounts: {
      like: post.reaction_counts?.like ?? 0,
      funny: post.reaction_counts?.funny ?? 0,
      wow: post.reaction_counts?.wow ?? 0,
      fire: post.reaction_counts?.fire ?? 0,
    },
  };
}

function applyOptimisticReaction(
  state: OptimisticReactionState,
  nextReaction: ReactionType | null
): OptimisticReactionState {
  const previousReaction = state.viewerReaction;
  if (previousReaction === nextReaction) return state;

  const reactionCounts = { ...state.reactionCounts };

  if (previousReaction) {
    reactionCounts[previousReaction] = Math.max(
      0,
      reactionCounts[previousReaction] - 1
    );
  }

  if (nextReaction) {
    reactionCounts[nextReaction] += 1;
  }

  return {
    viewerReaction: nextReaction,
    reactionCounts,
  };
}

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffInSeconds < 60) return "Just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

function getRankStyles(dailyRank?: 1 | 2 | 3) {
  if (dailyRank === 1)
    return {
      articleClass:
        "border-amber-200 bg-white shadow-[0_8px_30px_rgb(251,191,36,0.08)]",
      badgeClass: "bg-amber-100 text-amber-900 border-amber-200",
      badgeText: "👑 Winner",
      accentClass: "bg-amber-400",
    };
  if (dailyRank === 2)
    return {
      articleClass:
        "border-slate-200 bg-white shadow-[0_8px_30px_rgb(148,163,184,0.06)]",
      badgeClass: "bg-slate-100 text-slate-900 border-slate-200",
      badgeText: "✨ Runner Up",
      accentClass: "bg-slate-400",
    };
  if (dailyRank === 3)
    return {
      articleClass:
        "border-orange-200 bg-white shadow-[0_8px_30px_rgb(251,146,60,0.06)]",
      badgeClass: "bg-orange-100 text-orange-900 border-orange-200",
      badgeText: "🔥 Third",
      accentClass: "bg-orange-400",
    };
  return {
    articleClass: "border-neutral-100 bg-white shadow-sm",
    badgeClass: "hidden",
    badgeText: "",
    accentClass: "hidden",
  };
}

function PostCardComponent({
  post,
  onReactionUpdated,
  onCommentCreated,
  onCommentsCountChange,
  onPostDeleted,
  onBoosted,
  dailyRank,
  detailHref,
  isLoggedIn = false,
  disableRouterRefresh = false,
  initialShowComments = false,
  onMutationCommitted,
}: PostCardProps) {
  const { requireLoginAndResume, isAuthenticated, authReady } =
    useAuthModal();
  const router = useRouter();
  const [reactionLoading, setReactionLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showComments, setShowComments] = useState(initialShowComments);
  const [optimisticReactions, setOptimisticReactions] = useState(() =>
    getReactionStateFromPost(post)
  );
  const [localCommentsCount, setLocalCommentsCount] = useState(
    post.comments_count
  );
  const localCommentsCountRef = useRef(post.comments_count);
  const commentsContainerRef = useRef<HTMLDivElement | null>(null);
  const shouldScrollToCommentsRef = useRef(initialShowComments);

  const effectiveIsLoggedIn = authReady ? isAuthenticated : isLoggedIn;
  const rankStyles = getRankStyles(dailyRank);

  useEffect(() => {
    localCommentsCountRef.current = post.comments_count;
    setLocalCommentsCount(post.comments_count);
  }, [post.comments_count]);

  useEffect(() => {
    setOptimisticReactions(getReactionStateFromPost(post));
  }, [post]);

  useEffect(() => {
    if (!showComments || !shouldScrollToCommentsRef.current) return;

    shouldScrollToCommentsRef.current = false;
    scheduleScrollIntoViewIfNeeded(commentsContainerRef.current);
  }, [showComments]);

  function toggleComments() {
    setShowComments((prev) => {
      const next = !prev;
      if (next) {
        shouldScrollToCommentsRef.current = true;
      }
      return next;
    });
  }

  const handleCommentCreated = useCallback(() => {
    setLocalCommentsCount((prev) => {
      const next = prev + 1;
      localCommentsCountRef.current = next;
      return next;
    });
    onCommentCreated?.(post.id);
    onMutationCommitted?.();
  }, [onCommentCreated, onMutationCommitted, post.id]);

  const handleCommentsLoaded = useCallback(
    (count: number) => {
      if (localCommentsCountRef.current === count) {
        return;
      }

      localCommentsCountRef.current = count;
      setLocalCommentsCount(count);
      onCommentsCountChange?.(post.id, count);
    },
    [onCommentsCountChange, post.id]
  );

  const handleBoosted = useCallback(
    (postId: number, boostCount: number) => {
      onBoosted?.(postId, boostCount);
      onMutationCommitted?.();

      if (!disableRouterRefresh) {
        scheduleRefresh(router);
      }
    },
    [disableRouterRefresh, onBoosted, onMutationCommitted, router]
  );

  async function submitReaction(reaction: ReactionType) {
    if (reactionLoading) return;
    const previousReaction = optimisticReactions.viewerReaction;
    const nextReaction = previousReaction === reaction ? null : reaction;
    const previousOptimisticReactions = optimisticReactions;

    setOptimisticReactions((current) =>
      applyOptimisticReaction(current, nextReaction)
    );
    onReactionUpdated(post.id, nextReaction);
    setReactionLoading(true);

    try {
      const res = await fetch(`/api/posts/${post.id}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reaction: nextReaction }),
      });

      if (res.status === 401 || res.status === 403) {
        setOptimisticReactions(previousOptimisticReactions);
        onReactionUpdated(post.id, previousReaction);
        requireLoginAndResume(
          () => submitReaction(reaction),
          window.location.pathname
        );
        return;
      }

      if (!res.ok) {
        throw new Error("Post reaction failed.");
      }

      onMutationCommitted?.();

      if (!showComments && !disableRouterRefresh) {
        scheduleRefresh(router);
      }
    } catch {
      setOptimisticReactions(previousOptimisticReactions);
      onReactionUpdated(post.id, previousReaction);
    } finally {
      setReactionLoading(false);
    }
  }

  async function handleDeletePost() {
    setDeleteError(null);
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Could not delete this post. Try again.");
      }

      setDeleteConfirmOpen(false);
      onPostDeleted(post.id);
      if (!disableRouterRefresh) {
        router.refresh();
      }
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : "Could not delete this post. Try again."
      );
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <article
      className={`motion-card soft-enter group relative overflow-hidden rounded-[30px] border p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md sm:rounded-[32px] sm:p-6 ${rankStyles.articleClass}`}
    >
      {dailyRank && (
        <div
          className={`absolute inset-y-0 left-0 w-1 ${rankStyles.accentClass}`}
        />
      )}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {dailyRank && (
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest ${rankStyles.badgeClass}`}
            >
              {rankStyles.badgeText}
            </span>
          )}
          <span className="text-[11px] font-bold uppercase tracking-widest text-neutral-400">
            {formatRelativeTime(post.created_at)}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {effectiveIsLoggedIn && !post.can_delete && (
            <PostReportButton postId={post.id} />
          )}
          {post.can_delete && (
            <button
              onClick={() => {
                setDeleteError(null);
                setDeleteConfirmOpen(true);
              }}
              disabled={deleteLoading}
              className="text-[10px] font-black uppercase tracking-widest text-neutral-300 transition hover:text-red-500 disabled:opacity-30"
            >
              {deleteLoading ? "Removing..." : "Delete"}
            </button>
          )}
        </div>
      </div>

      {deleteError && <FormError message={deleteError} className="mb-4" />}

      <div className="mb-5 rounded-[24px] border border-neutral-100/80 bg-neutral-50/45 px-4 py-4 sm:mb-6 sm:px-5 sm:py-5">
        {detailHref ? (
          <Link
            href={detailHref}
            className="block transition-opacity hover:opacity-70"
          >
            <p className="min-h-[3.25rem] whitespace-pre-wrap break-words text-lg font-medium leading-relaxed tracking-tight text-neutral-900 sm:text-xl">
              {post.content}
            </p>
          </Link>
        ) : (
          <p className="min-h-[3.25rem] whitespace-pre-wrap break-words text-lg font-medium leading-relaxed tracking-tight text-neutral-900 sm:text-xl">
            {post.content}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 rounded-[24px] border border-neutral-100 bg-white/70 p-1.5 sm:gap-2">
        {REACTIONS.map((reaction) => {
          const isActive =
            optimisticReactions.viewerReaction === reaction.value;
          const count =
            optimisticReactions.reactionCounts[reaction.countKey] ?? 0;
          return (
            <button
              key={reaction.value}
              onClick={() => submitReaction(reaction.value)}
              disabled={reactionLoading}
              data-active={isActive}
              aria-label={`React with ${reaction.label}, ${count} reactions`}
              className={`motion-reaction inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-bold transition-all sm:px-4 ${isActive ? "bg-neutral-950 text-white shadow-lg" : "bg-neutral-50 text-neutral-500 hover:bg-neutral-100"}`}
            >
              <span>{reaction.emoji}</span>
              <span className={isActive ? "text-white" : "text-neutral-900"}>
                {count}
              </span>
            </button>
          );
        })}
        <button
          onClick={toggleComments}
          aria-label={`${showComments ? "Hide" : "Show"} comments, ${localCommentsCount} comments`}
          className={`motion-button inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-bold transition-all sm:px-4 ${showComments ? "border-neutral-200 bg-neutral-200 text-neutral-900" : "border-neutral-200/70 bg-white text-neutral-500 shadow-sm hover:border-amber-200 hover:bg-amber-50/60 hover:text-neutral-900"}`}
        >
          <span>💬</span>
          <span className="text-neutral-900">{localCommentsCount}</span>
        </button>
        <PostBoostButton
          postId={post.id}
          boostCount={post.boost_count}
          viewerHasBoosted={post.viewer_has_boosted}
          viewerBoostAvailableToday={post.viewer_boost_available_today}
          isTodayPost={post.is_today_post}
          canBoost={post.can_boost}
          isLoggedIn={effectiveIsLoggedIn}
          onBoosted={handleBoosted}
        />
      </div>

      {showComments && (
        <div
          ref={commentsContainerRef}
          className="mt-4 border-t border-neutral-100 pt-4 animate-in fade-in slide-in-from-top-2 duration-300"
        >
          <CommentsSection
            postId={post.id}
            onCommentCreated={handleCommentCreated}
            onCommentsLoaded={handleCommentsLoaded}
            isLoggedIn={effectiveIsLoggedIn}
          />
        </div>
      )}

      {deleteConfirmOpen && (
        <ConfirmDialog
          title="Delete this post?"
          description="This removes the post from APP. This action cannot be undone."
          confirmLabel="Delete post"
          loading={deleteLoading}
          onCancel={() => {
            if (!deleteLoading) setDeleteConfirmOpen(false);
          }}
          onConfirm={() => void handleDeletePost()}
        />
      )}
    </article>
  );
}

const PostCard = memo(PostCardComponent);
export default PostCard;

