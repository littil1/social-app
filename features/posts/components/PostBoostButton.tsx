"use client";

import { useEffect, useState } from "react";
import { useAuthModal } from "@/features/auth/components/AuthModalProvider";
import FormError from "@/shared/components/ui/FormError";
import {
  classifyAnalyticsError,
  getAnalyticsSource,
  trackEvent,
} from "@/shared/lib/analytics";

type BoostResponse = {
  boost_count?: number;
};

type PostBoostButtonProps = {
  postId: number;
  boostCount: number;
  viewerHasBoosted: boolean;
  viewerBoostAvailableToday: boolean;
  isTodayPost: boolean;
  canBoost: boolean;
  isLoggedIn: boolean;
  onBoosted?: (postId: number, boostCount: number) => void;
};

async function readSafeMessage(response: Response) {
  const message = await response.text();
  return message || "Couldn't BOOST this post. Try again.";
}

export default function PostBoostButton({
  postId,
  boostCount,
  viewerHasBoosted,
  viewerBoostAvailableToday,
  isTodayPost,
  canBoost,
  isLoggedIn,
  onBoosted,
}: PostBoostButtonProps) {
  const { requireLoginAndResume, isAuthenticated, authReady } = useAuthModal();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localBoostCount, setLocalBoostCount] = useState(boostCount);
  const [localHasBoosted, setLocalHasBoosted] = useState(viewerHasBoosted);
  const effectiveIsLoggedIn = authReady ? isAuthenticated : isLoggedIn;

  useEffect(() => {
    setLocalBoostCount(boostCount);
  }, [boostCount]);

  useEffect(() => {
    setLocalHasBoosted(viewerHasBoosted);
  }, [viewerHasBoosted]);

  if (!isTodayPost) {
    return null;
  }

  const boostUsed = localHasBoosted || !viewerBoostAvailableToday;
  const disabled = loading || localHasBoosted || (!canBoost && boostUsed);
  const label = localHasBoosted
    ? "🚀 BOOSTED"
    : viewerBoostAvailableToday
      ? "🚀 Daily BOOST available"
      : "🚀 Daily BOOST used";

  async function submitBoost() {
    if (loading || localHasBoosted) return;

    const source = getAnalyticsSource(window.location.pathname);
    trackEvent("boost_clicked", {
      source,
      state: localHasBoosted
        ? "boosted"
        : viewerBoostAvailableToday
          ? "available"
          : "already_used",
    });

    if (!effectiveIsLoggedIn) {
      requireLoginAndResume(
        () => void submitBoost(),
        window.location.pathname,
        "boost"
      );
      return;
    }

    if (!viewerBoostAvailableToday) {
      setError("You already used today's BOOST.");
      trackEvent("boost_failed", { reason: "rate_limited" });
      return;
    }

    setError(null);
    setLoading(true);
    let failureTracked = false;

    try {
      const response = await fetch(`/api/posts/${postId}/boost`, {
        method: "POST",
      });

      if (response.status === 401 || response.status === 403) {
        requireLoginAndResume(
          () => void submitBoost(),
          window.location.pathname,
          "boost"
        );
        return;
      }

      if (!response.ok) {
        trackEvent("boost_failed", {
          reason: classifyAnalyticsError(undefined, response.status),
        });
        failureTracked = true;
        throw new Error(await readSafeMessage(response));
      }

      const data = (await response.json()) as BoostResponse;
      const nextBoostCount = data.boost_count ?? localBoostCount + 1;

      setLocalHasBoosted(true);
      setLocalBoostCount(nextBoostCount);
      onBoosted?.(postId, nextBoostCount);
      trackEvent("boost_submitted", { source });
    } catch (boostError) {
      if (!failureTracked) {
        trackEvent("boost_failed", {
          reason: classifyAnalyticsError(boostError),
        });
      }
      setError(
        boostError instanceof Error
          ? boostError.message
          : "Couldn't BOOST this post. Try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <button
        type="button"
        onClick={() => void submitBoost()}
        disabled={disabled}
        title={
          localHasBoosted
            ? "You BOOSTED this post."
            : viewerBoostAvailableToday
              ? "BOOST adds +3 ECHO to today's ranking."
              : "You already used today's BOOST."
        }
        className={`motion-button inline-flex min-w-0 items-center justify-center rounded-full border px-3.5 py-2 text-xs font-black transition-all sm:px-4 sm:text-sm ${
          localHasBoosted
            ? "border-amber-200 bg-amber-100 text-amber-950 shadow-sm"
            : viewerBoostAvailableToday
              ? "border-amber-200 bg-white text-amber-900 shadow-sm hover:bg-amber-50"
              : "cursor-not-allowed border-neutral-200 bg-neutral-50 text-neutral-400"
        }`}
      >
        <span className="truncate">{loading ? "Boosting..." : label}</span>
        {localBoostCount > 0 && !localHasBoosted && (
          <span className="ml-2 rounded-full bg-amber-100 px-1.5 text-[10px] text-amber-900">
            {localBoostCount}
          </span>
        )}
      </button>
      {error && <FormError message={error} className="max-w-[220px]" />}
    </div>
  );
}
