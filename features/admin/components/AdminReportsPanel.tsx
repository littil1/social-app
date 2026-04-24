"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type ReportStatus = "open" | "reviewing" | "resolved" | "dismissed";
type ReportFilter = "all" | ReportStatus;
type ReportTargetType = "post" | "comment";

export type ModerationReport = {
  id: string;
  target_type: ReportTargetType;
  target_id: number;
  post_id: number | null;
  reporter_user_id: string;
  owner_user_id: string | null;
  reason: string;
  details: string | null;
  status: ReportStatus;
  admin_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

type AdminReportsPanelProps = {
  initialReports: ModerationReport[];
  initialSelectedReportId?: string;
  moderationReady: boolean;
  moderationUnavailableReason: string | null;
  targetPreviewsByKey: Record<string, string>;
  usernamesById: Record<string, string>;
};

const STATUS_PRIORITY: Record<ReportStatus, number> = {
  open: 0,
  reviewing: 1,
  resolved: 2,
  dismissed: 3,
};

const STATUS_STYLES: Record<
  ReportStatus,
  {
    chip: string;
    select: string;
  }
> = {
  open: {
    chip: "border-rose-200 bg-rose-50 text-rose-700",
    select: "border-rose-200 bg-rose-50 text-rose-800",
  },
  reviewing: {
    chip: "border-amber-200 bg-amber-50 text-amber-700",
    select: "border-amber-200 bg-amber-50 text-amber-800",
  },
  resolved: {
    chip: "border-emerald-200 bg-emerald-50 text-emerald-700",
    select: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  dismissed: {
    chip: "border-slate-200 bg-slate-50 text-slate-600",
    select: "border-slate-200 bg-slate-50 text-slate-700",
  },
};

const FILTER_OPTIONS: Array<{ value: ReportFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "reviewing", label: "Reviewing" },
  { value: "resolved", label: "Resolved" },
  { value: "dismissed", label: "Dismissed" },
];

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function sortReports(reports: ModerationReport[]) {
  return [...reports].sort((a, b) => {
    const statusOrder = STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status];
    if (statusOrder !== 0) {
      return statusOrder;
    }

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

function getTargetKey(report: Pick<ModerationReport, "target_type" | "target_id">) {
  return `${report.target_type}:${report.target_id}`;
}

function getUpdateRoute(report: Pick<ModerationReport, "target_type" | "id">) {
  return report.target_type === "comment"
    ? `/api/admin/comment-reports/${report.id}`
    : `/api/admin/reports/${report.id}`;
}

function getTargetLabel(targetType: ReportTargetType) {
  return targetType === "comment" ? "Comment" : "Post";
}

export default function AdminReportsPanel({
  initialReports,
  initialSelectedReportId,
  moderationReady,
  moderationUnavailableReason,
  targetPreviewsByKey,
  usernamesById,
}: AdminReportsPanelProps) {
  const [reports, setReports] = useState<ModerationReport[]>(() =>
    sortReports(initialReports)
  );
  const [activeFilter, setActiveFilter] = useState<ReportFilter>("all");
  const [selectedReportId, setSelectedReportId] = useState<string | null>(
    initialSelectedReportId &&
      initialReports.some((report) => report.id === initialSelectedReportId)
      ? initialSelectedReportId
      : initialReports[0]?.id ?? null
  );
  const [statusDraft, setStatusDraft] = useState<Record<string, ReportStatus>>(
    {}
  );
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});
  const [updatingReportId, setUpdatingReportId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  const visibleReports = useMemo(() => {
    const filtered =
      activeFilter === "all"
        ? reports
        : reports.filter((report) => report.status === activeFilter);

    return sortReports(filtered);
  }, [activeFilter, reports]);

  const selectedReport = useMemo(() => {
    if (visibleReports.length === 0) {
      return null;
    }

    return (
      visibleReports.find((report) => report.id === selectedReportId) ??
      visibleReports[0]
    );
  }, [selectedReportId, visibleReports]);

  async function handleSave(reportId: string) {
    const currentReport = reports.find((report) => report.id === reportId);
    if (!currentReport || updatingReportId) return;

    const nextStatus = statusDraft[reportId] ?? currentReport.status;
    const nextAdminNote = noteDraft[reportId] ?? currentReport.admin_note ?? "";

    setUpdatingReportId(reportId);
    setFeedback(null);

    try {
      const response = await fetch(getUpdateRoute(currentReport), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: nextStatus,
          admin_note: nextAdminNote,
        }),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Report could not be updated.");
      }

      const payload = (await response.json()) as { report: ModerationReport };

      setReports((current) =>
        sortReports(
          current.map((report) =>
            report.id === reportId ? payload.report : report
          )
        )
      );
      setStatusDraft((current) => ({
        ...current,
        [reportId]: payload.report.status,
      }));
      setNoteDraft((current) => ({
        ...current,
        [reportId]: payload.report.admin_note ?? "",
      }));
      setSelectedReportId(reportId);
      setFeedback({
        tone: "success",
        message: "Status updated",
      });
    } catch (error) {
      console.error(error);
      setFeedback({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "Report could not be updated.",
      });
    } finally {
      setUpdatingReportId(null);
    }
  }

  return (
    <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-[32px] border border-neutral-200 bg-white p-6 shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">
          Reports
        </p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-neutral-950">
          Moderation Queue
        </h2>

        {!moderationReady ? (
          <div className="mt-6 rounded-2xl border border-dashed border-amber-200 bg-amber-50 px-4 py-5 text-sm text-amber-900">
            {moderationUnavailableReason}
          </div>
        ) : (
          <>
            <div className="mt-6 flex flex-wrap gap-2">
              {FILTER_OPTIONS.map((filter) => {
                const isActive = activeFilter === filter.value;

                return (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setActiveFilter(filter.value)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] transition ${
                      isActive
                        ? "border-neutral-950 bg-neutral-950 text-white"
                        : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50"
                    }`}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>

            {visibleReports.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-5 text-sm text-neutral-500">
                {reports.length === 0
                  ? "No reports yet"
                  : "No reports for this filter."}
              </div>
            ) : (
              <div className="mt-6 grid gap-3">
                {visibleReports.map((report) => {
                  const isActive = selectedReport?.id === report.id;
                  const statusStyle = STATUS_STYLES[report.status];
                  const reporterUsername =
                    usernamesById[report.reporter_user_id] ?? "unknown";
                  const targetPreview =
                    targetPreviewsByKey[getTargetKey(report)] ??
                    "Content is no longer available.";

                  return (
                    <button
                      key={report.id}
                      type="button"
                      onClick={() => {
                        setSelectedReportId(report.id);
                        setFeedback(null);
                      }}
                      className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                        isActive
                          ? "border-neutral-950 bg-neutral-950 text-white"
                          : "border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-bold">
                              {report.reason}
                            </p>
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] ${
                                isActive
                                  ? "border-white/20 bg-white/10 text-white"
                                  : "border-neutral-200 bg-neutral-50 text-neutral-500"
                              }`}
                            >
                              {getTargetLabel(report.target_type)}
                            </span>
                          </div>
                          <p
                            className={`mt-1 truncate text-xs ${
                              isActive ? "text-white/80" : "text-neutral-600"
                            }`}
                          >
                            {targetPreview}
                          </p>
                          <p
                            className={`mt-2 text-xs ${
                              isActive ? "text-white/70" : "text-neutral-500"
                            }`}
                          >
                            by @{reporterUsername} | {formatDateTime(report.created_at)}
                          </p>
                        </div>
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${
                            isActive
                              ? "border-white/20 bg-white/10 text-white"
                              : statusStyle.chip
                          }`}
                        >
                          {report.status}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </section>

      <section className="rounded-[32px] border border-neutral-200 bg-white p-6 shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">
          Report Detail
        </p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-neutral-950">
          Moderation Details
        </h2>

        {!moderationReady ? (
          <div className="mt-6 rounded-2xl border border-dashed border-amber-200 bg-amber-50 px-4 py-5 text-sm text-amber-900">
            {moderationUnavailableReason}
          </div>
        ) : !selectedReport ? (
          <div className="mt-6 rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-5 text-sm text-neutral-500">
            Select a report on the left.
          </div>
        ) : (
          <div className="mt-6 space-y-8">
            <section className="rounded-3xl border border-neutral-200 bg-neutral-50 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${STATUS_STYLES[selectedReport.status].chip}`}
                >
                  {selectedReport.status}
                </span>
                <span className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">
                  {getTargetLabel(selectedReport.target_type)}
                </span>
                <span className="text-xs text-neutral-500">
                  Reported on {formatDateTime(selectedReport.created_at)}
                </span>
              </div>

              <div className="mt-4 grid gap-2 text-sm text-neutral-600">
                <p>
                  Reporter:{" "}
                  <span className="font-medium text-neutral-950">
                    @{usernamesById[selectedReport.reporter_user_id] ?? "unknown"}
                  </span>
                </p>
                <p>
                  Owner:{" "}
                  <span className="font-medium text-neutral-950">
                    {selectedReport.owner_user_id
                      ? `@${usernamesById[selectedReport.owner_user_id] ?? "unknown"}`
                      : "unknown"}
                  </span>
                </p>
                <p>
                  Reviewed by:{" "}
                  <span className="font-medium text-neutral-950">
                    {selectedReport.reviewed_by
                      ? `@${usernamesById[selectedReport.reviewed_by] ?? "unknown"}`
                      : "-"}
                  </span>
                </p>
                <p>
                  Review time:{" "}
                  <span className="font-medium text-neutral-950">
                    {selectedReport.reviewed_at
                      ? formatDateTime(selectedReport.reviewed_at)
                      : "-"}
                  </span>
                </p>
              </div>
            </section>

            <section className="rounded-3xl border border-neutral-200 bg-white p-5">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-neutral-400">
                {getTargetLabel(selectedReport.target_type)}
              </p>
              <p className="mt-4 whitespace-pre-wrap break-words text-sm font-medium text-neutral-800">
                {targetPreviewsByKey[getTargetKey(selectedReport)] ??
                  "Content is no longer available."}
              </p>
              {selectedReport.post_id && (
                <div className="mt-5">
                  <Link
                    href={`/posts/${selectedReport.post_id}`}
                    className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm font-bold text-neutral-950"
                  >
                    Open post
                  </Link>
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-neutral-200 bg-white p-5">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-neutral-400">
                Report
              </p>
              <p className="mt-4 text-base font-bold text-neutral-950">
                {selectedReport.reason}
              </p>
              {selectedReport.details && (
                <p className="mt-2 whitespace-pre-wrap break-words text-sm text-neutral-700">
                  {selectedReport.details}
                </p>
              )}
            </section>

            <section className="rounded-3xl border border-neutral-200 bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-black uppercase tracking-[0.18em] text-neutral-400">
                  Actions
                </p>
                {feedback && (
                  <p
                    className={`text-xs font-medium ${
                      feedback.tone === "success"
                        ? "text-emerald-700"
                        : "text-red-600"
                    }`}
                  >
                    {feedback.message}
                  </p>
                )}
              </div>

              <div className="mt-4 space-y-3">
                <select
                  value={statusDraft[selectedReport.id] ?? selectedReport.status}
                  onChange={(event) =>
                    setStatusDraft((current) => ({
                      ...current,
                      [selectedReport.id]: event.target.value as ReportStatus,
                    }))
                  }
                  disabled={updatingReportId === selectedReport.id}
                  className={`w-full rounded-2xl border px-4 py-3 text-sm font-medium outline-none ${STATUS_STYLES[statusDraft[selectedReport.id] ?? selectedReport.status].select}`}
                >
                  <option value="open">open</option>
                  <option value="reviewing">reviewing</option>
                  <option value="resolved">resolved</option>
                  <option value="dismissed">dismissed</option>
                </select>

                <textarea
                  value={
                    noteDraft[selectedReport.id] ??
                    selectedReport.admin_note ??
                    ""
                  }
                  onChange={(event) =>
                    setNoteDraft((current) => ({
                      ...current,
                      [selectedReport.id]: event.target.value,
                    }))
                  }
                  rows={4}
                  placeholder="Internal admin note"
                  disabled={updatingReportId === selectedReport.id}
                  className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-medium outline-none"
                />

                <button
                  type="button"
                  onClick={() => handleSave(selectedReport.id)}
                  disabled={updatingReportId === selectedReport.id}
                  className="rounded-2xl bg-neutral-950 px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
                >
                  {updatingReportId === selectedReport.id
                    ? "Saving..."
                    : "Save status"}
                </button>
              </div>
            </section>
          </div>
        )}
      </section>
    </section>
  );
}
