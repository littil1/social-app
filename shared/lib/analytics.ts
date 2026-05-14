"use client";

import posthog from "posthog-js";

type AnalyticsPrimitive = string | number | boolean | null;
type AnalyticsProperties = Record<string, unknown>;
type SafeAnalyticsProperties = Record<string, AnalyticsPrimitive>;
type AnalyticsFailureReason =
  | "validation"
  | "auth"
  | "rate_limited"
  | "network"
  | "unknown";

const SAFE_PROPERTY_KEYS = new Set([
  "area",
  "confirmation_required",
  "content_length",
  "depth",
  "is_anonymous",
  "path",
  "reason",
  "reason_category",
  "reaction_type",
  "source",
  "state",
  "status",
  "target",
  "target_type",
  "title_length",
]);

const SENSITIVE_KEY_PARTS = [
  "avatar",
  "bio",
  "comment_id",
  "description",
  "details",
  "email",
  "error",
  "id",
  "idea_id",
  "message",
  "post_id",
  "text",
  "token",
  "url",
  "user",
  "username",
];

let analyticsInitialized = false;

function hasPostHogConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN &&
      process.env.NEXT_PUBLIC_POSTHOG_HOST
  );
}

function isProduction() {
  return process.env.NODE_ENV === "production";
}

export function initAnalytics() {
  if (analyticsInitialized || typeof window === "undefined") return;
  if (!hasPostHogConfig() || !isProduction()) return;

  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN as string, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    disable_session_recording: true,
  });
  analyticsInitialized = true;
}

export function isAnalyticsReady() {
  return analyticsInitialized && hasPostHogConfig();
}

export function sanitizeAnalyticsProperties(
  properties: AnalyticsProperties = {}
): SafeAnalyticsProperties {
  const safeProperties: SafeAnalyticsProperties = {};

  for (const [key, value] of Object.entries(properties)) {
    const normalizedKey = key.toLowerCase();
    const hasSensitiveKey = SENSITIVE_KEY_PARTS.some((part) =>
      normalizedKey.includes(part)
    );

    if (hasSensitiveKey || !SAFE_PROPERTY_KEYS.has(key)) {
      continue;
    }

    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null
    ) {
      safeProperties[key] = value;
    }
  }

  return safeProperties;
}

export function trackEvent(
  eventName: string,
  properties: AnalyticsProperties = {}
) {
  if (!isAnalyticsReady()) return;
  posthog.capture(eventName, sanitizeAnalyticsProperties(properties));
}

export function trackPageView(path: string) {
  const safePath = path.split("?")[0]?.split("#")[0] || "/";

  trackEvent("page_viewed", {
    path: safePath,
    area: getAnalyticsArea(safePath),
  });
}

export function identifyAnalyticsUser(userId: string | null | undefined) {
  if (!userId || !isAnalyticsReady()) return;
  posthog.identify(userId);
}

export function resetAnalyticsUser() {
  if (!isAnalyticsReady()) return;
  posthog.reset();
}

export function getAnalyticsArea(path: string) {
  if (path === "/live" || path.startsWith("/posts/")) return "live";
  if (path === "/legends" || path === "/hall-of-fame") return "legends";
  if (path === "/input/road") return "road";
  if (path === "/input") return "input";
  if (path === "/vibe") return "vibe";
  if (path.startsWith("/u/") || path === "/me") return "profile";
  if (path.startsWith("/settings")) return "settings";
  if (path.startsWith("/admin")) return "admin";
  if (["/privacy", "/terms", "/imprint"].includes(path)) return "legal";
  return "other";
}

export function getAnalyticsSource(path: string) {
  const area = getAnalyticsArea(path);
  if (area === "live" || area === "profile" || area === "legends") return area;
  if (area === "road") return "input";
  if (area === "input" || area === "vibe") return area;
  return "unknown";
}

export function classifyAnalyticsError(
  error?: unknown,
  status?: number
): AnalyticsFailureReason {
  if (status === 401 || status === 403) return "auth";
  if (status === 429) return "rate_limited";

  if (error instanceof TypeError) {
    return "network";
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes("validation") || message.includes("write ")) {
      return "validation";
    }
    if (message.includes("auth") || message.includes("sign-in")) {
      return "auth";
    }
    if (message.includes("rate") || message.includes("limit")) {
      return "rate_limited";
    }
    if (message.includes("network") || message.includes("fetch")) {
      return "network";
    }
  }

  return "unknown";
}
