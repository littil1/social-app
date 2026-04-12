import NavBar from "@/app/components/layout/navbar";
import { createClient } from "@/lib/supabase-server";
import LeaderboardLiveHeader from "@/app/components/leaderboard/LeaderboardLiveHeader";
import LeaderboardPodiumCard from "@/app/components/leaderboard/LeaderboardPodiumCard";
import LeaderboardPodiumCarousel from "@/app/components/leaderboard/LeaderboardPodiumCarousel";
import HomeFeed from "@/app/components/posts/HomeFeed";
import LoginCta from "@/app/components/auth/LoginCta";
import { FEED_PAGE_SIZE, getFeedPage } from "@/lib/feed";
import type { Database } from "@/types/database";
import type { ReactionCounts } from "@/types/feed";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PostRow = Pick<
  Database["public"]["Tables"]["posts"]["Row"],
  "id" | "content" | "created_at" | "user_id"
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
  return { dayKey, startIso: start.toISOString(), endIso: end.toISOString() };
}

function createEmptyReactionCounts(): ReactionCounts {
  return { like: 0, funny: 0, wow: 0, fire: 0 };
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

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let navUser = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, avatar_url, is_admin")
      .eq("id", user.id)
      .maybeSingle();
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

  if (postsError) throw new Error(postsError.message);

  const todaysPosts = (postsData ?? []) as PostRow[];
  const hasPostsToday = todaysPosts.length > 0;
  const postIds = todaysPosts.map((post) => post.id);
  
  const reactionCountsByPostId = new Map<number, ReactionCounts>();
  const viewerReactionByPostId = new Map<number, ReactionType>();
  const commentCountByPostId = new Map<number, number>();

  if (postIds.length > 0) {
    const [{ data: reactionsData }, { data: commentsData }] = await Promise.all([
      supabase.from("post_reactions").select("post_id, user_id, reaction").in("post_id", postIds),
      supabase.from("comments").select("post_id").in("post_id", postIds),
    ]);

    (reactionsData ?? []).forEach((reaction: any) => {
      const counts = reactionCountsByPostId.get(reaction.post_id) ?? createEmptyReactionCounts();
      counts[reaction.reaction as keyof ReactionCounts] += 1;
      reactionCountsByPostId.set(reaction.post_id, counts);
      if (user && reaction.user_id === user.id) viewerReactionByPostId.set(reaction.post_id, reaction.reaction);
    });

    (commentsData ?? []).forEach((comment: any) => {
      commentCountByPostId.set(comment.post_id, (commentCountByPostId.get(comment.post_id) ?? 0) + 1);
    });
  }

  const baseRankedPosts = todaysPosts.map((post) => {
    const reactionCounts = reactionCountsByPostId.get(post.id) ?? createEmptyReactionCounts();
    const reactionsCount = getReactionsCount(reactionCounts);
    const commentsCount = commentCountByPostId.get(post.id) ?? 0;
    return {
      id: post.id,
      post_content: post.content ?? "",
      post_created_at: post.created_at,
      comments_count: commentsCount,
      relevance_score: getLeaderboardScore(reactionsCount, commentsCount),
      author_username: null,
      reactions_count: reactionsCount,
      reaction_counts: reactionCounts,
      viewer_reaction: viewerReactionByPostId.get(post.id) ?? null,
    };
  }).sort((a, b) => b.relevance_score - a.relevance_score);

  const rankedPosts: RankedPost[] = baseRankedPosts.map((post, index, array) => {
    const higherRankPost = index > 0 ? array[index - 1] : null;
    const lowerRankPost = index < array.length - 1 ? array[index + 1] : null;
    return {
      ...post,
      points_to_higher_rank: higherRankPost ? Math.max(1, higherRankPost.relevance_score - post.relevance_score) : null,
      lead_over_next_rank: lowerRankPost ? Math.max(0, post.relevance_score - lowerRankPost.relevance_score) : null,
    };
  });

  const podiumByPosition: Record<1 | 2 | 3, RankedPost | null> = {
    1: rankedPosts[0] ?? null,
    2: rankedPosts[1] ?? null,
    3: rankedPosts[2] ?? null,
  };

  const desktopPodium = getDesktopPodiumPositions().map(pos => ({ position: pos, post: podiumByPosition[pos] }));
  const mobilePodium = getMobilePodiumPositions().map(pos => ({ position: pos, post: podiumByPosition[pos] }));

  const todayLabel = formatDate(`${todayKey}T00:00:00`);
  const initialPosts = await getFeedPage(0, FEED_PAGE_SIZE);

  return (
    <>
      <NavBar user={navUser} />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-4 sm:px-6 sm:py-6 lg:gap-8 lg:px-8 lg:py-6">
        {!user && <LoginCta />}

        {hasPostsToday && (
          <div className="flex flex-col gap-6 lg:gap-8">
            <LeaderboardLiveHeader todayLabel={todayLabel} />
            <section className="flex flex-col gap-4 lg:gap-5">
              <div className="md:hidden">
                <LeaderboardPodiumCarousel items={mobilePodium} isLoggedIn={!!user} />
              </div>
              <div className="hidden md:grid md:grid-cols-3 md:items-end md:gap-4 lg:gap-5">
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
          </div>
        )}

        <section className="mx-auto w-full max-w-5xl">
          <HomeFeed
            initialPosts={initialPosts}
            pageSize={FEED_PAGE_SIZE}
            isLoggedIn={!!user}
            currentUserProfile={navUser ? { username: navUser.username, avatar_url: navUser.avatar_url } : null}
            showTopSection={!hasPostsToday} 
          />
        </section>
      </main>
    </>
  );
}