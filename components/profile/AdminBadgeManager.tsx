"use client";

import { useEffect, useMemo, useState } from "react";
import {
  PROFILE_BADGES,
  getProfileBadge,
  type ProfileBadgeKey,
} from "@/lib/badges/profile-badges";

type AdminBadgeManagerProps = {
  targetUserId: string;
  currentBadges: string[];
  onBadgesChange?: (badges: string[]) => void;
};

function normalizeBadges(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(value.filter((item): item is string => typeof item === "string"))
  );
}

export default function AdminBadgeManager({
  targetUserId,
  currentBadges,
  onBadgesChange,
}: AdminBadgeManagerProps) {
  const [badges, setBadges] = useState<string[]>(normalizeBadges(currentBadges));
  const [selectedBadge, setSelectedBadge] = useState<ProfileBadgeKey>(
    PROFILE_BADGES[0].key
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setBadges(normalizeBadges(currentBadges));
  }, [currentBadges]);

  const availableBadges = useMemo(
    () => PROFILE_BADGES.filter((badge) => !badges.includes(badge.key)),
    [badges]
  );

  useEffect(() => {
    if (availableBadges.length === 0) return;

    if (!availableBadges.some((badge) => badge.key === selectedBadge)) {
      setSelectedBadge(availableBadges[0].key);
    }
  }, [availableBadges, selectedBadge]);

  async function updateBadge(action: "add" | "remove", badge: string) {
    if (loading) return;

    setLoading(true);

    try {
      const res = await fetch(`/api/admin/users/${targetUserId}/badges`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          badge,
        }),
      });

      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Badge konnte nicht aktualisiert werden.");
      }

      const data = (await res.json()) as { badges?: unknown };
      const nextBadges = normalizeBadges(data.badges);

      setBadges(nextBadges);
      onBadgesChange?.(nextBadges);
    } catch (error) {
      console.error(error);
      alert("Badge konnte nicht aktualisiert werden.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
      <p className="text-sm font-semibold text-gray-900">
        Admin: Badges verwalten
      </p>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
        <select
          value={selectedBadge}
          onChange={(event) =>
            setSelectedBadge(event.target.value as ProfileBadgeKey)
          }
          disabled={loading || availableBadges.length === 0}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
        >
          {availableBadges.map((badge) => (
            <option key={badge.key} value={badge.key}>
              {badge.emoji} {badge.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => updateBadge("add", selectedBadge)}
          disabled={loading || availableBadges.length === 0}
          className="rounded-lg bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {loading ? "Speichert..." : "Badge vergeben"}
        </button>
      </div>

      {badges.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {badges.map((badgeKey) => {
            const badge = getProfileBadge(badgeKey);

            if (!badge) return null;

            return (
              <button
                key={badge.key}
                type="button"
                onClick={() => updateBadge("remove", badge.key)}
                disabled={loading}
                className={`rounded-full px-3 py-1 text-xs font-medium ${badge.className} disabled:opacity-50`}
                title={`${badge.label} – klicken zum Entfernen`}
              >
                {badge.emoji} {badge.label} ×
              </button>
            );
          })}
        </div>
      )}

      {availableBadges.length === 0 && (
        <p className="mt-3 text-xs text-gray-500">
          Dieses Profil hat bereits alle verfügbaren Badges.
        </p>
      )}
    </div>
  );
}
