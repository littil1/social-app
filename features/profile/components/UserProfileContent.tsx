"use client";

import { useCallback, useState } from "react";
import type { FeedPost, ReactionType } from "@/shared/types/feed";
import PostCard from "@/features/posts/components/PostCard";
import {
  applyOptimisticPostBoost,
  applyOptimisticPostReaction,
} from "@/shared/lib/optimistic-post";

type Props = {
  initialPosts: FeedPost[];
};

export default function UserProfileContent({
  initialPosts,
}: Props) {
  const [posts, setPosts] = useState<FeedPost[]>(() =>
    initialPosts.filter((post) => post.moderation_status !== "removed")
  );

  const handleReactionUpdated = useCallback(
    (postId: number, nextReaction: ReactionType | null) => {
      setPosts((prev) =>
        prev.map((post) => {
          if (post.id !== postId) {
            return post;
          }

          return applyOptimisticPostReaction(post, nextReaction);
        })
      );
    },
    []
  );

  const handleCommentsCountChange = useCallback(
    (postId: number, count: number) => {
      setPosts((prev) => {
        let changed = false;

        const nextPosts = prev.map((post) => {
          if (post.id !== postId) {
            return post;
          }

          if (post.comments_count === count) {
            return post;
          }

          changed = true;
          return {
            ...post,
            comments_count: count,
            relevance_score:
              typeof post.relevance_score === "number"
                ? Math.max(
                    0,
                    post.relevance_score + (count - post.comments_count) * 2
                  )
                : post.relevance_score,
          };
        });

        return changed ? nextPosts : prev;
      });
    },
    []
  );

  const handlePostDeleted = useCallback((postId: number) => {
    setPosts((prev) => prev.filter((post) => post.id !== postId));
  }, []);

  const handleBoosted = useCallback((postId: number, boostCount: number) => {
    setPosts((prev) =>
      prev.map((post) => applyOptimisticPostBoost(post, postId, boostCount))
    );
  }, []);

  return (
    <section className="space-y-4">
      {posts
        .filter((post) => post.moderation_status !== "removed")
        .map((post) => (
        <PostCard
          key={post.id}
          post={post}
          onReactionUpdated={handleReactionUpdated}
          onCommentsCountChange={handleCommentsCountChange}
          onPostDeleted={handlePostDeleted}
          onBoosted={handleBoosted}
        />
      ))}

      {posts.length === 0 && (
        <div className="rounded-xl border bg-white p-6 text-center text-gray-500 shadow-sm">
          No posts yet.
        </div>
      )}
    </section>
  );
}


