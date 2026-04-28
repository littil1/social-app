import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/shared/types/database";
import {
  compareDailyLiveRank,
  getLiveScore,
  getZurichDayRankingReferenceTime,
} from "./daily-ranking";

type LoggerLike = Pick<Console, "info" | "warn" | "error">;

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

type PostReactionRow = {
  post_id: number;
  reaction: ReactionType;
};

type ProfileRow = {
  id: string;
  username: string | null;
};

type ExistingWinnerRow = {
  id: number;
  author_id: string | null;
};

export type WinnerSnapshotDayRange = {
  winnerDate: string;
  startIso: string;
  endIso: string;
};

export type WinnerSnapshotMode = "skip_if_exists" | "replace";

export type DailyWinnerSnapshotRow = {
  winner_date: string;
  rank_position: 1;
  post_id: number;
  post_created_at: string;
  post_content: string;
  author_id: string | null;
  author_username: string | null;
  likes_count: number;
  funny_count: number;
  wow_count: number;
  fire_count: number;
  comments_count: number;
  relevance_score: number;
};

export type DailyWinnerSnapshotResult = {
  winnerDate: string;
  status:
    | "inserted"
    | "replaced"
    | "skipped_existing"
    | "cleared_no_posts"
    | "noop_no_posts";
  winner: DailyWinnerSnapshotRow | null;
  affectedWinnerUserIds: string[];
  existingRowCount: number;
};

type SnapshotDailyWinnerOptions = WinnerSnapshotDayRange & {
  mode: WinnerSnapshotMode;
  logger?: LoggerLike;
  onAffectedWinnerUser?: (userId: string) => Promise<void>;
};

function createEmptyReactionCounts(): ReactionCounts {
  return {
    like: 0,
    funny: 0,
    wow: 0,
    fire: 0,
  };
}

function uniqueStringIds(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values.filter((value): value is string => typeof value === "string")
    )
  );
}

async function loadCommentCountsByPostId(
  supabase: SupabaseClient<Database>,
  postIds: number[]
) {
  const counts = new Map<number, number>();

  if (postIds.length === 0) {
    return counts;
  }

  const { data, error } = await supabase
    .from("comments")
    .select("post_id")
    .is("deleted_at", null)
    .in("post_id", postIds);

  if (error) {
    throw new Error(error.message);
  }

  for (const row of (data ?? []) as Array<{ post_id: number }>) {
    counts.set(row.post_id, (counts.get(row.post_id) ?? 0) + 1);
  }

  for (const postId of postIds) {
    if (!counts.has(postId)) {
      counts.set(postId, 0);
    }
  }

  return counts;
}

async function loadReactionCountsByPostId(
  supabase: SupabaseClient<Database>,
  postIds: number[]
) {
  const countsByPostId = new Map<number, ReactionCounts>();

  if (postIds.length === 0) {
    return countsByPostId;
  }

  const { data, error } = await supabase
    .from("post_reactions")
    .select("post_id, reaction")
    .in("post_id", postIds);

  if (error) {
    throw new Error(error.message);
  }

  for (const row of (data ?? []) as PostReactionRow[]) {
    const counts = countsByPostId.get(row.post_id) ?? createEmptyReactionCounts();
    counts[row.reaction] += 1;
    countsByPostId.set(row.post_id, counts);
  }

  return countsByPostId;
}

async function loadProfilesById(
  supabase: SupabaseClient<Database>,
  authorIds: string[]
) {
  const profileMap = new Map<string, ProfileRow>();

  if (authorIds.length === 0) {
    return profileMap;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username")
    .in("id", authorIds);

  if (error) {
    throw new Error(error.message);
  }

  for (const profile of (data ?? []) as ProfileRow[]) {
    profileMap.set(profile.id, profile);
  }

  return profileMap;
}

async function recomputeAffectedWinners(
  affectedWinnerUserIds: string[],
  onAffectedWinnerUser?: (userId: string) => Promise<void>
) {
  if (!onAffectedWinnerUser) {
    return;
  }

  for (const userId of affectedWinnerUserIds) {
    await onAffectedWinnerUser(userId);
  }
}

export async function snapshotDailyWinner(
  supabase: SupabaseClient<Database>,
  {
    winnerDate,
    startIso,
    endIso,
    mode,
    logger = console,
    onAffectedWinnerUser,
  }: SnapshotDailyWinnerOptions
): Promise<DailyWinnerSnapshotResult> {
  logger.info(
    `[daily-winner-snapshot] Starting snapshot for ${winnerDate} (${mode}).`
  );

  const { data: existingRowsData, error: existingRowsError } = await supabase
    .from("daily_post_winners")
    .select("id, author_id")
    .eq("winner_date", winnerDate)
    .eq("rank_position", 1);

  if (existingRowsError) {
    throw new Error(existingRowsError.message);
  }

  const existingRows = (existingRowsData ?? []) as ExistingWinnerRow[];
  const existingRowCount = existingRows.length;
  const previousWinnerUserIds = uniqueStringIds(
    existingRows.map((row) => row.author_id)
  );

  if (mode === "skip_if_exists" && existingRowCount > 0) {
    logger.info(
      `[daily-winner-snapshot] Snapshot already exists for ${winnerDate}; skipping.`
    );

    return {
      winnerDate,
      status: "skipped_existing",
      winner: null,
      affectedWinnerUserIds: previousWinnerUserIds,
      existingRowCount,
    };
  }

  const { data: postsData, error: postsError } = await supabase
    .from("posts")
    .select("id, content, created_at, user_id")
    .gte("created_at", startIso)
    .lt("created_at", endIso);

  if (postsError) {
    throw new Error(postsError.message);
  }

  const posts = (postsData ?? []) as PostRow[];

  if (posts.length === 0) {
    if (mode === "replace" && existingRowCount > 0) {
      const { error: deleteError } = await supabase
        .from("daily_post_winners")
        .delete()
        .eq("winner_date", winnerDate)
        .eq("rank_position", 1);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      await recomputeAffectedWinners(previousWinnerUserIds, onAffectedWinnerUser);
      logger.warn(
        `[daily-winner-snapshot] No posts found for ${winnerDate}; cleared existing snapshot rows.`
      );

      return {
        winnerDate,
        status: "cleared_no_posts",
        winner: null,
        affectedWinnerUserIds: previousWinnerUserIds,
        existingRowCount,
      };
    }

    logger.warn(
      `[daily-winner-snapshot] No posts found for ${winnerDate}; nothing to snapshot.`
    );

    return {
      winnerDate,
      status: "noop_no_posts",
      winner: null,
      affectedWinnerUserIds: previousWinnerUserIds,
      existingRowCount,
    };
  }

  const postIds = posts.map((post) => post.id);
  const authorIds = uniqueStringIds(posts.map((post) => post.user_id));
  const rankingNow = getZurichDayRankingReferenceTime(endIso);

  const [commentCountsByPostId, reactionCountsByPostId, profilesById] =
    await Promise.all([
      loadCommentCountsByPostId(supabase, postIds),
      loadReactionCountsByPostId(supabase, postIds),
      loadProfilesById(supabase, authorIds),
    ]);

  const rankedPosts = posts
    .map((post) => {
      const reactionCounts =
        reactionCountsByPostId.get(post.id) ?? createEmptyReactionCounts();
      const commentsCount = commentCountsByPostId.get(post.id) ?? 0;
      const reactionsTotal =
        reactionCounts.like +
        reactionCounts.funny +
        reactionCounts.wow +
        reactionCounts.fire;
      const authorProfile = post.user_id
        ? profilesById.get(post.user_id) ?? null
        : null;

      return {
        post,
        commentsCount,
        reactionCounts,
        relevanceScore: getLiveScore({
          reactionsTotal,
          commentsCount,
          createdAt: post.created_at,
          now: rankingNow,
        }),
        authorUsername: authorProfile?.username ?? null,
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
    );

  const topPost = rankedPosts[0];

  if (!topPost) {
    throw new Error(`No ranked winner could be selected for ${winnerDate}.`);
  }

  const winnerRow: DailyWinnerSnapshotRow = {
    winner_date: winnerDate,
    rank_position: 1,
    post_id: topPost.post.id,
    post_created_at: topPost.post.created_at,
    post_content: topPost.post.content ?? "",
    author_id: topPost.post.user_id ?? null,
    author_username: topPost.authorUsername,
    likes_count: topPost.reactionCounts.like,
    funny_count: topPost.reactionCounts.funny,
    wow_count: topPost.reactionCounts.wow,
    fire_count: topPost.reactionCounts.fire,
    comments_count: topPost.commentsCount,
    relevance_score: topPost.relevanceScore,
  };

  if (mode === "replace" && existingRowCount > 0) {
    const { error: deleteError } = await supabase
      .from("daily_post_winners")
      .delete()
      .eq("winner_date", winnerDate)
      .eq("rank_position", 1);

    if (deleteError) {
      throw new Error(deleteError.message);
    }
  }

  const { error: insertError } = await supabase
    .from("daily_post_winners")
    .insert(winnerRow);

  if (insertError) {
    if (mode === "skip_if_exists" && insertError.code === "23505") {
      logger.warn(
        `[daily-winner-snapshot] Duplicate winner prevented for ${winnerDate}; treating as already snapshotted.`
      );

      return {
        winnerDate,
        status: "skipped_existing",
        winner: null,
        affectedWinnerUserIds: previousWinnerUserIds,
        existingRowCount,
      };
    }

    throw new Error(insertError.message);
  }

  const affectedWinnerUserIds = uniqueStringIds([
    ...previousWinnerUserIds,
    winnerRow.author_id,
  ]);

  await recomputeAffectedWinners(affectedWinnerUserIds, onAffectedWinnerUser);

  const status = existingRowCount > 0 ? "replaced" : "inserted";
  logger.info(
    `[daily-winner-snapshot] ${status} snapshot for ${winnerDate} with post ${winnerRow.post_id}.`
  );

  return {
    winnerDate,
    status,
    winner: winnerRow,
    affectedWinnerUserIds,
    existingRowCount,
  };
}
