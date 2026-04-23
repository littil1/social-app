"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ALL_BADGE_FAMILIES, type BadgeFamily } from "@/features/badges/lib";

type AdminRecomputeButtonProps = {
  userId: string;
  username: string;
};

export default function AdminRecomputeButton({
  userId,
  username,
}: AdminRecomputeButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedFamilies, setSelectedFamilies] = useState<BadgeFamily[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  function toggleFamily(family: BadgeFamily) {
    setSuccessMessage(null);
    setSelectedFamilies((current) =>
      current.includes(family)
        ? current.filter((value) => value !== family)
        : [...current, family]
    );
  }

  async function handleRecompute() {
    if (loading) return;

    setLoading(true);
    setSuccessMessage(null);

    try {
      const response = await fetch(
        `/api/admin/users/${userId}/badges/recompute`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            families: selectedFamilies,
          }),
        }
      );

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Badge-Recompute fehlgeschlagen.");
      }

      setSuccessMessage(
        selectedFamilies.length === 0
          ? `Alle Badge-Familien für @${username} wurden neu berechnet.`
          : `${selectedFamilies.length} Badge-Familie(n) für @${username} wurden neu berechnet.`
      );
      router.refresh();
    } catch (error) {
      console.error(error);
      alert(`Badge-Recompute für @${username} fehlgeschlagen.`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {ALL_BADGE_FAMILIES.map((family) => {
          const isActive = selectedFamilies.includes(family);

          return (
            <button
              key={family}
              type="button"
              onClick={() => toggleFamily(family)}
              disabled={loading}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] transition ${
                isActive
                  ? "border-neutral-950 bg-neutral-950 text-white"
                  : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50"
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {family}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-neutral-500">
        {selectedFamilies.length === 0
          ? "Keine Familie ausgewählt: Es werden alle Badge-Familien neu berechnet."
          : `${selectedFamilies.length} Familie(n) ausgewählt.`}
      </p>

      <button
        type="button"
        onClick={handleRecompute}
        disabled={loading}
        className="rounded-2xl bg-neutral-950 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Recompute läuft..." : "Badges neu berechnen"}
      </button>

      {successMessage && (
        <p className="text-xs font-medium text-emerald-700">{successMessage}</p>
      )}
    </div>
  );
}

