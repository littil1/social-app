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

  const [loginState, loginFormAction, loginPending] = useActionState(loginAction, initialState);
  const [signupState, signupFormAction, signupPending] = useActionState(signupAction, initialState);

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
      return;
    }
  }, [isOpen]);

  useEffect(() => {
    const loginSucceeded = !!loginState.success && !loginState.error;
    const signupSucceeded = !!signupState.success && signupState.success === "OK" && !signupState.error;

    if (!isOpen || loginPending || signupPending || authSuccessHandledRef.current) return;
    if (!loginSucceeded && !signupSucceeded) return;

    authSuccessHandledRef.current = true;
    handleAuthSuccess();
  }, [isOpen, loginPending, signupPending, loginState, signupState, handleAuthSuccess]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-md"
      onClick={closeLogin}
    >
      <div
        className="relative grid w-full max-w-4xl overflow-hidden rounded-[40px] border border-neutral-200 bg-white shadow-2xl lg:grid-cols-[1fr_1.1fr]"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={closeLogin}
          className="absolute right-6 top-6 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 transition hover:bg-neutral-200 hover:text-black"
          aria-label="Close"
        >
          ✕
        </button>

        {/* Sidebar Manifesto - Minimalist Refactor */}
        <section className="hidden bg-neutral-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="space-y-8">
            <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
              A PERFECT PLACE
            </span>

            <div className="space-y-6">
              <h1 className="text-5xl font-black tracking-tighter leading-none">
                Impact over <br />
                <span className="text-neutral-600 text-glow-neutral">Fame.</span>
              </h1>
              <p className="max-w-[280px] text-lg font-medium leading-relaxed text-neutral-400">
                Resonance is the only currency.
              </p>
            </div>
          </div>

          <div className="grid gap-3">
            <InfoCard title="Substance Only" text="We filter the noise. See what truly moves the community." />
            <InfoCard title="Earned Status" text="Your identity is revealed only when your value is proven." />
            <InfoCard title="Daily Race" text="Every 24 hours is a new chance to lead the pack." />
          </div>
        </section>

        {/* Form Section */}
        <section className="flex flex-col justify-center p-8 sm:p-16">
          <div className="mx-auto w-full max-w-sm">
            <div className="mb-10">
              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Identity Portal</span>
              <h2 className="mt-2 text-4xl font-black tracking-tight text-neutral-950">
                {mode === "login" ? "Welcome back." : "Create your account now."}
              </h2>
            </div>

            {/* Mode Switcher */}
            <div className="mb-8 grid grid-cols-2 rounded-2xl bg-neutral-100 p-1">
              <button
                type="button"
                onClick={() => setMode("login")}
                className={`rounded-xl px-4 py-3 text-sm font-bold transition-all ${
                  mode === "login" ? "bg-white text-black shadow-sm" : "text-neutral-500 hover:text-black"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={`rounded-xl px-4 py-3 text-sm font-bold transition-all ${
                  mode === "signup" ? "bg-white text-black shadow-sm" : "text-neutral-500 hover:text-black"
                }`}
              >
                Register
              </button>
            </div>

            <form action={mode === "login" ? loginFormAction : signupFormAction} className="space-y-6">
              <input type="hidden" name="redirect" value={redirectPath} />

              <div className="space-y-2">
                <label htmlFor="auth-email" className="text-xs font-black uppercase tracking-widest text-neutral-500">
                  Email Address
                </label>
                <input
                  id="auth-email"
                  name="email"
                  type="email"
                  required
                  placeholder="name@example.com"
                  className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-5 py-4 font-medium outline-none transition placeholder:text-neutral-500 focus:border-neutral-950 focus:bg-white"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="auth-password" className="text-xs font-black uppercase tracking-widest text-neutral-500">
                  Password
                </label>
                <input
                  id="auth-password"
                  name="password"
                  type="password"
                  required
                  minLength={mode === "signup" ? 6 : undefined}
                  placeholder="••••••••"
                  className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-5 py-4 font-medium outline-none transition placeholder:text-neutral-500 focus:border-neutral-950 focus:bg-white"
                />
              </div>

              {/* Status Messages */}
              {(loginState.error || signupState.error) && (
                <div className="rounded-2xl bg-red-50 p-4 text-xs font-bold text-red-600 border border-red-100">
                  {loginState.error || signupState.error}
                </div>
              )}
              {signupState.success && signupState.success !== "OK" && (
                <div className="rounded-2xl bg-emerald-50 p-4 text-xs font-bold text-emerald-700 border border-emerald-100">
                  {signupState.success}
                </div>
              )}

              <button
                type="submit"
                disabled={loginPending || signupPending}
                className="w-full rounded-2xl bg-neutral-950 py-5 text-sm font-bold text-white shadow-xl transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
              >
                {mode === "login"
                  ? loginPending ? "Syncing..." : "Enter the Place"
                  : signupPending ? "Initializing..." : "Create Identity"}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}

type InfoCardProps = {
  title: string;
  text: string;
};

function InfoCard({ title, text }: InfoCardProps) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5 transition hover:bg-white/[0.06]">
      <h3 className="text-xs font-black uppercase tracking-widest text-white">{title}</h3>
      <p className="mt-1 text-[11px] font-medium leading-relaxed text-neutral-500">{text}</p>
    </div>
  );
}

