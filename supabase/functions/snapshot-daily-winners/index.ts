import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { recomputeUserBadgeFamilies } from "../../../lib/badges.ts";
import {
  ARCHIVED_DAILY_WINNER_LIMIT,
  compareDailyLiveRank,
  getLiveScore,
  getPreviousZurichDayRange,
  getZurichDayRankingReferenceTime,
} from "../../../lib/daily-ranking.ts";

type ReactionType = "like" | "funny" | "wow" | "fire";

type ReactionCounts = {
  like: number;
  funny: number;
  wow: number;
  fire: number;
};

type PostRow = {
  id: number;
  content: string | null;
  created_at: string;
  user_id: string | null;
};

type CommentRow = {
  post_id: number;
};

type ReactionRow = {
  post_id: number;
  reaction: string;
};

type ProfileRow = {
  id: string;
  username: string | null;
};

function createEmptyReactionCounts(): ReactionCounts {
  return {
    like: 0,
    funny: 0,
    wow: 0,
    fire: 0,
  };
}

Deno.serve(async () => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response("Missing Supabase environment variables.", {
        status: 500,
      });
    }

    const previousRange = getPreviousZurichDayRange(new Date());
    if (!previousRange) {
      return new Response("Could not resolve Zurich day range.", {
        status: 500,
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { dayKey, startIso, endIso } = previousRange;
    const rankingNow = getZurichDayRankingReferenceTime(endIso);

    const { data: existingRows, error: existingError } = await supabase
      .from("daily_post_winners")
      .select("id")
      .eq("winner_date", dayKey);

    if (existingError) throw existingError;

    if ((existingRows ?? []).length > 0) {
      return new Response("Snapshot already exists.", { status: 200 });
    }

    const { data: postsData, error: postsError } = await supabase
      .from("posts")
      .select("id, content, created_at, user_id")
      .gte("created_at", startIso)
      .lt("created_at", endIso)
      .order("created_at", { ascending: false });

    if (postsError) throw postsError;

    const posts: PostRow[] = postsData ?? [];

    if (posts.length === 0) {
      return new Response("No posts.", { status: 200 });
    }

    const postIds = posts.map((post) => post.id);
    const authorIds = Array.from(
      new Set(
        posts
          .map((post) => post.user_id)
          .filter((id): id is string => typeof id === "string")
      )
    );

    const [
      { data: reactionsData, error: reactionsError },
      { data: commentsData, error: commentsError },
      { data: profilesData, error: profilesError },
    ] = await Promise.all([
      supabase
        .from("post_reactions")
        .select("post_id, reaction")
        .in("post_id", postIds),
      supabase
        .from("comments")
        .select("post_id")
        .is("deleted_at", null)
        .in("post_id", postIds),
      authorIds.length > 0
        ? supabase.from("profiles").select("id, username").in("id", authorIds)
        : Promise.resolve({ data: [] as ProfileRow[], error: null }),
    ]);

    if (reactionsError) throw reactionsError;
    if (commentsError) throw commentsError;
    if (profilesError) throw profilesError;

    const reactionMap = new Map<number, ReactionCounts>();
    const commentMap = new Map<number, number>();
    const profileMap = new Map<string, ProfileRow>();

    for (const profile of (profilesData ?? []) as ProfileRow[]) {
      profileMap.set(profile.id, profile);
    }

    for (const comment of (commentsData ?? []) as CommentRow[]) {
      commentMap.set(comment.post_id, (commentMap.get(comment.post_id) ?? 0) + 1);
    }

    for (const reaction of (reactionsData ?? []) as ReactionRow[]) {
      const counts = reactionMap.get(reaction.post_id) ?? createEmptyReactionCounts();
      const reactionType = reaction.reaction as ReactionType;

      if (
        reactionType === "like" ||
        reactionType === "funny" ||
        reactionType === "wow" ||
        reactionType === "fire"
      ) {
        counts[reactionType] += 1;
      }

      reactionMap.set(reaction.post_id, counts);
    }

    const ranked = posts
      .map((post) => {
        const reactionCounts = reactionMap.get(post.id) ?? createEmptyReactionCounts();
        const commentsCount = commentMap.get(post.id) ?? 0;
        const reactionsCount =
          reactionCounts.like +
          reactionCounts.funny +
          reactionCounts.wow +
          reactionCounts.fire;
        const relevanceScore = getLiveScore({
          reactionsTotal: reactionsCount,
          commentsCount,
          createdAt: post.created_at,
          now: rankingNow,
        });

        const author =
          post.user_id && profileMap.has(post.user_id)
            ? profileMap.get(post.user_id) ?? null
            : null;

        return {
          post,
          authorUsername: author?.username ?? null,
          authorId: post.user_id ?? null,
          reactionCounts,
          commentsCount,
          relevanceScore,
        };
      })
      .sort((a, b) =>
        compareDailyLiveRank(
          {
            id: a.post.id,
            created_at: a.post.created_at,
            comments_count: a.commentsCount,
            live_score: a.relevanceScore,
          },
          {
            id: b.post.id,
            created_at: b.post.created_at,
            comments_count: b.commentsCount,
            live_score: b.relevanceScore,
          }
        )
      )
      .slice(0, ARCHIVED_DAILY_WINNER_LIMIT);

    if (ranked.length === 0) {
      return new Response("No ranked posts.", { status: 200 });
    }

    const rows = ranked.map((entry, index) => ({
      winner_date: dayKey,
      rank_position: index + 1,
      post_id: entry.post.id,
      post_created_at: entry.post.created_at,
      post_content: entry.post.content ?? "",
      author_id: entry.authorId,
      author_username: entry.authorUsername,
      likes_count: entry.reactionCounts.like,
      funny_count: entry.reactionCounts.funny,
      wow_count: entry.reactionCounts.wow,
      fire_count: entry.reactionCounts.fire,
      comments_count: entry.commentsCount,
      relevance_score: entry.relevanceScore,
    }));

    const { error: insertError } = await supabase
      .from("daily_post_winners")
      .insert(rows);

    if (insertError) throw insertError;

    const winnerAuthorIds = Array.from(
      new Set(
        ranked
          .map((entry) => entry.authorId)
          .filter((value): value is string => typeof value === "string")
      )
    );

    for (const winnerAuthorId of winnerAuthorIds) {
      await recomputeUserBadgeFamilies(supabase as any, winnerAuthorId, [
        "legend",
      ]);
    }

    return new Response("Snapshot saved.", { status: 200 });
  } catch (error) {
    console.error(error);

    return new Response(
      error instanceof Error ? error.message : "Snapshot failed.",
      { status: 500 }
    );
  }
});
