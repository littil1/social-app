import { NextRequest, NextResponse } from "next/server";
import { resolvePostCommentCounts } from "@/lib/post-comment-counts";
import { createClient } from "@/lib/supabase-server";
import { recomputeUserBadgeFamilies } from "@/lib/badges";

type PostRow = {
  id: number;
  content: string | null;
  created_at: string;
  user_id: string | null;
  likes_count: number;
  comments_count: number;
};

type ProfileRow = {
  id: string;
  username: string;
};

type RankedPost = PostRow & {
  relevance_score: number;
  author_username: string | null;
};

function getRelevanceScore(
  post: Pick<PostRow, "likes_count" | "comments_count">
) {
  return (post.likes_count ?? 0) * 0.5 + (post.comments_count ?? 0);
}

function getZurichDayKey(date: Date) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Zurich",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getUtcRangeForZurichDay(dayKey: string) {
  const start = new Date(`${dayKey}T00:00:00+01:00`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

function getWinnerDateAndRange(input: string | null) {
  if (input) {
    const isValid = /^\d{4}-\d{2}-\d{2}$/.test(input);

    if (!isValid) {
      return null;
    }

    const { startIso, endIso } = getUtcRangeForZurichDay(input);

    return {
      winnerDate: input,
      startIso,
      endIso,
    };
  }

  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  const winnerDate = getZurichDayKey(yesterday);
  const { startIso, endIso } = getUtcRangeForZurichDay(winnerDate);

  return {
    winnerDate,
    startIso,
    endIso,
  };
}

function rankPosts(posts: RankedPost[]) {
  return [...posts].sort((a, b) => {
    if (b.relevance_score !== a.relevance_score) {
      return b.relevance_score - a.relevance_score;
    }

    if ((b.comments_count ?? 0) !== (a.comments_count ?? 0)) {
      return (b.comments_count ?? 0) - (a.comments_count ?? 0);
    }

    if ((b.likes_count ?? 0) !== (a.likes_count ?? 0)) {
      return (b.likes_count ?? 0) - (a.likes_count ?? 0);
    }

    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new NextResponse("Nicht eingeloggt.", { status: 401 });
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
      return new NextResponse("Keine Berechtigung.", { status: 403 });
    }

    const requestedDate = request.nextUrl.searchParams.get("date");
    const dateRange = getWinnerDateAndRange(requestedDate);

    if (!dateRange) {
      return new NextResponse("Ungültiges Datum. Erwartet: YYYY-MM-DD", {
        status: 400,
      });
    }

    const { winnerDate, startIso, endIso } = dateRange;

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
      .select("id, content, created_at, user_id, likes_count, comments_count")
      .gte("created_at", startIso)
      .lt("created_at", endIso);

    if (postsError) {
      return new NextResponse(postsError.message, { status: 500 });
    }

    const posts = (postsData ?? []) as PostRow[];

    if (posts.length === 0) {
      await supabase
        .from("daily_post_winners")
        .delete()
        .eq("winner_date", winnerDate);

      for (const previousWinnerUserId of previousWinnerUserIds) {
        await recomputeUserBadgeFamilies(supabase as any, previousWinnerUserId, [
          "legend",
        ]);
      }

      return NextResponse.json({
        winnerDate,
        winners: [],
        message: "Keine Posts für diesen Tag gefunden.",
      });
    }

    const resolvedCommentCounts = await resolvePostCommentCounts(
      supabase,
      posts
    );

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

        return {
          ...post,
          comments_count: commentsCount,
          relevance_score: getRelevanceScore({
            likes_count: post.likes_count,
            comments_count: commentsCount,
          }),
          author_username: post.user_id
            ? profileMap.get(post.user_id)?.username ?? null
            : null,
        };
      })
    ).slice(0, 3);

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
        likes_count: post.likes_count ?? 0,
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
      await recomputeUserBadgeFamilies(supabase as any, affectedWinnerUserId, [
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
        likes_count: post.likes_count ?? 0,
        comments_count: post.comments_count ?? 0,
        relevance_score: post.relevance_score,
      })),
    });
  } catch (error) {
    console.error(error);
    return new NextResponse("Daily Winners konnten nicht berechnet werden.", {
      status: 500,
    });
  }
}
