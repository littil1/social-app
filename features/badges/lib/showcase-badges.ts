import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/shared/types/database";
import { ALL_BADGE_FAMILIES, type BadgeFamily } from "@/features/badges/lib";

export type { BadgeFamily };

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

type BadgeDefinitionRow = Pick<
  Database["public"]["Tables"]["badges"]["Row"],
  | "id"
  | "key"
  | "family"
  | "level"
  | "threshold"
  | "name"
  | "short_label"
  | "icon"
  | "color_token"
  | "sort_order"
>;

type UserBadgeRow = Pick<
  Database["public"]["Tables"]["user_badges"]["Row"],
  "badge_id" | "family" | "progress_value"
>;

const BADGE_FAMILY_SET = new Set<string>(ALL_BADGE_FAMILIES);

export const BADGE_FAMILY_ORDER: BadgeFamily[] = [...ALL_BADGE_FAMILIES];
export const PROFILE_BADGE_SHOWCASE_FAMILIES: BadgeFamily[] = [
  ...ALL_BADGE_FAMILIES,
];

const PROFILE_BADGE_PRESTIGE_PRIORITY: Record<BadgeFamily, number> = {
  legend: 1,
  builder: 1,
  contributor: 2,
  most_reacted: 2,
  most_discussed: 2,
  top_reactor: 3,
  top_commentator: 3,
};

const FAMILY_FALLBACK_LABEL: Record<BadgeFamily, string> = {
  legend: "Legend",
  contributor: "Contributor",
  builder: "Builder",
  top_reactor: "Top Reactor",
  most_reacted: "Most Reacted",
  top_commentator: "Top Commentator",
  most_discussed: "Most Discussed",
};

function clampBadgeTier(level: number): BadgeTier {
  if (level <= 1) return 1;
  if (level >= 5) return 5;
  return level as BadgeTier;
}

function isBadgeFamily(value: string): value is BadgeFamily {
  return BADGE_FAMILY_SET.has(value);
}

function getProgressLabel(current: number, next: number | null) {
  if (next === null) {
    return `${current} total (max tier)`;
  }

  return `${current} / ${next} to next tier`;
}

function getNextThreshold(
  current: number,
  familyDefinitions: BadgeDefinitionRow[]
) {
  return (
    familyDefinitions
      .map((definition) => definition.threshold)
      .filter((threshold, index, thresholds) => {
        return thresholds.indexOf(threshold) === index && threshold > current;
      })
      .sort((a, b) => a - b)[0] ?? null
  );
}

function compareBadgePriority(
  next: ComputedUserBadge,
  current: ComputedUserBadge
) {
  if (next.tier !== current.tier) {
    return next.tier - current.tier;
  }

  return current.sortPriority - next.sortPriority;
}

export async function getComputedUserBadges(
  supabase: SupabaseClient<Database>,
  userId: string,
  options: { includeProgress: boolean }
) {
  const [{ data: badgeDefinitionsData, error: badgeDefinitionsError }, { data: userBadgesData, error: userBadgesError }] =
    await Promise.all([
      supabase
        .from("badges")
        .select(
          "id, key, family, level, threshold, name, short_label, icon, color_token, sort_order"
        )
        .eq("is_active", true)
        .in("family", [...ALL_BADGE_FAMILIES]),
      supabase
        .from("user_badges")
        .select("badge_id, family, progress_value")
        .eq("user_id", userId)
        .in("family", [...ALL_BADGE_FAMILIES]),
    ]);

  if (badgeDefinitionsError) {
    throw new Error(badgeDefinitionsError.message);
  }

  if (userBadgesError) {
    throw new Error(userBadgesError.message);
  }

  const badgeDefinitions = (badgeDefinitionsData ?? []) as BadgeDefinitionRow[];
  const userBadges = (userBadgesData ?? []) as UserBadgeRow[];
  const definitionById = new Map<number, BadgeDefinitionRow>();
  const definitionsByFamily = new Map<BadgeFamily, BadgeDefinitionRow[]>();

  for (const definition of badgeDefinitions) {
    if (!isBadgeFamily(definition.family)) continue;

    definitionById.set(definition.id, definition);
    const current = definitionsByFamily.get(definition.family) ?? [];
    current.push(definition);
    definitionsByFamily.set(definition.family, current);
  }

  for (const [family, definitions] of definitionsByFamily.entries()) {
    definitions.sort(
      (a, b) => a.threshold - b.threshold || a.sort_order - b.sort_order
    );
    definitionsByFamily.set(family, definitions);
  }

  const highestByFamily = new Map<BadgeFamily, ComputedUserBadge>();

  for (const userBadge of userBadges) {
    if (!isBadgeFamily(userBadge.family)) continue;

    const definition = definitionById.get(userBadge.badge_id);
    if (!definition) continue;

    const familyDefinitions = definitionsByFamily.get(userBadge.family) ?? [];
    const currentValue = Math.max(
      userBadge.progress_value ?? definition.threshold,
      0
    );
    const nextThreshold = getNextThreshold(currentValue, familyDefinitions);

    const computedBadge: ComputedUserBadge = {
      family: userBadge.family,
      tier: clampBadgeTier(definition.level),
      label:
        definition.short_label?.trim() ||
        definition.name?.trim() ||
        FAMILY_FALLBACK_LABEL[userBadge.family],
      icon: definition.icon?.trim() || "🏅",
      sortPriority: definition.sort_order,
      total: {
        count: currentValue,
        label: `Total: ${currentValue}`,
      },
      progress: options.includeProgress
        ? {
            current: currentValue,
            next: nextThreshold,
            isMaxLevel: nextThreshold === null,
            label: getProgressLabel(currentValue, nextThreshold),
          }
        : undefined,
    };

    const existing = highestByFamily.get(userBadge.family);
    if (!existing || compareBadgePriority(computedBadge, existing) > 0) {
      highestByFamily.set(userBadge.family, computedBadge);
    }
  }

  return [...highestByFamily.values()].sort(
    (a, b) =>
      PROFILE_BADGE_PRESTIGE_PRIORITY[a.family] -
        PROFILE_BADGE_PRESTIGE_PRIORITY[b.family] ||
      b.tier - a.tier ||
      a.sortPriority - b.sortPriority
  );
}
