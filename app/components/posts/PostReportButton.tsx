"use client";

import { useState } from "react";

const REPORT_REASONS = [
  { value: "spam", label: "Spam" },
  { value: "harassment", label: "Belästigung" },
  { value: "hate", label: "Hass / Diskriminierung" },
  { value: "sexual", label: "Sexueller Inhalt" },
  { value: "violence", label: "Gewalt / Bedrohung" },
  { value: "misleading", label: "Irreführender Inhalt" },
  { value: "other", label: "Sonstiges" },
] as const;

type PostReportButtonProps = {
  postId: number;
};

export default function PostReportButton({ postId }: PostReportButtonProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] =
    useState<(typeof REPORT_REASONS)[number]["value"]>("spam");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hasReported, setHasReported] = useState(false);
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  async function handleSubmit() {
    if (submitting || hasReported) return;

    setSubmitting(true);
    setFeedback(null);

    try {
      const response = await fetch(`/api/posts/${postId}/report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason,
          details,
        }),
      });

      if (!response.ok) {
        if (response.status === 409) {
          setHasReported(true);
          setOpen(false);
          setFeedback({
            tone: "success",
            message: "Du hast diesen Post bereits gemeldet.",
          });
          return;
        }

        const message = await response.text();
        throw new Error(message || "Report konnte nicht erstellt werden.");
      }

      setHasReported(true);
      setOpen(false);
      setDetails("");
      setReason("spam");
      setFeedback({
        tone: "success",
        message: "Post wurde gemeldet.",
      });
    } catch (error) {
      console.error(error);
      setFeedback({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "Post konnte nicht gemeldet werden.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => {
          if (hasReported) return;
          setFeedback(null);
          setOpen((prev) => !prev);
        }}
        disabled={hasReported}
        className={`text-[10px] font-black uppercase tracking-widest transition ${
          hasReported
            ? "cursor-default text-emerald-600"
            : "text-neutral-300 hover:text-amber-600"
        }`}
      >
        {hasReported ? "Reported" : "Report"}
      </button>

      {feedback && (
        <p
          className={`max-w-[220px] text-right text-[10px] font-medium ${
            feedback.tone === "success" ? "text-emerald-700" : "text-red-600"
          }`}
        >
          {feedback.message}
        </p>
      )}

      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-neutral-950/40 px-4">
          <div className="w-full max-w-md rounded-[32px] border border-neutral-200 bg-white p-5 shadow-2xl">
            <p className="text-sm font-black text-neutral-950">Post melden</p>
            <p className="mt-1 text-xs text-neutral-500">
              Melde problematische Inhalte direkt an das Admin-Team.
            </p>

            <div className="mt-4 space-y-3">
              <select
                value={reason}
                onChange={(event) =>
                  setReason(
                    event.target.value as (typeof REPORT_REASONS)[number]["value"]
                  )
                }
                disabled={submitting}
                className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-medium outline-none transition focus:border-neutral-950 focus:bg-white"
              >
                {REPORT_REASONS.map((entry) => (
                  <option key={entry.value} value={entry.value}>
                    {entry.label}
                  </option>
                ))}
              </select>

              <textarea
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                maxLength={1000}
                rows={4}
                placeholder="Optionale Details"
                disabled={submitting}
                className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-medium outline-none transition focus:border-neutral-950 focus:bg-white"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setFeedback(null);
                  }}
                  disabled={submitting}
                  className="rounded-2xl border border-neutral-200 px-4 py-2 text-sm font-bold text-neutral-600"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="rounded-2xl bg-neutral-950 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                >
                  {submitting ? "Sende..." : "Melden"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
