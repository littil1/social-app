"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { loginAction, signupAction, type AuthState } from "@/app/login/actions";
import { useAuthModal } from "@/features/auth/components/AuthModalProvider";

const initialState: AuthState = {
  error: null,
  success: null,
};

export default function LoginModal() {
  const { isOpen, redirectPath, closeLogin, handleAuthSuccess } = useAuthModal();
  const [mode, setMode] = useState<"login" | "signup">("login");

  const [loginState, loginFormAction, loginPending] = useActionState(
    loginAction,
    initialState
  );
  const [signupState, signupFormAction, signupPending] = useActionState(
    signupAction,
    initialState
  );

  const authSuccessHandledRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeLogin();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, closeLogin]);

  useEffect(() => {
    if (!isOpen) {
      queueMicrotask(() => setMode("login"));
      authSuccessHandledRef.current = false;
    }
  }, [isOpen]);

  useEffect(() => {
    const loginSucceeded = !!loginState.success && !loginState.error;
    const signupSucceeded =
      !!signupState.success &&
      signupState.success === "OK" &&
      !signupState.error;

    if (!isOpen || loginPending || signupPending || authSuccessHandledRef.current) {
      return;
    }
    if (!loginSucceeded && !signupSucceeded) return;

    authSuccessHandledRef.current = true;
    handleAuthSuccess();
  }, [
    isOpen,
    loginPending,
    signupPending,
    loginState,
    signupState,
    handleAuthSuccess,
  ]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-modal-open="true"
      className="soft-enter fixed inset-0 z-[110] flex items-end justify-center overflow-y-auto bg-neutral-950/45 px-3 pb-4 pt-10 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={closeLogin}
    >
      <div
        className="soft-enter relative w-full max-w-md overflow-hidden rounded-t-[28px] border border-neutral-200 bg-white shadow-2xl sm:rounded-[28px]"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={closeLogin}
          className="motion-button absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-lg leading-none text-neutral-500 transition hover:bg-neutral-200 hover:text-black"
          aria-label="Close"
        >
          x
        </button>

        <section className="flex flex-col justify-center p-6 sm:p-7">
          <div className="mx-auto w-full max-w-sm">
            <div className="mb-6 pr-10">
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-400">
                Identity Portal
              </span>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-neutral-950 sm:text-3xl">
                {mode === "login"
                  ? "Welcome back."
                  : "Create your account now."}
              </h2>
              <p className="mt-2 text-sm leading-6 text-neutral-500">
                Impact over Fame. Resonance is the only currency.
              </p>
            </div>

            <div className="mb-6 grid grid-cols-2 rounded-2xl bg-neutral-100 p-1">
              <button
                type="button"
                onClick={() => setMode("login")}
                className={`motion-button rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
                  mode === "login"
                    ? "bg-white text-black shadow-sm"
                    : "text-neutral-500 hover:text-black"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={`motion-button rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
                  mode === "signup"
                    ? "bg-white text-black shadow-sm"
                    : "text-neutral-500 hover:text-black"
                }`}
              >
                Register
              </button>
            </div>

            <form
              action={mode === "login" ? loginFormAction : signupFormAction}
              className="space-y-4"
            >
              <input type="hidden" name="redirect" value={redirectPath} />

              <div className="space-y-2">
                <label
                  htmlFor="auth-email"
                  className="text-xs font-black uppercase tracking-widest text-neutral-500"
                >
                  Email Address
                </label>
                <input
                  id="auth-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="name@example.com"
                  className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3.5 font-medium outline-none transition placeholder:text-neutral-500 focus:border-neutral-950 focus:bg-white"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="auth-password"
                  className="text-xs font-black uppercase tracking-widest text-neutral-500"
                >
                  Password
                </label>
                <input
                  id="auth-password"
                  name="password"
                  type="password"
                  required
                  minLength={mode === "signup" ? 6 : undefined}
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  placeholder="********"
                  className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3.5 font-medium outline-none transition placeholder:text-neutral-500 focus:border-neutral-950 focus:bg-white"
                />
              </div>

              {(loginState.error || signupState.error) && (
                <div className="rounded-2xl border border-red-100 bg-red-50 p-3 text-xs font-bold text-red-600">
                  {loginState.error || signupState.error}
                </div>
              )}
              {signupState.success && signupState.success !== "OK" && (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-xs font-bold text-emerald-700">
                  {signupState.success}
                </div>
              )}

              <button
                type="submit"
                disabled={loginPending || signupPending}
                className="motion-button w-full rounded-2xl bg-neutral-950 py-3.5 text-sm font-bold text-white shadow-[0_14px_28px_-16px_rgba(0,0,0,0.55)] transition-all hover:bg-neutral-800 disabled:opacity-50"
              >
                {mode === "login"
                  ? loginPending
                    ? "Syncing..."
                    : "Enter the Place"
                  : signupPending
                    ? "Initializing..."
                    : "Create Identity"}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
