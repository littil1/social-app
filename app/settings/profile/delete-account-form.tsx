"use client";

import type { FormEvent } from "react";
import { useActionState, useState } from "react";
import {
  deleteAccount,
  type DeleteAccountState,
} from "@/app/settings/profile/actions";

const initialState: DeleteAccountState = {
  error: null,
};

export default function DeleteAccountForm() {
  const [confirmation, setConfirmation] = useState("");
  const [state, formAction, isPending] = useActionState(
    deleteAccount,
    initialState
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const confirmed = window.confirm(
      "This permanently deletes your account and personal data. This cannot be undone."
    );

    if (!confirmed) {
      event.preventDefault();
    }
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="delete-confirmation"
          className="text-xs font-black uppercase tracking-widest text-neutral-500"
        >
          Type DELETE to confirm
        </label>
        <input
          id="delete-confirmation"
          name="confirmation"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          placeholder="DELETE"
          className="mt-2 w-full rounded-2xl border border-red-100 bg-white px-4 py-3 text-sm font-bold outline-none transition placeholder:text-neutral-400 focus:border-red-300"
        />
      </div>

      {state.error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-3 text-xs font-bold text-red-600">
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={confirmation !== "DELETE" || isPending}
        className="w-full rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isPending ? "Deleting..." : "Delete account"}
      </button>
    </form>
  );
}
