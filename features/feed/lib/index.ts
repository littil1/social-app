import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  LIVE_LEADERBOARD_SIZE,
  compareDailyHistoricalRank,
  compareDailyLiveRank,
  getBaseScore,
  getLiveScore,
  getZurichDayRange,
} from "@/features/winners/lib/daily-ranking";
import { resolvePostCommentCounts } from "@/features/comments/lib/post-comment-counts";
import type {
  FeedPost,
  FeedResponse,
  HomeFeedData,
  ReactionCounts,
  ReactionType,
} from "@/shared/types/feed";
import type { Database } from "@/shared/types/database";

export const FEED_PAGE_SIZE = 10;
export const MAX_FEED_PAGE_SIZE = 30;

const OLDER_FEED_CANDIDATE_POOL_MIN = 120;
const OLDER_FEED_CANDIDATE_POOL_MULTIPLIER = 8;

type PostRow = Database["public"]["Tables"]["posts"]["Row"];
type FeedPostRow = Pick<PostRow, "id" | "content" | "created_at" | "user_id">;
type ModeratedFeedPostRow = FeedPostRow & {
  moderation_status: FeedPost["moderation_status"];
};
type PostReactionCountRow = {
  post_id: number;
  reaction: ReactionType;
};
type ViewerReactionRow = {
  post_id: number;
  reaction: ReactionType;
};
type PostBoostRow = {
  post_id: number;
};
type FeedCandidatePost = FeedPost & {
  live_score: number;
  base_score: number;
};
type FeedUserContext = {
  userId: string | null;
  viewerIsAdmin: boolean;
};

const FEED_POST_SELECT = "id, content, created_at, user_id, moderation_status";

function stripCandidateScores(post: FeedCandidatePost) {
  return {
    id: post.id,
    content: post.content,
    moderation_status: post.moderation_status,
    created_at: post.created_at,
    comments_count: post.comments_count,
    reactions_count: post.reactions_count,
    boost_count: post.boost_count,
    viewer_has_boosted: post.viewer_has_boosted,
    viewer_boost_available_today: post.viewer_boost_available_today,
    is_today_post: post.is_today_post,
    can_boost: post.can_boost,
    reaction_counts: post.reaction_counts,
    viewer_reaction: post.viewer_reaction,
    can_delete: post.can_delete,
    author_username: post.author_username,
    author_avatar_url: post.author_avatar_url,
    relevance_score: post.live_score,
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

function getTotalReactions(counts: ReactionCounts) {
  return counts.like + counts.funny + counts.wow + counts.fire;
}

function buildTodayFeed(todayCandidates: FeedCandidatePost[]) {
  const rankedToday = [...todayCandidates].sort((a, b) =>
    compareDailyLiveRank(
      {
        id: a.id,
        created_at: a.created_at,
        comments_count: a.comments_count,
        live_score: a.live_score,
      },
      {
        id: b.id,
        created_at: b.created_at,
        comments_count: b.comments_count,
        live_score: b.live_score,
      }
    )
  );

  const topThreeToday = rankedToday.slice(0, LIVE_LEADERBOARD_SIZE);
  const todayFeed = rankedToday.slice(LIVE_LEADERBOARD_SIZE);

  return {
    topThreeToday,
    todayFeed,
  };
}

function buildOlderFeed(
  olderCandidates: FeedCandidatePost[],
  olderOffset: number,
  olderLimit: number
) {
  const rankedOlderPosts = [...olderCandidates].sort((a, b) =>
    compareDailyHistoricalRank(
      {
        id: a.id,
        created_at: a.created_at,
        comments_count: a.comments_count,
        base_score: a.base_score,
      },
      {
        id: b.id,
        created_at: b.created_at,
        comments_count: b.comments_count,
        base_score: b.base_score,
      }
    )
  );

  return {
    olderFeed: rankedOlderPosts.slice(olderOffset, olderOffset + olderLimit),
    olderHasMore: olderOffset + olderLimit < rankedOlderPosts.length,
  };
}

function mapReactionCounts(reactions: PostReactionCountRow[]) {
  const reactionCountsMap = new Map<number, ReactionCounts>();

  for (const reaction of reactions) {
    const counts =
      reactionCountsMap.get(reaction.post_id) ?? createEmptyReactionCounts();

    counts[reaction.reaction] += 1;
    reactionCountsMap.set(reaction.post_id, counts);
  }

  return reactionCountsMap;
}

function mapViewerReactions(reactions: ViewerReactionRow[]) {
  const viewerReactionMap = new Map<number, ReactionType>();

  for (const reaction of reactions) {
    viewerReactionMap.set(reaction.post_id, reaction.reaction);
  }

  return viewerReactionMap;
}

function mapBoostCounts(boosts: PostBoostRow[]) {
  const boostCountsMap = new Map<number, number>();

  for (const boost of boosts) {
    boostCountsMap.set(boost.post_id, (boostCountsMap.get(boost.post_id) ?? 0) + 1);
  }

  return boostCountsMap;
}

async function loadReactionCountsMap(
  supabase: SupabaseClient<Database>,
  postIds: number[]
) {
  if (postIds.length === 0) {
    return new Map<number, ReactionCounts>();
  }

  const reactionCountsResult = await supabase
    .from("post_reactions")
    .select("post_id, reaction")
    .in("post_id", postIds);

  if (reactionCountsResult.error) {
    throw new Error(reactionCountsResult.error.message);
  }

  return mapReactionCounts(
    (reactionCountsResult.data ?? []) as PostReactionCountRow[]
  );
}

async function loadViewerReactionMap(
  supabase: SupabaseClient<Database>,
  postIds: number[],
  userId: string | null
) {
  if (!userId || postIds.length === 0) {
    return new Map<number, ReactionType>();
  }

  const viewerReactionsResult = await supabase
    .from("post_reactions")
    .select("post_id, reaction")
    .in("post_id", postIds)
    .eq("user_id", userId);

  if (viewerReactionsResult.error) {
    throw new Error(viewerReactionsResult.error.message);
  }

  return mapViewerReactions(
    (viewerReactionsResult.data ?? []) as ViewerReactionRow[]
  );
}

async function loadBoostCountsMap(
  supabase: SupabaseClient<Database>,
  postIds: number[]
) {
  if (postIds.length === 0) {
    return new Map<number, number>();
  }

  const boostCountsResult = await supabase
    .from("post_boosts")
    .select("post_id")
    .in("post_id", postIds);

  if (boostCountsResult.error) {
    throw new Error(boostCountsResult.error.message);
  }

  return mapBoostCounts((boostCountsResult.data ?? []) as PostBoostRow[]);
}

async function loadViewerBoostedPostId(
  supabase: SupabaseClient<Database>,
  userId: string | null,
  dayKey: string
) {
  if (!userId) {
    return null;
  }

  const viewerBoostResult = await supabase
    .from("post_boosts")
    .select("post_id")
    .eq("user_id", userId)
    .eq("day_key", dayKey)
    .maybeSingle();

  if (viewerBoostResult.error) {
    throw new Error(viewerBoostResult.error.message);
  }

  return viewerBoostResult.data?.post_id ?? null;
}

function toFeedCandidatePost(
  post: ModeratedFeedPostRow,
  userId: string | null,
  viewerIsAdmin: boolean,
  reactionCountsMap: Map<number, ReactionCounts>,
  viewerReactionMap: Map<number, ReactionType>,
  commentCountMap: Map<number, number>,
  boostCountsMap: Map<number, number>,
  viewerBoostedPostId: number | null,
  todayStartIso: string
): FeedCandidatePost {
  const reactionCounts =
    reactionCountsMap.get(post.id) ?? createEmptyReactionCounts();
  const reactionsTotal = getTotalReactions(reactionCounts);
  const commentsCount = commentCountMap.get(post.id) ?? 0;
  const boostCount = boostCountsMap.get(post.id) ?? 0;
  const isTodayPost = post.created_at >= todayStartIso;
  const viewerHasBoosted = viewerBoostedPostId === post.id;
  const viewerBoostAvailableToday = viewerBoostedPostId === null;
  const canBoost =
    isTodayPost && (viewerHasBoosted || viewerBoostAvailableToday);

  return {
    id: post.id,
    content: post.content ?? "",
    moderation_status: post.moderation_status ?? "clean",
    created_at: post.created_at,
    comments_count: commentsCount,
    reactions_count: reactionsTotal,
    boost_count: boostCount,
    viewer_has_boosted: viewerHasBoosted,
    viewer_boost_available_today: viewerBoostAvailableToday,
    is_today_post: isTodayPost,
    can_boost: canBoost,
    reaction_counts: reactionCounts,
    viewer_reaction: viewerReactionMap.get(post.id) ?? null,
    can_delete: !!userId && (post.user_id === userId || viewerIsAdmin),
    author_username: null,
    author_avatar_url: null,
    live_score: getLiveScore({
      reactionsTotal,
      commentsCount,
      boostCount,
      createdAt: post.created_at,
    }),
    base_score: getBaseScore({
      reactionsTotal,
      commentsCount,
      boostCount,
    }),
  };
}

async function getFeedUserContext(
  supabase: SupabaseClient<Database>
): Promise<FeedUserContext> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      userId: null,
      viewerIsAdmin: false,
    };
  }

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  return {
    userId: user.id,
    viewerIsAdmin: profileData?.is_admin ?? false,
  };
}

async function loadFeedCandidates(
  supabase: SupabaseClient<Database>,
  olderOffset: number,
  olderLimit: number
) {
  const { dayKey, startIso } = getZurichDayRange(new Date());
  const olderCandidatePoolSize = Math.max(
    (olderOffset + olderLimit) * OLDER_FEED_CANDIDATE_POOL_MULTIPLIER,
    OLDER_FEED_CANDIDATE_POOL_MIN
  );
  const [
    { data: todaysPostsData, error: todaysPostsError },
    { data: olderPostsData, error: olderPostsError },
  ] = await Promise.all([
    supabase
      .from("posts")
      .select(FEED_POST_SELECT)
      .gte("created_at", startIso)
      .order("created_at", { ascending: false }),
    supabase
      .from("posts")
      .select(FEED_POST_SELECT)
      .lt("created_at", startIso)
      .order("created_at", { ascending: false })
      .range(0, olderCandidatePoolSize - 1),
  ]);

  if (todaysPostsError) {
    throw new Error(todaysPostsError.message);
  }

  if (olderPostsError) {
    throw new Error(olderPostsError.message);
  }

  const todaysPosts = (todaysPostsData ?? []) as ModeratedFeedPostRow[];
  const olderPosts = (olderPostsData ?? []) as ModeratedFeedPostRow[];
  const allCandidates = [...todaysPosts, ...olderPosts];

  if (allCandidates.length === 0) {
    return {
      todaysPosts,
      olderPosts,
      postIds: [] as number[],
      reactionCountsMap: new Map<number, ReactionCounts>(),
      boostCountsMap: new Map<number, number>(),
      commentCountMap: new Map<number, number>(),
      dayKey,
      startIso,
    };
  }

  const postIds = allCandidates.map((post) => post.id);
  const [reactionCountsMap, boostCountsMap, commentCountMap] = await Promise.all([
    loadReactionCountsMap(supabase, postIds),
    loadBoostCountsMap(supabase, postIds),
    resolvePostCommentCounts(supabase, allCandidates),
  ]);

  return {
    todaysPosts,
    olderPosts,
    postIds,
    reactionCountsMap,
    boostCountsMap,
    commentCountMap,
    dayKey,
    startIso,
  };
}

async function loadTodayFeedCandidates(
  supabase: SupabaseClient<Database>
) {
  const { dayKey, startIso } = getZurichDayRange(new Date());
  const { data: todaysPostsData, error: todaysPostsError } = await supabase
    .from("posts")
    .select(FEED_POST_SELECT)
    .gte("created_at", startIso)
    .order("created_at", { ascending: false });

  if (todaysPostsError) {
    throw new Error(todaysPostsError.message);
  }

  const todaysPosts = (todaysPostsData ?? []) as ModeratedFeedPostRow[];

  if (todaysPosts.length === 0) {
    return {
      todaysPosts,
      postIds: [] as number[],
      reactionCountsMap: new Map<number, ReactionCounts>(),
      boostCountsMap: new Map<number, number>(),
      commentCountMap: new Map<number, number>(),
      dayKey,
      startIso,
    };
  }

  const postIds = todaysPosts.map((post) => post.id);
  const [reactionCountsMap, boostCountsMap, commentCountMap] = await Promise.all([
    loadReactionCountsMap(supabase, postIds),
    loadBoostCountsMap(supabase, postIds),
    resolvePostCommentCounts(supabase, todaysPosts),
  ]);

  return {
    todaysPosts,
    postIds,
    reactionCountsMap,
    boostCountsMap,
    commentCountMap,
    dayKey,
    startIso,
  };
}

async function loadOlderFeedCandidates(
  supabase: SupabaseClient<Database>,
  olderOffset: number,
  olderLimit: number
) {
  const { dayKey, startIso } = getZurichDayRange(new Date());
  const olderCandidatePoolSize = Math.max(
    (olderOffset + olderLimit) * OLDER_FEED_CANDIDATE_POOL_MULTIPLIER,
    OLDER_FEED_CANDIDATE_POOL_MIN
  );
  const { data: olderPostsData, error: olderPostsError } = await supabase
    .from("posts")
    .select(FEED_POST_SELECT)
    .lt("created_at", startIso)
    .order("created_at", { ascending: false })
    .range(0, olderCandidatePoolSize - 1);

  if (olderPostsError) {
    throw new Error(olderPostsError.message);
  }

  const olderPosts = (olderPostsData ?? []) as ModeratedFeedPostRow[];

  if (olderPosts.length === 0) {
    return {
      olderPosts,
      postIds: [] as number[],
      reactionCountsMap: new Map<number, ReactionCounts>(),
      boostCountsMap: new Map<number, number>(),
      commentCountMap: new Map<number, number>(),
      dayKey,
      startIso,
    };
  }

  const postIds = olderPosts.map((post) => post.id);
  const [reactionCountsMap, boostCountsMap, commentCountMap] = await Promise.all([
    loadReactionCountsMap(supabase, postIds),
    loadBoostCountsMap(supabase, postIds),
    resolvePostCommentCounts(supabase, olderPosts),
  ]);

  return {
    olderPosts,
    postIds,
    reactionCountsMap,
    boostCountsMap,
    commentCountMap,
    dayKey,
    startIso,
  };
}

export async function getHomeFeedData(
  olderOffset = 0,
  olderLimit = FEED_PAGE_SIZE
): Promise<HomeFeedData> {
  const supabase = await createClient();
  const [{ userId, viewerIsAdmin }, candidates] = await Promise.all([
    getFeedUserContext(supabase),
    loadFeedCandidates(supabase, olderOffset, olderLimit),
  ]);
  const viewerReactionMap = await loadViewerReactionMap(
    supabase,
    candidates.postIds,
    userId
  );
  const viewerBoostedPostId = await loadViewerBoostedPostId(
    supabase,
    userId,
    candidates.dayKey
  );
  const todayCandidates = candidates.todaysPosts.map((post) =>
    toFeedCandidatePost(
      post,
      userId,
      viewerIsAdmin,
      candidates.reactionCountsMap,
      viewerReactionMap,
      candidates.commentCountMap,
      candidates.boostCountsMap,
      viewerBoostedPostId,
      candidates.startIso
    )
  );
  const olderCandidates = candidates.olderPosts.map((post) =>
    toFeedCandidatePost(
      post,
      userId,
      viewerIsAdmin,
      candidates.reactionCountsMap,
      viewerReactionMap,
      candidates.commentCountMap,
      candidates.boostCountsMap,
      viewerBoostedPostId,
      candidates.startIso
    )
  );
  const todaySection = buildTodayFeed(todayCandidates);
  const olderSection = buildOlderFeed(olderCandidates, olderOffset, olderLimit);

  return {
    topThreeToday: todaySection.topThreeToday.map(
      stripCandidateScores
    ),
    todayFeed: todaySection.todayFeed.map(
      stripCandidateScores
    ),
    olderFeed: olderSection.olderFeed.map(
      stripCandidateScores
    ),
    olderHasMore: olderSection.olderHasMore,
  };
}

export async function getLeaderboardTopThreeData(): Promise<FeedPost[]> {
  const supabase = await createClient();
  const [{ userId, viewerIsAdmin }, candidates] = await Promise.all([
    getFeedUserContext(supabase),
    loadTodayFeedCandidates(supabase),
  ]);
  const viewerReactionMap = await loadViewerReactionMap(
    supabase,
    candidates.postIds,
    userId
  );
  const viewerBoostedPostId = await loadViewerBoostedPostId(
    supabase,
    userId,
    candidates.dayKey
  );
  const todayCandidates = candidates.todaysPosts.map((post) =>
    toFeedCandidatePost(
      post,
      userId,
      viewerIsAdmin,
      candidates.reactionCountsMap,
      viewerReactionMap,
      candidates.commentCountMap,
      candidates.boostCountsMap,
      viewerBoostedPostId,
      candidates.startIso
    )
  );
  const todaySection = buildTodayFeed(todayCandidates);

  return todaySection.topThreeToday.map(stripCandidateScores);
}

export async function getOlderFeedPage(
  offset = 0,
  limit = FEED_PAGE_SIZE
): Promise<FeedResponse> {
  const supabase = await createClient();
  const [{ userId, viewerIsAdmin }, candidates] = await Promise.all([
    getFeedUserContext(supabase),
    loadOlderFeedCandidates(supabase, offset, limit),
  ]);
  const viewerReactionMap = await loadViewerReactionMap(
    supabase,
    candidates.postIds,
    userId
  );
  const viewerBoostedPostId = await loadViewerBoostedPostId(
    supabase,
    userId,
    candidates.dayKey
  );
  const olderCandidates = candidates.olderPosts.map((post) =>
    toFeedCandidatePost(
      post,
      userId,
      viewerIsAdmin,
      candidates.reactionCountsMap,
      viewerReactionMap,
      candidates.commentCountMap,
      candidates.boostCountsMap,
      viewerBoostedPostId,
      candidates.startIso
    )
  );
  const olderSection = buildOlderFeed(olderCandidates, offset, limit);

  return {
    posts: olderSection.olderFeed.map(stripCandidateScores),
    hasMore: olderSection.olderHasMore,
  };
}


