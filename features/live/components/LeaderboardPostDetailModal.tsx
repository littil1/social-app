"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import PostCard from "@/features/posts/components/PostCard";
import { scheduleRefresh } from "@/lib/refresh-batcher";
import type { FeedPost, ReactionCounts, ReactionType } from "@/shared/types/feed";

type LeaderboardPost = {
  id: number;
  post_content: string;
  post_created_at: string;
  comments_count: number;
  relevance_score: number;
  author_username: string | null;
  author_avatar_url: string | null;
  reactions_count: number;
  boost_count: number;
  viewer_has_boosted: boolean;
  viewer_boost_available_today: boolean;
  is_today_post: boolean;
  can_boost: boolean;
  reaction_counts: ReactionCounts;
  viewer_reaction: ReactionType | null;
  can_delete: boolean;
};

type LeaderboardPostDetailModalProps = {
  post: LeaderboardPost | null;
  isLoggedIn: boolean;
  onClose: () => void;
  onBoosted?: (postId: number, boostCount: number) => void;
};

function toFeedPost(post: LeaderboardPost): FeedPost {
  return {
    id: post.id,
    content: post.post_content,
    created_at: post.post_created_at,
    comments_count: post.comments_count,
    reactions_count: post.reactions_count,
    boost_count: post.boost_count,
    viewer_has_boosted: post.viewer_has_boosted,
    viewer_boost_available_today: post.viewer_boost_available_today,
    is_today_post: post.is_today_post,
    can_boost: post.can_boost,
    reaction_counts: post.reaction_counts,
    viewer_reaction: post.viewer_reaction,
    can_delete: post.can_delete,
    author_username: post.author_username,
    author_avatar_url: post.author_avatar_url,
    relevance_score: post.relevance_score,
  };
}

function applyReactionUpdate(
  post: FeedPost,
  nextReaction: ReactionType | null
): FeedPost {
  const previousReaction = post.viewer_reaction;

  if (previousReaction === nextReaction) {
    return post;
  }

  const reaction_counts = { ...post.reaction_counts };
  let reactions_count = post.reactions_count;

  if (previousReaction) {
    reaction_counts[previousReaction] = Math.max(
      0,
      reaction_counts[previousReaction] - 1
    );
    reactions_count = Math.max(0, reactions_count - 1);
  }

  if (nextReaction) {
    reaction_counts[nextReaction] += 1;
    reactions_count += 1;
  }

  return {
    ...post,
    viewer_reaction: nextReaction,
    reaction_counts,
    reactions_count,
  };
}

function applyBoostUpdate(
  post: FeedPost,
  postId: number,
  boostCount: number
): FeedPost {
  if (!post.is_today_post) {
    return post;
  }

  return {
    ...post,
    boost_count: post.id === postId ? boostCount : post.boost_count,
    viewer_has_boosted: post.id === postId,
    viewer_boost_available_today: false,
    can_boost: post.id === postId,
  };
}

export default function LeaderboardPostDetailModal({
  post,
  isLoggedIn,
  onClose,
  onBoosted,
}: LeaderboardPostDetailModalProps) {
  const router = useRouter();
  const [modalPost, setModalPost] = useState<FeedPost | null>(
    post ? toFeedPost(post) : null
  );

  useEffect(() => {
    if (!post) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, post]);

  useEffect(() => {
    if (!post) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [post]);

  if (typeof document === "undefined" || !post || !modalPost) {
    return null;
  }

  const activePost = post;

  function handleReactionUpdated(
    postId: number,
    nextReaction: ReactionType | null
  ) {
    setModalPost((current) => {
      if (!current || current.id !== postId) return current;
      return applyReactionUpdate(current, nextReaction);
    });
  }

  function handleCommentCreated(postId: number) {
    setModalPost((current) => {
      if (!current || current.id !== postId) return current;

      return {
        ...current,
        comments_count: current.comments_count + 1,
      };
    });
  }

  function handleCommentsCountChange(postId: number, count: number) {
    setModalPost((current) => {
      if (!current || current.id !== postId) return current;

      return {
        ...current,
        comments_count: count,
      };
    });
  }

  function handlePostDeleted(postId: number) {
    if (postId === activePost.id) {
      onClose();
    }
  }

  function handleBoosted(postId: number, boostCount: number) {
    setModalPost((current) =>
      current ? applyBoostUpdate(current, postId, boostCount) : current
    );
    onBoosted?.(postId, boostCount);
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      data-comments-panel-open="true"
      className="fixed inset-0 z-[150] flex items-end justify-center px-3 pb-4 pt-10 sm:items-center sm:p-6"
    >
      <button
        type="button"
        aria-label="Close post detail"
        className="absolute inset-0 z-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
      />
      <div
        className="relative z-10 flex max-h-[calc(100dvh-7rem)] w-full max-w-2xl flex-col overflow-hidden rounded-t-[32px] bg-white shadow-2xl sm:max-h-[calc(100dvh-4rem)] sm:rounded-[32px]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-neutral-100 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-xl font-black tracking-tight text-neutral-950">
              Live discussion
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close post detail"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-xl font-light text-neutral-700 transition hover:bg-neutral-200"
          >
            x
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-5">
          <PostCard
            post={modalPost}
            onReactionUpdated={handleReactionUpdated}
            onCommentCreated={handleCommentCreated}
            onCommentsCountChange={handleCommentsCountChange}
            onPostDeleted={handlePostDeleted}
            onBoosted={handleBoosted}
            isLoggedIn={isLoggedIn}
            disableRouterRefresh
            initialShowComments
            onMutationCommitted={() => scheduleRefresh(router)}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
