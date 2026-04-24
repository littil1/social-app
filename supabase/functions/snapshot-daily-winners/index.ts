/// <reference lib="deno.window" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { recomputeUserBadgeFamilies } from "../_shared/badges.ts";
import { snapshotDailyWinner } from "../_shared/daily-winner-snapshot.ts";
import { getPreviousZurichDayRange } from "../_shared/daily-ranking.ts";

function getCronSecretFromRequest(request: Request) {
  return (
    request.headers.get("x-cron-secret") ??
    request.headers.get("X-Cron-Secret") ??
    ""
  ).trim();
}

// Edge Functions run in Deno, so they keep local _shared copies instead of
// importing Next.js/server app modules that are not available in this runtime.
Deno.serve(async (request: Request) => {
  try {
    if (request.method !== "POST") {
      return Response.json(
        { error: "Method not allowed. Use POST." },
        { status: 405 }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const cronSecret = Deno.env.get("DAILY_WINNER_CRON_SECRET");

    if (!supabaseUrl || !serviceRoleKey || !cronSecret) {
      console.error(
        "[daily-winner-snapshot] Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or DAILY_WINNER_CRON_SECRET."
      );
      return Response.json(
        { error: "Missing required function environment variables." },
        { status: 500 }
      );
    }

    const requestSecret = getCronSecretFromRequest(request);

    if (!requestSecret || requestSecret !== cronSecret) {
      console.warn("[daily-winner-snapshot] Unauthorized cron invocation.");
      return Response.json({ error: "Unauthorized." }, { status: 401 });
    }

    const previousRange = getPreviousZurichDayRange(new Date());
    if (!previousRange) {
      console.error("[daily-winner-snapshot] Could not resolve Zurich day range.");
      return Response.json(
        { error: "Could not resolve Zurich day range." },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const result = await snapshotDailyWinner(supabase, {
      winnerDate: previousRange.dayKey,
      startIso: previousRange.startIso,
      endIso: previousRange.endIso,
      mode: "skip_if_exists",
      logger: console,
      onAffectedWinnerUser: async (userId) => {
        await recomputeUserBadgeFamilies(supabase, userId, ["legend"]);
      },
    });

    return Response.json(result, { status: 200 });
  } catch (error) {
    console.error("[daily-winner-snapshot] Snapshot failed:", error);

    return Response.json(
      {
        error: error instanceof Error ? error.message : "Snapshot failed.",
      },
      { status: 500 }
    );
  }
});
