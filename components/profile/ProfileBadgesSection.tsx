import { type UserBadgeDisplay } from "@/lib/badges/profile-badges";

type ProfileBadgesSectionProps = {
  badges: UserBadgeDisplay[];
};

export default function ProfileBadgesSection({
  badges,
}: ProfileBadgesSectionProps) {
  if (badges.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-5 text-sm text-neutral-500">
        Noch keine Badges.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {badges.map((badge) => (
        <span
          key={badge.key}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold shadow-sm ${badge.className}`}
          title={badge.description}
        >
          <span aria-hidden="true">{badge.icon}</span>
          <span>{badge.label}</span>
        </span>
      ))}
    </div>
  );
}
