"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

type ConfirmDialogProps = {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  loading?: boolean;
  tone?: "danger" | "neutral";
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ConfirmDialog({
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  loading = false,
  tone = "danger",
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !loading) {
        onCancel();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [loading, onCancel]);

  const confirmClass =
    tone === "danger"
      ? "bg-red-600 text-white hover:bg-red-500"
      : "bg-neutral-950 text-white hover:bg-neutral-800";

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[300] flex items-end justify-center bg-neutral-950/50 px-3 pb-4 pt-10 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={() => {
        if (!loading) onCancel();
      }}
    >
      <div
        className="soft-enter w-full max-w-sm rounded-t-[28px] border border-neutral-200 bg-white p-5 shadow-2xl sm:rounded-[28px] sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="text-lg font-black tracking-tight text-neutral-950">
          {title}
        </p>
        <p className="mt-2 text-sm font-medium leading-6 text-neutral-600">
          {description}
        </p>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="motion-button rounded-2xl border border-neutral-200 px-4 py-3 text-sm font-bold text-neutral-600 transition hover:bg-neutral-50 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`motion-button rounded-2xl px-4 py-3 text-sm font-black transition disabled:opacity-50 ${confirmClass}`}
          >
            {loading ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
