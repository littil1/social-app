"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { isAutoRefreshPaused } from "@/lib/auto-refresh";

// =====================================================
// Helpers
// =====================================================

function getTimeZoneOffsetMillis(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(date);
  const map = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );

  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second)
  );

  return asUtc - date.getTime();
}

function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string
) {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
  const offset = getTimeZoneOffsetMillis(new Date(utcGuess), timeZone);

  return new Date(utcGuess - offset);
}

function getZurichNowParts(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Zurich",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(date);
  const map = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

function getNextZurichMidnight() {
  const now = new Date();
  const zurichNow = getZurichNowParts(now);

  const nextDayUtc = new Date(
    Date.UTC(zurichNow.year, zurichNow.month - 1, zurichNow.day) + 86400000
  );

  return zonedTimeToUtc(
    nextDayUtc.getUTCFullYear(),
    nextDayUtc.getUTCMonth() + 1,
    nextDayUtc.getUTCDate(),
    0,
    0,
    0,
    "Europe/Zurich"
  );
}

function formatRemaining(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(
    2,
    "0"
  );
  const seconds = String(totalSeconds % 60).padStart(2, "0");

  return `${hours}:${minutes}:${seconds}`;
}

function formatUpdatedAgo(secondsAgo: number) {
  if (secondsAgo < 5) return "gerade eben";
  if (secondsAgo < 60) return `vor ${secondsAgo} Sek.`;
  const minutes = Math.floor(secondsAgo / 60);
  return `vor ${minutes} Min.`;
}

function shouldPauseAutoRefresh() {
  if (typeof document === "undefined") return false;

  if (isAutoRefreshPaused()) return true;

  const activeElement = document.activeElement as HTMLElement | null;
  const tagName = activeElement?.tagName ?? "";

  if (tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT") {
    return true;
  }

  if (activeElement?.isContentEditable) {
    return true;
  }

  if (document.querySelector('button[aria-label="Kommentare schliessen"]')) {
    return true;
  }

  if (document.querySelector('[role="dialog"]')) {
    return true;
  }

  return false;
}

// =====================================================
// Component
// =====================================================

type LeaderboardLiveHeaderProps = {
  todayLabel: string;
};

export default function LeaderboardLiveHeader({
  todayLabel,
}: LeaderboardLiveHeaderProps) {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  const [lastRefreshAt, setLastRefreshAt] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefreshing, setAutoRefreshing] = useState(false);

  useEffect(() => {
    const initialNow = Date.now();
    setMounted(true);
    setNow(initialNow);
    setLastRefreshAt(initialNow);

    const ticker = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(ticker);
  }, []);

  function handleAutoRefresh() {
    if (refreshing || autoRefreshing) return;
    if (shouldPauseAutoRefresh()) return;

    const refreshTime = Date.now();
    setAutoRefreshing(true);
    setLastRefreshAt(refreshTime);
    router.refresh();

    window.setTimeout(() => {
      setAutoRefreshing(false);
    }, 900);
  }

  useEffect(() => {
    if (!mounted) return;

    const interval = window.setInterval(() => {
      handleAutoRefresh();
    }, 60000);

    return () => window.clearInterval(interval);
  }, [mounted, refreshing, autoRefreshing]);

  const remaining = useMemo(() => {
    if (!mounted || now === null) return "--:--:--";

    const target = getNextZurichMidnight().getTime();
    return formatRemaining(target - now);
  }, [mounted, now]);

  // ================== NUR FÜR PROGRESS BAR ==================
  const progress = useMemo(() => {
    if (!mounted || now === null) return 0;

    const midnight = getNextZurichMidnight().getTime();
    const start = midnight - 86400000;

    const total = midnight - start;
    const elapsed = now - start;

    if (total <= 0) return 0;

    const value = (elapsed / total) * 100;

    return Math.min(100, Math.max(0, value));
  }, [mounted, now]);
  // ==========================================================

  const updatedAgo = useMemo(() => {
    if (!mounted || now === null || lastRefreshAt === null) return "gerade eben";

    const secondsAgo = Math.max(0, Math.floor((now - lastRefreshAt) / 1000));
    return formatUpdatedAgo(secondsAgo);
  }, [lastRefreshAt, mounted, now]);

  function handleRefresh() {
    if (refreshing || autoRefreshing) return;

    const refreshTime = Date.now();
    setRefreshing(true);
    setLastRefreshAt(refreshTime);
    router.refresh();

    window.setTimeout(() => {
      setRefreshing(false);
    }, 900);
  }

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-emerald-100/80 bg-gradient-to-br from-white via-emerald-50/80 to-sky-100/70 px-4 py-4 shadow-[0_35px_90px_-45px_rgba(16,185,129,0.30)] sm:rounded-[32px] sm:px-6 sm:py-6 lg:px-8 lg:py-7">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-8 top-4 h-20 w-20 rounded-full bg-emerald-200/30 blur-3xl sm:h-24 sm:w-24" />
        <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-sky-200/30 blur-3xl sm:h-28 sm:w-28" />
      </div>

      <div className="relative grid gap-4 lg:grid-cols-[1.25fr_0.75fr] lg:items-end lg:gap-6">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/90 px-3.5 py-1.5 text-sm font-semibold text-emerald-900 backdrop-blur">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            LIVE
          </div>

          <h1 className="max-w-3xl text-3xl font-bold leading-tight tracking-tight text-gray-950 sm:text-4xl lg:text-5xl">
            Race in progress.
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-700 sm:text-base sm:leading-7">
            Every reaction and every comment counts.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full border border-white/70 bg-white/85 px-3 py-1.5 text-sm font-medium text-gray-700 backdrop-blur">
              Today · {todayLabel}
            </span>

            <span className="rounded-full border border-white/70 bg-white/85 px-3 py-1.5 text-sm font-medium text-gray-700 backdrop-blur">
              Just updated {updatedAgo}
            </span>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing || autoRefreshing}
              className="rounded-full border border-white/70 bg-white/85 px-3 py-1.5 text-sm font-medium text-gray-700 backdrop-blur transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {refreshing || autoRefreshing
                ? "Refreshing ..."
                : "Refresh"}
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <div className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-sm backdrop-blur lg:p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
              Time remaining
            </p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl">
              {remaining}
            </p>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Claim the crown.
            </p>

            <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-neutral-200">
              <div
                className="h-full bg-emerald-500 transition-all duration-1000"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-sm backdrop-blur lg:p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
              Daily Goal
            </p>
            <p className="mt-2 text-base font-semibold text-gray-950">
              Top by midnight.
            </p>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Lead the pack to become a legend.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}