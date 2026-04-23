import { createClient } from "@/lib/supabase/server";
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
type PostReactionRow = {
  post_id: number;
  user_id: string;
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

function mapReactions(params: {
  userId: string | null;
  reactions: PostReactionRow[];
}) {
  const { userId, reactions } = params;
  const reactionCountsMap = new Map<number, ReactionCounts>();
  const viewerReactionMap = new Map<number, ReactionType>();

  for (const reaction of reactions) {
    const counts =
      reactionCountsMap.get(reaction.post_id) ?? createEmptyReactionCounts();

    counts[reaction.reaction] += 1;
    reactionCountsMap.set(reaction.post_id, counts);

    if (userId && reaction.user_id === userId) {
      viewerReactionMap.set(reaction.post_id, reaction.reaction);
    }
  }

  return { reactionCountsMap, viewerReactionMap };
}

function toFeedCandidatePost(
  post: PostRow,
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

async function getFeedUserContext(): Promise<FeedUserContext> {
  const supabase = await createClient();
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

async function loadFeedCandidates(olderOffset: number, olderLimit: number) {
  const supabase = await createClient();
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
      .select("*")
      .gte("created_at", startIso)
      .order("created_at", { ascending: false }),
    supabase
      .from("posts")
      .select("*")
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

  const todaysPosts = (todaysPostsData ?? []) as PostRow[];
  const olderPosts = (olderPostsData ?? []) as PostRow[];
  const allCandidates = [...todaysPosts, ...olderPosts];

  if (allCandidates.length === 0) {
    return {
      todaysPosts,
      olderPosts,
      reactions: [] as PostReactionRow[],
      commentCountMap: new Map<number, number>(),
    };
  }

  const postIds = allCandidates.map((post) => post.id);
  const [{ data: reactionsData, error: reactionsError }] = await Promise.all([
    supabase
      .from("post_reactions")
      .select("post_id, user_id, reaction")
      .in("post_id", postIds),
  ]);

  if (reactionsError) {
    throw new Error(reactionsError.message);
  }

  return {
    todaysPosts,
    olderPosts,
    reactions: (reactionsData ?? []) as PostReactionRow[],
    commentCountMap: await resolvePostCommentCounts(supabase, allCandidates),
  };
}

async function loadOlderFeedCandidates(olderOffset: number, olderLimit: number) {
  const supabase = await createClient();
  const { startIso } = getZurichDayRange(new Date());
  const olderCandidatePoolSize = Math.max(
    (olderOffset + olderLimit) * OLDER_FEED_CANDIDATE_POOL_MULTIPLIER,
    OLDER_FEED_CANDIDATE_POOL_MIN
  );
  const { data: olderPostsData, error: olderPostsError } = await supabase
    .from("posts")
    .select("*")
    .lt("created_at", startIso)
    .order("created_at", { ascending: false })
    .range(0, olderCandidatePoolSize - 1);

  if (olderPostsError) {
    throw new Error(olderPostsError.message);
  }

  const olderPosts = (olderPostsData ?? []) as PostRow[];

  if (olderPosts.length === 0) {
    return {
      olderPosts,
      reactions: [] as PostReactionRow[],
      commentCountMap: new Map<number, number>(),
    };
  }

  const postIds = olderPosts.map((post) => post.id);
  const { data: reactionsData, error: reactionsError } = await supabase
    .from("post_reactions")
    .select("post_id, user_id, reaction")
    .in("post_id", postIds);

  if (reactionsError) {
    throw new Error(reactionsError.message);
  }

  return {
    olderPosts,
    reactions: (reactionsData ?? []) as PostReactionRow[],
    commentCountMap: await resolvePostCommentCounts(supabase, olderPosts),
  };
}

export async function getHomeFeedData(
  olderOffset = 0,
  olderLimit = FEED_PAGE_SIZE
): Promise<HomeFeedData> {
  const [{ userId, viewerIsAdmin }, candidates] = await Promise.all([
    getFeedUserContext(),
    loadFeedCandidates(olderOffset, olderLimit),
  ]);
  const { reactionCountsMap, viewerReactionMap } = mapReactions({
    userId,
    reactions: candidates.reactions,
  });
  const todayCandidates = candidates.todaysPosts.map((post) =>
    toFeedCandidatePost(
      post,
      userId,
      viewerIsAdmin,
      reactionCountsMap,
      viewerReactionMap,
      candidates.commentCountMap
    )
  );
  const olderCandidates = candidates.olderPosts.map((post) =>
    toFeedCandidatePost(
      post,
      userId,
      viewerIsAdmin,
      reactionCountsMap,
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

export async function getOlderFeedPage(
  offset = 0,
  limit = FEED_PAGE_SIZE
): Promise<FeedResponse> {
  const [{ userId, viewerIsAdmin }, candidates] = await Promise.all([
    getFeedUserContext(),
    loadOlderFeedCandidates(offset, limit),
  ]);
  const { reactionCountsMap, viewerReactionMap } = mapReactions({
    userId,
    reactions: candidates.reactions,
  });
  const olderCandidates = candidates.olderPosts.map((post) =>
    toFeedCandidatePost(
      post,
      userId,
      viewerIsAdmin,
      reactionCountsMap,
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

