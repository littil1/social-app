"use client";

import { useState } from "react";
import type {
  BadgeFamily,
  BadgeTier,
  ComputedUserBadge,
} from "@/features/badges/lib/showcase-badges";
import type { PROFILE_BADGES } from "@/features/badges/lib/profile-badges";

type SpecialBadge = (typeof PROFILE_BADGES)[number];
type ShowcaseFamily = BadgeFamily | "know_everything";
type ShowcaseBadge =
  | ComputedUserBadge
  | {
      family: "know_everything";
      tier: BadgeTier;
      label: string;
      icon: string;
      total: {
        count: number;
        label: string;
      };
    };

type ProfileBadgesSectionProps = {
  badges: ComputedUserBadge[];
  specialBadges?: SpecialBadge[];
  showProgress: boolean;
};

type PrestigeGroup = "high" | "medium" | "starter";

type TierPalette = {
  frame: string;
  core: string;
  spike: string;
  highlight: string;
  glow: string;
  ring: string;
};

type CrownConfig = {
  angles: number[];
  radius: number;
  height: number;
  width: number;
  lift: number;
};

const FAMILY_ACCENTS: Record<ShowcaseFamily, string> = {
  legend: "from-amber-200 via-yellow-400 to-orange-500",
  podium: "from-slate-200 via-zinc-300 to-slate-600",
  impact: "from-sky-200 via-cyan-300 to-blue-500",
  spark: "from-fuchsia-200 via-pink-300 to-rose-500",
  creator: "from-orange-200 via-red-300 to-rose-500",
  influence: "from-lime-200 via-emerald-300 to-cyan-500",
  contributor: "from-emerald-200 via-green-300 to-teal-500",
  supporter: "from-violet-200 via-purple-300 to-indigo-500",
  connector: "from-indigo-200 via-blue-300 to-sky-500",
  know_everything: "from-violet-200 via-fuchsia-300 to-rose-500",
};

const FAMILY_TEXT: Record<ShowcaseFamily, string> = {
  legend: "Daily Hall of Fame wins.",
  podium: "Top daily leaderboard finishes.",
  impact: "Reactions earned from the community.",
  spark: "Discussions sparked by posts and ideas.",
  creator: "Posts created and contributions published.",
  influence: "Followers earned from the community.",
  contributor: "Accepted product ideas and contributions.",
  supporter: "Reactions and comments given to others.",
  connector: "Users followed and connections started.",
  know_everything: "Reached the end of the archive.",
};

const FAMILY_PRESTIGE: Record<ShowcaseFamily, PrestigeGroup> = {
  legend: "high",
  podium: "starter",
  impact: "high",
  spark: "high",
  creator: "medium",
  influence: "medium",
  contributor: "starter",
  supporter: "starter",
  connector: "starter",
  know_everything: "starter",
};

const TIER_FRAME_CLASSES: Record<BadgeTier, string> = {
  1: "border-neutral-200 bg-[radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.95),transparent_42%),linear-gradient(145deg,#ffffff,#f4f4f5)] shadow-[0_18px_42px_-32px_rgba(15,23,42,0.55)]",
  2: "border-neutral-200 bg-[radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.95),transparent_42%),linear-gradient(145deg,#ffffff,#f1f5f9)] shadow-[0_18px_42px_-32px_rgba(15,23,42,0.58)]",
  3: "border-neutral-200 bg-[radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.92),transparent_42%),linear-gradient(145deg,#ffffff,#f8fafc)] shadow-[0_20px_46px_-32px_rgba(15,23,42,0.6)]",
  4: "border-neutral-200 bg-[radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.9),transparent_42%),linear-gradient(145deg,#ffffff,#f5f5f5)] shadow-[0_22px_52px_-34px_rgba(15,23,42,0.65)]",
  5: "border-neutral-200 bg-[radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.86),transparent_42%),linear-gradient(145deg,#ffffff,#f4f4f5)] shadow-[0_24px_58px_-36px_rgba(15,23,42,0.68)]",
};

const TIER_PALETTES: Record<BadgeTier, TierPalette> = {
  1: {
    frame: "linear-gradient(145deg,#fff7ad,#f5c542 48%,#9f6f12)",
    core: "radial-gradient(circle at 50% 18%,#fff8c8,#b77914 48%,#2a1a06)",
    spike: "linear-gradient(180deg,#fffbd1,#f5c542 56%,#9f6f12)",
    highlight: "rgba(255,251,209,0.72)",
    glow: "rgba(245,197,66,0.38)",
    ring: "rgba(255,248,191,0.7)",
  },
  2: {
    frame: "linear-gradient(145deg,#ffe6a3,#f59e0b 48%,#9a4a05)",
    core: "radial-gradient(circle at 50% 18%,#fff0b8,#c76c09 48%,#321004)",
    spike: "linear-gradient(180deg,#fff0b8,#f59e0b 56%,#9a4a05)",
    highlight: "rgba(255,240,184,0.76)",
    glow: "rgba(245,158,11,0.42)",
    ring: "rgba(255,230,163,0.72)",
  },
  3: {
    frame: "linear-gradient(145deg,#fed7aa,#f97316 48%,#7c2d12)",
    core: "radial-gradient(circle at 50% 18%,#ffedd5,#c2410c 48%,#2b0b04)",
    spike: "linear-gradient(180deg,#fed7aa,#f97316 56%,#7c2d12)",
    highlight: "rgba(254,215,170,0.78)",
    glow: "rgba(249,115,22,0.48)",
    ring: "rgba(254,215,170,0.76)",
  },
  4: {
    frame: "linear-gradient(145deg,#fecaca,#dc2626 48%,#450a0a)",
    core: "radial-gradient(circle at 50% 18%,#fee2e2,#991b1b 48%,#190202)",
    spike: "linear-gradient(180deg,#fecaca,#dc2626 56%,#450a0a)",
    highlight: "rgba(254,202,202,0.84)",
    glow: "rgba(220,38,38,0.54)",
    ring: "rgba(254,202,202,0.82)",
  },
  5: {
    frame: "linear-gradient(145deg,#f0abfc,#be123c 42%,#581c87 72%,#1e102f)",
    core: "radial-gradient(circle at 50% 18%,#fae8ff,#9f1239 42%,#4c1d95 70%,#0b0418)",
    spike: "linear-gradient(180deg,#fae8ff,#be123c 50%,#581c87)",
    highlight: "rgba(250,232,255,0.92)",
    glow: "rgba(190,18,60,0.62)",
    ring: "rgba(240,171,252,0.9)",
  },
};

const TIER_CROWN_CONFIG: Record<BadgeTier, CrownConfig> = {
  1: { angles: [0], radius: 45, height: 21, width: 17, lift: 1.18 },
  2: { angles: [-36, 0, 36], radius: 48, height: 23, width: 18, lift: 1.22 },
  3: {
    angles: [-62, -31, 0, 31, 62],
    radius: 51,
    height: 25,
    width: 19,
    lift: 1.28,
  },
  4: {
    angles: [-80, -54, -27, 0, 27, 54, 80],
    radius: 54,
    height: 28,
    width: 20,
    lift: 1.38,
  },
  5: {
    angles: [-94, -70, -47, -24, 0, 24, 47, 70, 94],
    radius: 57,
    height: 31,
    width: 21,
    lift: 1.5,
  },
};

const PRESTIGE_CARD_CLASSES: Record<PrestigeGroup, string> = {
  high: "h-52 w-44 hover:-translate-y-2 sm:w-48",
  medium: "h-52 w-44 hover:-translate-y-1.5 sm:w-44",
  starter: "h-52 w-44 hover:-translate-y-1 sm:w-44",
};

const PRESTIGE_GLOW_CLASSES: Record<PrestigeGroup, string> = {
  high: "blur-2xl group-hover:opacity-55",
  medium: "blur-xl group-hover:opacity-35",
  starter: "blur-lg group-hover:opacity-24",
};

const PRESTIGE_SELECTED_GLOW_CLASSES: Record<PrestigeGroup, string> = {
  high: "opacity-45",
  medium: "opacity-30",
  starter: "opacity-20",
};

const PRESTIGE_FRAME_CLASSES: Record<PrestigeGroup, string> = {
  high: "p-4 shadow-[0_24px_66px_-42px_rgba(15,23,42,0.68)] ring-1 ring-white/40",
  medium: "p-4 shadow-[0_20px_54px_-40px_rgba(15,23,42,0.58)] ring-1 ring-white/30",
  starter: "p-4 shadow-[0_18px_46px_-38px_rgba(15,23,42,0.5)] ring-1 ring-white/25",
};

const PRESTIGE_ORNAMENT_CLASSES: Record<PrestigeGroup, string> = {
  high: "h-32 w-32",
  medium: "h-[7.25rem] w-[7.25rem]",
  starter: "h-28 w-28",
};

const PRESTIGE_ICON_CLASSES: Record<PrestigeGroup, string> = {
  high: "text-5xl drop-shadow-[0_3px_12px_rgba(255,255,255,0.45)]",
  medium: "text-4xl drop-shadow-[0_2px_8px_rgba(255,255,255,0.3)]",
  starter: "text-3xl drop-shadow-[0_2px_6px_rgba(255,255,255,0.22)]",
};

const PRESTIGE_DETAIL_CLASSES: Record<PrestigeGroup, string> = {
  high: "opacity-45",
  medium: "opacity-30",
  starter: "opacity-[0.18]",
};

function CrownSpikes({
  tier,
  palette,
}: {
  tier: BadgeTier;
  palette: TierPalette;
}) {
  const config = TIER_CROWN_CONFIG[tier];

  return (
    <>
      {config.angles.map((angle) => {
        const topBias = Math.cos((angle * Math.PI) / 180);
        const height = config.height * (topBias > 0.72 ? config.lift : 1);
        const width = angle === 0 ? config.width * 1.15 : config.width;

        return (
          <span
            key={angle}
            className="absolute left-1/2 top-1/2 z-20 origin-center rounded-sm shadow-[0_6px_16px_rgba(0,0,0,0.38)]"
            style={{
              width: `${width}px`,
              height: `${height}px`,
              background: palette.spike,
              clipPath: "polygon(50% 0, 100% 78%, 63% 100%, 50% 84%, 37% 100%, 0 78%)",
              transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-${config.radius}px)`,
            }}
          >
            <span
              className="absolute left-1/2 top-1 h-[48%] w-px -translate-x-1/2 rounded-full"
              style={{ backgroundColor: palette.highlight }}
            />
          </span>
        );
      })}
    </>
  );
}

function getTierMotion(tier: BadgeTier) {
  if (tier === 5) {
    return "animate-[badge-aura_3s_ease-in-out_infinite]";
  }

  if (tier === 4) {
    return "animate-[badge-aura_4.8s_ease-in-out_infinite]";
  }

  return "";
}

function BadgeCard({
  badge,
  selected,
  onSelect,
}: {
  badge: ShowcaseBadge;
  selected: boolean;
  onSelect: () => void;
}) {
  const motionClass = getTierMotion(badge.tier);
  const prestige = FAMILY_PRESTIGE[badge.family];
  const palette = TIER_PALETTES[badge.tier];

  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={onSelect}
      className={`group relative shrink-0 snap-start rounded-[28px] text-left outline-none transition duration-300 focus-visible:ring-2 focus-visible:ring-neutral-950 ${PRESTIGE_CARD_CLASSES[prestige]}`}
      aria-pressed={selected}
    >
      <div
        className={`absolute inset-0 rounded-[28px] bg-gradient-to-br ${FAMILY_ACCENTS[badge.family]} opacity-0 transition duration-300 ${PRESTIGE_GLOW_CLASSES[prestige]} ${
          selected ? PRESTIGE_SELECTED_GLOW_CLASSES[prestige] : ""
        } ${motionClass}`}
      />

      <div
        className={`relative flex h-full flex-col items-center justify-center gap-5 overflow-visible rounded-[28px] border ${TIER_FRAME_CLASSES[badge.tier]} ${PRESTIGE_FRAME_CLASSES[prestige]}`}
      >
        <div className="pointer-events-none absolute inset-x-6 top-3 h-px bg-white/55" />
        <div
          className={`pointer-events-none absolute inset-x-10 top-8 h-14 rounded-full bg-white blur-2xl ${PRESTIGE_DETAIL_CLASSES[prestige]}`}
        />
        <div
          className={`pointer-events-none absolute -left-14 top-12 h-20 w-20 rotate-45 border border-white/15 ${
            prestige === "starter" ? "opacity-25" : "opacity-45"
          }`}
        />
        <div
          className={`pointer-events-none absolute -right-14 top-12 h-20 w-20 rotate-45 border border-white/15 ${
            prestige === "starter" ? "opacity-25" : "opacity-45"
          }`}
        />
        {prestige === "high" && (
          <>
            <div className="pointer-events-none absolute left-1/2 top-2 h-5 w-8 -translate-x-1/2 rounded-b-full border-b-2 border-l border-r border-white/55" />
            <div className="pointer-events-none absolute bottom-12 left-5 h-10 w-px bg-white/45" />
            <div className="pointer-events-none absolute bottom-12 right-5 h-10 w-px bg-white/45" />
          </>
        )}

        <div className={`relative ${PRESTIGE_ORNAMENT_CLASSES[prestige]}`}>
          <div
            className="absolute -inset-8 rounded-full blur-2xl"
            style={{ backgroundColor: palette.glow }}
          />
          {badge.tier >= 4 && (
            <div
              className="absolute -inset-10 rounded-full blur-3xl"
              style={{ backgroundColor: palette.glow }}
            />
          )}
          <CrownSpikes tier={badge.tier} palette={palette} />
          <div
            className="absolute inset-[15%] z-30 rounded-full border shadow-[0_18px_42px_-18px_rgba(0,0,0,0.95)]"
            style={{
              background: palette.frame,
              borderColor: palette.ring,
              boxShadow: `inset 0 2px 8px rgba(255,255,255,0.35), inset 0 -10px 18px rgba(0,0,0,0.28), 0 0 0 1px ${palette.ring}, 0 18px 42px -18px rgba(0,0,0,0.95), 0 0 34px ${palette.glow}`,
            }}
          />
          <div
            className="absolute inset-[22%] z-40 rounded-full border bg-neutral-950/85 shadow-[inset_0_0_26px_rgba(255,255,255,0.12)]"
            style={{ borderColor: palette.ring }}
          />
          <div
            className="absolute inset-[28%] z-50 rounded-full border"
            style={{
              background: palette.core,
              borderColor: palette.ring,
            }}
          />
          <div
            className={`absolute inset-[36%] z-[60] rounded-full bg-gradient-to-br ${FAMILY_ACCENTS[badge.family]} ${
              prestige === "high"
                ? "opacity-35"
                : prestige === "medium"
                  ? "opacity-24"
                  : "opacity-16"
            }`}
          />
          <div className="absolute inset-[25%] z-[60] rounded-full border border-white/20" />
          <div className="absolute inset-x-8 top-[26%] z-[60] h-3 rounded-full bg-white/30 blur-sm" />
          <div className="absolute left-1/2 top-[22%] z-[60] h-2 w-10 -translate-x-1/2 rounded-full bg-white/35 blur-[1px]" />
          <span
            className={`absolute inset-0 z-[70] flex items-center justify-center ${PRESTIGE_ICON_CLASSES[prestige]}`}
          >
            {badge.icon}
          </span>
        </div>

        <div className="relative w-full text-center">
          <h3
            className={`truncate font-black tracking-tight text-neutral-950 ${
              prestige === "starter" ? "text-lg" : "text-xl"
            }`}
          >
            {badge.label}
          </h3>
        </div>
      </div>
    </button>
  );
}

export default function ProfileBadgesSection({
  badges,
  specialBadges = [],
  showProgress,
}: ProfileBadgesSectionProps) {
  const showcaseBadges: ShowcaseBadge[] = [
    ...badges,
    ...specialBadges.map((badge) => ({
      family: "know_everything" as const,
      tier: 3 as BadgeTier,
      label: badge.label,
      icon: badge.emoji,
      total: {
        count: 1,
        label: "Special badge claimed.",
      },
    })),
  ];
  const [selectedFamily, setSelectedFamily] = useState<ShowcaseFamily | null>(
    badges[0]?.family ?? null
  );

  if (showcaseBadges.length === 0) {
    return (
      <section className="rounded-[32px] border border-dashed border-neutral-200 bg-white px-5 py-8 text-center shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-neutral-400">
          Badge Showcase
        </p>
        <p className="mt-2 text-sm font-medium text-neutral-500">
          No badges earned yet.
        </p>
      </section>
    );
  }

  const selectedBadge =
    showcaseBadges.find((badge) => badge.family === selectedFamily) ??
    showcaseBadges[0];

  return (
    <section className="space-y-4 pb-2">
      <style jsx global>{`
        @keyframes badge-aura {
          0%,
          100% {
            opacity: 0.22;
            transform: scale(0.98);
          }
          50% {
            opacity: 0.48;
            transform: scale(1.04);
          }
        }
      `}</style>

      <div className="flex items-end justify-between gap-4 px-1">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-neutral-400">
            Badge Showcase
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-neutral-950">
            Earned Honors
          </h2>
        </div>
      </div>

      <div className="-mx-4 overflow-x-auto px-5 pb-3 pt-2 [scrollbar-width:none] sm:px-4 [&::-webkit-scrollbar]:hidden">
        <div className="flex snap-x snap-mandatory gap-5 sm:gap-4">
          {showcaseBadges.map((badge) => (
            <BadgeCard
              key={badge.family}
              badge={badge}
              selected={selectedBadge.family === badge.family}
              onSelect={() => setSelectedFamily(badge.family)}
            />
          ))}
        </div>
      </div>

      {selectedBadge && (
        <div className="rounded-[28px] border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-neutral-400">
                {selectedBadge.label}
              </p>
              <p className="mt-2 max-w-xl text-sm font-medium leading-5 text-neutral-600 sm:leading-6">
                {FAMILY_TEXT[selectedBadge.family]}
              </p>
              <p className="mt-3 text-xs font-black uppercase tracking-[0.16em] text-neutral-500 sm:tracking-[0.18em]">
                {selectedBadge.total.label}
              </p>
            </div>
          </div>

          {showProgress && "progress" in selectedBadge && selectedBadge.progress && (
            <div className="mt-4 border-t border-neutral-100 pt-4 sm:mt-5">
              <div className="flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-[0.18em] text-neutral-400">
                <span>Next tier</span>
                <span>
                  {selectedBadge.progress.isMaxLevel
                    ? "Max tier"
                    : selectedBadge.progress.label}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-100">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${FAMILY_ACCENTS[selectedBadge.family]}`}
                  style={{
                    width: `${
                      selectedBadge.progress.next
                        ? Math.min(
                            100,
                            (selectedBadge.progress.current /
                              selectedBadge.progress.next) *
                              100
                          )
                        : 100
                    }%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
