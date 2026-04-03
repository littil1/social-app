"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import LeaderboardPodiumCard from "@/app/components/leaderboard/LeaderboardPodiumCard";
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

type ChangeType = "up" | "down" | "new" | null;

type LeaderboardPodiumStageProps = {
  items: PodiumEntry[];
  isLoggedIn?: boolean;
};

function getMobileOrder(items: PodiumEntry[]) {
  return [...items].sort((a, b) => a.position - b.position);
}

const STORAGE_KEY = "app_leaderboard_previous_podium_positions";

export default function LeaderboardPodiumStage({
  items,
  isLoggedIn = false,
}: LeaderboardPodiumStageProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [changeByPostId, setChangeByPostId] = useState<Map<number, ChangeType>>(
    new Map()
  );

  const mobileItems = useMemo(() => getMobileOrder(items), [items]);

  useEffect(() => {
    const nextChanges = new Map<number, ChangeType>();
    const nextSnapshot: Record<string, 1 | 2 | 3> = {};

    let previousSnapshot: Record<string, 1 | 2 | 3> = {};

    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);

      if (raw) {
        previousSnapshot = JSON.parse(raw) as Record<string, 1 | 2 | 3>;
      }
    } catch {
      previousSnapshot = {};
    }

    for (const entry of items) {
      if (!entry.post) continue;

      const postId = entry.post.id;
      const previousPosition = previousSnapshot[String(postId)];

      if (previousPosition === undefined) {
        nextChanges.set(postId, "new");
      } else if (entry.position < previousPosition) {
        nextChanges.set(postId, "up");
      } else if (entry.position > previousPosition) {
        nextChanges.set(postId, "down");
      } else {
        nextChanges.set(postId, null);
      }

      nextSnapshot[String(postId)] = entry.position;
    }

    setChangeByPostId(nextChanges);

    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(nextSnapshot));
    } catch {
      // ignore storage errors
    }

    const timeout = window.setTimeout(() => {
      setChangeByPostId(new Map());
    }, 3200);

    return () => window.clearTimeout(timeout);
  }, [items]);

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
    <>
      <div className="space-y-4 md:hidden">
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => scrollByDirection("left")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-lg text-gray-800 shadow-sm transition hover:bg-gray-50"
            aria-label="Nach links scrollen"
          >
            ←
          </button>

          <button
            type="button"
            onClick={() => scrollByDirection("right")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-lg text-gray-800 shadow-sm transition hover:bg-gray-50"
            aria-label="Nach rechts scrollen"
          >
            →
          </button>
        </div>

        <div
          ref={scrollRef}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {mobileItems.map((entry) => (
            <div
              key={entry.position}
              className="w-[88%] min-w-[88%] snap-center"
            >
              <LeaderboardPodiumCard
                position={entry.position}
                post={entry.post}
                changeType={
                  entry.post ? changeByPostId.get(entry.post.id) ?? null : null
                }
                isLoggedIn={isLoggedIn}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="hidden min-h-0 flex-1 md:grid md:grid-cols-3 md:items-end md:gap-4 lg:gap-5">
        {items.map((entry) => (
          <LeaderboardPodiumCard
            key={entry.position}
            position={entry.position}
            post={entry.post}
            changeType={
              entry.post ? changeByPostId.get(entry.post.id) ?? null : null
            }
          />
        ))}
      </div>
    </>
  );
}