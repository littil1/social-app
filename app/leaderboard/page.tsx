import Link from "next/link";
import Script from "next/script";
import NavBar from "@/app/components/layout/navbar";
import { createClient } from "@/lib/supabase-server";
import LeaderboardPodiumCard from "@/app/components/leaderboard/LeaderboardPodiumCard";
import FreezeDailyWinnersForm from "@/app/components/leaderboard/FreezeDailyWinnersForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

type LikeRow = {
  post_id: number | null;
  user_id: string;
};

type CommentRow = {
  post_id: number | null;
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
  viewer_has_liked: boolean;
};

// =====================================================
// Helpers
// =====================================================

function formatDate(dateString: string) {
  const date = new Date(dateString);

  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatDateTime(dateString: string) {
  const date = new Date(dateString);

  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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

function getRelevanceScore(likesCount: number, commentsCount: number) {
  return likesCount + commentsCount * 2;
}

function getPodiumPositions() {
  return [2, 1, 3] as const;
}

// =====================================================
// Page
// =====================================================

export default async function LeaderboardPage() {
  // =====================================================
  // Auth / Nav User
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

  // =====================================================
  // Load Posts
  // =====================================================

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

  const postIds = todaysPosts.map((post) => post.id);

  // =====================================================
  // Load Authors
  // =====================================================

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
      ((profilesData ?? []) as ProfileRow[]).map((profile) => [
        profile.id,
        profile,
      ])
    );
  }

  // =====================================================
  // Load Live Likes / Comments Counts
  // =====================================================

  const likeCountByPostId = new Map<number, number>();
  const commentCountByPostId = new Map<number, number>();
  const viewerLikedPostIds = new Set<number>();

  if (postIds.length > 0) {
    const { data: likesData, error: likesError } = await supabase
      .from("likes")
      .select("post_id, user_id")
      .in("post_id", postIds);

    if (likesError) {
      throw new Error(likesError.message);
    }

    for (const like of (likesData ?? []) as LikeRow[]) {
      if (typeof like.post_id !== "number") continue;

      likeCountByPostId.set(
        like.post_id,
        (likeCountByPostId.get(like.post_id) ?? 0) + 1
      );

      if (user && like.user_id === user.id) {
        viewerLikedPostIds.add(like.post_id);
      }
    }

    const { data: commentsData, error: commentsError } = await supabase
      .from("comments")
      .select("post_id")
      .in("post_id", postIds);

    if (commentsError) {
      throw new Error(commentsError.message);
    }

    for (const comment of (commentsData ?? []) as CommentRow[]) {
      if (typeof comment.post_id !== "number") continue;

      commentCountByPostId.set(
        comment.post_id,
        (commentCountByPostId.get(comment.post_id) ?? 0) + 1
      );
    }
  }

  // =====================================================
  // Ranking
  // =====================================================

  const rankedPosts: RankedPost[] = todaysPosts
    .map((post) => {
      const authorProfile = post.user_id ? profilesById.get(post.user_id) : null;
      const likesCount = likeCountByPostId.get(post.id) ?? 0;
      const commentsCount = commentCountByPostId.get(post.id) ?? 0;

      return {
        id: post.id,
        post_content: post.content ?? "",
        post_created_at: post.created_at,
        likes_count: likesCount,
        comments_count: commentsCount,
        relevance_score: getRelevanceScore(likesCount, commentsCount),
        author_id: post.user_id,
        author_username: authorProfile?.username ?? null,
        viewer_has_liked: viewerLikedPostIds.has(post.id),
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

      return (
        new Date(a.post_created_at).getTime() -
        new Date(b.post_created_at).getTime()
      );
    });

  const topTenPosts = rankedPosts.slice(0, 10);
  const podium = topTenPosts.slice(0, 3);
  const remainingTopPosts = topTenPosts.slice(3);

  // =====================================================
  // Render
  // =====================================================

  return (
    <>
      {/* Auto Refresh */}
      <Script id="leaderboard-auto-refresh" strategy="afterInteractive">
        {`
          window.setInterval(() => {
            window.location.reload();
          }, 15000);
        `}
      </Script>

      <NavBar user={navUser} />

      <main className="mx-auto max-w-6xl p-6">
        {/* Header */}


        {/* Admin Actions */}
        {navUser?.is_admin && (
          <details className="mb-8 rounded-2xl border border-gray-200 bg-white shadow-sm group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm font-semibold text-gray-900">
              <span>Admin Panel</span>
              <span className="text-lg text-gray-500 transition group-open:rotate-45">
                +
              </span>
            </summary>

            <div className="border-t border-gray-100 px-5 py-4">
              <FreezeDailyWinnersForm />
            </div>
          </details>
        )}

        {/* Empty State */}
        {rankedPosts.length === 0 ? (
          <div className="rounded-xl bg-white p-6 text-center text-gray-500 shadow">
            Heute gibt es noch keine Posts im Leaderboard.
          </div>
        ) : (
          <>
            {/* Podium */}
            <section className="mb-10">
              <div className="mb-4">
                <h2 className="text-2xl font-bold">Live-Podium</h2>
                <div>
                  <p className="text-sm text-gray-500">
                    Live-Ranking für heute, {formatDate(`${todayKey}T00:00:00`)}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3 md:items-end">
                {getPodiumPositions().map((position) => {
                  const post = podium[position - 1] ?? null;

                  return (
                    <LeaderboardPodiumCard
                      key={position}
                      position={position}
                      post={post}
                    />
                  );
                })}
              </div>
            </section>

            {/* Remaining Top Posts */}
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
                        className="rounded-2xl border border-gray-100 bg-white p-5 shadow"
                      >
                        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              Platz {position}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              Live im heutigen Leaderboard
                            </p>
                          </div>

                          <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700">
                            ⚡ {post.relevance_score}
                          </span>
                        </div>

                        <p className="mb-4 whitespace-pre-wrap break-words text-[16px] leading-7 text-gray-900">
                          {post.post_content}
                        </p>

                        <div className="mb-4 space-y-1 text-sm text-gray-600">
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
                            {formatDateTime(post.post_created_at)}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-3">
                          <div className="flex flex-wrap items-center gap-2 text-sm">
                            <span className="rounded-full bg-white px-3 py-1 text-gray-700 ring-1 ring-gray-200">
                              💡 {post.likes_count}
                            </span>
                            <span className="rounded-full bg-white px-3 py-1 text-gray-700 ring-1 ring-gray-200">
                              💬 {post.comments_count}
                            </span>
                          </div>
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