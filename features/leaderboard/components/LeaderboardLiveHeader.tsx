"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getNextZurichMidnight } from "@/features/winners/lib/daily-ranking";
import { isAutoRefreshPaused } from "@/lib/utils/auto-refresh";

type LeaderboardLiveHeaderProps = {
  todayLabel: string;
};

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
  if (secondsAgo < 5) return "just now";
  if (secondsAgo < 60) return `${secondsAgo}s ago`;
  const minutes = Math.floor(secondsAgo / 60);
  return `${minutes}m ago`;
}

function shouldPauseAutoRefresh() {
  if (typeof document === "undefined") return false;
  if (isAutoRefreshPaused()) return true;
  return !!document.querySelector('[data-comments-panel-open="true"]');
}

export default function LeaderboardLiveHeader({
  todayLabel,
}: LeaderboardLiveHeaderProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  const [lastRefreshAt, setLastRefreshAt] = useState<number | null>(null);
  const [autoRefreshing, setAutoRefreshing] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const initialNow = Date.now();
      setMounted(true);
      setNow(initialNow);
      setLastRefreshAt(initialNow);
    });
    const ticker = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearInterval(ticker);
    };
  }, []);

  const handleAutoRefresh = useCallback(() => {
    if (autoRefreshing) return;
    if (shouldPauseAutoRefresh()) return;

    const refreshTime = Date.now();
    setAutoRefreshing(true);
    setLastRefreshAt(refreshTime);
    router.refresh();

    window.setTimeout(() => {
      setAutoRefreshing(false);
    }, 900);
  }, [autoRefreshing, router]);

  useEffect(() => {
    if (!mounted) return;

    const interval = window.setInterval(() => {
      handleAutoRefresh();
    }, 60000);

    return () => window.clearInterval(interval);
  }, [handleAutoRefresh, mounted]);

  const remaining = useMemo(() => {
    if (!mounted || now === null) return "--:--:--";

    const target = getNextZurichMidnight().getTime();
    return formatRemaining(target - now);
  }, [mounted, now]);

  const progress = useMemo(() => {
    if (!mounted || now === null) return 0;

    const midnight = getNextZurichMidnight().getTime();
    const remainingMs = Math.max(0, midnight - now);
    const value = (remainingMs / 86400000) * 100;

    return Math.min(100, Math.max(0, value));
  }, [mounted, now]);

  const updatedAgo = useMemo(() => {
    if (!mounted || now === null || lastRefreshAt === null) return "just now";

    const secondsAgo = Math.max(0, Math.floor((now - lastRefreshAt) / 1000));
    return formatUpdatedAgo(secondsAgo);
  }, [lastRefreshAt, mounted, now]);

  return (
    <section className="relative overflow-hidden rounded-[26px] border border-emerald-100/80 bg-gradient-to-br from-white via-emerald-50/70 to-sky-50 px-4 py-3 shadow-[0_24px_70px_-48px_rgba(16,185,129,0.34)] sm:rounded-[30px] sm:px-6 sm:py-5 lg:px-7">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-8 top-2 h-16 w-16 rounded-full bg-emerald-200/25 blur-3xl sm:h-20 sm:w-20" />
        <div className="absolute right-0 top-0 h-20 w-20 rounded-full bg-sky-200/25 blur-3xl sm:h-24 sm:w-24" />
      </div>

      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/90 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-emerald-900 backdrop-blur">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            LIVE
          </span>

          <h1 className="mt-2 text-4xl font-black leading-tight tracking-tight text-gray-950 sm:text-4xl">
            Leaderboard
          </h1>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/70 bg-white/85 px-3 py-1.5 text-sm font-medium text-gray-700 backdrop-blur">
              {todayLabel}
            </span>

            <span className="rounded-full border border-white/70 bg-white/85 px-3 py-1.5 text-sm font-medium text-gray-700 backdrop-blur">
              Updated {updatedAgo}
            </span>
          </div>
        </div>

        <div className="rounded-[26px] border border-white/70 bg-white/85 p-4 shadow-sm backdrop-blur sm:min-w-[290px] sm:p-5">
          <div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">
                Time left
              </p>
              <p className="mt-2 text-3xl font-black tracking-tight text-gray-950 tabular-nums sm:text-4xl">
                {remaining}
              </p>
            </div>
          </div>
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
            <div
              className="motion-safe:animate-pulse h-full bg-emerald-500 transition-all duration-1000"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
