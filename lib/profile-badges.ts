export type ProfileBadgeKey =
  | "founding_voice"
  | "helpful_mind"
  | "daily_winner"
  | "hall_of_fame"
  | "idea_creator"
  | "platform_builder"
  | "community_supporter"
  | "quality_poster"
  | "constructive_voice"
  | "top_contributor";

export type ProfileBadgeDefinition = {
  key: ProfileBadgeKey;
  label: string;
  emoji: string;
  description: string;
  className: string;
};

export const PROFILE_BADGES: ProfileBadgeDefinition[] = [
  {
    key: "founding_voice",
    label: "Frühe Stimme",
    emoji: "🌱",
    description: "Früh dabei und Teil der ersten Community.",
    className: "bg-emerald-50 text-emerald-700",
  },
  {
    key: "helpful_mind",
    label: "Hilfreicher Denker",
    emoji: "💡",
    description: "Hilfreiche Beiträge mit echtem Mehrwert.",
    className: "bg-yellow-50 text-yellow-700",
  },
  {
    key: "daily_winner",
    label: "Tagessieger",
    emoji: "🏆",
    description: "Ein Beitrag hat es auf das Tagespodest geschafft.",
    className: "bg-amber-100 text-amber-800",
  },
  {
    key: "hall_of_fame",
    label: "Hall of Fame",
    emoji: "👑",
    description: "Dauerhaft ausgezeichnet in der Hall of Fame.",
    className: "bg-indigo-100 text-indigo-700",
  },
  {
    key: "idea_creator",
    label: "Ideenstarter",
    emoji: "🛠️",
    description: "Hat wertvolle Verbesserungswünsche eingebracht.",
    className: "bg-orange-50 text-orange-700",
  },
  {
    key: "platform_builder",
    label: "Plattform-Mitgestalter",
    emoji: "🚀",
    description: "Hat die Plattform spürbar weitergebracht.",
    className: "bg-sky-50 text-sky-700",
  },
  {
    key: "community_supporter",
    label: "Community Supporter",
    emoji: "🤝",
    description: "Stärkt die Community durch konstante Aktivität.",
    className: "bg-teal-50 text-teal-700",
  },
  {
    key: "quality_poster",
    label: "Qualitätsbeitrag",
    emoji: "✨",
    description: "Steht für besonders starke Beiträge.",
    className: "bg-violet-50 text-violet-700",
  },
  {
    key: "constructive_voice",
    label: "Konstruktive Stimme",
    emoji: "🧭",
    description: "Sorgt für sachliche und konstruktive Diskussionen.",
    className: "bg-cyan-50 text-cyan-700",
  },
  {
    key: "top_contributor",
    label: "Top Contributor",
    emoji: "🔥",
    description: "Besonders starker Gesamtbeitrag zur Plattform.",
    className: "bg-rose-50 text-rose-700",
  },
];

export const PROFILE_BADGE_KEYS = PROFILE_BADGES.map((badge) => badge.key);

export function getProfileBadge(key: string) {
  return PROFILE_BADGES.find((badge) => badge.key === key) ?? null;
}