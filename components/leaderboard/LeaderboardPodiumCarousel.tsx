"use client";

import { useRef } from "react";
import LeaderboardPodiumCard from "@/components/leaderboard/LeaderboardPodiumCard";
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

type LeaderboardPodiumCarouselProps = {
  items: PodiumEntry[];
  isLoggedIn?: boolean;
  openPostId: number | null;
  onToggleComments: (postId: number) => void;
};

export default function LeaderboardPodiumCarousel({
  items,
  isLoggedIn = false,
  openPostId,
  onToggleComments,
}: LeaderboardPodiumCarouselProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  function scrollByDirection(direction: "left" | "right") {
    const container = scrollRef.current;

    if (!container) return;

    const amount = Math.round(container.clientWidth * 0.88);

    container.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => scrollByDirection("left")}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-lg text-gray-800 shadow-sm transition hover:bg-gray-50"
          aria-label="Scroll left"
        >
          ←
        </button>

        <button
          type="button"
          onClick={() => scrollByDirection("right")}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-lg text-gray-800 shadow-sm transition hover:bg-gray-50"
          aria-label="Scroll right"
        >
          →
        </button>
      </div>

      <div
        ref={scrollRef}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((entry) => (
          <div
            key={entry.post ? `post-${entry.post.id}` : `slot-${entry.position}`}
            className="w-[88%] min-w-[88%] snap-center"
          >
            <LeaderboardPodiumCard
              position={entry.position}
              post={entry.post}
              isLoggedIn={isLoggedIn}
              isCommentsOpen={entry.post ? entry.post.id === openPostId : false}
              onToggleComments={
                entry.post ? () => onToggleComments(entry.post.id) : undefined
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
}
