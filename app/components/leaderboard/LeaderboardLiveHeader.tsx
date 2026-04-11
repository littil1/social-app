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
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function formatUpdatedAgo(secondsAgo: number) {
  if (secondsAgo < 5) return "just now";
  if (secondsAgo < 60) return `${secondsAgo}s ago`;
  const minutes = Math.floor(secondsAgo / 60);
  return `${minutes}m ago`;
}

function shouldPauseAutoRefresh() {
  if (typeof document === "undefined") return false;
  if (isAutoRefreshPaused()) return true;
  const activeElement = document.activeElement as HTMLElement | null;
  const tagName = activeElement?.tagName ?? "";
  if (tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT") return true;
  if (activeElement?.isContentEditable) return true;
  if (document.querySelector('button[aria-label="Kommentare schliessen"]')) return true;
  if (document.querySelector('[role="dialog"]')) return true;
  return false;
}

// =====================================================
// Component
// =====================================================

type LeaderboardLiveHeaderProps = {
  todayLabel: string;
};

export default function LeaderboardLiveHeader({ todayLabel }: LeaderboardLiveHeaderProps) {
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
    const ticker = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(ticker);
  }, []);

  function handleAutoRefresh() {
    if (refreshing || autoRefreshing || shouldPauseAutoRefresh()) return;
    const refreshTime = Date.now();
    setAutoRefreshing(true);
    setLastRefreshAt(refreshTime);
    router.refresh();
    window.setTimeout(() => setAutoRefreshing(false), 900);
  }

  useEffect(() => {
    if (!mounted) return;
    const interval = window.setInterval(() => handleAutoRefresh(), 60000);
    return () => window.clearInterval(interval);
  }, [mounted, refreshing, autoRefreshing]);

  const remaining = useMemo(() => {
    if (!mounted || now === null) return "--:--:--";
    
    // Fehlerkorrektur: Sicherstellen, dass midnight ein Date ist
    const midnight = getNextZurichMidnight();
    const target = (midnight instanceof Date && !isNaN(midnight.getTime())) 
      ? midnight.getTime() 
      : Date.now() + 86400000;

    return formatRemaining(target - now);
  }, [mounted, now]);

  const updatedAgo = useMemo(() => {
    if (!mounted || now === null || lastRefreshAt === null) return "just now";
    const secondsAgo = Math.max(0, Math.floor((now - lastRefreshAt) / 1000));
    return formatUpdatedAgo(secondsAgo);
  }, [lastRefreshAt, mounted, now]);

  function handleRefresh() {
    if (refreshing || autoRefreshing) return;
    const refreshTime = Date.now();
    setRefreshing(true);
    setLastRefreshAt(refreshTime);
    router.refresh();
    window.setTimeout(() => setRefreshing(false), 900);
  }

  return (
    <section className="relative overflow-hidden rounded-[32px] border border-neutral-200 bg-white p-5 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.05)] sm:p-8 lg:p-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-emerald-50 blur-[80px]" />
        <div className="absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-sky-50 blur-[80px]" />
      </div>

      <div className="relative grid gap-8 lg:grid-cols-[1fr_320px] lg:items-center">
        <div>
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50/50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Live Race
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              {todayLabel}
            </span>
          </div>

          <h1 className="mt-4 text-4xl font-black tracking-tighter text-neutral-950 sm:text-5xl lg:text-6xl">
            The Arena is <span className="text-emerald-500">Open.</span>
          </h1>

          <p className="mt-4 max-w-xl text-lg font-medium leading-relaxed text-neutral-500">
            Every reaction and every comment counts. Claim your spot in the Hall of Fame.
          </p>

          <div className="mt-8 flex items-center gap-4">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing || autoRefreshing}
              className="group relative flex items-center gap-2 rounded-full bg-neutral-950 px-6 py-3 text-sm font-bold text-white transition hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              <svg 
                className={`h-4 w-4 transition-transform duration-700 ${refreshing || autoRefreshing ? 'animate-spin' : 'group-hover:rotate-180'}`} 
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h5M20 20v-5h-5" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 9.138A9.003 9.003 0 1020 15" />
              </svg>
              {refreshing || autoRefreshing ? "Syncing..." : "Refresh Feed"}
            </button>
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-tight">
              Updated {updatedAgo}
            </span>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <div className="group relative rounded-[24px] border border-neutral-100 bg-neutral-50 p-6 transition-all hover:border-emerald-200 hover:bg-white hover:shadow-xl">
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
              Time Remaining
            </p>
            <p className="mt-2 font-mono text-4xl font-black tracking-tight text-neutral-950">
              {remaining}
            </p>
            <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-neutral-200">
                <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: '65%' }} />
            </div>
          </div>

          <div className="rounded-[24px] border border-neutral-100 bg-neutral-50 p-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
              Daily Goal
            </p>
            <p className="mt-2 text-lg font-bold text-neutral-950">
              Top by Midnight.
            </p>
            <p className="mt-1 text-xs font-medium text-neutral-500 leading-relaxed">
              Secure the crown to become a Legend.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}