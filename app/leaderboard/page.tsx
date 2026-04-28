import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getLiveScore, getZurichDayRange } from "@/features/winners/lib/daily-ranking";
import LeaderboardLiveHeader from "@/features/leaderboard/components/LeaderboardLiveHeader";
import LeaderboardPodiumSection from "@/features/leaderboard/components/LeaderboardPodiumSection";
import HomeFeed from "@/features/feed/components/HomeFeed";
import LoginCta from "@/features/auth/components/LoginCta";
import {
  FEED_PAGE_SIZE,
  getHomeFeedData,
} from "@/features/feed/lib";
import { KNOW_EVERYTHING_BADGE_KEY } from "@/features/badges/lib/profile-badges";
import type {
  FeedPost,
  HomeFeedData,
  ReactionCounts,
  ReactionType,
} from "@/shared/types/feed";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RankedPost = {
  id: number;
  post_content: string;
  post_created_at: string;
  comments_count: number;
  relevance_score: number;
  author_username: string | null;
  author_avatar_url: string | null;
  reactions_count: number;
  reaction_counts: ReactionCounts;
  viewer_reaction: ReactionType | null;
  can_delete: boolean;
  points_to_higher_rank: number | null;
  lead_over_next_rank: number | null;
};

function formatDate(dateString: string) {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}.${month}.${year}`;
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
    author_avatar_url: post.author_avatar_url,
    reactions_count: post.reactions_count,
    reaction_counts: post.reaction_counts,
    viewer_reaction: post.viewer_reaction,
    can_delete: post.can_delete,
    points_to_higher_rank: null,
    lead_over_next_rank: null,
  };
}

async function LeaderboardFeedSection({
  homeFeedDataPromise,
  isLoggedIn,
  hasKnowEverythingBadge,
}: {
  homeFeedDataPromise: Promise<HomeFeedData>;
  isLoggedIn: boolean;
  hasKnowEverythingBadge: boolean;
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
        initialHasKnowEverythingBadge={hasKnowEverythingBadge}
        showTopSection={false}
      />
    </section>
  );
}

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const userPromise = supabase.auth.getUser();
  const homeFeedDataPromise = getHomeFeedData(0, FEED_PAGE_SIZE);
  const {
    data: { user },
  } = await userPromise;

  let hasKnowEverythingBadge = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("badges")
      .eq("id", user.id)
      .maybeSingle();

    hasKnowEverythingBadge = Array.isArray(profile?.badges)
      ? profile.badges.includes(KNOW_EVERYTHING_BADGE_KEY)
      : false;
  }

  const { dayKey: todayKey } = getZurichDayRange(new Date());
  const homeFeedData = await homeFeedDataPromise;
  const topThreeToday = homeFeedData.topThreeToday;
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
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pb-28 pt-4 sm:px-6 sm:py-6 lg:gap-7 lg:px-8 lg:py-6">
      {!user && <LoginCta />}

      {hasPostsToday && (
        <div className="flex flex-col gap-4 lg:gap-6">
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
          homeFeedDataPromise={Promise.resolve(homeFeedData)}
          isLoggedIn={!!user}
          hasKnowEverythingBadge={hasKnowEverythingBadge}
        />
      </Suspense>
    </main>
  );
}


