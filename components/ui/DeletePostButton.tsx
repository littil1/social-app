"use client";

import { useTransition } from "react";
import { deletePost } from "@/app/actions/delete-post";

type Props = {
  postId: number;
};

export function DeletePostButton({ postId }: Props) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => {
        const confirmed = window.confirm(
          "Willst du diesen Post wirklich löschen?"
        );

        if (!confirmed) return;

        startTransition(async () => {
          try {
            await deletePost(postId);
          } catch (error) {
            alert(error instanceof Error ? error.message : "Fehler beim Löschen");
          }
        });
      }}
      disabled={isPending}
      className="rounded-lg border border-red-300 px-3 py-1 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
    >
      {isPending ? "Lösche..." : "Delete"}
    </button>
  );
}