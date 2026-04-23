import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recomputeUserBadgeFamilies } from "@/features/badges/lib";
import {
  ARCHIVED_DAILY_WINNER_LIMIT,
  compareDailyLiveRank,
  getLiveScore,
  getPreviousZurichDayRange,
  getZurichDayRankingReferenceTime,
  getZurichDayRangeForDayKey,
} from "@/features/winners/lib/daily-ranking";
import { resolvePostCommentCounts } from "@/features/comments/lib/post-comment-counts";
import type { ReactionCounts } from "@/shared/types/feed";

type PostRow = {
  id: number;
  content: string | null;
  created_at: string;
  user_id: string | null;
  comments_count: number;
};

type ProfileRow = {
  id: string;
  username: string;
};

type PostReactionRow = {
  post_id: number;
  reaction: "like" | "funny" | "wow" | "fire";
};

type RankedPost = PostRow & {
  relevance_score: number;
  author_username: string | null;
  reaction_counts: ReactionCounts;
};

function createEmptyReactionCounts(): ReactionCounts {
  return {
    like: 0,
    funny: 0,
    wow: 0,
    fire: 0,
  };
}

function getWinnerDateAndRange(input: string | null) {
  if (input) {
    const range = getZurichDayRangeForDayKey(input);

    return range
      ? {
          winnerDate: input,
          startIso: range.startIso,
          endIso: range.endIso,
        }
      : null;
  }

  const previousRange = getPreviousZurichDayRange(new Date());
  if (!previousRange) {
    return null;
  }

  return {
    winnerDate: previousRange.dayKey,
    startIso: previousRange.startIso,
    endIso: previousRange.endIso,
  };
}

function rankPosts(posts: RankedPost[]) {
  return [...posts].sort((a, b) =>
    compareDailyLiveRank(
      {
        id: a.id,
        created_at: a.created_at,
        comments_count: a.comments_count,
        live_score: a.relevance_score,
      },
      {
        id: b.id,
        created_at: b.created_at,
        comments_count: b.comments_count,
        live_score: b.relevance_score,
      }
    )
  );
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new NextResponse("Not signed in.", { status: 401 });
    }

    const { data: adminProfile, error: adminProfileError } = await supabase
      .from("profiles")
      .select("id, is_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (adminProfileError) {
      return new NextResponse(adminProfileError.message, { status: 500 });
    }

    if (!adminProfile?.is_admin) {
      return new NextResponse("Forbidden.", { status: 403 });
    }

    const requestedDate = request.nextUrl.searchParams.get("date");
    const dateRange = getWinnerDateAndRange(requestedDate);

    if (!dateRange) {
      return new NextResponse("Invalid date. Expected: YYYY-MM-DD.", {
        status: 400,
      });
    }

    const { winnerDate, startIso, endIso } = dateRange;
    const rankingNow = getZurichDayRankingReferenceTime(endIso);

    const { data: existingWinnerRows, error: existingWinnersError } =
      await supabase
        .from("daily_post_winners")
        .select("author_id")
        .eq("winner_date", winnerDate);

    if (existingWinnersError) {
      return new NextResponse(existingWinnersError.message, { status: 500 });
    }

    const previousWinnerUserIds = Array.from(
      new Set(
        ((existingWinnerRows ?? []) as Array<{ author_id: string | null }>)
          .map((row) => row.author_id)
          .filter((value): value is string => typeof value === "string")
      )
    );

    const { data: postsData, error: postsError } = await supabase
      .from("posts")
      .select("id, content, created_at, user_id, comments_count")
      .gte("created_at", startIso)
      .lt("created_at", endIso);

    if (postsError) {
      return new NextResponse(postsError.message, { status: 500 });
    }

    const posts = (postsData ?? []) as PostRow[];
    const postIds = posts.map((post) => post.id);

    if (posts.length === 0) {
      await supabase
        .from("daily_post_winners")
        .delete()
        .eq("winner_date", winnerDate);

      for (const previousWinnerUserId of previousWinnerUserIds) {
        await recomputeUserBadgeFamilies(supabase, previousWinnerUserId, [
          "legend",
        ]);
      }

      return NextResponse.json({
        winnerDate,
        winners: [],
        message: "No posts were found for that day.",
      });
    }

    const resolvedCommentCounts = await resolvePostCommentCounts(supabase, posts);
    const reactionCountsByPostId = new Map<number, ReactionCounts>();

    if (postIds.length > 0) {
      const { data: reactionsData, error: reactionsError } = await supabase
        .from("post_reactions")
        .select("post_id, reaction")
        .in("post_id", postIds);

      if (reactionsError) {
        return new NextResponse(reactionsError.message, { status: 500 });
      }

      for (const reaction of (reactionsData ?? []) as PostReactionRow[]) {
        const counts =
          reactionCountsByPostId.get(reaction.post_id) ?? createEmptyReactionCounts();
        counts[reaction.reaction] += 1;
        reactionCountsByPostId.set(reaction.post_id, counts);
      }
    }

    const userIds = Array.from(
      new Set(
        posts
          .map((post) => post.user_id)
          .filter((value): value is string => typeof value === "string")
      )
    );

    let profileMap = new Map<string, ProfileRow>();

    if (userIds.length > 0) {
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username")
        .in("id", userIds);

      if (profilesError) {
        return new NextResponse(profilesError.message, { status: 500 });
      }

      const profiles = (profilesData ?? []) as ProfileRow[];
      profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
    }

    const rankedPosts = rankPosts(
      posts.map((post) => {
        const commentsCount = resolvedCommentCounts.get(post.id) ?? 0;
        const reactionCounts =
          reactionCountsByPostId.get(post.id) ?? createEmptyReactionCounts();
        const reactionsTotal =
          reactionCounts.like +
          reactionCounts.funny +
          reactionCounts.wow +
          reactionCounts.fire;

        return {
          ...post,
          comments_count: commentsCount,
          reaction_counts: reactionCounts,
          relevance_score: getLiveScore({
            reactionsTotal,
            commentsCount,
            createdAt: post.created_at,
            now: rankingNow,
          }),
          author_username: post.user_id
            ? profileMap.get(post.user_id)?.username ?? null
            : null,
        };
      })
    ).slice(0, ARCHIVED_DAILY_WINNER_LIMIT);

    await supabase
      .from("daily_post_winners")
      .delete()
      .eq("winner_date", winnerDate);

    if (rankedPosts.length > 0) {
      const payload = rankedPosts.map((post, index) => ({
        winner_date: winnerDate,
        rank_position: index + 1,
        post_id: post.id,
        post_created_at: post.created_at,
        post_content: post.content ?? "",
        author_id: post.user_id,
        author_username: post.author_username,
        likes_count: post.reaction_counts.like,
        funny_count: post.reaction_counts.funny,
        wow_count: post.reaction_counts.wow,
        fire_count: post.reaction_counts.fire,
        comments_count: post.comments_count ?? 0,
        relevance_score: post.relevance_score,
      }));

      const { error: insertError } = await supabase
        .from("daily_post_winners")
        .insert(payload);

      if (insertError) {
        return new NextResponse(insertError.message, { status: 500 });
      }
    }

    const winnerUserIds = Array.from(
      new Set(
        rankedPosts
          .map((post) => post.user_id)
          .filter((value): value is string => typeof value === "string")
      )
    );

    const affectedWinnerUserIds = Array.from(
      new Set([...previousWinnerUserIds, ...winnerUserIds])
    );

    for (const affectedWinnerUserId of affectedWinnerUserIds) {
      await recomputeUserBadgeFamilies(supabase, affectedWinnerUserId, [
        "legend",
      ]);
    }

    return NextResponse.json({
      winnerDate,
      winners: rankedPosts.map((post, index) => ({
        rank_position: index + 1,
        post_id: post.id,
        author_id: post.user_id,
        author_username: post.author_username,
        likes_count: post.reaction_counts.like,
        comments_count: post.comments_count ?? 0,
        relevance_score: post.relevance_score,
      })),
    });
  } catch (error) {
    console.error(error);
    return new NextResponse("Daily winners could not be computed.", {
      status: 500,
    });
  }
}


