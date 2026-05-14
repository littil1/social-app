"use client";

import type { FormEvent } from "react";
import { trackEvent } from "@/shared/lib/analytics";

type InputIdeaFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  username: string;
};

export default function InputIdeaForm({ action, username }: InputIdeaFormProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    const title = String(formData.get("title") ?? "");
    const description = String(formData.get("description") ?? "");

    if (!title.trim() || !description.trim()) {
      trackEvent("input_idea_submit_failed", { reason: "validation" });
      return;
    }

    trackEvent("input_idea_submitted", {
      source: "input",
      title_length: title.trim().length,
      content_length: description.trim().length,
    });
  }

  return (
    <form
      action={action}
      onSubmit={handleSubmit}
      className="mt-6 space-y-4"
    >
      <input
        type="text"
        name="title"
        placeholder="Idea title (e.g., Save for Later)"
        required
        className="w-full rounded-2xl border border-neutral-200 bg-neutral-50/70 px-5 py-4 font-medium outline-none transition placeholder:text-neutral-500 focus:border-neutral-950 focus:bg-white focus:ring-2 focus:ring-amber-100"
      />
      <textarea
        name="description"
        placeholder="Describe your idea in detail..."
        required
        rows={4}
        className="w-full rounded-2xl border border-neutral-200 bg-neutral-50/70 px-5 py-4 font-medium outline-none transition placeholder:text-neutral-500 focus:border-neutral-950 focus:bg-white focus:ring-2 focus:ring-amber-100"
      />
      <div className="flex flex-col gap-4 rounded-2xl border border-amber-100 bg-amber-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-bold text-amber-900 uppercase tracking-tight">
          Posting as @{username}
        </p>
        <button
          type="submit"
          className="w-full rounded-full bg-neutral-950 px-6 py-2.5 text-sm font-bold text-white shadow-lg transition hover:scale-105 sm:w-auto"
        >
          Submit idea
        </button>
      </div>
    </form>
  );
}
