"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { loginAction, signupAction, type AuthState } from "@/app/login/actions";
import { useAuthModal } from "@/app/components/auth/AuthModalProvider";

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
      setMode("login");
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
        className="relative grid w-full max-w-4xl overflow-hidden rounded-[32px] border border-neutral-200 bg-white shadow-2xl lg:grid-cols-[1fr_1.1fr]"
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

        {/* Sidebar Manifest */}
        <section className="hidden bg-neutral-950 p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="space-y-6">
            <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">
              The Arena
            </span>

            <div className="space-y-4">
              <h1 className="text-4xl font-black tracking-tighter sm:text-5xl">
                Impact over <br />
                <span className="text-neutral-500 text-glow-neutral">Volume.</span>
              </h1>
              <p className="max-w-md text-base leading-relaxed text-neutral-400">
                Join a community that values deep insights over loud noise. Your journey to become a Legend starts here.
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            <InfoCard title="Curated Noise" text="We filter the chaos. You only see what truly matters." />
            <InfoCard title="Earned Status" text="Your name is revealed only when your value is proven." />
            <InfoCard title="Daily Reset" text="Every 24 hours is a new chance to lead the pack." />
          </div>
        </section>

        {/* Form Section */}
        <section className="flex flex-col justify-center p-8 sm:p-12">
          <div className="mx-auto w-full max-w-sm">
            <div className="mb-8">
              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Access APP</span>
              <h2 className="mt-2 text-4xl font-black tracking-tight text-neutral-950">
                {mode === "login" ? "Welcome back." : "Join the race."}
              </h2>
            </div>

            {/* Mode Switcher */}
            <div className="mb-8 grid grid-cols-2 rounded-2xl bg-neutral-100 p-1">
              <button
                type="button"
                onClick={() => setMode("login")}
                className={`rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
                  mode === "login" ? "bg-white text-black shadow-sm" : "text-neutral-500 hover:text-black"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={`rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
                  mode === "signup" ? "bg-white text-black shadow-sm" : "text-neutral-500 hover:text-black"
                }`}
              >
                Register
              </button>
            </div>

            <form action={mode === "login" ? loginFormAction : signupFormAction} className="space-y-5">
              <input type="hidden" name="redirect" value={redirectPath} />

              <div className="space-y-2">
                <label htmlFor="auth-email" className="text-xs font-bold uppercase tracking-tight text-neutral-500">
                  Email Address
                </label>
                <input
                  id="auth-email"
                  name="email"
                  type="email"
                  required
                  placeholder="name@example.com"
                  className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3.5 font-medium outline-none transition focus:border-neutral-950 focus:bg-white"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="auth-password" className="text-xs font-bold uppercase tracking-tight text-neutral-500">
                  Password
                </label>
                <input
                  id="auth-password"
                  name="password"
                  type="password"
                  required
                  minLength={mode === "signup" ? 6 : undefined}
                  placeholder="••••••••"
                  className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3.5 font-medium outline-none transition focus:border-neutral-950 focus:bg-white"
                />
                {mode === "signup" && <p className="text-[10px] font-medium text-neutral-400">Min. 6 characters</p>}
              </div>

              {/* Status Messages */}
              {(loginState.error || signupState.error) && (
                <div className="rounded-2xl bg-red-50 p-4 text-xs font-bold text-red-600 border border-red-100 animate-shake">
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
                className="w-full rounded-2xl bg-neutral-950 py-4 text-sm font-bold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              >
                {mode === "login"
                  ? loginPending ? "Authenticating..." : "Sign In"
                  : signupPending ? "Creating Account..." : "Create Account"}
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
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm transition hover:bg-white/10">
      <h3 className="text-sm font-black tracking-tight text-white">{title}</h3>
      <p className="mt-2 text-xs leading-relaxed text-neutral-400">{text}</p>
    </div>
  );
}