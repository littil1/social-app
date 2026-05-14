"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PostCard from "@/features/posts/components/PostCard";
import type { FeedPost, ReactionType } from "@/shared/types/feed";
import {
  applyOptimisticPostBoost,
  applyOptimisticPostReaction,
} from "@/shared/lib/optimistic-post";

type SinglePostViewProps = {
  initialPost: FeedPost;
};

// =====================================================
// Helpers
// =====================================================

// =====================================================
// Component
// =====================================================

export default function SinglePostView({
  initialPost,
}: SinglePostViewProps) {
  // =====================================================
  // State
  // =====================================================

  const [post, setPost] = useState<FeedPost | null>(initialPost);

  const router = useRouter();

  // =====================================================
  // Actions
  // =====================================================

  function handleReactionUpdated(
    postId: number,
    nextReaction: ReactionType | null
  ) {
    setPost((prev) => {
      if (!prev || prev.id !== postId) return prev;
      return applyOptimisticPostReaction(prev, nextReaction);
    });
  }

  function handleCommentCreated(postId: number) {
    setPost((prev) => {
      if (!prev || prev.id !== postId) return prev;

      return {
        ...prev,
        comments_count: prev.comments_count + 1,
        relevance_score:
          typeof prev.relevance_score === "number"
            ? prev.relevance_score + 2
            : prev.relevance_score,
      };
    });
  }

  function handlePostDeleted(postId: number) {
    if (postId !== post?.id) return;
    setPost(null);
    router.push("/live");
    router.refresh();
  }

  function handleBoosted(postId: number, boostCount: number) {
    setPost((prev) =>
      prev ? applyOptimisticPostBoost(prev, postId, boostCount) : prev
    );
    router.refresh();
  }

  // =====================================================
  // Render
  // =====================================================

  if (!post) {
    return null;
  }

  return (
    <PostCard
      post={post}
      onReactionUpdated={handleReactionUpdated}
      onCommentCreated={handleCommentCreated}
      onPostDeleted={handlePostDeleted}
      onBoosted={handleBoosted}
    />
  );
}

