"use client";

import { useCallback, useState } from "react";
import type { FeedPost, ReactionType } from "@/shared/types/feed";
import PostCard from "@/features/posts/components/PostCard";

type Props = {
  initialPosts: FeedPost[];
};

export default function UserProfileContent({
  initialPosts,
}: Props) {
  const [posts, setPosts] = useState<FeedPost[]>(initialPosts);

  const handleReactionUpdated = useCallback(
    (postId: number, nextReaction: ReactionType | null) => {
      setPosts((prev) =>
        prev.map((post) => {
          if (post.id !== postId) {
            return post;
          }

          const previousReaction = post.viewer_reaction;
          const nextReactionCounts = {
            like: post.reaction_counts.like,
            funny: post.reaction_counts.funny,
            wow: post.reaction_counts.wow,
            fire: post.reaction_counts.fire,
          };

          if (previousReaction) {
            nextReactionCounts[previousReaction] = Math.max(
              0,
              nextReactionCounts[previousReaction] - 1
            );
          }

          if (nextReaction) {
            nextReactionCounts[nextReaction] += 1;
          }

          return {
            ...post,
            viewer_reaction: nextReaction,
            reactions_count:
              nextReactionCounts.like +
              nextReactionCounts.funny +
              nextReactionCounts.wow +
              nextReactionCounts.fire,
            reaction_counts: nextReactionCounts,
          };
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
          return { ...post, comments_count: count };
        });

        return changed ? nextPosts : prev;
      });
    },
    []
  );

  const handlePostDeleted = useCallback((postId: number) => {
    setPosts((prev) => prev.filter((post) => post.id !== postId));
  }, []);

  return (
    <section className="space-y-4">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          onReactionUpdated={handleReactionUpdated}
          onCommentsCountChange={handleCommentsCountChange}
          onPostDeleted={handlePostDeleted}
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


