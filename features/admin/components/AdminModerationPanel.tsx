"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type ModerationStatus = "clean" | "reported" | "blurred" | "removed";
type ReportStatus = "open" | "reviewing" | "resolved" | "dismissed";
type TargetType = "post" | "comment";
type QueueFilter =
  | "needs-review"
  | "archived"
  | "reported"
  | "blurred"
  | "removed"
  | "posts"
  | "comments";

export type AdminModerationReport = {
  id: string;
  reporter_user_id: string;
  reporter_username: string | null;
  reason: string;
  details: string | null;
  status: ReportStatus;
  admin_note: string | null;
  reviewed_by: string | null;
  reviewed_by_username: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminModerationQueueItem = {
  key: string;
  target_type: TargetType;
  target_id: number;
  post_id: number | null;
  content: string;
  author_username: string | null;
  created_at: string;
  report_count: number;
  latest_reported_at: string | null;
  moderation_status: ModerationStatus;
  moderation_reason: string | null;
  moderation_reviewed_by_username: string | null;
  moderation_reviewed_at: string | null;
  moderation_ai_summary: string | null;
  moderation_ai_categories: unknown;
  moderation_ai_scores: Record<string, number> | null;
  moderation_ai_checked_at: string | null;
  reports: AdminModerationReport[];
};

type Props = {
  initialItems: AdminModerationQueueItem[];
};

const FILTERS: Array<{ value: QueueFilter; label: string }> = [
  { value: "needs-review", label: "Needs review" },
  { value: "archived", label: "Archived" },
  { value: "reported", label: "Reported" },
  { value: "blurred", label: "Blurred" },
  { value: "removed", label: "Removed" },
  { value: "posts", label: "Posts" },
  { value: "comments", label: "Comments" },
];

const STATUS_STYLES: Record<ModerationStatus, string> = {
  clean: "border-emerald-200/80 bg-emerald-50/80 text-emerald-700",
  reported: "border-amber-200/80 bg-amber-50/80 text-amber-700",
  blurred: "border-red-200/80 bg-red-50/80 text-red-700",
  removed: "border-neutral-200 bg-neutral-100 text-neutral-600",
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function hasOpenReports(item: AdminModerationQueueItem) {
  return item.reports.some(
    (report) => report.status === "open" || report.status === "reviewing"
  );
}

function isNeedsReview(item: AdminModerationQueueItem) {
  return (
    item.moderation_status === "reported" ||
    hasOpenReports(item)
  );
}

function getFlagged(categories: unknown) {
  if (
    categories &&
    typeof categories === "object" &&
    "flagged" in categories &&
    typeof categories.flagged === "boolean"
  ) {
    return categories.flagged;
  }

  return null;
}

function getTopScores(scores: Record<string, number> | null) {
  return Object.entries(scores ?? {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);
}

function getLatestReport(item: AdminModerationQueueItem) {
  return [...item.reports].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )[0] ?? null;
}

function getReportStatusSummary(item: AdminModerationQueueItem) {
  const counts = item.reports.reduce<Record<string, number>>((acc, report) => {
    acc[report.status] = (acc[report.status] ?? 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts)
    .map(([status, count]) => `${status} ${count}`)
    .join(", ");
}

function getPriority(item: AdminModerationQueueItem) {
  const flagged = getFlagged(item.moderation_ai_categories);
  if (flagged && item.moderation_status === "blurred") return 4;
  if (item.moderation_status === "blurred") return 3;
  if (item.moderation_status === "reported") return 2;
  if (hasOpenReports(item)) return 1;
  return 0;
}

function sortItems(items: AdminModerationQueueItem[], filter: QueueFilter) {
  return [...items].sort((a, b) => {
    if (filter === "archived") {
      const aDate = a.moderation_reviewed_at ?? getLatestReport(a)?.reviewed_at ?? a.latest_reported_at ?? a.created_at;
      const bDate = b.moderation_reviewed_at ?? getLatestReport(b)?.reviewed_at ?? b.latest_reported_at ?? b.created_at;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    }

    const priorityDiff = getPriority(b) - getPriority(a);
    if (priorityDiff !== 0) return priorityDiff;

    if (a.report_count !== b.report_count) {
      return b.report_count - a.report_count;
    }

    const aLatest = a.latest_reported_at ?? a.created_at;
    const bLatest = b.latest_reported_at ?? b.created_at;
    return new Date(bLatest).getTime() - new Date(aLatest).getTime();
  });
}

function filterItems(items: AdminModerationQueueItem[], filter: QueueFilter) {
  return items.filter((item) => {
    if (filter === "needs-review") return isNeedsReview(item);
    if (filter === "archived") return !isNeedsReview(item);
    if (filter === "reported") return item.moderation_status === "reported";
    if (filter === "blurred") return item.moderation_status === "blurred";
    if (filter === "removed") return item.moderation_status === "removed";
    if (filter === "posts") return item.target_type === "post";
    if (filter === "comments") return item.target_type === "comment";
    return true;
  });
}

function createTimeline(item: AdminModerationQueueItem) {
  const events: Array<{
    at: string;
    title: string;
    body: string;
  }> = [
    {
      at: item.created_at,
      title: "Content created",
      body: item.author_username ? `Author @${item.author_username}` : "Author unknown",
    },
  ];

  for (const report of item.reports) {
    events.push({
      at: report.created_at,
      title: "Report submitted",
      body: `@${report.reporter_username ?? "unknown"} · ${report.reason}`,
    });

    if (report.reviewed_at) {
      events.push({
        at: report.reviewed_at,
        title: `Report ${report.status}`,
        body: [
          report.reviewed_by_username ? `by @${report.reviewed_by_username}` : null,
          report.admin_note,
        ].filter(Boolean).join(" · ") || "Reviewed",
      });
    }
  }

  if (item.moderation_ai_checked_at) {
    const flagged = getFlagged(item.moderation_ai_categories);
    const scores = getTopScores(item.moderation_ai_scores)
      .map(([category, score]) => `${category} ${(score * 100).toFixed(1)}%`)
      .join(", ");

    events.push({
      at: item.moderation_ai_checked_at,
      title: "AI check completed",
      body: `Flagged: ${flagged === null ? "-" : flagged ? "yes" : "no"}${scores ? ` · ${scores}` : ""}`,
    });
  }

  if (item.report_count > 0) {
    events.push({
      at: item.latest_reported_at ?? item.created_at,
      title: "Auto status evaluated",
      body:
        item.moderation_status === "blurred"
          ? "Blurred by report threshold or emergency brake."
          : `Status: ${item.moderation_status}`,
    });
  }

  if (item.moderation_reviewed_at) {
    events.push({
      at: item.moderation_reviewed_at,
      title: "Admin action",
      body: [
        `Decision: ${item.moderation_status}`,
        item.moderation_reviewed_by_username
          ? `by @${item.moderation_reviewed_by_username}`
          : null,
        item.moderation_reason,
      ].filter(Boolean).join(" · "),
    });
  }

  return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

function getActionStatusLabel(status: "clean" | "blurred" | "removed") {
  if (status === "clean") return "Keep visible";
  if (status === "blurred") return "Blur";
  return "Remove";
}

export default function AdminModerationPanel({ initialItems }: Props) {
  const [items, setItems] = useState(initialItems);
  const [activeFilter, setActiveFilter] = useState<QueueFilter>("needs-review");
  const [selectedKey, setSelectedKey] = useState<string | null>(
    sortItems(filterItems(initialItems, "needs-review"), "needs-review")[0]?.key ??
      initialItems[0]?.key ??
      null
  );
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const needsReviewCount = useMemo(
    () => items.filter(isNeedsReview).length,
    [items]
  );
  const archivedCount = items.length - needsReviewCount;
  const visibleItems = useMemo(
    () => sortItems(filterItems(items, activeFilter), activeFilter),
    [activeFilter, items]
  );
  const selectedItem =
    visibleItems.find((item) => item.key === selectedKey) ?? visibleItems[0] ?? null;

  async function updateModeration(
    item: AdminModerationQueueItem,
    status: "clean" | "blurred" | "removed"
  ) {
    if (updatingKey) return;

    setUpdatingKey(item.key);
    setFeedback(null);

    try {
      const response = await fetch("/api/admin/moderation", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_type: item.target_type,
          target_id: item.target_id,
          moderation_status: status,
          moderation_reason: noteDraft[item.key] ?? item.moderation_reason ?? "",
        }),
      });

      if (!response.ok) {
        throw new Error("Moderation action failed.");
      }

      const payload = (await response.json()) as {
        moderation_status: ModerationStatus;
        moderation_reason: string | null;
        moderation_reviewed_by: string;
        moderation_reviewed_at: string;
      };
      const reportStatus: ReportStatus = status === "clean" ? "dismissed" : "resolved";

      setItems((current) =>
        current.map((currentItem) =>
          currentItem.key === item.key
            ? {
                ...currentItem,
                moderation_status: payload.moderation_status,
                moderation_reason: payload.moderation_reason,
                moderation_reviewed_by_username: "you",
                moderation_reviewed_at: payload.moderation_reviewed_at,
                reports: currentItem.reports.map((report) =>
                  report.status === "open" || report.status === "reviewing"
                    ? {
                        ...report,
                        status: reportStatus,
                        admin_note: payload.moderation_reason,
                        reviewed_by: payload.moderation_reviewed_by,
                        reviewed_by_username: "you",
                        reviewed_at: payload.moderation_reviewed_at,
                      }
                    : report
                ),
              }
            : currentItem
        )
      );
      setActiveFilter("needs-review");
      setSelectedKey((current) => (current === item.key ? null : current));
      setFeedback(`${getActionStatusLabel(status)} saved`);
    } catch (error) {
      console.error(error);
      setFeedback("Moderation action failed.");
    } finally {
      setUpdatingKey(null);
    }
  }

  function renderItemSummary(item: AdminModerationQueueItem) {
    const latestReport = getLatestReport(item);
    const flagged = getFlagged(item.moderation_ai_categories);

    return (
      <button
        key={item.key}
        type="button"
        onClick={() => {
          setSelectedKey(item.key);
          setFeedback(null);
        }}
        className={`motion-card w-full min-w-0 rounded-xl border px-3 py-2.5 text-left transition ${
          selectedItem?.key === item.key
            ? "border-neutral-900 bg-neutral-900 text-white shadow-sm"
            : "border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50"
        }`}
      >
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.16em]">
                {item.target_type}
              </span>
              <span
                className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] ${
                  selectedItem?.key === item.key
                    ? "border-white/20 bg-white/10 text-white"
                    : STATUS_STYLES[item.moderation_status]
                }`}
              >
                {item.moderation_status}
              </span>
            </div>
            <p className="mt-1.5 line-clamp-2 break-words text-sm font-bold leading-5 [overflow-wrap:anywhere]">
              {item.moderation_status === "removed"
                ? "Removed by moderation."
                : item.content || "Content is no longer available."}
            </p>
            <p
              className={`mt-1.5 text-xs ${
                selectedItem?.key === item.key ? "text-white/70" : "text-neutral-500"
              }`}
            >
              {item.report_count} reports · latest {latestReport?.reason ?? "-"} · AI{" "}
              {flagged === null ? "-" : flagged ? "flagged" : "clear"}
            </p>
          </div>
          {isNeedsReview(item) && (
            <span className="shrink-0 rounded-full bg-red-600 px-2 py-0.5 text-[9px] font-black text-white">
              OPEN
            </span>
          )}
        </div>
      </button>
    );
  }

  function renderDetail(item: AdminModerationQueueItem) {
    const latestReport = getLatestReport(item);
    const flagged = getFlagged(item.moderation_ai_categories);
    const topScores = getTopScores(item.moderation_ai_scores);
    const timeline = createTimeline(item);

    return (
      <div className="min-w-0 space-y-4">
        <section className="rounded-2xl border border-neutral-200 bg-white p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-neutral-500">
              {item.target_type}
            </span>
            <span
              className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${STATUS_STYLES[item.moderation_status]}`}
            >
              {item.moderation_status}
            </span>
            <span className="text-xs font-bold text-neutral-500">
              {item.report_count} reports
            </span>
          </div>

          <p className="mt-3 whitespace-pre-wrap break-words text-sm font-medium leading-6 text-neutral-900 [overflow-wrap:anywhere]">
            {item.moderation_status === "removed"
              ? "Removed by moderation."
              : item.content || "Content is no longer available."}
          </p>

          <div className="mt-3 grid gap-1.5 text-xs text-neutral-600 sm:grid-cols-2">
            <p>
              Author:{" "}
              <span className="font-bold text-neutral-950">
                {item.author_username ? `@${item.author_username}` : "unknown"}
              </span>
            </p>
            <p>Created: {formatDateTime(item.created_at)}</p>
            <p>Latest report: {latestReport?.reason ?? "-"}</p>
            <p>Status summary: {getReportStatusSummary(item) || "-"}</p>
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-neutral-50/70 p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-400">
            AI
          </p>
          <div className="mt-2 grid gap-1.5 text-sm text-neutral-700">
            <p>
              Checked:{" "}
              <span className="font-bold text-neutral-950">
                {item.moderation_ai_checked_at
                  ? formatDateTime(item.moderation_ai_checked_at)
                  : "AI check not available yet."}
              </span>
            </p>
            <p>
              Flagged:{" "}
              <span className="font-bold text-neutral-950">
                {flagged === null ? "-" : flagged ? "yes" : "no"}
              </span>
            </p>
            <p>{item.moderation_ai_summary ?? "No AI check stored."}</p>
          </div>
          {topScores.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {topScores.map(([category, score]) => (
                <span
                  key={category}
                  className="rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-[10px] font-bold text-neutral-600"
                >
                  {category}: {(score * 100).toFixed(1)}%
                </span>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-400">
            Decision
          </p>
          {item.moderation_reviewed_at && (
            <p className="mt-1.5 text-xs text-neutral-600">
              Reviewed {formatDateTime(item.moderation_reviewed_at)}
              {item.moderation_reviewed_by_username
                ? ` by @${item.moderation_reviewed_by_username}`
                : ""}
            </p>
          )}
          <textarea
            value={noteDraft[item.key] ?? item.moderation_reason ?? ""}
            onChange={(event) =>
              setNoteDraft((current) => ({
                ...current,
                [item.key]: event.target.value,
              }))
            }
            rows={3}
            placeholder="Internal admin note"
            className="mt-3 w-full min-w-0 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm font-medium outline-none placeholder:text-neutral-500"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void updateModeration(item, "clean")}
              disabled={updatingKey === item.key}
              className="motion-button rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-emerald-700 disabled:opacity-60"
            >
              Keep visible
            </button>
            <button
              type="button"
              onClick={() => void updateModeration(item, "blurred")}
              disabled={updatingKey === item.key}
              className="motion-button rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-amber-700 disabled:opacity-60"
            >
              Blur
            </button>
            <button
              type="button"
              onClick={() => void updateModeration(item, "removed")}
              disabled={updatingKey === item.key}
              className="motion-button rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-red-700 disabled:opacity-60"
            >
              Remove
            </button>
            {item.post_id && (
              <Link
                href={`/posts/${item.post_id}`}
                className="motion-button rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-neutral-700"
              >
                Context
              </Link>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-400">
            Timeline
          </p>
          <div className="mt-3 max-h-[34vh] space-y-2.5 overflow-y-auto pr-1">
            {timeline.map((event, index) => (
              <div
                key={`${event.title}-${event.at}-${index}`}
                className="border-l-2 border-neutral-200 pl-3"
              >
                <p className="text-xs font-black text-neutral-950">
                  {event.title}
                </p>
                <p className="mt-0.5 break-words text-xs text-neutral-600 [overflow-wrap:anywhere]">
                  {event.body}
                </p>
                <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-neutral-400">
                  {formatDateTime(event.at)}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  return (
    <section className="grid w-full min-w-0 gap-3 overflow-hidden lg:h-[calc(100vh-12rem)] lg:grid-cols-[minmax(320px,0.82fr)_minmax(0,1.18fr)]">
      <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-[#fffdf8] p-4 shadow-sm">
        <div className="flex shrink-0 flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">
              Moderation
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-neutral-950">
              Queue
            </h2>
          </div>
          <div className="flex gap-2">
            <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-black text-red-700">
              {needsReviewCount} open
            </span>
            <span className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-black text-neutral-500">
              {archivedCount} archived
            </span>
          </div>
        </div>

        {feedback && (
          <p className="mt-4 text-sm font-bold text-neutral-600">{feedback}</p>
        )}

        <div className="mt-3 flex shrink-0 flex-wrap gap-1.5">
          {FILTERS.map((filter) => {
            const active = activeFilter === filter.value;
            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => {
                  setActiveFilter(filter.value);
                  setSelectedKey(null);
                }}
                className={`motion-button rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] transition ${
                  active
                    ? "border-neutral-950 bg-neutral-950 text-white"
                    : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>

        <div className="mt-3 grid min-h-0 gap-2 overflow-y-auto pr-1 lg:flex-1">
          {visibleItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-5 text-sm text-neutral-500">
              No items for this filter.
            </div>
          ) : (
            visibleItems.map(renderItemSummary)
          )}
        </div>
      </section>

      <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-[#fffdf8] p-4 shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">
          Detail
        </p>
        <h2 className="mt-1 text-2xl font-black tracking-tight text-neutral-950">
          Case Details
        </h2>

        <div className="mt-3 min-h-0 overflow-y-auto pr-1 lg:flex-1">
          {selectedItem ? (
            renderDetail(selectedItem)
          ) : (
            <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-5 text-sm text-neutral-500">
              Select a moderation item.
            </div>
          )}
        </div>
      </section>
    </section>
  );
}
