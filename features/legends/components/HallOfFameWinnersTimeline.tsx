import HallOfFameFrozenPostCard from "@/features/legends/components/HallOfFameFrozenPostCard";
import type { ReactionCounts } from "@/shared/types/feed";

type TimelineWinnerPost = {
  id: number;
  post_content: string;
  post_created_at: string;
  comments_count: number;
  relevance_score: number;
  author_username: string | null;
  reactions_count: number;
  boost_count: number;
  reaction_counts: ReactionCounts;
  winner_date: string;
};

type TimelineItem = {
  dayKey: string;
  dayLabel: string;
  winner: TimelineWinnerPost;
};

type HallOfFameWinnersTimelineProps = {
  items: TimelineItem[];
};

export default function HallOfFameWinnersTimeline({
  items,
}: HallOfFameWinnersTimelineProps) {
  return (
    <div className="relative space-y-5">
      <div className="absolute bottom-8 left-2.5 top-8 hidden w-px bg-gradient-to-b from-amber-200 via-neutral-200 to-transparent sm:block" />

      {items.map((entry) => (
        <section key={entry.dayKey} className="relative sm:pl-7">
          <div className="absolute left-2.5 top-7 hidden h-5 w-5 -translate-x-1/2 rounded-full border border-amber-200 bg-amber-50 shadow-[0_0_0_5px_rgba(250,250,250,0.95)] sm:block" />

          <div className="rounded-[32px] bg-white/70 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.36)]">
            <HallOfFameFrozenPostCard
              post={entry.winner}
              dayLabel={entry.dayLabel}
              variant="archive"
            />
          </div>
        </section>
      ))}
    </div>
  );
}
