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
  selectedCaseKey?: string | null;
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
  clean: "border-emerald-200/80 bg-emerald-50/70 text-emerald-700",
  reported: "border-neutral-200 bg-neutral-100 text-neutral-600",
  blurred: "border-amber-200/80 bg-amber-50/70 text-amber-700",
  removed: "border-red-200/80 bg-red-50/70 text-red-700",
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
  return item.moderation_status === "reported" || hasOpenReports(item);
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

function getTopScores(scores: Record<string, number> | null, limit = 5) {
  return Object.entries(scores ?? {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit);
}

function getLatestReport(item: AdminModerationQueueItem) {
  return (
    [...item.reports].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0] ?? null
  );
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
      const aDate =
        a.moderation_reviewed_at ??
        getLatestReport(a)?.reviewed_at ??
        a.latest_reported_at ??
        a.created_at;
      const bDate =
        b.moderation_reviewed_at ??
        getLatestReport(b)?.reviewed_at ??
        b.latest_reported_at ??
        b.created_at;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    }

    const priorityDiff = getPriority(b) - getPriority(a);
    if (priorityDiff !== 0) return priorityDiff;

    if (a.report_count !== b.report_count) return b.report_count - a.report_count;

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

function getActionStatusLabel(status: "clean" | "blurred" | "removed") {
  if (status === "clean") return "Keep visible";
  if (status === "blurred") return "Blur";
  return "Remove";
}

function getDecisionPill(item: AdminModerationQueueItem) {
  if (item.moderation_status === "clean") {
    return {
      label: "CLEAN",
      className: "border-emerald-200/80 bg-emerald-50/70 text-emerald-700",
    };
  }

  if (item.moderation_status === "blurred") {
    return {
      label: "BLURRED",
      className: "border-amber-200/80 bg-amber-50/70 text-amber-700",
    };
  }

  if (item.moderation_status === "removed") {
    return {
      label: "REMOVED",
      className: "border-red-200/80 bg-red-50/70 text-red-700",
    };
  }

  return {
    label: "PENDING",
    className: "border-neutral-200 bg-neutral-100 text-neutral-600",
  };
}

export default function AdminModerationPanel({
  initialItems,
  selectedCaseKey = null,
}: Props) {
  const [items, setItems] = useState(initialItems);
  const [activeFilter, setActiveFilter] = useState<QueueFilter>("needs-review");
  const [expandedBadgeByItem, setExpandedBadgeByItem] = useState<
    Record<string, "ai" | "reports" | "decision" | "note" | null>
  >({});
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const needsReviewCount = useMemo(
    () => items.filter(isNeedsReview).length,
    [items]
  );
  const visibleItems = useMemo(
    () => sortItems(filterItems(items, activeFilter), activeFilter),
    [activeFilter, items]
  );
  const selectedItem = selectedCaseKey
    ? items.find((item) => item.key === selectedCaseKey) ?? null
    : null;

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

      if (!response.ok) throw new Error("Moderation action failed.");

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
      setFeedback(`${getActionStatusLabel(status)} saved`);
    } catch (error) {
      console.error(error);
      setFeedback("Moderation action failed.");
    } finally {
      setUpdatingKey(null);
    }
  }

  function renderCaseSummary(item: AdminModerationQueueItem) {
    const flagged = getFlagged(item.moderation_ai_categories);

    return (
      <Link
        key={item.key}
        href={`/admin?tab=moderation&case=${encodeURIComponent(item.key)}`}
        className="motion-card w-full min-w-0 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-left transition hover:border-neutral-300 hover:bg-neutral-50"
      >
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[9px] font-black uppercase tracking-[0.16em] text-neutral-500">
                {item.target_type}
              </span>
              <span
                className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] ${STATUS_STYLES[item.moderation_status]}`}
              >
                {item.moderation_status}
              </span>
              {flagged !== null && (
                <span
                  className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] ${
                    flagged
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-neutral-200 bg-neutral-50 text-neutral-500"
                  }`}
                >
                  AI {flagged ? "flagged" : "clear"}
                </span>
              )}
            </div>
            <p className="mt-1.5 line-clamp-2 break-words text-sm font-semibold leading-5 text-neutral-900 [overflow-wrap:anywhere]">
              {item.moderation_status === "removed"
                ? "Removed by moderation."
                : item.content || "Content is no longer available."}
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-neutral-200 bg-white px-2 py-0.5 text-[10px] font-black text-neutral-600">
            {item.report_count}
          </span>
        </div>
      </Link>
    );
  }

  function renderDecisionEditor(item: AdminModerationQueueItem) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-neutral-400">
              Edit decision
            </p>
            {item.moderation_reviewed_at && (
              <p className="mt-1 text-xs text-neutral-500">
                Last reviewed {formatDateTime(item.moderation_reviewed_at)}
              </p>
            )}
          </div>
          {item.post_id && (
            <Link
              href={`/posts/${item.post_id}`}
              className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-neutral-600"
            >
              Context
            </Link>
          )}
        </div>

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
          className="mt-3 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm font-medium outline-none placeholder:text-neutral-500"
        />

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void updateModeration(item, "clean")}
            disabled={updatingKey === item.key}
            className="motion-button rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-700 disabled:opacity-60"
          >
            Keep visible
          </button>
          <button
            type="button"
            onClick={() => void updateModeration(item, "blurred")}
            disabled={updatingKey === item.key}
            className="motion-button rounded-full border border-amber-200 bg-amber-50 px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-amber-700 disabled:opacity-60"
          >
            Blur
          </button>
          <button
            type="button"
            onClick={() => void updateModeration(item, "removed")}
            disabled={updatingKey === item.key}
            className="motion-button rounded-full border border-red-200 bg-red-50 px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-red-700 disabled:opacity-60"
          >
            Remove
          </button>
        </div>
      </div>
    );
  }

  function toggleBadge(
    item: AdminModerationQueueItem,
    badge: "ai" | "reports" | "decision" | "note"
  ) {
    setExpandedBadgeByItem((current) => ({
      ...current,
      [item.key]: current[item.key] === badge ? null : badge,
    }));
  }

  function renderExpandedBadge(item: AdminModerationQueueItem) {
    const expanded = expandedBadgeByItem[item.key] ?? null;

    if (!expanded) return null;

    if (expanded === "ai") {
      const flagged = getFlagged(item.moderation_ai_categories);
      const topScores = getTopScores(item.moderation_ai_scores, 3);

      return (
        <div className="mt-3 rounded-xl border border-neutral-200 bg-neutral-50/80 p-3">
          <p className="text-xs font-black text-neutral-950">AI Einschätzung</p>
          <p className="mt-1 text-sm text-neutral-700">
            Flagged:{" "}
            <span className="font-bold">
              {flagged === null ? "-" : flagged ? "yes" : "no"}
            </span>
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            {item.moderation_ai_checked_at
              ? formatDateTime(item.moderation_ai_checked_at)
              : "AI check not available yet."}
          </p>
          {item.moderation_ai_summary && (
            <p className="mt-2 text-sm text-neutral-700">
              {item.moderation_ai_summary}
            </p>
          )}
          {topScores.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {topScores.map(([category, score]) => (
                <span
                  key={category}
                  className="rounded-full border border-neutral-200 bg-white px-2 py-1 text-[10px] font-bold text-neutral-600"
                >
                  {category}: {(score * 100).toFixed(1)}%
                </span>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (expanded === "reports") {
      return (
        <div className="mt-3 rounded-xl border border-neutral-200 bg-neutral-50/80 p-3">
          <p className="text-xs font-black text-neutral-950">Reports</p>
          <div className="mt-2 grid gap-2">
            {item.reports.map((report) => (
              <div
                key={report.id}
                className="rounded-lg border border-neutral-200 bg-white px-3 py-2"
              >
                <p className="text-sm font-bold text-neutral-900">
                  {report.reason}
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  @{report.reporter_username ?? "unknown"} ·{" "}
                  {formatDateTime(report.created_at)} · {report.status}
                </p>
                {report.details && (
                  <p className="mt-1 line-clamp-3 break-words text-xs text-neutral-600 [overflow-wrap:anywhere]">
                    {report.details}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (expanded === "note") {
      const noteValue = noteDraft[item.key] ?? item.moderation_reason ?? "";

      return (
        <div className="mt-3 rounded-xl border border-neutral-200 bg-neutral-50/80 p-3">
          <p className="text-xs font-black text-neutral-950">Internal admin note</p>
          <p className="mt-1 text-xs text-neutral-500">
            {item.moderation_reviewed_at
              ? `Last saved ${formatDateTime(item.moderation_reviewed_at)}`
              : "No saved decision note yet."}
          </p>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm text-neutral-700 [overflow-wrap:anywhere]">
            {noteValue || "No note yet."}
          </p>
        </div>
      );
    }

    return null;
  }

  function renderDetail(item: AdminModerationQueueItem) {
    const decisionPill = getDecisionPill(item);
    const flagged = getFlagged(item.moderation_ai_categories);
    const latestReport = getLatestReport(item);
    const showSummaryDecision = isNeedsReview(item);
    const decisionEditorOpen =
      showSummaryDecision || expandedBadgeByItem[item.key] === "decision";

    return (
      <div className="min-w-0 space-y-3">
        <section className="rounded-xl border border-neutral-200 bg-white p-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => toggleBadge(item, "decision")}
              className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] transition hover:bg-white ${decisionPill.className}`}
            >
              {decisionPill.label}
            </button>
            <button
              type="button"
              onClick={() => toggleBadge(item, "reports")}
              className="rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-neutral-600 transition hover:bg-neutral-50"
            >
              {item.report_count} {item.report_count === 1 ? "REPORT" : "REPORTS"}
            </button>
            <button
              type="button"
              onClick={() => toggleBadge(item, "ai")}
              className="rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-neutral-600 transition hover:bg-neutral-50"
            >
              AI {flagged === null ? "-" : flagged ? "FLAGGED" : "CLEAN"}
            </button>
            <button
              type="button"
              onClick={() => toggleBadge(item, "note")}
              className="rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-neutral-600 transition hover:bg-neutral-50"
            >
              NOTE
            </button>
          </div>

          <p className="mt-3 line-clamp-3 whitespace-pre-wrap break-words text-sm font-medium leading-6 text-neutral-900 [overflow-wrap:anywhere]">
            {item.moderation_status === "removed"
              ? "Removed by moderation."
              : item.content || "Content is no longer available."}
          </p>
          <p className="mt-2 text-xs text-neutral-500">
            Created {formatDateTime(item.created_at)}
            {latestReport ? ` · latest report ${formatDateTime(latestReport.created_at)}` : ""}
          </p>
          {renderExpandedBadge(item)}
        </section>

        {decisionEditorOpen && renderDecisionEditor(item)}
      </div>
    );
  }

  if (selectedCaseKey) {
    return (
      <section className="min-w-0 overflow-hidden rounded-2xl border border-neutral-200 bg-[#fffdf8] p-4 shadow-sm lg:min-h-[calc(100vh-7rem)]">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <Link
            href="/admin?tab=moderation"
            className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-neutral-600 transition hover:bg-neutral-50"
          >
            Back to queue
          </Link>
          {feedback && (
            <p className="text-sm font-bold text-neutral-600">{feedback}</p>
          )}
        </div>

        {selectedItem ? (
          <div className="mx-auto max-w-4xl">{renderDetail(selectedItem)}</div>
        ) : (
          <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-5 text-sm text-neutral-500">
            Case not found.
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-[#fffdf8] p-4 shadow-sm lg:h-[calc(100vh-7rem)]">
        <div className="flex shrink-0 flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">
              Moderation
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-neutral-950">
              Queue
            </h2>
          </div>
          <div className="flex gap-2">
            <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-black text-red-700">
              {needsReviewCount} open
            </span>
          </div>
        </div>

        {feedback && (
          <p className="mt-3 text-sm font-bold text-neutral-600">{feedback}</p>
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
                }}
                className={`motion-button rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] transition ${
                  active
                    ? "border-neutral-700 bg-neutral-800 text-white"
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
            <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-5 text-sm text-neutral-500">
              No items for this filter.
            </div>
          ) : (
            visibleItems.map(renderCaseSummary)
          )}
        </div>
    </section>
  );
}
