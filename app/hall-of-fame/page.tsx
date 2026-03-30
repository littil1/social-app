import NavBar from "@/app/components/layout/navbar";
import { createClient } from "@/lib/supabase-server";
import HallOfFameFrozenPostCard from "@/app/components/hall-of-fame/HallOfFameFrozenPostCard";
import type { Database } from "@/types/database";
import type { ReactionCounts } from "@/types/feed";

export const dynamic = "force-dynamic";

type DailyWinnerRow =
  Database["public"]["Tables"]["daily_post_winners"]["Row"];

type DailyWinnersGroup = {
  dayKey: string;
  dayLabel: string;
  winners: FrozenWinnerPost[];
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
  rank_position: 1 | 2 | 3;
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

function createFrozenReactionCounts(item: DailyWinnerRow): ReactionCounts {
  return {
    like: item.likes_count ?? 0,
    funny: 0,
    wow: 0,
    fire: 0,
  };
}

function getPodiumPositions() {
  return [2, 1, 3] as const;
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

  const items = ((data ?? []) as DailyWinnerRow[])
    .filter((item) => item.winner_date !== todayKey)
    .map((item) => {
      const reactionCounts = createFrozenReactionCounts(item);

      return {
        id: item.post_id,
        post_content: item.post_content ?? "",
        post_created_at: item.post_created_at,
        comments_count: item.comments_count ?? 0,
        relevance_score: Number(item.relevance_score ?? 0),
        author_username: item.author_username ?? null,
        reactions_count:
          reactionCounts.like +
          reactionCounts.funny +
          reactionCounts.wow +
          reactionCounts.fire,
        reaction_counts: reactionCounts,
        rank_position: item.rank_position as 1 | 2 | 3,
        winner_date: item.winner_date,
      };
    });

  const groupedMap = new Map<string, FrozenWinnerPost[]>();

  for (const item of items) {
    const existing = groupedMap.get(item.winner_date) ?? [];
    existing.push(item);
    groupedMap.set(item.winner_date, existing);
  }

  const dailyResults: DailyWinnersGroup[] = Array.from(groupedMap.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([dayKey, winners]) => ({
      dayKey,
      dayLabel: formatDate(`${dayKey}T00:00:00`),
      winners: [...winners].sort((a, b) => a.rank_position - b.rank_position),
    }))
    .filter((day) => day.winners.length > 0);

  const latestPastDay = dailyResults[0] ?? null;
  const latestPastPodium = latestPastDay ? latestPastDay.winners : [];
  const olderPastDays = dailyResults.slice(1, 15);

  return (
    <>
      <NavBar user={navUser} />

      <main className="mx-auto max-w-6xl p-6">
        {dailyResults.length === 0 ? (
          <div className="rounded-xl bg-white p-6 text-center text-gray-500 shadow">
            Noch keine vergangenen Hall-of-Fame-Einträge vorhanden.
          </div>
        ) : (
          <>
            <section className="mb-10">
              <div className="mb-4">
                <h2 className="text-2xl font-bold">Hall of Fame</h2>
                <p className="text-sm text-gray-500">
                  Eingefrorenes Podium des letzten abgeschlossenen Tages,
                  Reactions sind nur sichtbar, Comments bleiben aktiv.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3 md:items-end">
                {getPodiumPositions().map((position) => {
                  const post =
                    latestPastPodium.find(
                      (item) => item.rank_position === position
                    ) ?? null;

                  return (
                    <HallOfFameFrozenPostCard
                      key={position}
                      position={position}
                      post={post}
                    />
                  );
                })}
              </div>
            </section>

            <section>
              <div className="mb-4">
                <h2 className="text-xl font-bold">Weitere vergangene Tage</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Historische Gold-Gewinner der letzten abgeschlossenen Tage.
                </p>
              </div>

              <div className="space-y-4">
                {olderPastDays.map((day) => {
                  const winner =
                    day.winners.find((item) => item.rank_position === 1) ?? null;

                  return (
                    <div key={day.dayKey}>
                      <div className="mb-2">
                        <p className="text-sm font-semibold text-gray-900">
                          🏆 Tagessieger vom {day.dayLabel}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          Eingefrorener Gold-Post des Tages
                        </p>
                      </div>

                      <HallOfFameFrozenPostCard
                        post={winner}
                        archiveLabel="Gold"
                      />
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </main>
    </>
  );
}