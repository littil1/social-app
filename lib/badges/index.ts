import type { PostgrestFilterBuilder } from "@supabase/postgrest-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export const ALL_BADGE_FAMILIES = [
  "legend",
  "contributor",
  "builder",
  "top_reactor",
  "most_reacted",
  "top_commentator",
  "most_discussed",
] as const;

export type BadgeFamily = (typeof ALL_BADGE_FAMILIES)[number];

type UserBadgeRecord = {
  id: number;
  badge_id: number;
};

async function getExactCount(
  query: PostgrestFilterBuilder<any, any, { count: number | null }, unknown>
) {
  const { count, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

async function getNumberIds(
  query: Promise<{ data: Array<{ id: number }> | null; error: { message: string } | null }>
) {
  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? [])
    .map((row) => row.id)
    .filter((value): value is number => typeof value === "number");
}

async function getHighestBadgeForProgress(
  supabase: SupabaseClient<Database>,
  family: BadgeFamily,
  progressValue: number
) {
  if (progressValue <= 0) {
    return null;
  }

  const { data, error } = await supabase
    .from("badges")
    .select("id, family, threshold")
    .eq("family", family)
    .eq("is_active", true)
    .lte("threshold", progressValue)
    .order("threshold", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? null;
}

async function upsertHighestBadgeForFamily(
  supabase: SupabaseClient<Database>,
  userId: string,
  family: BadgeFamily,
  progressValue: number
) {
  const highestBadge = await getHighestBadgeForProgress(
    supabase,
    family,
    progressValue
  );

  const { data: existingRow, error: existingError } = await supabase
    .from("user_badges")
    .select("id, badge_id")
    .eq("user_id", userId)
    .eq("family", family)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  const existing = (existingRow ?? null) as UserBadgeRecord | null;

  if (!highestBadge) {
    if (existing) {
      const { error: deleteError } = await supabase
        .from("user_badges")
        .delete()
        .eq("id", existing.id);

      if (deleteError) {
        throw new Error(deleteError.message);
      }
    }

    return;
  }

  if (!existing) {
    const { error: insertError } = await supabase.from("user_badges").insert({
      user_id: userId,
      badge_id: highestBadge.id,
      family,
      awarded_via: "automatic",
      progress_value: progressValue,
    });

    if (insertError) {
      throw new Error(insertError.message);
    }

    return;
  }

  if (existing.badge_id === highestBadge.id) {
    const { error: updateError } = await supabase
      .from("user_badges")
      .update({
        progress_value: progressValue,
      })
      .eq("id", existing.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return;
  }

  const { error: promoteError } = await supabase
    .from("user_badges")
    .update({
      badge_id: highestBadge.id,
      progress_value: progressValue,
      awarded_via: "automatic",
      awarded_at: new Date().toISOString(),
    })
    .eq("id", existing.id);

  if (promoteError) {
    throw new Error(promoteError.message);
  }
}

async function getLegendCount(
  supabase: SupabaseClient<Database>,
  userId: string
) {
  return getExactCount(
    supabase
      .from("daily_post_winners")
      .select("*", { count: "exact", head: true })
      .eq("rank_position", 1)
      .eq("author_id", userId)
  );
}

async function getContributorCount(
  supabase: SupabaseClient<Database>,
  userId: string
) {
  return getExactCount(
    supabase
      .from("feature_requests")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
  );
}

async function getBuilderCount(
  supabase: SupabaseClient<Database>,
  userId: string
) {
  return getExactCount(
    supabase
      .from("feature_requests")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "implemented")
  );
}

async function getTopReactorCount(
  supabase: SupabaseClient<Database>,
  userId: string
) {
  const [postReactionCount, commentReactionCount, feedbackCommentReactionCount] =
    await Promise.all([
      getExactCount(
        supabase
          .from("post_reactions")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
      ),
      getExactCount(
        supabase
          .from("comment_reactions")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
      ),
      getExactCount(
        supabase
          .from("feature_request_comment_reactions")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
      ),
    ]);

  return (
    postReactionCount + commentReactionCount + feedbackCommentReactionCount
  );
}

async function getMostReactedCount(
  supabase: SupabaseClient<Database>,
  userId: string
) {
  const [postIds, commentIds, feedbackCommentIds] = await Promise.all([
    getNumberIds(
      supabase.from("posts").select("id").eq("user_id", userId)
    ),
    getNumberIds(
      supabase
        .from("comments")
        .select("id")
        .eq("user_id", userId)
        .is("deleted_at", null)
    ),
    getNumberIds(
      supabase
        .from("feature_request_comments")
        .select("id")
        .eq("user_id", userId)
    ),
  ]);

  let total = 0;

  if (postIds.length > 0) {
    total += await getExactCount(
      supabase
        .from("post_reactions")
        .select("*", { count: "exact", head: true })
        .in("post_id", postIds)
    );
  }

  if (commentIds.length > 0) {
    total += await getExactCount(
      supabase
        .from("comment_reactions")
        .select("*", { count: "exact", head: true })
        .in("comment_id", commentIds)
    );
  }

  if (feedbackCommentIds.length > 0) {
    total += await getExactCount(
      supabase
        .from("feature_request_comment_reactions")
        .select("*", { count: "exact", head: true })
        .in("comment_id", feedbackCommentIds)
    );
  }

  return total;
}

async function getTopCommentatorCount(
  supabase: SupabaseClient<Database>,
  userId: string
) {
  const [postCommentCount, feedbackCommentCount] = await Promise.all([
    getExactCount(
      supabase
        .from("comments")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("deleted_at", null)
    ),
    getExactCount(
      supabase
        .from("feature_request_comments")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
    ),
  ]);

  return postCommentCount + feedbackCommentCount;
}

async function getMostDiscussedCount(
  supabase: SupabaseClient<Database>,
  userId: string
) {
  const [postIds, requestIds] = await Promise.all([
    getNumberIds(
      supabase.from("posts").select("id").eq("user_id", userId)
    ),
    getNumberIds(
      supabase
        .from("feature_requests")
        .select("id")
        .eq("user_id", userId)
    ),
  ]);

  let total = 0;

  if (postIds.length > 0) {
    total += await getExactCount(
      supabase
        .from("comments")
        .select("*", { count: "exact", head: true })
        .in("post_id", postIds)
        .is("deleted_at", null)
    );
  }

  if (requestIds.length > 0) {
    total += await getExactCount(
      supabase
        .from("feature_request_comments")
        .select("*", { count: "exact", head: true })
        .in("feature_request_id", requestIds)
    );
  }

  return total;
}

async function getProgressForFamily(
  supabase: SupabaseClient<Database>,
  userId: string,
  family: BadgeFamily
) {
  switch (family) {
    case "legend":
      return getLegendCount(supabase, userId);
    case "contributor":
      return getContributorCount(supabase, userId);
    case "builder":
      return getBuilderCount(supabase, userId);
    case "top_reactor":
      return getTopReactorCount(supabase, userId);
    case "most_reacted":
      return getMostReactedCount(supabase, userId);
    case "top_commentator":
      return getTopCommentatorCount(supabase, userId);
    case "most_discussed":
      return getMostDiscussedCount(supabase, userId);
    default:
      return 0;
  }
}

export async function recomputeUserBadgeFamilies(
  supabase: SupabaseClient<Database>,
  userId: string,
  families: BadgeFamily[]
) {
  const uniqueFamilies = [...new Set(families)];

  for (const family of uniqueFamilies) {
    const progressValue = await getProgressForFamily(supabase, userId, family);
    await upsertHighestBadgeForFamily(supabase, userId, family, progressValue);
  }
}
