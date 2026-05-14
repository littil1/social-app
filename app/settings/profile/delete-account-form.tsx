"use client";

import type { FormEvent } from "react";
import { useActionState, useEffect, useRef, useState } from "react";
import {
  deleteAccount,
  type DeleteAccountState,
} from "@/app/settings/profile/actions";
import ConfirmDialog from "@/shared/components/ui/ConfirmDialog";
import FormError from "@/shared/components/ui/FormError";
import { trackEvent } from "@/shared/lib/analytics";

const initialState: DeleteAccountState = {
  error: null,
};

export default function DeleteAccountForm() {
  const [confirmation, setConfirmation] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);
  const allowSubmitRef = useRef(false);
  const [state, formAction, isPending] = useActionState(
    deleteAccount,
    initialState
  );

  useEffect(() => {
    if (!state.error) return;
    trackEvent("account_delete_failed", { reason: "unknown" });
  }, [state.error]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!allowSubmitRef.current) {
      event.preventDefault();
      trackEvent("account_delete_started");
      setConfirmOpen(true);
      return;
    }

    allowSubmitRef.current = false;
    trackEvent("account_delete_confirmed");
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={handleSubmit}
      className="space-y-4"
    >
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
        <FormError message={state.error} />
      )}

      <button
        type="submit"
        disabled={confirmation !== "DELETE" || isPending}
        className="w-full rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isPending ? "Deleting..." : "Delete account"}
      </button>

      {confirmOpen && (
        <ConfirmDialog
          title="Delete your account?"
          description="This permanently deletes your account and personal data. Type DELETE must stay in the field to continue."
          confirmLabel="Delete account"
          loading={isPending}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => {
            allowSubmitRef.current = true;
            setConfirmOpen(false);
            formRef.current?.requestSubmit();
          }}
        />
      )}
    </form>
  );
}
