import NavBar from "@/components/layout/navbar";
import {
  ARCHIVED_DAILY_WINNER_RANK,
  getZurichDayKey,
} from "@/lib/winners/daily-ranking";
import { resolvePostCommentCounts } from "@/lib/comments/post-comment-counts";
import { createClient } from "@/lib/supabase/server";
import HallOfFameFrozenPostCard from "@/components/hall-of-fame/HallOfFameFrozenPostCard";
import HallOfFameWinnersCarousel from "@/components/hall-of-fame/HallOfFameWinnersCarousel";
import type { Database } from "@/types/database";
import type { ReactionCounts } from "@/types/feed";

export const dynamic = "force-dynamic";

type DailyWinnerRow = Database["public"]["Tables"]["daily_post_winners"]["Row"];
type DailyWinnerSnapshotRow = DailyWinnerRow & {
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
  reaction_counts: ReactionCounts;
  winner_date: string;
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let navUser: {
    username: string;
    avatar_url: string | null;
    is_admin: boolean;
  } | null = null;

  if (user) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("username, avatar_url, is_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      throw new Error(profileError.message);
    }

    if (profile?.username) {
      navUser = {
        username: profile.username,
        avatar_url: profile.avatar_url ?? null,
        is_admin: profile.is_admin ?? false,
      };
    }
  }

  const { data, error } = await supabase
    .from("daily_post_winners")
    .select("*")
    .order("winner_date", { ascending: false })
    .order("rank_position", { ascending: true });

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

  if (winnerPostIds.length > 0) {
    const { data: postsData, error: postsError } = await supabase
      .from("posts")
      .select("id, comments_count")
      .in("id", winnerPostIds);

    if (postsError) {
      throw new Error(postsError.message);
    }

    const resolvedCounts = await resolvePostCommentCounts(
      supabase,
      (postsData ?? []) as Array<{ id: number; comments_count: number | null }>
    );

    for (const [postId, count] of resolvedCounts.entries()) {
      currentCommentsCountByPostId.set(postId, count);
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
          author_username: item.author_username ?? null,
          reactions_count: countTotalReactions(reactionCounts),
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
      <NavBar user={navUser} />

      <main className="mx-auto w-full max-w-6xl px-4 py-8 lg:py-16">
        {dailyWinners.length === 0 ? (
          <section className="relative overflow-hidden rounded-[40px] border border-neutral-200 bg-white p-12 text-center shadow-sm">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400">
              The Hall
            </span>
            <h1 className="mt-6 text-4xl font-black tracking-tighter text-neutral-950 sm:text-6xl">
              No legends yet.
            </h1>
            <p className="mt-4 font-medium text-neutral-500">
              Every day, the top post secures its legacy here.
            </p>
          </section>
        ) : (
          <div className="space-y-20">
            <section className="relative overflow-hidden rounded-[40px] bg-neutral-950 px-8 py-16 text-white shadow-2xl lg:px-16 lg:py-20">
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-amber-400/10 blur-[120px]" />
                <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-white/5 blur-[100px]" />
              </div>

              <div className="relative max-w-3xl">
                <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">
                  The Hall of Fame
                </span>
                <h1 className="mt-8 text-5xl font-black tracking-tighter sm:text-7xl lg:text-8xl">
                  Legends stay <br />
                  <span className="text-glow-neutral text-neutral-500">
                    visible forever.
                  </span>
                </h1>
                <p className="mt-8 text-lg font-medium leading-relaxed text-neutral-400 sm:text-xl">
                  Every day, one post becomes legendary. Secure your badge and
                  join the hall.
                </p>

                <div className="mt-10 flex flex-wrap gap-3">
                  {["Interesting", "Helpful", "Relevant"].map((label) => (
                    <span
                      key={label}
                      className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white/80 backdrop-blur-sm"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </section>

            {latestWinner && (
              <section className="space-y-8">
                <div className="flex items-end justify-between border-b border-neutral-200 pb-6">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600">
                      Current
                    </span>
                    <h2 className="mt-2 text-4xl font-black tracking-tight text-neutral-950">
                      Reigning Champion
                    </h2>
                  </div>
                  <p className="text-sm font-bold uppercase tracking-tighter text-neutral-400">
                    {latestWinner.dayLabel}
                  </p>
                </div>
                <HallOfFameFrozenPostCard
                  post={latestWinner.winner}
                  archiveLabel="Champion"
                  variant="featured"
                />
              </section>
            )}

            {olderWinners.length > 0 && (
              <section className="space-y-8">
                <div className="flex items-end justify-between border-b border-neutral-200 pb-6">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">
                      Archive
                    </span>
                    <h2 className="mt-2 text-4xl font-black tracking-tight text-neutral-950">
                      Previous Champions
                    </h2>
                  </div>
                </div>
                <HallOfFameWinnersCarousel items={olderWinners} />
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

