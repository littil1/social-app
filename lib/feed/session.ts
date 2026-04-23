export const FEED_SESSION_COOKIE = "app_feed_session";
export const FEED_SESSION_MAX_AGE = 60 * 60 * 24;

export function hasFeedSessionCookie(value: string | undefined | null) {
  return typeof value === "string" && value.trim().length > 0;
}
