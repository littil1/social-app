"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type ModerationStatus = "clean" | "reported" | "blurred" | "removed";
type TargetType = "post" | "comment";

export type AdminModerationItem = {
  key: string;
  target_type: TargetType;
  target_id: number;
  post_id: number | null;
  content: string;
  author_username: string | null;
  created_at: string;
  report_count: number;
  latest_report_reason: string | null;
  report_statuses: string[];
  moderation_status: ModerationStatus;
  moderation_reason: string | null;
  moderation_ai_summary: string | null;
  moderation_ai_categories: unknown;
  moderation_ai_scores: Record<string, number> | null;
  moderation_ai_checked_at: string | null;
};

type Props = {
  initialItems: AdminModerationItem[];
};

const STATUS_STYLES: Record<ModerationStatus, string> = {
  clean: "border-emerald-200 bg-emerald-50 text-emerald-700",
  reported: "border-amber-200 bg-amber-50 text-amber-700",
  blurred: "border-red-200 bg-red-50 text-red-700",
  removed: "border-neutral-200 bg-neutral-100 text-neutral-600",
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
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

function sortItems(items: AdminModerationItem[]) {
  return [...items].sort((a, b) => {
    const aExtreme = a.moderation_status === "blurred" ? 1 : 0;
    const bExtreme = b.moderation_status === "blurred" ? 1 : 0;

    if (aExtreme !== bExtreme) {
      return bExtreme - aExtreme;
    }

    if (a.report_count !== b.report_count) {
      return b.report_count - a.report_count;
    }

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export default function AdminPostModerationPanel({ initialItems }: Props) {
  const [items, setItems] = useState(() => sortItems(initialItems));
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const queueCount = useMemo(
    () =>
      items.filter(
        (item) =>
          item.moderation_status === "reported" ||
          item.moderation_status === "blurred"
      ).length,
    [items]
  );

  async function updateModeration(item: AdminModerationItem, status: "clean" | "blurred" | "removed") {
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
        const message = await response.text();
        throw new Error(message || "Moderation action failed.");
      }

      const payload = (await response.json()) as {
        moderation_status: ModerationStatus;
        moderation_reason: string | null;
      };

      setItems((current) =>
        sortItems(
          current.map((currentItem) =>
            currentItem.key === item.key
              ? {
                  ...currentItem,
                  moderation_status: payload.moderation_status,
                  moderation_reason: payload.moderation_reason,
                  report_statuses: currentItem.report_statuses.map(() =>
                    status === "clean" ? "dismissed" : "resolved"
                  ),
                }
              : currentItem
          )
        )
      );
      setFeedback("Moderation action saved");
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "Moderation action failed."
      );
    } finally {
      setUpdatingKey(null);
    }
  }

  return (
    <section className="min-w-0 overflow-hidden rounded-[32px] border border-neutral-200 bg-[#fffdf8] p-5 shadow-sm sm:p-6">
      <div className="flex min-w-0 flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">
            Post Moderation
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-neutral-950">
            Reported Content Queue
          </h2>
        </div>
        <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-red-700">
          {queueCount} active
        </span>
      </div>

      {feedback && (
        <p className="mt-4 break-words text-sm font-bold text-neutral-600 [overflow-wrap:anywhere]">
          {feedback}
        </p>
      )}

      {items.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-5 text-sm text-neutral-500">
          No reported, blurred, or removed posts/comments yet.
        </div>
      ) : (
        <div className="mt-5 grid gap-4">
          {items.map((item) => {
            const topScores = getTopScores(item.moderation_ai_scores);
            const flagged = getFlagged(item.moderation_ai_categories);

            return (
              <article
                key={item.key}
                className="min-w-0 overflow-hidden rounded-3xl border border-neutral-200 bg-white p-5"
              >
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${STATUS_STYLES[item.moderation_status]}`}
                  >
                    {item.moderation_status}
                  </span>
                  <span className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-neutral-500">
                    {item.target_type}
                  </span>
                  <span className="text-xs font-bold text-neutral-500">
                    {item.report_count} reports
                  </span>
                  <span className="text-xs text-neutral-500">
                    {formatDateTime(item.created_at)}
                  </span>
                </div>

                <p className="mt-4 whitespace-pre-wrap break-words text-sm font-medium text-neutral-900 [overflow-wrap:anywhere]">
                  {item.content || "Content is no longer available."}
                </p>

                <div className="mt-4 grid gap-2 text-xs text-neutral-600 sm:grid-cols-2">
                  <p>
                    Author:{" "}
                    <span className="font-bold text-neutral-950">
                      {item.author_username ? `@${item.author_username}` : "unknown"}
                    </span>
                  </p>
                  <p>
                    Latest reason:{" "}
                    <span className="font-bold text-neutral-950">
                      {item.latest_report_reason ?? "-"}
                    </span>
                  </p>
                  <p>
                    Report statuses:{" "}
                    <span className="font-bold text-neutral-950">
                      {Array.from(new Set(item.report_statuses)).join(", ") || "-"}
                    </span>
                  </p>
                  <p>
                    AI flagged:{" "}
                    <span className="font-bold text-neutral-950">
                      {flagged === null ? "-" : flagged ? "yes" : "no"}
                    </span>
                  </p>
                </div>

                <section className="mt-4 rounded-2xl border border-neutral-100 bg-neutral-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-400">
                    AI Einschätzung
                  </p>
                  <p className="mt-2 text-sm font-medium text-neutral-700">
                    {item.moderation_ai_summary ?? "No AI check stored yet."}
                  </p>
                  {topScores.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
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
                  <p className="mt-3 text-xs text-neutral-500">
                    Checked:{" "}
                    {item.moderation_ai_checked_at
                      ? formatDateTime(item.moderation_ai_checked_at)
                      : "-"}
                  </p>
                </section>

                <div className="mt-4 flex min-w-0 flex-col gap-3">
                  <textarea
                    value={noteDraft[item.key] ?? item.moderation_reason ?? ""}
                    onChange={(event) =>
                      setNoteDraft((current) => ({
                        ...current,
                        [item.key]: event.target.value,
                      }))
                    }
                    rows={2}
                    placeholder="Internal note/reason"
                    className="w-full min-w-0 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-medium outline-none placeholder:text-neutral-500"
                  />

                  <div className="flex flex-wrap gap-2">
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
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
