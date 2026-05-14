import {
  ARCHIVED_DAILY_WINNER_RANK,
  getZurichDayKey,
} from "@/features/winners/lib/daily-ranking";
import { resolvePostCommentCounts } from "@/features/comments/lib/post-comment-counts";
import { createClient } from "@/lib/supabase/server";
import HallOfFameFrozenPostCard from "@/features/legends/components/HallOfFameFrozenPostCard";
import HallOfFameWinnersTimeline from "@/features/legends/components/HallOfFameWinnersTimeline";
import type { Database } from "@/shared/types/database";
import type { ReactionCounts } from "@/shared/types/feed";

export const dynamic = "force-dynamic";

type DailyWinnerRow = Database["public"]["Tables"]["daily_post_winners"]["Row"];
type DailyWinnerSnapshotRow = DailyWinnerRow & {
  boost_count?: number | null;
  funny_count: number | null;
  wow_count: number | null;
  fire_count: number | null;
};

type FrozenWinnerPost = {
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

type PostBoostRow = {
  post_id: number;
};

type DailyWinnerEntry = {
  dayKey: string;
  dayLabel: string;
  winner: FrozenWinnerPost;
};

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function countTotalReactions(reactionCounts: ReactionCounts) {
  return (
    reactionCounts.like +
    reactionCounts.funny +
    reactionCounts.wow +
    reactionCounts.fire
  );
}

export default async function HallOfFamePage() {
  const supabase = await createClient();
  const winnersPromise = supabase
    .from("daily_post_winners")
    .select("*")
    .order("winner_date", { ascending: false })
    .order("rank_position", { ascending: true });

  const { data, error } = await winnersPromise;

  if (error) {
    throw new Error(error.message);
  }

  const todayKey = getZurichDayKey(new Date());
  const winnerRows: DailyWinnerSnapshotRow[] = (
    (data ?? []) as DailyWinnerSnapshotRow[]
  ).filter(
    (item) =>
      item.winner_date !== todayKey &&
      item.rank_position === ARCHIVED_DAILY_WINNER_RANK
  );
  const winnerPostIds = Array.from(new Set(winnerRows.map((item) => item.post_id)));
  const currentCommentsCountByPostId = new Map<number, number>();
  const boostCountByPostId = new Map<number, number>();
  const authorUsernameById = new Map<string, string>();

  const winnerAuthorIds = Array.from(
    new Set(
      winnerRows
        .map((item) => item.author_id)
        .filter((authorId): authorId is string => typeof authorId === "string")
    )
  );

  const winnerPostCountsPromise =
    winnerPostIds.length > 0
      ? supabase
          .from("posts")
          .select("id, comments_count")
          .in("id", winnerPostIds)
      : Promise.resolve({ data: [], error: null });
  const winnerProfilesPromise =
    winnerAuthorIds.length > 0
      ? supabase
          .from("profiles")
          .select("id, username")
          .in("id", winnerAuthorIds)
      : Promise.resolve({ data: [], error: null });
  const winnerBoostsPromise =
    winnerPostIds.length > 0
      ? supabase.from("post_boosts").select("post_id").in("post_id", winnerPostIds)
      : Promise.resolve({ data: [], error: null });

  const [
    { data: postsData, error: postsError },
    { data: profilesData, error: profilesError },
    { data: boostsData, error: boostsError },
  ] = await Promise.all([
    winnerPostCountsPromise,
    winnerProfilesPromise,
    winnerBoostsPromise,
  ]);

  if (postsError) {
    throw new Error(postsError.message);
  }

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  if (boostsError) {
    throw new Error(boostsError.message);
  }

  if (winnerPostIds.length > 0) {
    const resolvedCounts = await resolvePostCommentCounts(
      supabase,
      (postsData ?? []) as Array<{ id: number; comments_count: number | null }>
    );

    for (const [postId, count] of resolvedCounts.entries()) {
      currentCommentsCountByPostId.set(postId, count);
    }
  }

  if (winnerAuthorIds.length > 0) {
    for (const profile of profilesData ?? []) {
      if (profile.username) {
        authorUsernameById.set(profile.id, profile.username);
      }
    }
  }

  if (winnerPostIds.length > 0) {
    for (const boost of (boostsData ?? []) as PostBoostRow[]) {
      boostCountByPostId.set(
        boost.post_id,
        (boostCountByPostId.get(boost.post_id) ?? 0) + 1
      );
    }
  }

  const dailyWinners: DailyWinnerEntry[] = winnerRows
    .map((item) => {
      const reactionCounts: ReactionCounts = {
        like: Number(item.likes_count ?? 0),
        funny: Number(item.funny_count ?? 0),
        wow: Number(item.wow_count ?? 0),
        fire: Number(item.fire_count ?? 0),
      };
      const snapshotBoostCount =
        typeof item.boost_count === "number" ? item.boost_count : null;

      return {
        dayKey: item.winner_date,
        dayLabel: formatDate(`${item.winner_date}T00:00:00`),
        winner: {
          id: item.post_id,
          post_content: item.post_content ?? "",
          post_created_at: item.post_created_at,
          comments_count:
            currentCommentsCountByPostId.get(item.post_id) ??
            Math.max(0, Number(item.comments_count ?? 0)),
          relevance_score: Number(item.relevance_score ?? 0),
          author_username:
            item.author_username ??
            (item.author_id ? authorUsernameById.get(item.author_id) ?? null : null),
          reactions_count: countTotalReactions(reactionCounts),
          boost_count: snapshotBoostCount ?? boostCountByPostId.get(item.post_id) ?? 0,
          reaction_counts: reactionCounts,
          winner_date: item.winner_date,
        },
      };
    })
    .sort((a, b) => b.dayKey.localeCompare(a.dayKey));

  const latestWinner = dailyWinners[0] ?? null;
  const olderWinners = dailyWinners.slice(1);

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pt-14">
        {dailyWinners.length === 0 ? (
          <section className="relative overflow-hidden rounded-[32px] border border-neutral-200 bg-white p-8 text-center shadow-sm sm:rounded-[40px] sm:p-12">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400">
              Hall of Fame
            </span>
            <h1 className="mt-6 text-4xl font-black tracking-tighter text-neutral-950 sm:text-6xl">
              No legends yet.
            </h1>
            <p className="mt-4 font-medium text-neutral-500">
              Every day, the top post secures its legacy here.
            </p>
          </section>
        ) : (
          <div className="space-y-10 sm:space-y-14">
            <section className="relative overflow-hidden rounded-[32px] bg-neutral-950 px-5 py-8 text-white shadow-2xl sm:rounded-[36px] sm:px-8 sm:py-10 lg:px-12 lg:py-12">
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-amber-400/10 blur-[110px]" />
                <div className="absolute bottom-0 left-0 h-52 w-52 rounded-full bg-white/5 blur-[90px]" />
              </div>

              <div className="relative max-w-3xl">
                <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">
                  Hall of Fame
                </span>
                <h1 className="mt-5 text-4xl font-black tracking-tighter sm:mt-6 sm:text-6xl lg:text-7xl">
                  Legends stay <br />
                  <span className="text-glow-neutral text-neutral-500">
                    visible forever.
                  </span>
                </h1>
                <p className="mt-4 max-w-2xl text-base font-medium leading-relaxed text-neutral-400 sm:mt-5 sm:text-lg">
                  Every day, one post becomes legendary. Join the hall and secure your badge today!
                </p>

                <div className="mt-7 flex flex-wrap gap-2.5">
                  {["Interesting", "Helpful", "Relevant"].map((label) => (
                    <span
                      key={label}
                      className="rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-bold uppercase tracking-widest text-white/80 backdrop-blur-sm"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </section>

            {latestWinner && (
              <section className="space-y-5 sm:space-y-8">
                <HallOfFameFrozenPostCard
                  post={latestWinner.winner}
                  dayLabel={latestWinner.dayLabel}
                  variant="featured"
                />
              </section>
            )}

            {olderWinners.length > 0 && (
              <section className="space-y-5 sm:space-y-8">
                <HallOfFameWinnersTimeline items={olderWinners} />
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
