const ZURICH_TIME_ZONE = "Europe/Zurich";
const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;

export const LIVE_LEADERBOARD_SIZE = 3;
export const ARCHIVED_DAILY_WINNER_RANK = 1;
export const ARCHIVED_DAILY_WINNER_LIMIT = 1;

type ZurichDateParts = {
  year: number;
  month: number;
  day: number;
};

type ScoreInput = {
  reactionsTotal: number;
  commentsCount: number;
  boostCount?: number;
};

type LiveScoreInput = ScoreInput & {
  createdAt: Date | string;
  now?: Date | string;
};

type DailyLiveRankEntry = {
  id: number;
  created_at: string;
  comments_count: number;
  live_score: number;
};

type DailyHistoricalRankEntry = {
  id: number;
  created_at: string;
  comments_count: number;
  base_score: number;
};

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

function getZurichDateParts(date: Date | string): ZurichDateParts {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZURICH_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(new Date(date));
  const map = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
  };
}

function shiftZurichDateParts(parts: ZurichDateParts, dayOffset: number) {
  const shifted = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day) + dayOffset * ONE_DAY_IN_MS
  );

  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

function getCreatedAtOrder(aCreatedAt: string, bCreatedAt: string) {
  return new Date(bCreatedAt).getTime() - new Date(aCreatedAt).getTime();
}

export function getZurichDayKey(date: Date | string) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: ZURICH_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
}

export function getZurichHourBucket(date: Date | string) {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: ZURICH_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(date));
  const map = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );

  return `${map.year}-${map.month}-${map.day}-${map.hour}`;
}

export function getZurichDayRange(date: Date | string) {
  const parts = getZurichDateParts(date);
  const nextDay = shiftZurichDateParts(parts, 1);

  const start = zonedTimeToUtc(
    parts.year,
    parts.month,
    parts.day,
    0,
    0,
    0,
    ZURICH_TIME_ZONE
  );
  const end = zonedTimeToUtc(
    nextDay.year,
    nextDay.month,
    nextDay.day,
    0,
    0,
    0,
    ZURICH_TIME_ZONE
  );

  return {
    dayKey: getZurichDayKey(date),
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

export function getCurrentZurichDayStartIso(date: Date | string = new Date()) {
  return getZurichDayRange(date).startIso;
}

export function isPostVisibleOnPublicProfile(
  createdAt: Date | string,
  now: Date | string = new Date()
) {
  return (
    new Date(createdAt).getTime() <
    new Date(getCurrentZurichDayStartIso(now)).getTime()
  );
}

export function getZurichDayRangeForDayKey(dayKey: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) {
    return null;
  }

  return getZurichDayRange(`${dayKey}T12:00:00Z`);
}

export function getPreviousZurichDayRange(date: Date | string) {
  const parts = shiftZurichDateParts(getZurichDateParts(date), -1);
  const dayKey = `${String(parts.year).padStart(4, "0")}-${String(
    parts.month
  ).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;

  return getZurichDayRangeForDayKey(dayKey);
}

export function getNextZurichMidnight(date: Date | string = new Date()) {
  const nextDay = shiftZurichDateParts(getZurichDateParts(date), 1);

  return zonedTimeToUtc(
    nextDay.year,
    nextDay.month,
    nextDay.day,
    0,
    0,
    0,
    ZURICH_TIME_ZONE
  );
}

export function getZurichDayRankingReferenceTime(endIso: string) {
  return new Date(new Date(endIso).getTime() - 1);
}

export function getBaseScore({
  reactionsTotal,
  commentsCount,
  boostCount = 0,
}: ScoreInput) {
  return reactionsTotal + commentsCount * 2 + boostCount * 3;
}

export function getLiveScore({
  reactionsTotal,
  commentsCount,
  boostCount = 0,
  createdAt,
  now = new Date(),
}: LiveScoreInput) {
  const baseScore = getBaseScore({ reactionsTotal, commentsCount, boostCount });
  const createdAtMs = new Date(createdAt).getTime();
  const nowMs = new Date(now).getTime();
  const ageHours = Math.max(0, (nowMs - createdAtMs) / 3600000);

  return baseScore / Math.pow(1 + ageHours / 8, 0.3);
}

export function compareDailyLiveRank(
  a: DailyLiveRankEntry,
  b: DailyLiveRankEntry
) {
  if (b.live_score !== a.live_score) {
    return b.live_score - a.live_score;
  }

  if (b.comments_count !== a.comments_count) {
    return b.comments_count - a.comments_count;
  }

  const createdAtOrder = getCreatedAtOrder(a.created_at, b.created_at);
  if (createdAtOrder !== 0) {
    return createdAtOrder;
  }

  return b.id - a.id;
}

export function compareDailyHistoricalRank(
  a: DailyHistoricalRankEntry,
  b: DailyHistoricalRankEntry
) {
  if (b.base_score !== a.base_score) {
    return b.base_score - a.base_score;
  }

  if (b.comments_count !== a.comments_count) {
    return b.comments_count - a.comments_count;
  }

  const createdAtOrder = getCreatedAtOrder(a.created_at, b.created_at);
  if (createdAtOrder !== 0) {
    return createdAtOrder;
  }

  return b.id - a.id;
}
