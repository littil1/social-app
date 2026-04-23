import { Suspense } from "react";
import NavBar from "@/components/layout/navbar";
import { createClient } from "@/lib/supabase/server";
import { getLiveScore, getZurichDayRange } from "@/lib/winners/daily-ranking";
import LeaderboardLiveHeader from "@/components/leaderboard/LeaderboardLiveHeader";
import LeaderboardPodiumSection from "@/components/leaderboard/LeaderboardPodiumSection";
import HomeFeed from "@/components/posts/HomeFeed";
import LoginCta from "@/components/auth/LoginCta";
import {
  FEED_PAGE_SIZE,
  getHomeFeedData,
  getLeaderboardTopThreeData,
} from "@/lib/feed";
import type {
  FeedPost,
  HomeFeedData,
  ReactionCounts,
  ReactionType,
} from "@/types/feed";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

function getDesktopPodiumPositions() {
  return [2, 1, 3] as const;
}

function getMobilePodiumPositions() {
  return [1, 2, 3] as const;
}

function toRankedPost(post: FeedPost): RankedPost {
  const liveScore =
    typeof post.relevance_score === "number"
      ? post.relevance_score
      : getLiveScore({
          reactionsTotal: post.reactions_count,
          commentsCount: post.comments_count,
          createdAt: post.created_at,
        });

  return {
    id: post.id,
    post_content: post.content,
    post_created_at: post.created_at,
    comments_count: post.comments_count,
    relevance_score: liveScore,
    author_username: post.author_username,
    reactions_count: post.reactions_count,
    reaction_counts: post.reaction_counts,
    viewer_reaction: post.viewer_reaction,
    points_to_higher_rank: null,
    lead_over_next_rank: null,
  };
}

async function LeaderboardFeedSection({
  homeFeedDataPromise,
  isLoggedIn,
}: {
  homeFeedDataPromise: Promise<HomeFeedData>;
  isLoggedIn: boolean;
}) {
  const homeFeedData = await homeFeedDataPromise;

  return (
    <section className="mx-auto w-full max-w-5xl">
      <HomeFeed
        initialTopThreeToday={homeFeedData.topThreeToday}
        initialTodayFeed={homeFeedData.todayFeed}
        initialOlderFeed={homeFeedData.olderFeed}
        initialOlderHasMore={homeFeedData.olderHasMore}
        pageSize={FEED_PAGE_SIZE}
        isLoggedIn={isLoggedIn}
        showTopSection={false}
      />
    </section>
  );
}

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const leaderboardTopThreePromise = getLeaderboardTopThreeData();
  const homeFeedDataPromise = getHomeFeedData(0, FEED_PAGE_SIZE);

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

  const { dayKey: todayKey } = getZurichDayRange(new Date());
  const topThreeToday = await leaderboardTopThreePromise;
  const hasPostsToday = topThreeToday.length > 0;
  const baseRankedPosts = topThreeToday.map((post) =>
    toRankedPost(post)
  );
  const rankedPosts: RankedPost[] = baseRankedPosts.map((post, index, array) => {
    const higherRankPost = index > 0 ? array[index - 1] : null;
    const lowerRankPost = index < array.length - 1 ? array[index + 1] : null;

    return {
      ...post,
      points_to_higher_rank: higherRankPost
        ? Math.max(
            1,
            Math.ceil(higherRankPost.relevance_score - post.relevance_score)
          )
        : null,
      lead_over_next_rank: lowerRankPost
        ? Math.max(
            0,
            Math.ceil(post.relevance_score - lowerRankPost.relevance_score)
          )
        : null,
    };
  });
  const podiumByPosition: Record<1 | 2 | 3, RankedPost | null> = {
    1: rankedPosts[0] ?? null,
    2: rankedPosts[1] ?? null,
    3: rankedPosts[2] ?? null,
  };
  const desktopPodium = getDesktopPodiumPositions().map((position) => ({
    position,
    post: podiumByPosition[position],
  }));
  const mobilePodium = getMobilePodiumPositions().map((position) => ({
    position,
    post: podiumByPosition[position],
  }));
  const todayLabel = formatDate(`${todayKey}T00:00:00`);

  return (
    <>
      <NavBar user={navUser} />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-4 sm:px-6 sm:py-6 lg:gap-8 lg:px-8 lg:py-6">
        {!user && <LoginCta />}

        {hasPostsToday && (
          <div className="flex flex-col gap-6 lg:gap-8">
            <LeaderboardLiveHeader todayLabel={todayLabel} />
            <LeaderboardPodiumSection
              mobileItems={mobilePodium}
              desktopItems={desktopPodium}
              isLoggedIn={!!user}
            />
          </div>
        )}

        <Suspense fallback={<section className="mx-auto w-full max-w-5xl" />}>
          <LeaderboardFeedSection
            homeFeedDataPromise={homeFeedDataPromise}
            isLoggedIn={!!user}
          />
        </Suspense>
      </main>
    </>
  );
}

