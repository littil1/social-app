"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { loginAction, signupAction, type AuthState } from "@/app/login/actions";
import { useAuthModal } from "@/features/auth/components/AuthModalProvider";
import FormError from "@/shared/components/ui/FormError";
import { trackEvent } from "@/shared/lib/analytics";
import { lockDocumentScroll } from "@/shared/lib/scroll-lock";

const initialState: AuthState = {
  error: null,
  success: null,
};

const SIGNUP_CONFIRMATION_PENDING_KEY = "app_signup_confirmation_pending";

export default function LoginModal() {
  const {
    isOpen,
    redirectPath,
    closeLogin,
    handleAuthSuccess,
    loginSource,
  } = useAuthModal();
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
  const signupStartedTrackedRef = useRef(false);
  const signupSubmittedHandledRef = useRef(false);
  const signupCompletedHandledRef = useRef(false);

  function trackSignupStartedOnce() {
    if (signupStartedTrackedRef.current) return;

    signupStartedTrackedRef.current = true;
    trackEvent("signup_started", { source: loginSource });
  }

  useEffect(() => {
    if (!isOpen) return;

    return lockDocumentScroll();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeLogin();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, closeLogin]);

  useEffect(() => {
    if (!isOpen) {
      queueMicrotask(() => setMode("login"));
      authSuccessHandledRef.current = false;
      signupStartedTrackedRef.current = false;
      signupSubmittedHandledRef.current = false;
      signupCompletedHandledRef.current = false;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || loginPending || signupPending) return;

    const loginSucceeded =
      loginState.authEvent === "login_completed" &&
      !!loginState.success &&
      !loginState.error;
    const signupSubmitted =
      (signupState.authEvent === "signup_submitted" ||
        signupState.authEvent === "signup_completed") &&
      !!signupState.success &&
      !signupState.error;
    const signupCompleted = signupState.authEvent === "signup_completed";

    if (signupSubmitted && !signupSubmittedHandledRef.current) {
      signupSubmittedHandledRef.current = true;
      trackEvent("signup_submitted", {
        confirmation_required: signupState.confirmationRequired ?? false,
        source: loginSource,
      });

      if (signupState.confirmationRequired) {
        window.sessionStorage.setItem(SIGNUP_CONFIRMATION_PENDING_KEY, "1");
        trackEvent("signup_email_confirmation_required", {
          confirmation_required: true,
          source: loginSource,
        });
      }
    }

    if (signupCompleted && !signupCompletedHandledRef.current) {
      signupCompletedHandledRef.current = true;
      trackEvent("signup_completed", {
        confirmation_required: false,
        source: loginSource,
      });
    }

    if (!loginSucceeded && !signupCompleted) return;
    if (authSuccessHandledRef.current) return;

    authSuccessHandledRef.current = true;
    handleAuthSuccess();
  }, [
    isOpen,
    loginPending,
    signupPending,
    loginState,
    signupState,
    loginSource,
    handleAuthSuccess,
  ]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-modal-open="true"
      className="soft-enter fixed inset-0 z-[110] flex items-end justify-center overflow-y-auto bg-neutral-950/50 px-3 pb-4 pt-10 backdrop-blur-md sm:items-center sm:p-6"
      onClick={closeLogin}
    >
      <div
        className="soft-enter relative w-full max-w-md overflow-hidden rounded-t-[30px] border border-white/70 bg-white shadow-[0_28px_90px_-42px_rgba(245,158,11,0.42),0_24px_70px_-46px_rgba(15,23,42,0.7)] sm:rounded-[30px]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_50%_0%,rgba(251,191,36,0.22),transparent_62%)]" />
        <button
          type="button"
          onClick={closeLogin}
          className="motion-button absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/85 text-lg leading-none text-neutral-500 shadow-sm transition hover:bg-neutral-100 hover:text-black"
          aria-label="Close"
        >
          x
        </button>

        <section className="relative flex flex-col justify-center p-6 sm:p-7">
          <div className="mx-auto w-full max-w-sm">
            <div className="mb-6 pr-10">
              <span className="inline-flex rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
                Impact over fame
              </span>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-neutral-950 sm:text-3xl">
                {mode === "login"
                  ? "Enter the Place."
                  : "Take the stage."}
              </h2>
              <p className="mt-2 text-sm leading-6 text-neutral-500">
                {mode === "login"
                  ? "Post anonymously. Be remembered by impact."
                  : "Create your identity. Let the idea speak first."}
              </p>
            </div>

            <div className="mb-6 grid grid-cols-2 rounded-2xl border border-neutral-100 bg-neutral-100/80 p-1 shadow-inner">
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
                onClick={() => {
                  setMode("signup");
                  trackSignupStartedOnce();
                }}
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
              onSubmit={() => {
                if (mode === "signup") {
                  trackSignupStartedOnce();
                }
              }}
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
                className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3.5 font-medium outline-none transition placeholder:text-neutral-500 focus:border-neutral-950 focus:bg-white focus:shadow-[0_0_0_4px_rgba(245,158,11,0.08)]"
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
                className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3.5 font-medium outline-none transition placeholder:text-neutral-500 focus:border-neutral-950 focus:bg-white focus:shadow-[0_0_0_4px_rgba(245,158,11,0.08)]"
                />
              </div>

              {(loginState.error || signupState.error) && (
                <FormError message={loginState.error || signupState.error || ""} />
              )}
              {signupState.success && signupState.success !== "OK" && (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-xs font-bold text-emerald-700">
                  {signupState.success}
                </div>
              )}

              <button
                type="submit"
                disabled={loginPending || signupPending}
                className="motion-button w-full rounded-2xl bg-neutral-950 py-3.5 text-sm font-black text-white shadow-[0_18px_36px_-22px_rgba(0,0,0,0.78)] transition-all hover:bg-neutral-800 disabled:opacity-50"
              >
                {mode === "login"
                  ? loginPending
                    ? "Syncing..."
                    : "Enter APP"
                  : signupPending
                    ? "Initializing..."
                    : "Create identity"}
              </button>
            </form>
            <p className="mt-4 text-center text-[11px] font-medium leading-5 text-neutral-400">
              By continuing, you agree to the{" "}
              <Link href="/terms" className="font-bold text-neutral-600 hover:text-neutral-950">
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="font-bold text-neutral-600 hover:text-neutral-950">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
