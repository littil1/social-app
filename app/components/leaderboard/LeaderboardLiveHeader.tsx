"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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

  useEffect(() => {
    if (!mounted) return;

    const refreshInterval = window.setInterval(() => {
      router.refresh();
      setLastRefreshAt(Date.now());
    }, 15000);

    return () => window.clearInterval(refreshInterval);
  }, [mounted, router]);

  const remaining = useMemo(() => {
    if (!mounted || now === null) return "--:--:--";

    const target = getNextZurichMidnight().getTime();
    return formatRemaining(target - now);
  }, [mounted, now]);

  const updatedAgo = useMemo(() => {
    if (!mounted || now === null || lastRefreshAt === null) return "gerade eben";

    const secondsAgo = Math.max(0, Math.floor((now - lastRefreshAt) / 1000));
    return formatUpdatedAgo(secondsAgo);
  }, [lastRefreshAt, mounted, now]);

  return (
    <section className="relative overflow-hidden rounded-[32px] border border-emerald-100/80 bg-gradient-to-br from-white via-emerald-50/80 to-sky-100/70 px-5 py-5 shadow-[0_35px_90px_-45px_rgba(16,185,129,0.30)] sm:px-6 sm:py-6 lg:px-8 lg:py-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-10 top-4 h-24 w-24 rounded-full bg-emerald-200/30 blur-3xl" />
        <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-sky-200/30 blur-3xl" />
      </div>

      <div className="relative grid gap-4 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/90 px-4 py-1.5 text-sm font-semibold text-emerald-900 backdrop-blur">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            LIVE
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl lg:text-5xl">
            Das Rennen des Tages läuft.
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-700 sm:text-base sm:leading-7">
            Heute zählt jeder Impuls. Jede Reaction und jeder Kommentar kann das
            Podium neu ordnen.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full border border-white/70 bg-white/85 px-3 py-1.5 text-sm font-medium text-gray-700 backdrop-blur">
              Heute · {todayLabel}
            </span>
            <span className="rounded-full border border-white/70 bg-white/85 px-3 py-1.5 text-sm font-medium text-gray-700 backdrop-blur">
              Aktualisiert {updatedAgo}
            </span>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <div className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-sm backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
              Endet in
            </p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl">
              {remaining}
            </p>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Noch ist Platz 1 offen.
            </p>
          </div>

          <div className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-sm backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
              Tagesziel
            </p>
            <p className="mt-2 text-base font-semibold text-gray-950">
              Bis Mitternacht an die Spitze
            </p>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Wer vorne bleibt, wird morgen zur Hall of Fame.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}