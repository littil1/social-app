import Link from "next/link";
import NavBar from "@/app/components/layout/navbar";
import { createClient } from "@/lib/supabase-server";
import type { Database } from "@/types/database";

export const dynamic = "force-dynamic";

type DailyWinnerRow =
  Database["public"]["Tables"]["daily_post_winners"]["Row"];

type DailyWinnersGroup = {
  dayKey: string;
  dayLabel: string;
  winners: DailyWinnerRow[];
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

function getPodiumCardClass(position: number) {
  if (position === 1) {
    return "border-yellow-300 bg-yellow-50";
  }

  if (position === 2) {
    return "border-gray-300 bg-gray-50";
  }

  return "border-orange-300 bg-orange-50";
}

function getPodiumHeightClass(position: number) {
  if (position === 1) return "min-h-[320px]";
  if (position === 2) return "min-h-[260px]";
  return "min-h-[220px]";
}

function getPodiumEmoji(position: number) {
  if (position === 1) return "🥇";
  if (position === 2) return "🥈";
  return "🥉";
}

function getPodiumLabel(position: number) {
  if (position === 1) return "Gold";
  if (position === 2) return "Silber";
  return "Bronze";
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

  const items = ((data ?? []) as DailyWinnerRow[]).filter(
    (item) => item.winner_date !== todayKey
  );

  const groupedMap = new Map<string, DailyWinnerRow[]>();

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
      winners: [...winners].sort(
        (a, b) => a.rank_position - b.rank_position
      ),
    }))
    .filter((day) => day.winners.length > 0);

  const latestPastDay = dailyResults[0] ?? null;
  const latestPastPodium = latestPastDay ? latestPastDay.winners : [];
  const olderPastDays = dailyResults.slice(1, 15);

  return (
    <>
      <NavBar user={navUser} />

      <main className="mx-auto max-w-6xl p-6">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500">
              Eingefrorene Tagesgewinner vergangener Tage
            </p>
          </div>

          <Link
            href="/leaderboard"
            className="rounded-lg border px-4 py-2 text-sm text-gray-700"
          >
            Zum Leaderboard
          </Link>
        </div>

        {dailyResults.length === 0 ? (
          <div className="rounded-xl bg-white p-6 text-center text-gray-500 shadow">
            Noch keine vergangenen Hall-of-Fame-Einträge vorhanden.
          </div>
        ) : (
          <>
            <section className="mb-10">
              <div className="mb-4">
                <h2 className="text-2xl font-bold">Letzter abgeschlossener Tag</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Podest für {latestPastDay?.dayLabel}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3 md:items-end">
                {[2, 1, 3].map((position) => {
                  const post = latestPastPodium.find(
                    (item) => item.rank_position === position
                  );

                  return (
                    <article
                      key={position}
                      className={`rounded-2xl border p-5 shadow ${getPodiumCardClass(
                        position
                      )} ${getPodiumHeightClass(position)}`}
                    >
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-2xl">{getPodiumEmoji(position)}</p>
                          <p className="mt-2 text-lg font-bold">
                            {getPodiumLabel(position)}
                          </p>
                        </div>

                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-700">
                          Platz {position}
                        </span>
                      </div>

                      {post ? (
                        <>
                          <p className="mb-3 whitespace-pre-wrap break-words text-gray-900">
                            {post.post_content ?? ""}
                          </p>

                          <div className="mb-3 space-y-1 text-sm text-gray-600">
                            <p>
                              <span className="font-medium text-gray-800">
                                Autor:
                              </span>{" "}
                              {post.author_username ? (
                                <Link
                                  href={`/u/${encodeURIComponent(
                                    post.author_username
                                  )}`}
                                  className="hover:underline"
                                >
                                  @{post.author_username}
                                </Link>
                              ) : (
                                "Unbekannt"
                              )}
                            </p>
                            <p>
                              <span className="font-medium text-gray-800">
                                Erstellt:
                              </span>{" "}
                              {formatDate(post.post_created_at)}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-700">
                            <span>{post.likes_count ?? 0} Hat mir geholfen</span>
                            <span>{post.comments_count ?? 0} Kommentare</span>
                            <span>
                              Relevanz {Number(post.relevance_score).toFixed(1)}
                            </span>
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-gray-500">
                          Für diesen Platz gibt es keinen gespeicherten Post.
                        </p>
                      )}
                    </article>
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
                  const winner = day.winners.find(
                    (item) => item.rank_position === 1
                  );

                  return (
                    <article
                      key={day.dayKey}
                      className="rounded-xl bg-white p-5 shadow"
                    >
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            🏆 Tagessieger vom {day.dayLabel}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            Eingefrorener Gold-Post des Tages
                          </p>
                        </div>

                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">
                          Hall of Fame
                        </span>
                      </div>

                      <p className="mb-3 whitespace-pre-wrap break-words text-gray-900">
                        {winner?.post_content ?? ""}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-700">
                        <span>
                          Autor:{" "}
                          {winner?.author_username ? (
                            <Link
                              href={`/u/${encodeURIComponent(
                                winner.author_username
                              )}`}
                              className="hover:underline"
                            >
                              @{winner.author_username}
                            </Link>
                          ) : (
                            "Unbekannt"
                          )}
                        </span>
                        <span>{winner?.likes_count ?? 0} Hat mir geholfen</span>
                        <span>{winner?.comments_count ?? 0} Kommentare</span>
                        <span>
                          Relevanz{" "}
                          {winner
                            ? Number(winner.relevance_score).toFixed(1)
                            : "0.0"}
                        </span>
                      </div>
                    </article>
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