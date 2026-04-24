"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuthModal } from "@/features/auth/components/AuthModalProvider";

const LOGIN_NUDGE_SESSION_KEY = "app_leaderboard_login_nudge_seen";
const LOGIN_NUDGE_DELAY_MS = 50000;

export default function LoginCta() {
  const pathname = usePathname();
  const { openLogin } = useAuthModal();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const alreadySeen =
      window.sessionStorage.getItem(LOGIN_NUDGE_SESSION_KEY) === "true";

    if (alreadySeen) {
      return;
    }

    const timer = window.setTimeout(() => {
      window.sessionStorage.setItem(LOGIN_NUDGE_SESSION_KEY, "true");
      setVisible(true);
    }, LOGIN_NUDGE_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  function handleDismiss() {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(LOGIN_NUDGE_SESSION_KEY, "true");
    }

    setVisible(false);
  }

  function handleOpenLogin() {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(LOGIN_NUDGE_SESSION_KEY, "true");
    }

    setVisible(false);
    openLogin(pathname || "/leaderboard");
  }

  if (!visible) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-40 px-4 sm:bottom-24">
      <div className="mx-auto flex max-w-sm justify-center sm:justify-end">
        <div className="pointer-events-auto relative w-full overflow-hidden rounded-[28px] border border-white/60 bg-white/90 p-4 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.22)] backdrop-blur-xl sm:max-w-[22rem]">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-8 top-0 h-24 w-24 rounded-full bg-amber-100/70 blur-3xl" />
            <div className="absolute bottom-0 right-0 h-24 w-24 rounded-full bg-sky-100/70 blur-3xl" />
          </div>

          <div className="relative">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">
                  Spectator Mode
                </p>
                <h3 className="mt-2 text-lg font-black tracking-tight text-neutral-950">
                  Join the race.
                </h3>
                <p className="mt-2 text-sm leading-6 text-neutral-500">
                  Create your profile to post, react, and climb into the Hall.
                </p>
              </div>

              <button
                type="button"
                onClick={handleDismiss}
                className="shrink-0 rounded-full p-2 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
                aria-label="Dismiss login prompt"
              >
                ×
              </button>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenLogin}
                className="rounded-full bg-neutral-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-neutral-800 active:scale-[0.98]"
              >
                Create your profile
              </button>

              <button
                type="button"
                onClick={handleDismiss}
                className="rounded-full px-3 py-2 text-sm font-medium text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-700"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
