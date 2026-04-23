import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  LIVE_LEADERBOARD_SIZE,
  compareDailyHistoricalRank,
  compareDailyLiveRank,
  getBaseScore,
  getLiveScore,
  getZurichDayRange,
} from "@/lib/winners/daily-ranking";
import { resolvePostCommentCounts } from "@/lib/comments/post-comment-counts";
import type {
  FeedPost,
  FeedResponse,
  HomeFeedData,
  ReactionCounts,
  ReactionType,
} from "@/types/feed";
import type { Database } from "@/types/database";

export const FEED_PAGE_SIZE = 10;
export const MAX_FEED_PAGE_SIZE = 30;

const OLDER_FEED_CANDIDATE_POOL_MIN = 120;
const OLDER_FEED_CANDIDATE_POOL_MULTIPLIER = 8;

type PostRow = Database["public"]["Tables"]["posts"]["Row"];
type FeedPostRow = Pick<PostRow, "id" | "content" | "created_at" | "user_id">;
type PostReactionCountRow = {
  post_id: number;
  reaction: ReactionType;
};
type ViewerReactionRow = {
  post_id: number;
  reaction: ReactionType;
};
type FeedCandidatePost = FeedPost & {
  live_score: number;
  base_score: number;
};
type FeedUserContext = {
  userId: string | null;
  viewerIsAdmin: boolean;
};

const FEED_POST_SELECT = "id, content, created_at, user_id";

function stripCandidateScores(post: FeedCandidatePost) {
  return {
    id: post.id,
    content: post.content,
    created_at: post.created_at,
    comments_count: post.comments_count,
    reactions_count: post.reactions_count,
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

function toFeedCandidatePost(
  post: FeedPostRow,
  userId: string | null,
  viewerIsAdmin: boolean,
  reactionCountsMap: Map<number, ReactionCounts>,
  viewerReactionMap: Map<number, ReactionType>,
  commentCountMap: Map<number, number>
): FeedCandidatePost {
  const reactionCounts =
    reactionCountsMap.get(post.id) ?? createEmptyReactionCounts();
  const reactionsTotal = getTotalReactions(reactionCounts);
  const commentsCount = commentCountMap.get(post.id) ?? 0;

  return {
    id: post.id,
    content: post.content ?? "",
    created_at: post.created_at,
    comments_count: commentsCount,
    reactions_count: reactionsTotal,
    reaction_counts: reactionCounts,
    viewer_reaction: viewerReactionMap.get(post.id) ?? null,
    can_delete: !!userId && (post.user_id === userId || viewerIsAdmin),
    author_username: null,
    author_avatar_url: null,
    live_score: getLiveScore({
      reactionsTotal,
      commentsCount,
      createdAt: post.created_at,
    }),
    base_score: getBaseScore({
      reactionsTotal,
      commentsCount,
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
  const { startIso } = getZurichDayRange(new Date());
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

  const todaysPosts = (todaysPostsData ?? []) as FeedPostRow[];
  const olderPosts = (olderPostsData ?? []) as FeedPostRow[];
  const allCandidates = [...todaysPosts, ...olderPosts];

  if (allCandidates.length === 0) {
    return {
      todaysPosts,
      olderPosts,
      postIds: [] as number[],
      reactionCountsMap: new Map<number, ReactionCounts>(),
      commentCountMap: new Map<number, number>(),
    };
  }

  const postIds = allCandidates.map((post) => post.id);
  const [reactionCountsMap, commentCountMap] = await Promise.all([
    loadReactionCountsMap(supabase, postIds),
    resolvePostCommentCounts(supabase, allCandidates),
  ]);

  return {
    todaysPosts,
    olderPosts,
    postIds,
    reactionCountsMap,
    commentCountMap,
  };
}

async function loadTodayFeedCandidates(
  supabase: SupabaseClient<Database>
) {
  const { startIso } = getZurichDayRange(new Date());
  const { data: todaysPostsData, error: todaysPostsError } = await supabase
    .from("posts")
    .select(FEED_POST_SELECT)
    .gte("created_at", startIso)
    .order("created_at", { ascending: false });

  if (todaysPostsError) {
    throw new Error(todaysPostsError.message);
  }

  const todaysPosts = (todaysPostsData ?? []) as FeedPostRow[];

  if (todaysPosts.length === 0) {
    return {
      todaysPosts,
      postIds: [] as number[],
      reactionCountsMap: new Map<number, ReactionCounts>(),
      commentCountMap: new Map<number, number>(),
    };
  }

  const postIds = todaysPosts.map((post) => post.id);
  const [reactionCountsMap, commentCountMap] = await Promise.all([
    loadReactionCountsMap(supabase, postIds),
    resolvePostCommentCounts(supabase, todaysPosts),
  ]);

  return {
    todaysPosts,
    postIds,
    reactionCountsMap,
    commentCountMap,
  };
}

async function loadOlderFeedCandidates(
  supabase: SupabaseClient<Database>,
  olderOffset: number,
  olderLimit: number
) {
  const { startIso } = getZurichDayRange(new Date());
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

  const olderPosts = (olderPostsData ?? []) as FeedPostRow[];

  if (olderPosts.length === 0) {
    return {
      olderPosts,
      postIds: [] as number[],
      reactionCountsMap: new Map<number, ReactionCounts>(),
      commentCountMap: new Map<number, number>(),
    };
  }

  const postIds = olderPosts.map((post) => post.id);
  const [reactionCountsMap, commentCountMap] = await Promise.all([
    loadReactionCountsMap(supabase, postIds),
    resolvePostCommentCounts(supabase, olderPosts),
  ]);

  return {
    olderPosts,
    postIds,
    reactionCountsMap,
    commentCountMap,
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
  const todayCandidates = candidates.todaysPosts.map((post) =>
    toFeedCandidatePost(
      post,
      userId,
      viewerIsAdmin,
      candidates.reactionCountsMap,
      viewerReactionMap,
      candidates.commentCountMap
    )
  );
  const olderCandidates = candidates.olderPosts.map((post) =>
    toFeedCandidatePost(
      post,
      userId,
      viewerIsAdmin,
      candidates.reactionCountsMap,
      viewerReactionMap,
      candidates.commentCountMap
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
  const todayCandidates = candidates.todaysPosts.map((post) =>
    toFeedCandidatePost(
      post,
      userId,
      viewerIsAdmin,
      candidates.reactionCountsMap,
      viewerReactionMap,
      candidates.commentCountMap
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
  const olderCandidates = candidates.olderPosts.map((post) =>
    toFeedCandidatePost(
      post,
      userId,
      viewerIsAdmin,
      candidates.reactionCountsMap,
      viewerReactionMap,
      candidates.commentCountMap
    )
  );
  const olderSection = buildOlderFeed(olderCandidates, offset, limit);

  return {
    posts: olderSection.olderFeed.map(stripCandidateScores),
    hasMore: olderSection.olderHasMore,
  };
}

