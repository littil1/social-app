import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/shared/types/database";

export type BadgeFamily =
  | "legend"
  | "podium"
  | "impact"
  | "spark"
  | "creator"
  | "influence"
  | "contributor"
  | "supporter"
  | "connector";

export type BadgeTier = 1 | 2 | 3 | 4 | 5;

export type ComputedUserBadge = {
  family: BadgeFamily;
  tier: BadgeTier;
  label: string;
  icon: string;
  sortPriority: number;
  total: {
    count: number;
    label: string;
  };
  progress?: {
    current: number;
    next: number | null;
    isMaxLevel: boolean;
    label: string;
  };
};

type BadgeFamilyDefinition = {
  family: BadgeFamily;
  label: string;
  icon: string;
  sortPriority: number;
  thresholds: [number, number, number, number, number];
  totalLabel: (current: number) => string;
  progressLabel: (current: number, next: number | null) => string;
};

type CountResult = {
  count: number | null;
  error: { message: string } | null;
};

type IdResult = {
  data: Array<{ id: number }> | null;
  error: { message: string } | null;
};

type UserBadgeCounts = Record<BadgeFamily, number>;

export const BADGE_FAMILY_ORDER: BadgeFamily[] = [
  "legend",
  "podium",
  "impact",
  "spark",
  "creator",
  "influence",
  "contributor",
  "supporter",
  "connector",
];

export const PROFILE_BADGE_SHOWCASE_FAMILIES: BadgeFamily[] = [
  "legend",
  "impact",
  "spark",
  "creator",
  "influence",
  "contributor",
  "supporter",
  "connector",
];

const PROFILE_BADGE_PRESTIGE_PRIORITY: Record<BadgeFamily, number> = {
  legend: 1,
  impact: 1,
  spark: 1,
  creator: 2,
  influence: 2,
  contributor: 3,
  supporter: 3,
  connector: 3,
  podium: 4,
};

export const BADGE_FAMILY_DEFINITIONS: Record<
  BadgeFamily,
  BadgeFamilyDefinition
> = {
  legend: {
    family: "legend",
    label: "Legend",
    icon: "\u265B",
    sortPriority: 10,
    thresholds: [1, 3, 5, 10, 25],
    totalLabel: (current) =>
      `Total: ${current} ${current === 1 ? "legendary win" : "legendary wins"}`,
    progressLabel: (current, next) =>
      next === null
        ? `${current} daily wins`
        : `${current} / ${next} daily wins to next tier`,
  },
  podium: {
    family: "podium",
    label: "Podium",
    icon: "\u25C6",
    sortPriority: 20,
    thresholds: [1, 5, 10, 25, 50],
    totalLabel: (current) =>
      `Total: ${current} ${current === 1 ? "Top 3 finish" : "Top 3 finishes"}`,
    progressLabel: (current, next) =>
      next === null
        ? `${current} Top 3 finishes`
        : `${current} / ${next} Top 3 finishes to next tier`,
  },
  impact: {
    family: "impact",
    label: "Impact",
    icon: "\u2726",
    sortPriority: 20,
    thresholds: [10, 50, 100, 250, 500],
    totalLabel: (current) =>
      `Total: ${current} ${current === 1 ? "reaction received" : "reactions received"}`,
    progressLabel: (current, next) =>
      next === null
        ? `${current} reactions received`
        : `${current} / ${next} reactions received to next tier`,
  },
  spark: {
    family: "spark",
    label: "Spark",
    icon: "\u2739",
    sortPriority: 30,
    thresholds: [10, 50, 100, 250, 500],
    totalLabel: (current) =>
      `Total: ${current} ${current === 1 ? "comment sparked" : "comments sparked"}`,
    progressLabel: (current, next) =>
      next === null
        ? `${current} comments generated`
        : `${current} / ${next} comments generated to next tier`,
  },
  creator: {
    family: "creator",
    label: "Creator",
    icon: "\u25A3",
    sortPriority: 40,
    thresholds: [1, 10, 50, 100, 250],
    totalLabel: (current) =>
      `Total: ${current} ${current === 1 ? "post created" : "posts created"}`,
    progressLabel: (current, next) =>
      next === null
        ? `${current} posts created`
        : `${current} / ${next} posts created to next tier`,
  },
  influence: {
    family: "influence",
    label: "Influence",
    icon: "\u25CE",
    sortPriority: 50,
    thresholds: [1, 10, 50, 100, 250],
    totalLabel: (current) =>
      `Total: ${current} ${current === 1 ? "follower" : "followers"}`,
    progressLabel: (current, next) =>
      next === null
        ? `${current} followers`
        : `${current} / ${next} followers to next tier`,
  },
  contributor: {
    family: "contributor",
    label: "Contributor",
    icon: "\u25C7",
    sortPriority: 60,
    thresholds: [1, 3, 5, 10, 25],
    totalLabel: (current) =>
      `Total: ${current} ${current === 1 ? "implemented idea" : "implemented ideas"}`,
    progressLabel: (current, next) =>
      next === null
        ? `${current} accepted contributions`
        : `${current} / ${next} accepted contributions to next tier`,
  },
  supporter: {
    family: "supporter",
    label: "Supporter",
    icon: "\u2727",
    sortPriority: 70,
    thresholds: [10, 50, 100, 250, 500],
    totalLabel: (current) =>
      `Total: ${current} reactions/comments given`,
    progressLabel: (current, next) =>
      next === null
        ? `${current} reactions/comments given`
        : `${current} / ${next} reactions/comments given to next tier`,
  },
  connector: {
    family: "connector",
    label: "Connector",
    icon: "\u221E",
    sortPriority: 80,
    thresholds: [1, 10, 50, 100, 250],
    totalLabel: (current) =>
      `Total: ${current} ${current === 1 ? "user followed" : "users followed"}`,
    progressLabel: (current, next) =>
      next === null
        ? `${current} users followed`
        : `${current} / ${next} users followed to next tier`,
  },
};

async function getExactCount(query: PromiseLike<CountResult>) {
  const { count, error } = await query;

  if (error) {
    console.error("[badge-showcase] Count error:", error.message);
    return 0;
  }

  return count ?? 0;
}

async function getNumberIds(query: PromiseLike<IdResult>) {
  const { data, error } = await query;

  if (error) {
    console.error("[badge-showcase] ID query error:", error.message);
    return [];
  }

  return (data ?? []).map((row) => row.id).filter(Number.isFinite);
}

function getTierForProgress(
  current: number,
  thresholds: BadgeFamilyDefinition["thresholds"]
) {
  let tier: BadgeTier | null = null;

  thresholds.forEach((threshold, index) => {
    if (current >= threshold) {
      tier = (index + 1) as BadgeTier;
    }
  });

  return tier;
}

function getNextThreshold(
  current: number,
  thresholds: BadgeFamilyDefinition["thresholds"]
) {
  return thresholds.find((threshold) => threshold > current) ?? null;
}

async function getLegendCount(
  supabase: SupabaseClient<Database>,
  userId: string
) {
  return getExactCount(
    supabase
      .from("daily_post_winners")
      .select("*", { count: "exact", head: true })
      .eq("author_id", userId)
      .eq("rank_position", 1)
  );
}

async function getImpactCount(
  supabase: SupabaseClient<Database>,
  userId: string
) {
  const [postIds, commentIds, feedbackCommentIds] = await Promise.all([
    getNumberIds(supabase.from("posts").select("id").eq("user_id", userId)),
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

  const [postReactions, commentReactions, feedbackCommentReactions] =
    await Promise.all([
      postIds.length > 0
        ? getExactCount(
            supabase
              .from("post_reactions")
              .select("*", { count: "exact", head: true })
              .in("post_id", postIds)
          )
        : 0,
      commentIds.length > 0
        ? getExactCount(
            supabase
              .from("comment_reactions")
              .select("*", { count: "exact", head: true })
              .in("comment_id", commentIds)
          )
        : 0,
      feedbackCommentIds.length > 0
        ? getExactCount(
            supabase
              .from("feature_request_comment_reactions")
              .select("*", { count: "exact", head: true })
              .in("comment_id", feedbackCommentIds)
          )
        : 0,
    ]);

  return postReactions + commentReactions + feedbackCommentReactions;
}

async function getCreatorCount(
  supabase: SupabaseClient<Database>,
  userId: string
) {
  return getExactCount(
    supabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
  );
}

async function getSparkCount(
  supabase: SupabaseClient<Database>,
  userId: string
) {
  const [postIds, requestIds] = await Promise.all([
    getNumberIds(supabase.from("posts").select("id").eq("user_id", userId)),
    getNumberIds(
      supabase
        .from("feature_requests")
        .select("id")
        .eq("user_id", userId)
    ),
  ]);

  const [postComments, feedbackComments] = await Promise.all([
    postIds.length > 0
      ? getExactCount(
          supabase
            .from("comments")
            .select("*", { count: "exact", head: true })
            .in("post_id", postIds)
            .is("deleted_at", null)
        )
      : 0,
    requestIds.length > 0
      ? getExactCount(
          supabase
            .from("feature_request_comments")
            .select("*", { count: "exact", head: true })
            .in("feature_request_id", requestIds)
        )
      : 0,
  ]);

  return postComments + feedbackComments;
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
      .eq("status", "implemented")
  );
}

async function getInfluenceCount(
  supabase: SupabaseClient<Database>,
  userId: string
) {
  return getExactCount(
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", userId)
  );
}

async function getSupporterCount(
  supabase: SupabaseClient<Database>,
  userId: string
) {
  const [
    postReactionsGiven,
    commentReactionsGiven,
    feedbackCommentReactionsGiven,
    postCommentsGiven,
    feedbackCommentsGiven,
  ] = await Promise.all([
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

  return (
    postReactionsGiven +
    commentReactionsGiven +
    feedbackCommentReactionsGiven +
    postCommentsGiven +
    feedbackCommentsGiven
  );
}

async function getConnectorCount(
  supabase: SupabaseClient<Database>,
  userId: string
) {
  return getExactCount(
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", userId)
  );
}

export async function getUserBadgeCounts(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<UserBadgeCounts> {
  const [
    legend,
    impact,
    spark,
    creator,
    influence,
    contributor,
    supporter,
    connector,
  ] = await Promise.all([
    getLegendCount(supabase, userId),
    getImpactCount(supabase, userId),
    getSparkCount(supabase, userId),
    getCreatorCount(supabase, userId),
    getInfluenceCount(supabase, userId),
    getContributorCount(supabase, userId),
    getSupporterCount(supabase, userId),
    getConnectorCount(supabase, userId),
  ]);

  return {
    legend,
    podium: 0,
    impact,
    spark,
    creator,
    influence,
    contributor,
    supporter,
    connector,
  };
}

export function computeUserBadgesFromCounts(
  counts: UserBadgeCounts,
  options: { includeProgress: boolean }
): ComputedUserBadge[] {
  return PROFILE_BADGE_SHOWCASE_FAMILIES.flatMap((family) => {
    const definition = BADGE_FAMILY_DEFINITIONS[family];
    const current = counts[family] ?? 0;
    const tier = getTierForProgress(current, definition.thresholds);

    if (!tier) {
      return [];
    }

    const next = getNextThreshold(current, definition.thresholds);

    return [
      {
        family,
        tier,
        label: definition.label,
        icon: definition.icon,
        sortPriority: definition.sortPriority,
        total: {
          count: current,
          label: definition.totalLabel(current),
        },
        progress: options.includeProgress
          ? {
              current,
              next,
              isMaxLevel: next === null,
              label: definition.progressLabel(current, next),
            }
          : undefined,
      },
    ];
  }).sort(
    (a, b) =>
      PROFILE_BADGE_PRESTIGE_PRIORITY[a.family] -
        PROFILE_BADGE_PRESTIGE_PRIORITY[b.family] ||
      b.tier - a.tier ||
      a.sortPriority - b.sortPriority
  );
}

export async function getComputedUserBadges(
  supabase: SupabaseClient<Database>,
  userId: string,
  options: { includeProgress: boolean }
) {
  const counts = await getUserBadgeCounts(supabase, userId);

  return computeUserBadgesFromCounts(counts, options);
}
