"use client";

import { useRef } from "react";
import HallOfFameFrozenPostCard from "@/features/hall-of-fame/components/HallOfFameFrozenPostCard";
import type { ReactionCounts } from "@/shared/types/feed";

type CarouselWinnerPost = {
  id: number;
  post_content: string;
  post_created_at: string;
  comments_count: number;
  relevance_score: number;
  author_username: string | null;
  reactions_count: number;
  reaction_counts: ReactionCounts;
  winner_date: string;
};

type CarouselItem = {
  dayKey: string;
  dayLabel: string;
  winner: CarouselWinnerPost;
};

type HallOfFameWinnersCarouselProps = {
  items: CarouselItem[];
};

export default function HallOfFameWinnersCarousel({
  items,
}: HallOfFameWinnersCarouselProps) {
  // =====================================================
  // Refs
  // =====================================================

  const scrollRef = useRef<HTMLDivElement | null>(null);

  // =====================================================
  // Actions
  // =====================================================

  function scrollByDirection(direction: "left" | "right") {
    const container = scrollRef.current;

    if (!container) return;

    const amount = Math.round(container.clientWidth * 0.9);

    container.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  }

  // =====================================================
  // Render
  // =====================================================

  return (
    <div className="space-y-4">
      <div className="hidden items-center justify-end gap-2 sm:flex">
        <button
          type="button"
          onClick={() => scrollByDirection("left")}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-lg text-gray-800 shadow-sm transition hover:bg-gray-50"
          aria-label="Nach links scrollen"
        >
          ←
        </button>

        <button
          type="button"
          onClick={() => scrollByDirection("right")}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-lg text-gray-800 shadow-sm transition hover:bg-gray-50"
          aria-label="Nach rechts scrollen"
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
            key={entry.dayKey}
            className="w-[88%] min-w-[88%] snap-center sm:w-[72%] sm:min-w-[72%] lg:w-[58%] lg:min-w-[58%]"
          >
            <section className="h-full rounded-[30px] border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                    Tagessieger
                  </p>
                  <h3 className="mt-2 text-xl font-bold tracking-tight text-gray-950">
                    {entry.dayLabel}
                  </h3>
                </div>

                <div className="inline-flex w-fit rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900">
                  Hall of Fame
                </div>
              </div>

              <HallOfFameFrozenPostCard
                post={entry.winner}
                archiveLabel="Tagessieger"
                variant="archive"
              />
            </section>
          </div>
        ))}
      </div>
    </div>
  );
}


