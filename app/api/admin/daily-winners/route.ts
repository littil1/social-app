import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { recomputeUserBadgeFamilies } from "@/features/badges/lib";
import {
  getCurrentZurichDayStartIso,
  getPreviousZurichDayRange,
  getZurichDayKey,
  getZurichDayRangeForDayKey,
} from "@/features/winners/lib/daily-ranking";
import { snapshotDailyWinner } from "@/lib/daily-winner-snapshot";
import type { Database } from "@/shared/types/database";

const POST_PAGE_SIZE = 1000;

function getWinnerDateAndRange(input: string | null) {
  if (input) {
    const range = getZurichDayRangeForDayKey(input);

    return range
      ? {
          winnerDate: input,
          startIso: range.startIso,
          endIso: range.endIso,
        }
      : null;
  }

  const previousRange = getPreviousZurichDayRange(new Date());
  if (!previousRange) {
    return null;
  }

  return {
    winnerDate: previousRange.dayKey,
    startIso: previousRange.startIso,
    endIso: previousRange.endIso,
  };
}

function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase admin environment variables.");
  }

  return createSupabaseServiceClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function loadPreviousZurichDaysWithPosts(
  supabase: ReturnType<typeof createAdminClient>
) {
  const currentZurichDayStartIso = getCurrentZurichDayStartIso(new Date());
  const dayKeys = new Set<string>();
  let from = 0;

  while (true) {
    const to = from + POST_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("posts")
      .select("created_at")
      .lt("created_at", currentZurichDayStartIso)
      .order("created_at", { ascending: true })
      .range(from, to);

    if (error) {
      throw new Error(error.message);
    }

    for (const post of data ?? []) {
      dayKeys.add(getZurichDayKey(post.created_at));
    }

    if (!data || data.length < POST_PAGE_SIZE) {
      break;
    }

    from += POST_PAGE_SIZE;
  }

  return Array.from(dayKeys)
    .sort((a, b) => a.localeCompare(b))
    .map((dayKey) => {
      const range = getZurichDayRangeForDayKey(dayKey);

      if (!range) {
        throw new Error(`Invalid Zurich day key generated: ${dayKey}`);
      }

      return {
        winnerDate: dayKey,
        startIso: range.startIso,
        endIso: range.endIso,
      };
    });
}

export async function POST(request: NextRequest) {
  try {
    const userSupabase = await createClient();

    const {
      data: { user },
    } = await userSupabase.auth.getUser();

    if (!user) {
      return new NextResponse("Not signed in.", { status: 401 });
    }

    const { data: adminProfile, error: adminProfileError } = await userSupabase
      .from("profiles")
      .select("id, is_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (adminProfileError) {
      return new NextResponse(adminProfileError.message, { status: 500 });
    }

    if (!adminProfile?.is_admin) {
      return new NextResponse("Forbidden.", { status: 403 });
    }

    const supabase = createAdminClient();
    const isBackfill = request.nextUrl.searchParams.get("backfill") === "1";

    if (isBackfill) {
      const ranges = await loadPreviousZurichDaysWithPosts(supabase);
      const results = [];

      for (const range of ranges) {
        const result = await snapshotDailyWinner(supabase, {
          ...range,
          mode: "skip_if_exists",
          onAffectedWinnerUser: async (userId) => {
            await recomputeUserBadgeFamilies(supabase, userId, ["legend"]);
          },
        });

        results.push({
          winnerDate: result.winnerDate,
          status: result.status,
          inserted: result.status === "inserted" ? 1 : 0,
          skipped_existing: result.status === "skipped_existing" ? 1 : 0,
          cleared_no_posts: result.status === "cleared_no_posts" ? 1 : 0,
          replaced: result.status === "replaced" ? 1 : 0,
          existingRowCount: result.existingRowCount,
          winner: result.winner,
        });
      }

      return NextResponse.json({
        mode: "backfill",
        processed: results.length,
        inserted: results.reduce((total, item) => total + item.inserted, 0),
        skipped_existing: results.reduce(
          (total, item) => total + item.skipped_existing,
          0
        ),
        cleared_no_posts: results.reduce(
          (total, item) => total + item.cleared_no_posts,
          0
        ),
        replaced: results.reduce((total, item) => total + item.replaced, 0),
        results,
      });
    }

    const requestedDate = request.nextUrl.searchParams.get("date");
    const dateRange = getWinnerDateAndRange(requestedDate);

    if (!dateRange) {
      return new NextResponse("Invalid date. Expected: YYYY-MM-DD.", {
        status: 400,
      });
    }

    const { winnerDate, startIso, endIso } = dateRange;
    const result = await snapshotDailyWinner(supabase, {
      winnerDate,
      startIso,
      endIso,
      mode: "replace",
      onAffectedWinnerUser: async (userId) => {
        await recomputeUserBadgeFamilies(supabase, userId, ["legend"]);
      },
    });

    return NextResponse.json({
      mode: "single-day",
      winnerDate: result.winnerDate,
      status: result.status,
      inserted: result.status === "inserted" ? 1 : 0,
      skipped_existing: result.status === "skipped_existing" ? 1 : 0,
      cleared_no_posts: result.status === "cleared_no_posts" ? 1 : 0,
      replaced: result.status === "replaced" ? 1 : 0,
      existingRowCount: result.existingRowCount,
      winners: result.winner ? [result.winner] : [],
    });
  } catch (error) {
    console.error(error);
    return new NextResponse("Daily winners could not be computed.", {
      status: 500,
    });
  }
}


