import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  FEED_SESSION_COOKIE,
  FEED_SESSION_MAX_AGE,
  hasFeedSessionCookie,
} from "@/lib/feed/session";

function isPrefetchRequest(request: NextRequest) {
  return (
    request.headers.has("next-router-prefetch") ||
    request.headers.get("purpose")?.toLowerCase() === "prefetch"
  );
}

function isFeedSessionRequest(request: NextRequest) {
  return request.method === "GET" && !isPrefetchRequest(request);
}

export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const sessionId = request.cookies.get(FEED_SESSION_COOKIE)?.value;

  if (!hasFeedSessionCookie(sessionId) && isFeedSessionRequest(request)) {
    response.cookies.set({
      name: FEED_SESSION_COOKIE,
      value: crypto.randomUUID(),
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: FEED_SESSION_MAX_AGE,
      secure: request.nextUrl.protocol === "https:",
    });
  }

  return response;
}

export const config = {
  matcher: ["/", "/leaderboard"],
};

