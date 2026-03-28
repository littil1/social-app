"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PostCard from "@/app/components/posts/PostCard";
import type { FeedPost } from "@/types/feed";

type SinglePostViewProps = {
  initialPost: FeedPost;
};

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

  function handleLikeUpdated(postId: number, liked: boolean) {
    setPost((prev) => {
      if (prev.id !== postId) return prev;

      return {
        ...prev,
        viewer_has_liked: liked,
        likes_count: liked
          ? prev.likes_count + 1
          : Math.max(0, prev.likes_count - 1),
      };
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
      showAuthor
      detailHref={`/posts/${post.id}`}
      onLikeUpdated={handleLikeUpdated}
      onCommentCreated={handleCommentCreated}
      onPostDeleted={handlePostDeleted}
    />
  );
}