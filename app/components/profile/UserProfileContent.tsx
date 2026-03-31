"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import type { FeedPost, ReactionType } from "@/types/feed";
import PostCard from "@/app/components/posts/PostCard";

// =====================================================
// Types
// =====================================================

type Props = {
  initialPosts: FeedPost[];
  followersCount: number;
  followingCount: number;
  username: string;
};

type StatItemProps = {
  label: string;
  value: number;
  href?: string;
};

// =====================================================
// Helper Components
// =====================================================

function StatItem({ label, value, href }: StatItemProps) {
  const content = (
    <div className="flex flex-col gap-1 rounded-xl px-2 py-1 transition">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-lg font-semibold text-black">{value}</span>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="rounded-xl hover:bg-gray-50">
        {content}
      </Link>
    );
  }

  return content;
}

// =====================================================
// Component
// =====================================================

export default function UserProfileContent({
  initialPosts,
  followersCount,
  followingCount,
  username,
}: Props) {
  const [posts, setPosts] = useState<FeedPost[]>(initialPosts);

  const totalLikes = useMemo(
    () => posts.reduce((sum, post) => sum + post.reaction_counts.like, 0),
    [posts]
  );

  const handleReactionUpdated = useCallback(
    (postId: number, nextReaction: ReactionType | null) => {
      setPosts((prev) =>
        prev.map((post) => {
          if (post.id !== postId) return post;

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
            nextReactionCounts[nextReaction] =
              nextReactionCounts[nextReaction] + 1;
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
          if (post.id !== postId) return post;
          if (post.comments_count === count) return post;

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
    <>
      {/* =====================================================
          Stats
      ===================================================== */}
      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatItem label="Beiträge" value={posts.length} />
          <StatItem
            label="Follower"
            value={followersCount}
            href={`/u/${username}/followers`}
          />
          <StatItem
            label="Gefolgt"
            value={followingCount}
            href={`/u/${username}/following`}
          />
          <StatItem label="Likes" value={totalLikes} />
        </div>
      </section>

      {/* =====================================================
          Posts
      ===================================================== */}
      <section className="mt-6 space-y-4">
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
          <div className="rounded-xl bg-white p-6 text-center text-gray-500 shadow">
            Noch keine Beiträge vorhanden.
          </div>
        )}
      </section>
    </>
  );
}