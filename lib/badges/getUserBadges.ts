import { createClient } from "@/lib/supabase-server";
import {
  mapBadgeToDisplay,
  type BadgeDefinitionRow,
  type UserBadgeRow,
  type UserBadgeDisplay,
} from "@/lib/profile-badges";

export type GetUserBadgesOptions = {
  limitPerUser?: number;
};

export async function getUserBadges(
  userIds: string[],
  options: GetUserBadgesOptions = {}
) {
  const uniqueUserIds = Array.from(
    new Set(userIds.filter((value): value is string => typeof value === "string"))
  );

  const result = new Map<string, UserBadgeDisplay[]>();

  if (uniqueUserIds.length === 0) {
    return result;
  }

  const supabase = await createClient();
  const badgeClient = supabase as any;

  const { data: userBadgesData, error: userBadgesError } = await badgeClient
    .from("user_badges")
    .select("user_id, badge_id, family, awarded_at, progress_value")
    .in("user_id", uniqueUserIds);

  if (userBadgesError) {
    throw new Error(userBadgesError.message);
  }

  const typedUserBadges = (userBadgesData ?? []) as Array<
    UserBadgeRow & { user_id: string }
  >;

  const badgeIds = Array.from(
    new Set(
      typedUserBadges
        .map((badge) => badge.badge_id)
        .filter((id): id is number => typeof id === "number")
    )
  );

  if (badgeIds.length === 0) {
    return result;
  }

  const { data: badgeDefinitionsData, error: badgeDefinitionsError } =
    await badgeClient
      .from("badges")
      .select(
        "id, key, family, level, threshold, name, short_label, description, icon, color_token, sort_order"
      )
      .in("id", badgeIds)
      .eq("is_active", true);

  if (badgeDefinitionsError) {
    throw new Error(badgeDefinitionsError.message);
  }

  const badgeDefinitionMap = new Map<number, BadgeDefinitionRow>(
    ((badgeDefinitionsData ?? []) as BadgeDefinitionRow[]).map((badge) => [
      badge.id,
      badge,
    ])
  );

  for (const userBadge of typedUserBadges) {
    const definition = badgeDefinitionMap.get(userBadge.badge_id);
    if (!definition) continue;

    const mapped = mapBadgeToDisplay(definition, userBadge);
    const existing = result.get(userBadge.user_id) ?? [];
    existing.push(mapped);
    result.set(userBadge.user_id, existing);
  }

  for (const [userId, badges] of result.entries()) {
    badges.sort((a, b) => a.sortOrder - b.sortOrder);

    if (
      typeof options.limitPerUser === "number" &&
      options.limitPerUser > 0 &&
      badges.length > options.limitPerUser
    ) {
      result.set(userId, badges.slice(0, options.limitPerUser));
    } else {
      result.set(userId, badges);
    }
  }

  return result;
}