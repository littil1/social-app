"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PostCard from "@/app/components/posts/PostCard";
import type { FeedPost, ReactionType } from "@/types/feed";

type SinglePostViewProps = {
  initialPost: FeedPost;
};

// =====================================================
// Helpers
// =====================================================

function applyReactionUpdate(
  post: FeedPost,
  nextReaction: ReactionType | null
): FeedPost {
  const previousReaction = post.viewer_reaction;

  if (previousReaction === nextReaction) {
    return post;
  }

  const nextReactionCounts = {
    ...post.reaction_counts,
  };

  let nextReactionsCount = post.reactions_count;

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
    ...post,
    viewer_reaction: nextReaction,
    reaction_counts: nextReactionCounts,
    reactions_count: nextReactionsCount,
  };
}

// =====================================================
// Component
// =====================================================

export default function SinglePostView({
  initialPost,
}: SinglePostViewProps) {
  // =====================================================
  // State
  // =====================================================

  const [post, setPost] = useState<FeedPost>(initialPost);

  const router = useRouter();

  // =====================================================
  // Actions
  // =====================================================

  function handleReactionUpdated(
    postId: number,
    nextReaction: ReactionType | null
  ) {
    setPost((prev) => {
      if (prev.id !== postId) return prev;
      return applyReactionUpdate(prev, nextReaction);
    });
  }

  function handleCommentCreated(postId: number) {
    setPost((prev) => {
      if (prev.id !== postId) return prev;

      return {
        ...prev,
        comments_count: prev.comments_count + 1,
      };
    });
  }

  function handlePostDeleted(postId: number) {
    if (postId !== post.id) return;
    router.push("/");
    router.refresh();
  }

  // =====================================================
  // Render
  // =====================================================

  return (
    <PostCard
      post={post}
      onReactionUpdated={handleReactionUpdated}
      onCommentCreated={handleCommentCreated}
      onPostDeleted={handlePostDeleted}
      showAuthor
    />
  );
}