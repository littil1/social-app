import Link from "next/link";
import NavBar from "@/app/navbar";
import { createClient } from "@/lib/supabase-server";
import FreezeDailyWinnersForm from "@/app/components/leaderboard/FreezeDailyWinnersForm";

export const dynamic = "force-dynamic";

type PostRow = {
  id: number;
  content: string | null;
  created_at: string;
  likes_count: number | null;
  comments_count: number | null;
  user_id: string | null;
};

type ProfileRow = {
  id: string;
  username: string | null;
};

type RankedPost = {
  id: number;
  post_content: string;
  post_created_at: string;
  likes_count: number;
  comments_count: number;
  relevance_score: number;
  author_id: string | null;
  author_username: string | null;
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

function getRelevanceScore(post: PostRow) {
  const likes = post.likes_count ?? 0;
  const comments = post.comments_count ?? 0;

  return likes + comments * 2;
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

export default async function LeaderboardPage() {
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

  const { data: postsData, error: postsError } = await supabase
    .from("posts")
    .select("id, content, created_at, likes_count, comments_count, user_id")
    .order("created_at", { ascending: false })
    .limit(500);

  if (postsError) {
    throw new Error(postsError.message);
  }

  const allPosts = (postsData ?? []) as PostRow[];
  const todayKey = getZurichDayKey(new Date());

  const todaysPosts = allPosts.filter(
    (post) => getZurichDayKey(post.created_at) === todayKey
  );

  const authorIds = Array.from(
    new Set(
      todaysPosts
        .map((post) => post.user_id)
        .filter((id): id is string => typeof id === "string")
    )
  );

  let profilesById = new Map<string, ProfileRow>();

  if (authorIds.length > 0) {
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", authorIds);

    if (profilesError) {
      throw new Error(profilesError.message);
    }

    profilesById = new Map(
      ((profilesData ?? []) as ProfileRow[]).map((profile) => [profile.id, profile])
    );
  }

  const rankedPosts: RankedPost[] = todaysPosts
    .map((post) => {
      const authorProfile = post.user_id ? profilesById.get(post.user_id) : null;

      return {
        id: post.id,
        post_content: post.content ?? "",
        post_created_at: post.created_at,
        likes_count: post.likes_count ?? 0,
        comments_count: post.comments_count ?? 0,
        relevance_score: getRelevanceScore(post),
        author_id: post.user_id,
        author_username: authorProfile?.username ?? null,
      };
    })
    .sort((a, b) => {
      if (b.relevance_score !== a.relevance_score) {
        return b.relevance_score - a.relevance_score;
      }

      if (b.likes_count !== a.likes_count) {
        return b.likes_count - a.likes_count;
      }

      if (b.comments_count !== a.comments_count) {
        return b.comments_count - a.comments_count;
      }

      return new Date(a.post_created_at).getTime() - new Date(b.post_created_at).getTime();
    });

  const podium = rankedPosts.slice(0, 3);
  const remainingTopPosts = rankedPosts.slice(3, 15);

  return (
    <>
      <NavBar user={navUser} />

      <main className="mx-auto max-w-6xl p-6">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500">
              Live-Ranking für heute, {formatDate(`${todayKey}T00:00:00`)}
            </p>
          </div>

          <Link
            href="/"
            className="rounded-lg border px-4 py-2 text-sm text-gray-700"
          >
            Back to Home
          </Link>
        </div>

{navUser?.is_admin && (
  <div className="mb-8">
    <FreezeDailyWinnersForm />
  </div>
)}
        {rankedPosts.length === 0 ? (
          <div className="rounded-xl bg-white p-6 text-center text-gray-500 shadow">
            Heute gibt es noch keine Posts im Leaderboard.
          </div>
        ) : (
          <>
            <section className="mb-10">
              <div className="mb-4">
                <h2 className="text-2xl font-bold">Live-Podium</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Aktueller Stand des heutigen Tages.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3 md:items-end">
                {[2, 1, 3].map((position) => {
                  const post = podium[position - 1] ?? null;

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
                            {post.post_content}
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
                            <span>{post.likes_count} Hat mir geholfen</span>
                            <span>{post.comments_count} Kommentare</span>
                            <span>Relevanz {post.relevance_score.toFixed(1)}</span>
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-gray-500">
                          Für diesen Platz gibt es noch keinen Post.
                        </p>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>

            {remainingTopPosts.length > 0 && (
              <section>
                <div className="mb-4">
                  <h2 className="text-xl font-bold">Weitere Top-Posts heute</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Die nächsten Plätze im heutigen Live-Ranking.
                  </p>
                </div>

                <div className="space-y-4">
                  {remainingTopPosts.map((post, index) => {
                    const position = index + 4;

                    return (
                      <article
                        key={post.id}
                        className="rounded-xl bg-white p-5 shadow"
                      >
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              Platz {position}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              Live im heutigen Leaderboard
                            </p>
                          </div>

                          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                            Relevanz {post.relevance_score.toFixed(1)}
                          </span>
                        </div>

                        <p className="mb-3 whitespace-pre-wrap break-words text-gray-900">
                          {post.post_content}
                        </p>

                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-700">
                          <span>
                            Autor:{" "}
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
                          </span>
                          <span>{post.likes_count} Hat mir geholfen</span>
                          <span>{post.comments_count} Kommentare</span>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </>
  );
}