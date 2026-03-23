"use client";

import { useState } from "react";
import AdminBadgeManager from "@/app/components/profile/AdminBadgeManager";
import { getProfileBadge } from "@/lib/profile-badges";

type ProfileBadgesSectionProps = {
  targetUserId: string;
  initialBadges: string[];
  viewerIsAdmin: boolean;
};

export default function ProfileBadgesSection({
  targetUserId,
  initialBadges,
  viewerIsAdmin,
}: ProfileBadgesSectionProps) {
  const [badges, setBadges] = useState<string[]>(initialBadges);

  const visibleBadges = badges.filter(
    (value): value is string => typeof value === "string"
  );

  return (
    <>
      {visibleBadges.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {visibleBadges.map((badgeKey) => {
            const badge = getProfileBadge(badgeKey);

            if (!badge) return null;

            return (
              <button
                key={badge.key}
                type="button"
                className={`cursor-default rounded-full px-3 py-1 text-xs font-medium ${badge.className}`}
                title={badge.description}
              >
                {badge.emoji} {badge.label}
              </button>
            );
          })}
        </div>
      )}

      {viewerIsAdmin && (
        <AdminBadgeManager
          targetUserId={targetUserId}
          currentBadges={visibleBadges}
          onBadgesChange={setBadges}
        />
      )}
    </>
  );
}