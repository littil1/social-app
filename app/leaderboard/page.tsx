import NavBar from "@/app/components/layout/navbar";
import { createClient } from "@/lib/supabase-server";
import LeaderboardPodiumCard from "@/app/components/leaderboard/LeaderboardPodiumCard";
import FreezeDailyWinnersForm from "@/app/components/leaderboard/FreezeDailyWinnersForm";
import type { ReactionCounts, ReactionType } from "@/types/feed";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// =====================================================
// Types
// =====================================================

type PostRow = {
  id: number;
  content: string | null;
  created_at: string;
  comments_count: number | null;
  user_id: string | null;
};

type ProfileRow = {
  id: string;
  username: string | null;
};

type CommentRow = {
  post_id: number | null;
};

type PostReactionRow = {
  post_id: number;
  user_id: string;
  reaction: ReactionType;
};

type RankedPost = {
  id: number;
  post_content: string;
  post_created_at: string;
  comments_count: number;
  relevance_score: number;
  author_id: string | null;
  author_username: string | null;
  reactions_count: number;
  reaction_counts: ReactionCounts;
  viewer_reaction: ReactionType | null;
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

function getRelevanceScore(reactionsCount: number, commentsCount: number) {
  return reactionsCount + commentsCount * 2;
}

function getPodiumPositions() {
  return [2, 1, 3] as const;
}

// =====================================================
// Page
// =====================================================

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
    .select("id, content, created_at, comments_count, user_id")
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
    const { data: reactionsData, error: reactionsError } = await supabase
      .from("post_reactions")
      .select("post_id, user_id, reaction")
      .in("post_id", postIds);

    if (reactionsError) {
      throw new Error(reactionsError.message);
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

  const rankedPosts: RankedPost[] = todaysPosts
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
        relevance_score: getRelevanceScore(reactionsCount, commentsCount),
        author_id: post.user_id,
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

  const podium = rankedPosts.slice(0, 3);

  return (
    <>
      <NavBar user={navUser} />

      <main className="mx-auto max-w-6xl p-6">
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

        {rankedPosts.length === 0 ? (
          <div className="rounded-xl bg-white p-6 text-center text-gray-500 shadow">
            Heute gibt es noch keine Posts im Leaderboard.
          </div>
        ) : (
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
        )}
      </main>
    </>
  );
}