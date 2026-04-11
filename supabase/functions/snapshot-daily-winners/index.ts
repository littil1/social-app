import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

function getTimeZoneOffsetMillis(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(date);
  const map = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second),
  );

  return asUtc - date.getTime();
}

function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string,
) {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
  const offset = getTimeZoneOffsetMillis(new Date(utcGuess), timeZone);
  return new Date(utcGuess - offset);
}

function getZurichDayKey(date: Date | string) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Zurich",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
}

function getZurichNowParts(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Zurich",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(date);
  const map = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
  };
}

function getZurichDayRange(date: Date) {
  const zurichNow = getZurichNowParts(date);

  const start = zonedTimeToUtc(
    zurichNow.year,
    zurichNow.month,
    zurichNow.day,
    0,
    0,
    0,
    "Europe/Zurich",
  );

  const nextDayUtc = new Date(
    Date.UTC(zurichNow.year, zurichNow.month - 1, zurichNow.day) + 86400000,
  );

  const end = zonedTimeToUtc(
    nextDayUtc.getUTCFullYear(),
    nextDayUtc.getUTCMonth() + 1,
    nextDayUtc.getUTCDate(),
    0,
    0,
    0,
    "Europe/Zurich",
  );

  return {
    dayKey: getZurichDayKey(date),
    startIso: start.toISOString(),
    endIso: end.toISOString(),
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

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    now.setDate(now.getDate() - 1); // 👈 Vortag

    const { dayKey, startIso, endIso } = getZurichDayRange(now);

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

    const postIds = posts.map((post: PostRow) => post.id);
    const authorIds = Array.from(
      new Set(
        posts
          .map((post: PostRow) => post.user_id)
          .filter((id: string | null): id is string => typeof id === "string"),
      ),
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
        .in("post_id", postIds),
      authorIds.length > 0
        ? supabase
            .from("profiles")
            .select("id, username")
            .in("id", authorIds)
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
      commentMap.set(
        comment.post_id,
        (commentMap.get(comment.post_id) ?? 0) + 1,
      );
    }

    for (const reaction of (reactionsData ?? []) as ReactionRow[]) {
      const current =
        reactionMap.get(reaction.post_id) ?? createEmptyReactionCounts();

      const reactionType = reaction.reaction as ReactionType;

      if (
        reactionType === "like" ||
        reactionType === "funny" ||
        reactionType === "wow" ||
        reactionType === "fire"
      ) {
        current[reactionType] += 1;
      }

      reactionMap.set(reaction.post_id, current);
    }

    const ranked = posts
      .map((post: PostRow) => {
        const reactionCounts =
          reactionMap.get(post.id) ?? createEmptyReactionCounts();
        const commentsCount = commentMap.get(post.id) ?? 0;
        const reactionsCount =
          reactionCounts.like +
          reactionCounts.funny +
          reactionCounts.wow +
          reactionCounts.fire;
        const relevanceScore = reactionsCount + commentsCount * 2;

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
          reactionsCount,
        };
      })
      .sort((a, b) => {
        if (b.relevanceScore !== a.relevanceScore) {
          return b.relevanceScore - a.relevanceScore;
        }

        if (b.reactionsCount !== a.reactionsCount) {
          return b.reactionsCount - a.reactionsCount;
        }

        if (b.commentsCount !== a.commentsCount) {
          return b.commentsCount - a.commentsCount;
        }

        return (
          new Date(a.post.created_at).getTime() -
          new Date(b.post.created_at).getTime()
        );
      })
      .slice(0, 1);

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

    return new Response("Snapshot saved.", { status: 200 });
  } catch (error) {
    console.error(error);

    return new Response(
      error instanceof Error ? error.message : "Snapshot failed.",
      { status: 500 },
    );
  }
});