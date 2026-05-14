"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import LeaderboardPodiumCard from "@/features/live/components/LeaderboardPodiumCard";
import LeaderboardPostDetailModal from "@/features/live/components/LeaderboardPostDetailModal";
import { setAutoRefreshPaused } from "@/lib/utils/auto-refresh";
import { scheduleRefresh } from "@/lib/refresh-batcher";
import type { ReactionCounts, ReactionType } from "@/shared/types/feed";

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
  points_to_higher_rank: number | null;
  lead_over_next_rank: number | null;
};

type PodiumEntry = {
  position: 1 | 2 | 3;
  post: LeaderboardPost | null;
};

type LeaderboardPodiumSectionProps = {
  mobileItems: PodiumEntry[];
  desktopItems: PodiumEntry[];
  isLoggedIn?: boolean;
};

export default function LeaderboardPodiumSection({
  mobileItems,
  desktopItems,
  isLoggedIn = false,
}: LeaderboardPodiumSectionProps) {
  const router = useRouter();
  const [mobilePodiumItems, setMobilePodiumItems] = useState(mobileItems);
  const [desktopPodiumItems, setDesktopPodiumItems] = useState(desktopItems);
  const [selectedPost, setSelectedPost] = useState<LeaderboardPost | null>(
    null
  );

  useEffect(() => {
    setMobilePodiumItems(mobileItems);
  }, [mobileItems]);

  useEffect(() => {
    setDesktopPodiumItems(desktopItems);
  }, [desktopItems]);

  const updatePost = useCallback((
    postId: number,
    updater: (post: LeaderboardPost) => LeaderboardPost
  ) => {
    setMobilePodiumItems((prev) =>
      prev.map((entry) =>
        entry.post?.id === postId ? { ...entry, post: updater(entry.post) } : entry
      )
    );
    setDesktopPodiumItems((prev) =>
      prev.map((entry) =>
        entry.post?.id === postId ? { ...entry, post: updater(entry.post) } : entry
      )
    );
    setSelectedPost((current) =>
      current?.id === postId ? updater(current) : current
    );
  }, []);

  const handleReactionUpdated = useCallback((
    postId: number,
    nextReaction: ReactionType | null
  ) => {
    updatePost(postId, (post) => {
      const previousReaction = post.viewer_reaction;
      if (previousReaction === nextReaction) return post;

      const reactionCounts = { ...post.reaction_counts };
      let reactionsCount = post.reactions_count;

      if (previousReaction) {
        reactionCounts[previousReaction] = Math.max(
          0,
          reactionCounts[previousReaction] - 1
        );
        reactionsCount = Math.max(0, reactionsCount - 1);
      }

      if (nextReaction) {
        reactionCounts[nextReaction] += 1;
        reactionsCount += 1;
      }

      return {
        ...post,
        viewer_reaction: nextReaction,
        reaction_counts: reactionCounts,
        reactions_count: reactionsCount,
      };
    });
  }, [updatePost]);

  const handleBoosted = useCallback(
    (postId: number, boostCount: number) => {
      const applyBoost = (post: LeaderboardPost) => {
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
      };

      setMobilePodiumItems((prev) =>
        prev.map((entry) =>
          entry.post ? { ...entry, post: applyBoost(entry.post) } : entry
        )
      );
      setDesktopPodiumItems((prev) =>
        prev.map((entry) =>
          entry.post ? { ...entry, post: applyBoost(entry.post) } : entry
        )
      );
      setSelectedPost((current) => (current ? applyBoost(current) : current));
    },
    []
  );

  const handleMutationCommitted = useCallback(() => {
    scheduleRefresh(router);
  }, [router]);

  const handleCloseModal = useCallback(() => {
    setSelectedPost(null);
  }, []);

  const visiblePostIds = useMemo(() => {
    const ids = new Set<number>();

    for (const entry of mobilePodiumItems) {
      if (entry.post) {
        ids.add(entry.post.id);
      }
    }

    for (const entry of desktopPodiumItems) {
      if (entry.post) {
        ids.add(entry.post.id);
      }
    }

    return ids;
  }, [desktopPodiumItems, mobilePodiumItems]);

  const visibleSelectedPost =
    selectedPost && visiblePostIds.has(selectedPost.id) ? selectedPost : null;

  useEffect(() => {
    setAutoRefreshPaused(visibleSelectedPost !== null);

    return () => {
      setAutoRefreshPaused(false);
    };
  }, [visibleSelectedPost]);

  return (
    <section className="flex flex-col gap-4 lg:gap-5">
      <div className="grid gap-3 md:hidden">
        {mobilePodiumItems.map((entry) => {
          const postId = entry.post?.id;
          const cardKey = postId ? `post-${postId}` : `slot-${entry.position}`;

          return (
            <LeaderboardPodiumCard
              key={cardKey}
              position={entry.position}
              post={entry.post}
              isLoggedIn={isLoggedIn}
              onOpenPost={
                entry.post ? () => setSelectedPost(entry.post) : undefined
              }
              onOpenComments={
                entry.post ? () => setSelectedPost(entry.post) : undefined
              }
              onReactionUpdated={handleReactionUpdated}
              onBoosted={handleBoosted}
              onMutationCommitted={handleMutationCommitted}
            />
          );
        })}
      </div>
      <div className="hidden md:grid md:grid-cols-[0.9fr_1fr_0.9fr] md:items-end md:gap-4 lg:gap-5">
        {desktopPodiumItems.map((entry) => {
          const postId = entry.post?.id;
          const cardKey = postId ? `post-${postId}` : `slot-${entry.position}`;

          return (
            <LeaderboardPodiumCard
              key={cardKey}
              position={entry.position}
              post={entry.post}
              isLoggedIn={isLoggedIn}
              onOpenPost={
                entry.post ? () => setSelectedPost(entry.post) : undefined
              }
              onOpenComments={
                entry.post ? () => setSelectedPost(entry.post) : undefined
              }
              onReactionUpdated={handleReactionUpdated}
              onBoosted={handleBoosted}
              onMutationCommitted={handleMutationCommitted}
            />
          );
        })}
      </div>

      <LeaderboardPostDetailModal
        key={visibleSelectedPost?.id ?? "closed"}
        post={visibleSelectedPost}
        isLoggedIn={isLoggedIn}
        onClose={handleCloseModal}
        onBoosted={handleBoosted}
      />
    </section>
  );
}

