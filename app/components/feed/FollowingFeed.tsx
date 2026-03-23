"use client";

import { useState } from "react";
import type { FeedPost } from "@/types/feed";
import PostCard from "@/app/components/feed/PostCard";

type FollowingFeedProps = {
  initialPosts: FeedPost[];
};

export default function FollowingFeed({ initialPosts }: FollowingFeedProps) {
  const [posts, setPosts] = useState<FeedPost[]>(initialPosts);

  function handleLikeUpdated(postId: number, liked: boolean) {
    setPosts((prev) =>
      prev.map((post) => {
        if (post.id !== postId) return post;

        return {
          ...post,
          viewer_has_liked: liked,
          likes_count: liked
            ? post.likes_count + 1
            : Math.max(0, post.likes_count - 1),
        };
      })
    );
  }

  function handleCommentCreated(postId: number) {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? { ...post, comments_count: post.comments_count + 1 }
          : post
      )
    );
  }

  function handlePostDeleted(postId: number) {
    setPosts((prev) => prev.filter((post) => post.id !== postId));
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          onLikeUpdated={handleLikeUpdated}
          onCommentCreated={handleCommentCreated}
          onPostDeleted={handlePostDeleted}
          showAuthor
        />
      ))}
    </div>
  );
}