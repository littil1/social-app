import NavBar from "@/app/components/layout/navbar";
import { createClient } from "@/lib/supabase-server";
import FreezeDailyWinnersForm from "@/app/components/leaderboard/FreezeDailyWinnersForm";
import LeaderboardLiveHeader from "@/app/components/leaderboard/LeaderboardLiveHeader";
import LeaderboardPodiumCard from "@/app/components/leaderboard/LeaderboardPodiumCard";
import LeaderboardPodiumCarousel from "@/app/components/leaderboard/LeaderboardPodiumCarousel";
import type { Database } from "@/types/database";
import type { ReactionCounts } from "@/types/feed";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// =====================================================
// Types
// =====================================================

type PostRow = Pick<
  Database["public"]["Tables"]["posts"]["Row"],
  "id" | "content" | "created_at" | "user_id"
>;

type ProfileRow = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "username"
>;

type CommentRow = Pick<Database["public"]["Tables"]["comments"]["Row"], "post_id">;

type PostReactionRow = Pick<
  Database["public"]["Tables"]["post_reactions"]["Row"],
  "post_id" | "user_id" | "reaction"
>;

type ReactionType = Database["public"]["Enums"]["reaction_type"];

type RankedPost = {
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
  post: RankedPost | null;
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

function getZurichDayKey(date: Date | string) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Zurich",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
}

function getZurichDayRange(date: Date | string) {
  const base = new Date(date);
  const dayKey = getZurichDayKey(base);

  const start = new Date(`${dayKey}T00:00:00+01:00`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return {
    dayKey,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

function createEmptyReactionCounts(): ReactionCounts {
  return {
    like: 0,
    funny: 0,
    wow: 0,
    fire: 0,
  };
}

function getReactionsCount(counts: ReactionCounts) {
  return counts.like + counts.funny + counts.wow + counts.fire;
}

function getLeaderboardScore(reactionsCount: number, commentsCount: number) {
  return reactionsCount + commentsCount * 2;
}

function getDesktopPodiumPositions() {
  return [2, 1, 3] as const;
}

function getMobilePodiumPositions() {
  return [1, 2, 3] as const;
}

// =====================================================
// Page
// =====================================================

export default async function LeaderboardPage() {
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

  const { dayKey: todayKey, startIso, endIso } = getZurichDayRange(new Date());

  const { data: postsData, error: postsError } = await supabase
    .from("posts")
    .select("id, content, created_at, user_id")
    .gte("created_at", startIso)
    .lt("created_at", endIso)
    .order("created_at", { ascending: false });

  if (postsError) {
    throw new Error(postsError.message);
  }

  const todaysPosts = (postsData ?? []) as PostRow[];
  const hasPostsToday = todaysPosts.length > 0;

  const postIds = todaysPosts.map((post) => post.id);

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

  const reactionCountsByPostId = new Map<number, ReactionCounts>();
  const viewerReactionByPostId = new Map<number, ReactionType>();
  const commentCountByPostId = new Map<number, number>();

  if (postIds.length > 0) {
    const [
      { data: reactionsData, error: reactionsError },
      { data: commentsData, error: commentsError },
    ] = await Promise.all([
      supabase
        .from("post_reactions")
        .select("post_id, user_id, reaction")
        .in("post_id", postIds),
      supabase.from("comments").select("post_id").in("post_id", postIds),
    ]);

    if (reactionsError) {
      throw new Error(reactionsError.message);
    }

    if (commentsError) {
      throw new Error(commentsError.message);
    }

    for (const reaction of (reactionsData ?? []) as PostReactionRow[]) {
      const counts =
        reactionCountsByPostId.get(reaction.post_id) ??
        createEmptyReactionCounts();

      counts[reaction.reaction] += 1;
      reactionCountsByPostId.set(reaction.post_id, counts);

      if (user && reaction.user_id === user.id) {
        viewerReactionByPostId.set(reaction.post_id, reaction.reaction);
      }
    }

    for (const comment of (commentsData ?? []) as CommentRow[]) {
      commentCountByPostId.set(
        comment.post_id,
        (commentCountByPostId.get(comment.post_id) ?? 0) + 1
      );
    }
  }

  // =====================================================
  // Ranking
  // =====================================================

  const baseRankedPosts = todaysPosts
    .map((post) => {
      const authorProfile = post.user_id ? profilesById.get(post.user_id) : null;
      const reactionCounts =
        reactionCountsByPostId.get(post.id) ?? createEmptyReactionCounts();
      const reactionsCount = getReactionsCount(reactionCounts);
      const commentsCount = commentCountByPostId.get(post.id) ?? 0;

      return {
        id: post.id,
        post_content: post.content ?? "",
        post_created_at: post.created_at,
        comments_count: commentsCount,
        relevance_score: getLeaderboardScore(reactionsCount, commentsCount),
        author_username: authorProfile?.username ?? null,
        reactions_count: reactionsCount,
        reaction_counts: reactionCounts,
        viewer_reaction: viewerReactionByPostId.get(post.id) ?? null,
      };
    })
    .sort((a, b) => {
      if (b.relevance_score !== a.relevance_score) {
        return b.relevance_score - a.relevance_score;
      }

      if (b.reactions_count !== a.reactions_count) {
        return b.reactions_count - a.reactions_count;
      }

      if (b.comments_count !== a.comments_count) {
        return b.comments_count - a.comments_count;
      }

      return (
        new Date(a.post_created_at).getTime() -
        new Date(b.post_created_at).getTime()
      );
    });

  const rankedPosts: RankedPost[] = baseRankedPosts.map((post, index, array) => {
    const higherRankPost = index > 0 ? array[index - 1] : null;
    const lowerRankPost = index < array.length - 1 ? array[index + 1] : null;

    return {
      ...post,
      points_to_higher_rank: higherRankPost
        ? Math.max(1, higherRankPost.relevance_score - post.relevance_score)
        : null,
      lead_over_next_rank: lowerRankPost
        ? Math.max(0, post.relevance_score - lowerRankPost.relevance_score)
        : null,
    };
  });

  const podiumByPosition: Record<1 | 2 | 3, RankedPost | null> = {
    1: rankedPosts[0] ?? null,
    2: rankedPosts[1] ?? null,
    3: rankedPosts[2] ?? null,
  };

  const desktopPodium: PodiumEntry[] = getDesktopPodiumPositions().map(
    (position) => ({
      position,
      post: podiumByPosition[position],
    })
  );

  const mobilePodium: PodiumEntry[] = getMobilePodiumPositions().map(
    (position) => ({
      position,
      post: podiumByPosition[position],
    })
  );

  const todayLabel = formatDate(`${todayKey}T00:00:00`);

  // =====================================================
  // Render
  // =====================================================

  return (
    <>
      <NavBar user={navUser} />

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-4 sm:px-6 sm:py-6 lg:min-h-[calc(100vh-110px)] lg:gap-6 lg:px-8 lg:py-6">
        {navUser?.is_admin && (
          <details className="rounded-3xl border border-gray-200 bg-white shadow-sm group">
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

        {!hasPostsToday ? (
          <section className="relative overflow-hidden rounded-[32px] border border-emerald-100 bg-gradient-to-br from-white via-emerald-50/70 to-sky-100/60 p-6 shadow-[0_30px_80px_-40px_rgba(16,185,129,0.25)] sm:p-10">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute left-8 top-8 h-24 w-24 rounded-full bg-emerald-200/40 blur-3xl" />
              <div className="absolute bottom-0 right-0 h-32 w-32 rounded-full bg-sky-200/40 blur-3xl" />
            </div>

            <div className="relative mx-auto max-w-2xl text-center">
              <div className="mb-4 inline-flex rounded-full border border-emerald-200 bg-white/85 px-4 py-1.5 text-sm font-semibold text-emerald-900 backdrop-blur">
                Live-Leaderboard
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-gray-950 sm:text-5xl">
                Heute gibt es noch keine Beiträge im Rennen
              </h1>

              <p className="mt-4 text-sm leading-6 text-gray-700 sm:text-base sm:leading-7">
                Sobald heute Beiträge veröffentlicht werden, startet hier das
                Live-Ranking des Tages.
              </p>
            </div>
          </section>
        ) : (
          <section className="flex min-h-0 flex-1 flex-col gap-5 lg:gap-6">
            <LeaderboardLiveHeader todayLabel={todayLabel} />

            <section className="flex min-h-0 flex-1 flex-col gap-4 lg:gap-5">
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                  Tagesrennen
                </p>
                <h2 className="text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl">
                  Live-Podium
                </h2>
                <p className="max-w-2xl text-sm leading-6 text-gray-600 sm:text-base">
                  Jede Reaction und jeder Kommentar kann das Ranking bis
                  Mitternacht verändern.
                </p>
              </div>

              <div className="md:hidden">
                <LeaderboardPodiumCarousel
                  items={mobilePodium}
                  isLoggedIn={!!user}
                />
              </div>

              <div className="hidden min-h-0 flex-1 md:grid md:grid-cols-3 md:items-end md:gap-4 lg:gap-5">
                {desktopPodium.map((entry) => (
                  <LeaderboardPodiumCard
                    key={entry.position}
                    position={entry.position}
                    post={entry.post}
                    isLoggedIn={!!user}
                  />
                ))}
              </div>
            </section>
          </section>
        )}
      </main>
    </>
  );
}