"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuthModal } from "@/features/auth/components/AuthModalProvider";

const LOGIN_NUDGE_SESSION_KEY = "app_leaderboard_login_nudge_seen";
const LOGIN_NUDGE_STARTED_AT_KEY = "app_leaderboard_login_nudge_started_at";
const LOGIN_NUDGE_ENGAGEMENT_KEY = "app_leaderboard_login_nudge_engagement";
const LOGIN_NUDGE_DELAY_MS = 60000;
const LOGIN_NUDGE_MIN_ENGAGEMENT_DELAY_MS = 15000;
const LOGIN_NUDGE_ENGAGEMENT_COUNT = 4;
const LOGIN_NUDGE_RETRY_MS = 5000;

function isUserTyping() {
  const activeElement = document.activeElement;

  if (!activeElement) return false;
  if (activeElement instanceof HTMLInputElement) return true;
  if (activeElement instanceof HTMLTextAreaElement) return true;
  if (activeElement instanceof HTMLSelectElement) return true;

  return activeElement.getAttribute("contenteditable") === "true";
}

function isAnotherModalOpen() {
  return !!document.querySelector('[data-modal-open="true"], [role="dialog"]');
}

export default function LoginCta() {
  const pathname = usePathname();
  const { authReady, isAuthenticated, isOpen, openLogin } = useAuthModal();
  const retryTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!authReady || isAuthenticated) return;
    if (window.sessionStorage.getItem(LOGIN_NUDGE_SESSION_KEY) === "true") {
      return;
    }

    const storedStartedAt = Number(
      window.sessionStorage.getItem(LOGIN_NUDGE_STARTED_AT_KEY)
    );
    const startedAt = Number.isFinite(storedStartedAt) && storedStartedAt > 0
      ? storedStartedAt
      : Date.now();

    if (!storedStartedAt) {
      window.sessionStorage.setItem(
        LOGIN_NUDGE_STARTED_AT_KEY,
        String(startedAt)
      );
    }

    function clearRetryTimer() {
      if (retryTimerRef.current === null) return;
      window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    function tryOpenLoginNudge() {
      if (window.sessionStorage.getItem(LOGIN_NUDGE_SESSION_KEY) === "true") {
        clearRetryTimer();
        return;
      }

      if (isOpen || isUserTyping() || isAnotherModalOpen()) {
        if (retryTimerRef.current === null) {
          retryTimerRef.current = window.setTimeout(() => {
            retryTimerRef.current = null;
            tryOpenLoginNudge();
          }, LOGIN_NUDGE_RETRY_MS);
        }
        return;
      }

      window.sessionStorage.setItem(LOGIN_NUDGE_SESSION_KEY, "true");
      openLogin(pathname || "/leaderboard");
      clearRetryTimer();
    }

    function handleEngagement(event: Event) {
      const elapsed = Date.now() - startedAt;
      if (elapsed < LOGIN_NUDGE_MIN_ENGAGEMENT_DELAY_MS) return;

      if (event.target instanceof HTMLElement) {
        const tagName = event.target.tagName.toLowerCase();
        if (
          tagName === "input" ||
          tagName === "textarea" ||
          tagName === "select" ||
          event.target.isContentEditable
        ) {
          return;
        }
      }

      const currentCount = Number(
        window.sessionStorage.getItem(LOGIN_NUDGE_ENGAGEMENT_KEY) ?? "0"
      );
      const nextCount = Number.isFinite(currentCount) ? currentCount + 1 : 1;
      window.sessionStorage.setItem(
        LOGIN_NUDGE_ENGAGEMENT_KEY,
        String(nextCount)
      );

      if (nextCount >= LOGIN_NUDGE_ENGAGEMENT_COUNT) {
        tryOpenLoginNudge();
      }
    }

    const remainingDelay = Math.max(
      0,
      startedAt + LOGIN_NUDGE_DELAY_MS - Date.now()
    );
    const timer = window.setTimeout(
      tryOpenLoginNudge,
      remainingDelay
    );

    window.addEventListener("pointerdown", handleEngagement, {
      passive: true,
    });
    window.addEventListener("scroll", handleEngagement, { passive: true });
    window.addEventListener("keydown", handleEngagement);

    return () => {
      window.clearTimeout(timer);
      clearRetryTimer();
      window.removeEventListener("pointerdown", handleEngagement);
      window.removeEventListener("scroll", handleEngagement);
      window.removeEventListener("keydown", handleEngagement);
    };
  }, [authReady, isAuthenticated, isOpen, openLogin, pathname]);

  return null;
}
