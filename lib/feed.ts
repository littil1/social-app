import { createClient } from "@/lib/supabase-server";
import type { FeedPost, ReactionCounts, ReactionType } from "@/types/feed";
import type { Database } from "@/types/database";

export const FEED_PAGE_SIZE = 10;

type PostRow = Database["public"]["Tables"]["posts"]["Row"];
type FollowRow = Pick<
  Database["public"]["Tables"]["follows"]["Row"],
  "following_id"
>;

type PostReactionRow = {
  post_id: number;
  user_id: string;
  reaction: ReactionType;
};

// =====================================================
// Helpers
// =====================================================

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

function getZurichDayKey(date: Date | string) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Zurich",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
}

function isTodayInZurich(dateString: string) {
  return getZurichDayKey(dateString) === getZurichDayKey(new Date());
}

function buildMixedPostIds(params: {
  newestIds: number[];
  trendingIds: number[];
  followingIds: number[];
  targetCount: number;
}): number[] {
  const { newestIds, trendingIds, followingIds, targetCount } = params;

  const result: number[] = [];
  const usedIds = new Set<number>();

  let newestIndex = 0;
  let trendingIndex = 0;
  let followingIndex = 0;

  function takeNext(ids: number[], startIndex: number) {
    let index = startIndex;

    while (index < ids.length) {
      const id = ids[index];
      index += 1;

      if (!usedIds.has(id)) {
        usedIds.add(id);
        result.push(id);
        return { nextIndex: index, added: true };
      }
    }

    return { nextIndex: index, added: false };
  }

  while (result.length < targetCount) {
    let addedInRound = false;

    const newestPick = takeNext(newestIds, newestIndex);
    newestIndex = newestPick.nextIndex;
    addedInRound = newestPick.added || addedInRound;

    if (result.length >= targetCount) break;

    const trendingPick = takeNext(trendingIds, trendingIndex);
    trendingIndex = trendingPick.nextIndex;
    addedInRound = trendingPick.added || addedInRound;

    if (result.length >= targetCount) break;

    if (followingIds.length > 0) {
      const followingPick = takeNext(followingIds, followingIndex);
      followingIndex = followingPick.nextIndex;
      addedInRound = followingPick.added || addedInRound;
    }

    if (!addedInRound) {
      break;
    }
  }

  return result;
}

function sortPostsByNewest(posts: PostRow[]) {
  return [...posts].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

function sortPostsByTrending(
  posts: PostRow[],
  reactionCountsMap: Map<number, ReactionCounts>,
  commentCountMap: Map<number, number>
) {
  return [...posts].sort((a, b) => {
    const aReactions = getTotalReactions(
      reactionCountsMap.get(a.id) ?? createEmptyReactionCounts()
    );
    const bReactions = getTotalReactions(
      reactionCountsMap.get(b.id) ?? createEmptyReactionCounts()
    );

    if (bReactions !== aReactions) {
      return bReactions - aReactions;
    }

    const aComments = commentCountMap.get(a.id) ?? 0;
    const bComments = commentCountMap.get(b.id) ?? 0;

    if (bComments !== aComments) {
      return bComments - aComments;
    }

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

function buildOrderedFeedIds(params: {
  posts: PostRow[];
  followingUserIds: string[];
  reactionCountsMap: Map<number, ReactionCounts>;
  commentCountMap: Map<number, number>;
  targetCount: number;
}) {
  const {
    posts,
    followingUserIds,
    reactionCountsMap,
    commentCountMap,
    targetCount,
  } = params;

  const todaysPosts = posts.filter((post) => isTodayInZurich(post.created_at));
  const olderPosts = posts.filter((post) => !isTodayInZurich(post.created_at));

  function buildGroupIds(groupPosts: PostRow[]) {
    const newestPosts = sortPostsByNewest(groupPosts);
    const trendingPosts = sortPostsByTrending(
      groupPosts,
      reactionCountsMap,
      commentCountMap
    );

    const followingPosts =
      followingUserIds.length > 0
        ? newestPosts.filter(
            (post) => !!post.user_id && followingUserIds.includes(post.user_id)
          )
        : [];

    return buildMixedPostIds({
      newestIds: newestPosts.map((post) => post.id),
      trendingIds: trendingPosts.map((post) => post.id),
      followingIds: followingPosts.map((post) => post.id),
      targetCount,
    });
  }

  const todaysIds = buildGroupIds(todaysPosts);
  const olderIds = buildGroupIds(olderPosts);

  return [...todaysIds, ...olderIds];
}

// =====================================================
// Main
// =====================================================

export async function getFeedPage(
  offset = 0,
  limit = FEED_PAGE_SIZE
): Promise<FeedPost[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let viewerIsAdmin = false;
  let followingUserIds: string[] = [];

  if (user) {
    const [
      { data: profileData, error: profileError },
      { data: followsData, error: followsError },
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id),
    ]);

    if (profileError) {
      throw new Error(profileError.message);
    }

    if (followsError) {
      throw new Error(followsError.message);
    }

    viewerIsAdmin = profileData?.is_admin ?? false;
    followingUserIds = ((followsData ?? []) as FollowRow[])
      .map((row) => row.following_id)
      .filter((id): id is string => typeof id === "string");
  }

  const targetCount = offset + limit;
  const candidatePoolSize = Math.max(targetCount * 6, 120);

  const { data: recentPostsData, error: recentPostsError } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false })
    .range(0, candidatePoolSize - 1);

  if (recentPostsError) {
    throw new Error(recentPostsError.message);
  }

  const recentPosts = (recentPostsData ?? []) as PostRow[];

  if (recentPosts.length === 0) {
    return [];
  }

  const recentPostIds = recentPosts.map((post) => post.id);

  const [
    { data: reactionsData, error: reactionsError },
  ] = await Promise.all([
    supabase
      .from("post_reactions")
      .select("post_id, user_id, reaction")
      .in("post_id", recentPostIds),
  ]);

  if (reactionsError) {
    throw new Error(reactionsError.message);
  }

  const reactions = (reactionsData ?? []) as PostReactionRow[];

  const reactionCountsMap = new Map<number, ReactionCounts>();
  const viewerReactionMap = new Map<number, ReactionType>();

  for (const reaction of reactions) {
    const counts =
      reactionCountsMap.get(reaction.post_id) ?? createEmptyReactionCounts();

    counts[reaction.reaction] += 1;
    reactionCountsMap.set(reaction.post_id, counts);

    if (user && reaction.user_id === user.id) {
      viewerReactionMap.set(reaction.post_id, reaction.reaction);
    }
  }

  const orderedFeedIds = buildOrderedFeedIds({
    posts: recentPosts,
    followingUserIds,
    reactionCountsMap,
    commentCountMap: new Map(
      recentPosts.map((post) => [post.id, Math.max(0, post.comments_count ?? 0)])
    ),
    targetCount,
  });

  const paginatedPostIds = orderedFeedIds.slice(offset, offset + limit);

  if (paginatedPostIds.length === 0) {
    return [];
  }

  const postMap = new Map<number, PostRow>();

  for (const post of recentPosts) {
    postMap.set(post.id, post);
  }

  const selectedPosts = paginatedPostIds
    .map((id) => postMap.get(id))
    .filter((post): post is PostRow => !!post);

  return selectedPosts.map((post) => {
    const reactionCounts =
      reactionCountsMap.get(post.id) ?? createEmptyReactionCounts();

    return {
      id: post.id,
      content: post.content ?? "",
      created_at: post.created_at,
      reactions_count: getTotalReactions(reactionCounts),
      reaction_counts: reactionCounts,
      viewer_reaction: viewerReactionMap.get(post.id) ?? null,
      comments_count: Math.max(0, post.comments_count ?? 0),
      can_delete: !!user && (post.user_id === user.id || viewerIsAdmin),
      author_username: null,
      author_avatar_url: null,
    };
  });
}
