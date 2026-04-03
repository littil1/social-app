import NavBar from "@/app/components/layout/navbar";
import { createClient } from "@/lib/supabase-server";
import HallOfFameFrozenPostCard from "@/app/components/hall-of-fame/HallOfFameFrozenPostCard";
import HallOfFameWinnersCarousel from "@/app/components/hall-of-fame/HallOfFameWinnersCarousel";
import type { Database } from "@/types/database";
import type { ReactionCounts } from "@/types/feed";

export const dynamic = "force-dynamic";

type DailyWinnerRow =
  Database["public"]["Tables"]["daily_post_winners"]["Row"];

type PostReactionRow =
  Database["public"]["Tables"]["post_reactions"]["Row"];

type CommentRow = Database["public"]["Tables"]["comments"]["Row"];

type ReactionType = Database["public"]["Enums"]["reaction_type"];

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

  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function getZurichDayKey(date: Date | string) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Zurich",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
}

function createEmptyReactionCounts(): ReactionCounts {
  return {
    like: 0,
    funny: 0,
    wow: 0,
    fire: 0,
  };
}

function countTotalReactions(reactionCounts: ReactionCounts) {
  return (
    reactionCounts.like +
    reactionCounts.funny +
    reactionCounts.wow +
    reactionCounts.fire
  );
}

function isReactionType(value: string): value is ReactionType {
  return (
    value === "like" ||
    value === "funny" ||
    value === "wow" ||
    value === "fire"
  );
}

export default async function HallOfFamePage() {
  // =====================================================
  // Data
  // =====================================================

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

  // =====================================================
  // Winner rows
  // =====================================================

  const todayKey = getZurichDayKey(new Date());

  const winnerRows: DailyWinnerRow[] = (data ?? []).filter(
    (item) => item.winner_date !== todayKey && item.rank_position === 1
  );

  const winnerPostIds = Array.from(
    new Set(winnerRows.map((item) => item.post_id))
  );

  // =====================================================
  // Live comments counts
  // =====================================================

  const commentsCountMap = new Map<number, number>();

  if (winnerPostIds.length > 0) {
    const { data: commentsData, error: commentsError } = await supabase
      .from("comments")
      .select("post_id")
      .in("post_id", winnerPostIds);

    if (commentsError) {
      throw new Error(commentsError.message);
    }

    for (const comment of (commentsData ?? []) as Pick<CommentRow, "post_id">[]) {
      const postId = comment.post_id;
      commentsCountMap.set(postId, (commentsCountMap.get(postId) ?? 0) + 1);
    }
  }

  // =====================================================
  // Live reaction counts
  // =====================================================

  const reactionCountsMap = new Map<number, ReactionCounts>();

  if (winnerPostIds.length > 0) {
    const { data: reactionsData, error: reactionsError } = await supabase
      .from("post_reactions")
      .select("post_id, reaction")
      .in("post_id", winnerPostIds);

    if (reactionsError) {
      throw new Error(reactionsError.message);
    }

    for (const reaction of (reactionsData ?? []) as Pick<
      PostReactionRow,
      "post_id" | "reaction"
    >[]) {
      const postId = reaction.post_id;
      const reactionType = reaction.reaction;

      if (!isReactionType(reactionType)) {
        continue;
      }

      const currentCounts =
        reactionCountsMap.get(postId) ?? createEmptyReactionCounts();

      currentCounts[reactionType] += 1;
      reactionCountsMap.set(postId, currentCounts);
    }
  }

  // =====================================================
  // Final winners list
  // =====================================================

  const dailyWinners: DailyWinnerEntry[] = winnerRows
    .map((item) => {
      const reactionCounts =
        reactionCountsMap.get(item.post_id) ?? createEmptyReactionCounts();

      const commentsCount = commentsCountMap.get(item.post_id) ?? 0;

      return {
        dayKey: item.winner_date,
        dayLabel: formatDate(`${item.winner_date}T00:00:00`),
        winner: {
          id: item.post_id,
          post_content: item.post_content ?? "",
          post_created_at: item.post_created_at,
          comments_count: commentsCount,
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

  // =====================================================
  // Render
  // =====================================================

  return (
    <>
      <NavBar user={navUser} />

      <main className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        {dailyWinners.length === 0 ? (
          <section className="relative overflow-hidden rounded-[32px] border border-amber-100 bg-gradient-to-br from-white via-amber-50/70 to-yellow-100/60 p-6 shadow-[0_30px_80px_-40px_rgba(245,158,11,0.35)] sm:p-10">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute left-8 top-8 h-24 w-24 rounded-full bg-yellow-200/40 blur-3xl" />
              <div className="absolute bottom-0 right-0 h-32 w-32 rounded-full bg-amber-200/40 blur-3xl" />
            </div>

            <div className="relative mx-auto max-w-2xl text-center">
              <div className="mb-4 inline-flex rounded-full border border-amber-200 bg-white/85 px-4 py-1.5 text-sm font-semibold text-amber-900 backdrop-blur">
                Hall of Fame
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-gray-950 sm:text-5xl">
                Noch keine vergangenen Einträge vorhanden
              </h1>

              <p className="mt-4 text-sm leading-6 text-gray-700 sm:text-base sm:leading-7">
                Sobald ein abgeschlossener Tag einen Sieger hervorbringt, bleibt
                dieser Beitrag hier dauerhaft sichtbar.
              </p>
            </div>
          </section>
        ) : (
          <div className="space-y-10 sm:space-y-12 lg:space-y-14">
            <section className="relative overflow-hidden rounded-[32px] border border-amber-100/80 bg-gradient-to-br from-[#fffdf8] via-amber-50/80 to-yellow-100/70 px-5 py-6 shadow-[0_35px_90px_-45px_rgba(245,158,11,0.38)] sm:px-8 sm:py-9 lg:px-10 lg:py-11">
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-1/2 top-0 h-40 w-40 -translate-x-1/2 rounded-full bg-yellow-200/30 blur-3xl" />
                <div className="absolute left-0 top-10 h-28 w-28 rounded-full bg-amber-200/25 blur-3xl" />
                <div className="absolute bottom-0 right-0 h-36 w-36 rounded-full bg-orange-200/25 blur-3xl" />
              </div>

              <div className="relative max-w-3xl">
                <div className="mb-4 inline-flex rounded-full border border-amber-200 bg-white/85 px-4 py-1.5 text-sm font-semibold text-amber-900 backdrop-blur">
                  Hall of Fame
                </div>

                <h1 className="text-3xl font-bold tracking-tight text-gray-950 sm:text-5xl lg:text-6xl">
                  Wer überzeugt, bleibt für immer sichtbar
                </h1>

                <p className="mt-4 max-w-2xl text-sm leading-6 text-gray-700 sm:text-base sm:leading-7">
                  Jeden Tag wird der stärkste Beitrag ausgewählt und dauerhaft in
                  die Hall of Fame aufgenommen.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/70 bg-white/80 px-3 py-1.5 text-sm font-medium text-gray-700 backdrop-blur">
                    Hilfreich
                  </span>
                  <span className="rounded-full border border-white/70 bg-white/80 px-3 py-1.5 text-sm font-medium text-gray-700 backdrop-blur">
                    Konkret
                  </span>
                  <span className="rounded-full border border-white/70 bg-white/80 px-3 py-1.5 text-sm font-medium text-gray-700 backdrop-blur">
                    Relevant
                  </span>
                </div>
              </div>
            </section>

            {latestWinner && (
              <section className="space-y-5 sm:space-y-6">
                <div className="max-w-2xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                    Hall of Fame · Neu
                  </p>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl lg:text-4xl">
                    Bester Beitrag von gestern
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-gray-600 sm:text-base">
                    {latestWinner.dayLabel}
                  </p>
                </div>

                <HallOfFameFrozenPostCard
                  post={latestWinner.winner}
                  archiveLabel="Tagessieger"
                  variant="featured"
                />
              </section>
            )}

            {olderWinners.length > 0 && (
              <section className="space-y-5 sm:space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div className="max-w-2xl">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                      Archiv
                    </p>
                    <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl lg:text-4xl">
                      Frühere Tagessieger
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-gray-600 sm:text-base">
                      Starte beim neuesten Sieger und swipe oder scrolle durch
                      alle bisherigen Gewinner.
                    </p>
                  </div>
                </div>

                <HallOfFameWinnersCarousel items={olderWinners} />
              </section>
            )}
          </div>
        )}
      </main>
    </>
  );
}