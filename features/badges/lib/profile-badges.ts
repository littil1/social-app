export type BadgeColorToken =
  | "neutral"
  | "slate"
  | "amber"
  | "emerald"
  | "indigo"
  | "rose"
  | "violet"
  | "sky"
  | "teal";

export const KNOW_EVERYTHING_BADGE_KEY = "know_everything";
export const LEGEND_BADGE_ICON = "👑";

export const PROFILE_BADGES = [
  {
    key: "daily_winner",
    label: "Daily Winner",
    emoji: "👑",
    className: "border-amber-200 bg-amber-50 text-amber-800",
  },
  {
    key: KNOW_EVERYTHING_BADGE_KEY,
    label: "I want to know everything",
    emoji: "\u221E",
    className: "border-violet-200 bg-violet-50 text-violet-800",
  },
] as const;

export type ProfileBadgeKey = (typeof PROFILE_BADGES)[number]["key"];

export const PROFILE_BADGE_KEYS: ProfileBadgeKey[] = PROFILE_BADGES.map(
  (badge) => badge.key
);

export type BadgeDefinitionRow = {
  id: number;
  key: string;
  family: string;
  level: number;
  threshold: number;
  name: string;
  short_label: string;
  description: string | null;
  icon: string | null;
  color_token: string;
  sort_order: number;
};

export type UserBadgeRow = {
  badge_id: number;
  family: string;
  awarded_at: string;
  progress_value: number | null;
};

export type UserBadgeDisplay = {
  id: number;
  key: string;
  family: string;
  level: number;
  threshold: number;
  label: string;
  description: string;
  icon: string;
  colorToken: BadgeColorToken;
  className: string;
  sortOrder: number;
  awardedAt: string;
  progressValue: number | null;
};

export function getProfileBadge(key: string) {
  return PROFILE_BADGES.find((badge) => badge.key === key) ?? null;
}

function isBadgeColorToken(value: string): value is BadgeColorToken {
  return (
    value === "neutral" ||
    value === "slate" ||
    value === "amber" ||
    value === "emerald" ||
    value === "indigo" ||
    value === "rose" ||
    value === "violet" ||
    value === "sky" ||
    value === "teal"
  );
}

function getBadgeClassName(colorToken: BadgeColorToken, level: number) {
  const levelAccent =
    level >= 6
      ? "ring-2 ring-offset-1"
      : level >= 4
      ? "ring-1 ring-offset-1"
      : "";

  switch (colorToken) {
    case "amber":
      return `border-amber-200 bg-amber-50 text-amber-800 ${levelAccent}`.trim();
    case "emerald":
      return `border-emerald-200 bg-emerald-50 text-emerald-800 ${levelAccent}`.trim();
    case "indigo":
      return `border-indigo-200 bg-indigo-50 text-indigo-800 ${levelAccent}`.trim();
    case "rose":
      return `border-rose-200 bg-rose-50 text-rose-800 ${levelAccent}`.trim();
    case "violet":
      return `border-violet-200 bg-violet-50 text-violet-800 ${levelAccent}`.trim();
    case "sky":
      return `border-sky-200 bg-sky-50 text-sky-800 ${levelAccent}`.trim();
    case "teal":
      return `border-teal-200 bg-teal-50 text-teal-800 ${levelAccent}`.trim();
    case "slate":
      return `border-slate-200 bg-slate-50 text-slate-800 ${levelAccent}`.trim();
    case "neutral":
    default:
      return `border-neutral-200 bg-neutral-50 text-neutral-800 ${levelAccent}`.trim();
  }
}

export function mapBadgeToDisplay(
  badge: BadgeDefinitionRow,
  userBadge: UserBadgeRow
): UserBadgeDisplay {
  const colorToken = isBadgeColorToken(badge.color_token)
    ? badge.color_token
    : "neutral";

  return {
    id: badge.id,
    key: badge.key,
    family: badge.family,
    level: badge.level,
    threshold: badge.threshold,
    label: badge.short_label,
    description: badge.description ?? badge.name,
    icon: badge.family === "legend" ? LEGEND_BADGE_ICON : badge.icon ?? "🏅",
    colorToken,
    className: getBadgeClassName(colorToken, badge.level),
    sortOrder: badge.sort_order,
    awardedAt: userBadge.awarded_at,
    progressValue: userBadge.progress_value ?? null,
  };
}
