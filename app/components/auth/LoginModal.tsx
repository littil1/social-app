"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loginAction, signupAction, type AuthState } from "@/app/login/actions";
import { useAuthModal } from "@/app/components/auth/AuthModalProvider";

// =====================================================
// Constants
// =====================================================

const initialState: AuthState = {
  error: null,
  success: null,
};

// =====================================================
// Component
// =====================================================

export default function LoginModal() {
  const router = useRouter();
  const { isOpen, redirectPath, closeLogin } = useAuthModal();

  const [mode, setMode] = useState<"login" | "signup">("login");

  const [loginState, loginFormAction, loginPending] = useActionState(
    loginAction,
    initialState
  );

  const [signupState, signupFormAction, signupPending] = useActionState(
    signupAction,
    initialState
  );

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeLogin();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, closeLogin]);

  useEffect(() => {
    if (loginState.success !== "OK") return;

    closeLogin();
    router.refresh();

    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent("auth-login-success"));
    }, 0);
  }, [loginState.success, closeLogin, router]);

  useEffect(() => {
    if (signupState.success !== "OK") return;

    closeLogin();
    router.refresh();

    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent("auth-login-success"));
    }, 0);
  }, [signupState.success, closeLogin, router]);

  useEffect(() => {
    if (!isOpen) {
      setMode("login");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
      onClick={closeLogin}
    >
      <div
        className="relative grid w-full max-w-4xl overflow-hidden rounded-3xl border bg-white shadow-xl lg:grid-cols-[1fr_1.05fr]"
        onClick={(event) => event.stopPropagation()}
      >
        {/* =====================================================
            Close
        ===================================================== */}
        <button
          type="button"
          onClick={closeLogin}
          className="absolute right-4 top-4 z-10 rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-black"
          aria-label="Schliessen"
        >
          ✕
        </button>

        {/* =====================================================
            Intro
        ===================================================== */}
        <section className="hidden border-r bg-gray-50 p-8 lg:flex lg:flex-col lg:justify-between">
          <div className="space-y-4">
            <span className="text-sm font-medium text-gray-500">
              Willkommen bei APP
            </span>

            <div className="space-y-3">
              <h1 className="text-4xl font-bold tracking-tight text-black">
                Qualität vor Quantität
              </h1>

              <p className="max-w-md text-sm leading-7 text-gray-600">
                Teile Gedanken, Erfahrungen und Erkenntnisse. APP ist von
                Menschen für Menschen.
              </p>
            </div>
          </div>

          <div className="grid gap-3">
            <InfoCard
              title="Hilfreiche Beiträge"
              text="Teile Dinge, die anderen im echten Leben helfen."
            />
            <InfoCard
              title="Echte Perspektiven"
              text="Persönliche Empfehlungen über generische Inhalte."
            />
            <InfoCard
              title="Starke Community"
              text="Beiträge mit Mehrwert statt leerer Aufmerksamkeit."
            />
          </div>
        </section>

        {/* =====================================================
            Form Area
        ===================================================== */}
        <section className="p-6 sm:p-8">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-6 space-y-3">
              <span className="text-sm font-medium text-gray-500">APP</span>
              <h2 className="text-3xl font-bold tracking-tight text-black">
                {mode === "login" ? "Einloggen" : "Registrieren"}
              </h2>
              <p className="text-sm leading-6 text-gray-600">
                {mode === "login"
                  ? "Melde dich an, um Beiträge zu erstellen, zu reagieren und Profilseiten zu nutzen."
                  : "Erstelle deinen Account, um Gedanken, Tipps und echte Erfahrungen zu teilen."}
              </p>
            </div>

            {/* =====================================================
                Tabs
            ===================================================== */}
            <div className="mb-6 grid grid-cols-2 rounded-2xl bg-gray-100 p-1">
              <button
                type="button"
                onClick={() => setMode("login")}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                  mode === "login"
                    ? "bg-white text-black shadow-sm"
                    : "text-gray-600 hover:text-black"
                }`}
              >
                Einloggen
              </button>

              <button
                type="button"
                onClick={() => setMode("signup")}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                  mode === "signup"
                    ? "bg-white text-black shadow-sm"
                    : "text-gray-600 hover:text-black"
                }`}
              >
                Registrieren
              </button>
            </div>

            {mode === "login" ? (
              <form action={loginFormAction} className="space-y-4">
                <input type="hidden" name="redirect" value={redirectPath} />

                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="login-email"
                    className="text-sm font-medium text-gray-700"
                  >
                    E-Mail
                  </label>
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    required
                    className="w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none transition focus:border-black"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="login-password"
                    className="text-sm font-medium text-gray-700"
                  >
                    Passwort
                  </label>
                  <input
                    id="login-password"
                    name="password"
                    type="password"
                    required
                    className="w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none transition focus:border-black"
                  />
                </div>

                {loginState.error && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {loginState.error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loginPending}
                  className="w-full rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
                >
                  {loginPending ? "Anmelden..." : "Einloggen"}
                </button>
              </form>
            ) : (
              <form action={signupFormAction} className="space-y-4">
                <input type="hidden" name="redirect" value={redirectPath} />

                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="signup-email"
                    className="text-sm font-medium text-gray-700"
                  >
                    E-Mail
                  </label>
                  <input
                    id="signup-email"
                    name="email"
                    type="email"
                    required
                    className="w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none transition focus:border-black"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="signup-password"
                    className="text-sm font-medium text-gray-700"
                  >
                    Passwort
                  </label>
                  <input
                    id="signup-password"
                    name="password"
                    type="password"
                    required
                    minLength={6}
                    className="w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none transition focus:border-black"
                  />
                  <p className="text-xs text-gray-500">
                    Mindestens 6 Zeichen.
                  </p>
                </div>

                {signupState.error && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {signupState.error}
                  </div>
                )}

                {signupState.success && signupState.success !== "OK" && (
                  <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                    {signupState.success}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={signupPending}
                  className="w-full rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
                >
                  {signupPending ? "Account wird erstellt..." : "Registrieren"}
                </button>
              </form>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

// =====================================================
// Helper Components
// =====================================================

type InfoCardProps = {
  title: string;
  text: string;
};

function InfoCard({ title, text }: InfoCardProps) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <h3 className="text-sm font-semibold text-black">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-gray-600">{text}</p>
    </div>
  );
}