import { createClient } from "@/lib/supabase-server";
import type {
  FeedPost,
  ReactionCounts,
  ReactionType,
} from "@/types/feed";
import type { Database } from "@/types/database";

export const FEED_PAGE_SIZE = 10;

type PostRow = Database["public"]["Tables"]["posts"]["Row"];
type CommentRow = Pick<
  Database["public"]["Tables"]["comments"]["Row"],
  "post_id"
>;
type ProfileRow = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "username" | "avatar_url" | "is_admin"
>;
type FollowRow = Pick<
  Database["public"]["Tables"]["follows"]["Row"],
  "following_id"
>;

type PostReactionRow = {
  post_id: number;
  user_id: string;
  reaction: ReactionType;
};

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
    const [{ data: profileData, error: profileError }, { data: followsData, error: followsError }] =
      await Promise.all([
        supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle(),
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
    { data: commentsData, error: commentsError },
  ] = await Promise.all([
    supabase
      .from("post_reactions")
      .select("post_id, user_id, reaction")
      .in("post_id", recentPostIds),
    supabase.from("comments").select("post_id").in("post_id", recentPostIds),
  ]);

  if (reactionsError) {
    throw new Error(reactionsError.message);
  }

  if (commentsError) {
    throw new Error(commentsError.message);
  }

  const reactions = (reactionsData ?? []) as PostReactionRow[];
  const comments = (commentsData ?? []) as CommentRow[];

  const reactionCountsMap = new Map<number, ReactionCounts>();
  const viewerReactionMap = new Map<number, ReactionType>();
  const commentCountMap = new Map<number, number>();

  for (const reaction of reactions) {
    const counts =
      reactionCountsMap.get(reaction.post_id) ?? createEmptyReactionCounts();

    counts[reaction.reaction] += 1;
    reactionCountsMap.set(reaction.post_id, counts);

    if (user && reaction.user_id === user.id) {
      viewerReactionMap.set(reaction.post_id, reaction.reaction);
    }
  }

  for (const comment of comments) {
    if (typeof comment.post_id !== "number") continue;

    commentCountMap.set(
      comment.post_id,
      (commentCountMap.get(comment.post_id) ?? 0) + 1
    );
  }

  const newestPosts = [...recentPosts].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const trendingPosts = [...recentPosts].sort((a, b) => {
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

    return (
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  });

  const followingPosts =
    followingUserIds.length > 0
      ? newestPosts.filter(
          (post) => !!post.user_id && followingUserIds.includes(post.user_id)
        )
      : [];

  const mixedPostIds = buildMixedPostIds({
    newestIds: newestPosts.map((post) => post.id),
    trendingIds: trendingPosts.map((post) => post.id),
    followingIds: followingPosts.map((post) => post.id),
    targetCount,
  });

  const paginatedPostIds = mixedPostIds.slice(offset, offset + limit);

  if (paginatedPostIds.length === 0) {
    return [];
  }

  const selectedPosts = paginatedPostIds
    .map((id) => recentPosts.find((post) => post.id === id))
    .filter((post): post is PostRow => !!post);

  const authorIds = selectedPosts
    .map((post) => post.user_id)
    .filter((userId): userId is string => typeof userId === "string");

  let profiles: ProfileRow[] = [];

  if (authorIds.length > 0) {
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, is_admin")
      .in("id", authorIds);

    if (profilesError) {
      throw new Error(profilesError.message);
    }

    profiles = (profilesData ?? []) as ProfileRow[];
  }

  const profileMap = new Map<string, ProfileRow>();

  for (const profile of profiles) {
    profileMap.set(profile.id, profile);
  }

  return selectedPosts.map((post) => {
    const reactionCounts =
      reactionCountsMap.get(post.id) ?? createEmptyReactionCounts();

    const authorProfile =
      post.user_id && profileMap.has(post.user_id)
        ? profileMap.get(post.user_id)
        : null;

    return {
      id: post.id,
      content: post.content ?? "",
      created_at: post.created_at,
      reactions_count: getTotalReactions(reactionCounts),
      reaction_counts: reactionCounts,
      viewer_reaction: viewerReactionMap.get(post.id) ?? null,
      comments_count: commentCountMap.get(post.id) ?? 0,
      can_delete: !!user && (post.user_id === user.id || viewerIsAdmin),
      author_username: authorProfile?.username ?? null,
      author_avatar_url: authorProfile?.avatar_url ?? null,
    };
  });
}