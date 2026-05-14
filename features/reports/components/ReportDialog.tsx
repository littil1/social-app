"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { lockDocumentScroll } from "@/shared/lib/scroll-lock";

type ReportReason = {
  value: string;
  label: string;
};

type ReportDialogProps<TReason extends string> = {
  title: string;
  description: string;
  reasons: readonly ReportReason[];
  reason: TReason;
  details: string;
  submitting: boolean;
  onReasonChange: (reason: TReason) => void;
  onDetailsChange: (details: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export default function ReportDialog<TReason extends string>({
  title,
  description,
  reasons,
  reason,
  details,
  submitting,
  onReasonChange,
  onDetailsChange,
  onClose,
  onSubmit,
}: ReportDialogProps<TReason>) {
  useEffect(() => {
    return lockDocumentScroll();
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      data-modal-open="true"
      className="fixed inset-0 z-[120] flex items-end justify-center overflow-y-auto bg-neutral-950/50 px-3 pb-4 pt-10 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        className="soft-enter relative w-full max-w-md rounded-t-[28px] border border-neutral-200 bg-white p-5 shadow-2xl sm:max-h-[calc(100dvh-3rem)] sm:rounded-[28px] sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          aria-label={`Close ${title.toLowerCase()}`}
          className="motion-button absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-lg leading-none text-neutral-500 transition hover:bg-neutral-200 hover:text-neutral-950 disabled:opacity-50"
        >
          x
        </button>

        <div className="pr-10">
          <p className="text-sm font-black text-neutral-950">{title}</p>
          <p className="mt-1 text-xs leading-5 text-neutral-500">
            {description}
          </p>
        </div>

        <div className="mt-5 space-y-3">
          <select
            value={reason}
            onChange={(event) => onReasonChange(event.target.value as TReason)}
            disabled={submitting}
            className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-medium outline-none transition focus:border-neutral-950 focus:bg-white"
          >
            {reasons.map((entry) => (
              <option key={entry.value} value={entry.value}>
                {entry.label}
              </option>
            ))}
          </select>

          <textarea
            value={details}
            onChange={(event) => onDetailsChange(event.target.value)}
            maxLength={1000}
            rows={4}
            placeholder="Optional details"
            disabled={submitting}
            className="max-h-[35dvh] w-full resize-y rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-medium outline-none transition placeholder:text-neutral-500 focus:border-neutral-950 focus:bg-white"
          />

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="motion-button rounded-2xl border border-neutral-200 px-4 py-2 text-sm font-bold text-neutral-600 transition hover:bg-neutral-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={submitting}
              className="motion-button rounded-2xl bg-neutral-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-neutral-800 disabled:opacity-60"
            >
              {submitting ? "Sending..." : "Report"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
