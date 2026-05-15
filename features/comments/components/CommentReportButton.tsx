"use client";

import { useState } from "react";
import ReportDialog from "@/features/reports/components/ReportDialog";
import { useAuthModal } from "@/features/auth/components/AuthModalProvider";
import FormError from "@/shared/components/ui/FormError";
import { classifyAnalyticsError, trackEvent } from "@/shared/lib/analytics";

const REPORT_REASONS = [
  { value: "spam", label: "Spam" },
  { value: "harassment", label: "Harassment" },
  { value: "hate", label: "Hate / discrimination" },
  { value: "sexual", label: "Sexual content" },
  { value: "violence", label: "Violence / threats" },
  { value: "misleading", label: "Misleading content" },
  { value: "other", label: "Other" },
] as const;

type CommentReportButtonProps = {
  commentId: number;
};

export default function CommentReportButton({
  commentId,
}: CommentReportButtonProps) {
  const { requireLoginAndResume, isAuthenticated, authReady } = useAuthModal();
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

  async function handleSubmit(
    skipLoginCheck = false,
    reasonToSubmit = reason,
    detailsToSubmit = details
  ) {
    if (submitting || hasReported) return;

    if (!skipLoginCheck && authReady && !isAuthenticated) {
      requireLoginAndResume(
        () => {
          setOpen(true);
          void handleSubmit(true, reasonToSubmit, detailsToSubmit);
        },
        window.location.pathname,
        "report"
      );
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const response = await fetch(`/api/comments/${commentId}/report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: reasonToSubmit,
          details: detailsToSubmit,
        }),
      });

      if (!response.ok) {
        if (
          (response.status === 401 || response.status === 403) &&
          !skipLoginCheck
        ) {
          requireLoginAndResume(
            () => {
              setOpen(true);
              void handleSubmit(true, reasonToSubmit, detailsToSubmit);
            },
            window.location.pathname,
            "report"
          );
          return;
        }

        if (response.status === 409) {
          setHasReported(true);
          setOpen(false);
          setFeedback({
            tone: "success",
            message: "You already reported this comment.",
          });
          trackEvent("report_submitted", {
            target_type: "comment",
            reason_category: reasonToSubmit,
          });
          return;
        }

        const message = await response.text();
        trackEvent("report_submit_failed", {
          target_type: "comment",
          reason: classifyAnalyticsError(undefined, response.status),
        });
        throw new Error(message || "Could not submit the report. Try again.");
      }

      setHasReported(true);
      setOpen(false);
      setDetails("");
      setReason("spam");
      setFeedback({
        tone: "success",
        message: "Comment reported.",
      });
      trackEvent("report_submitted", {
        target_type: "comment",
        reason_category: reasonToSubmit,
      });
    } catch (error) {
      console.error(error);
      setFeedback({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "Could not submit the report. Try again.",
      });
      trackEvent("report_submit_failed", {
        target_type: "comment",
        reason: classifyAnalyticsError(error),
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
          if (!open) {
            trackEvent("report_opened", { target_type: "comment" });
          }
        }}
        disabled={hasReported}
        className={`text-[10px] font-black uppercase tracking-widest transition ${
          hasReported
            ? "cursor-default text-emerald-600"
            : "text-neutral-400 hover:text-amber-600"
        }`}
      >
        {hasReported ? "Reported" : "Report"}
      </button>

      {feedback && (
        feedback.tone === "success" ? (
          <p className="max-w-[220px] text-right text-[10px] font-bold text-emerald-700">
            {feedback.message}
          </p>
        ) : (
          <FormError message={feedback.message} className="max-w-[220px] text-left" />
        )
      )}

      {open && (
        <ReportDialog
          title="Report comment"
          description="Send problematic comments straight to the admin team."
          reasons={REPORT_REASONS}
          reason={reason}
          details={details}
          submitting={submitting}
          onReasonChange={setReason}
          onDetailsChange={setDetails}
          onClose={() => {
            setOpen(false);
            setFeedback(null);
          }}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
