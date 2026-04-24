import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  ALL_BADGE_FAMILIES,
  recomputeUserBadgeFamilies,
} from "@/features/badges/lib";
import { getUserBadges } from "@/features/badges/lib/getUserBadges";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type RequestBody = {
  families?: unknown;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id: targetUserId } = await context.params;

    if (!targetUserId) {
      return new NextResponse("Invalid user ID.", { status: 400 });
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new NextResponse("Not signed in.", { status: 401 });
    }

    const { data: adminProfile, error: adminProfileError } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (adminProfileError) {
      return new NextResponse(adminProfileError.message, { status: 500 });
    }

    if (!adminProfile?.is_admin) {
      return new NextResponse("Forbidden.", { status: 403 });
    }

    const { data: targetProfile, error: targetProfileError } = await supabase
      .from("profiles")
      .select("id, username")
      .eq("id", targetUserId)
      .maybeSingle();

    if (targetProfileError) {
      return new NextResponse(targetProfileError.message, { status: 500 });
    }

    if (!targetProfile) {
      return new NextResponse("Profile not found.", { status: 404 });
    }

    const body = (await request.json().catch(() => null)) as RequestBody | null;
    const requestedFamilies = Array.isArray(body?.families)
      ? body.families.filter(
          (family): family is (typeof ALL_BADGE_FAMILIES)[number] =>
            typeof family === "string" &&
            ALL_BADGE_FAMILIES.includes(
              family as (typeof ALL_BADGE_FAMILIES)[number]
            )
        )
      : [];

    const familiesToRecompute =
      requestedFamilies.length > 0 ? requestedFamilies : [...ALL_BADGE_FAMILIES];

    await recomputeUserBadgeFamilies(
      supabase as any,
      targetUserId,
      familiesToRecompute
    );

    const badges = (await getUserBadges([targetUserId])).get(targetUserId) ?? [];

    return NextResponse.json({
      success: true,
      user: {
        id: targetProfile.id,
        username: targetProfile.username,
      },
      families: familiesToRecompute,
      badges,
    });
  } catch (error) {
    console.error(error);
    return new NextResponse("Badge recompute failed.", {
      status: 500,
    });
  }
}


