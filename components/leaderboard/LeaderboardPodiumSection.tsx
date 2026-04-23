"use client";

import { useEffect, useMemo, useState } from "react";
import LeaderboardPodiumCard from "@/components/leaderboard/LeaderboardPodiumCard";
import LeaderboardPodiumCarousel from "@/components/leaderboard/LeaderboardPodiumCarousel";
import { setAutoRefreshPaused } from "@/lib/utils/auto-refresh";
import type { ReactionCounts, ReactionType } from "@/types/feed";

type LeaderboardPost = {
  id: number;
  post_content: string;
  post_created_at: string;
  comments_count: number;
  relevance_score: number;
  author_username: string | null;
  reactions_count: number;
  reaction_counts: ReactionCounts;
  viewer_reaction: ReactionType | null;
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
  const [openPostId, setOpenPostId] = useState<number | null>(null);

  const visiblePostIds = useMemo(() => {
    const ids = new Set<number>();

    for (const entry of mobileItems) {
      if (entry.post) {
        ids.add(entry.post.id);
      }
    }

    for (const entry of desktopItems) {
      if (entry.post) {
        ids.add(entry.post.id);
      }
    }

    return ids;
  }, [desktopItems, mobileItems]);

  const visibleOpenPostId =
    openPostId !== null && visiblePostIds.has(openPostId) ? openPostId : null;

  useEffect(() => {
    setAutoRefreshPaused(visibleOpenPostId !== null);

    return () => {
      setAutoRefreshPaused(false);
    };
  }, [visibleOpenPostId]);

  function toggleComments(postId: number) {
    setOpenPostId((currentPostId) =>
      currentPostId === postId ? null : postId
    );
  }

  return (
    <section className="flex flex-col gap-4 lg:gap-5">
      <div className="md:hidden">
        <LeaderboardPodiumCarousel
          items={mobileItems}
          isLoggedIn={isLoggedIn}
          openPostId={visibleOpenPostId}
          onToggleComments={toggleComments}
        />
      </div>
      <div className="hidden md:grid md:grid-cols-3 md:items-end md:gap-4 lg:gap-5">
        {desktopItems.map((entry) => {
          const postId = entry.post?.id;
          const cardKey = postId ? `post-${postId}` : `slot-${entry.position}`;

          return (
            <LeaderboardPodiumCard
              key={cardKey}
              position={entry.position}
              post={entry.post}
              isLoggedIn={isLoggedIn}
              isCommentsOpen={postId ? postId === visibleOpenPostId : false}
              onToggleComments={
                postId ? () => toggleComments(postId) : undefined
              }
            />
          );
        })}
      </div>
    </section>
  );
}
