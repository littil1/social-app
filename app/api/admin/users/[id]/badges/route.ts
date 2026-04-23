import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  PROFILE_BADGE_KEYS,
  type ProfileBadgeKey,
} from "@/features/badges/lib/profile-badges";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type RequestBody = {
  action?: "add" | "remove";
  badge?: string;
};

function normalizeBadges(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(value.filter((item): item is string => typeof item === "string"))
  );
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id: targetUserId } = await context.params;

    if (!targetUserId) {
      return new NextResponse("Ungültige User-ID.", { status: 400 });
    }

    const body = (await request.json()) as RequestBody;
    const action = body.action;
    const badge = body.badge;

    if (action !== "add" && action !== "remove") {
      return new NextResponse("Ungültige Aktion.", { status: 400 });
    }

    if (!badge || !PROFILE_BADGE_KEYS.includes(badge as ProfileBadgeKey)) {
      return new NextResponse("Ungültiges Badge.", { status: 400 });
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new NextResponse("Nicht eingeloggt.", { status: 401 });
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
      return new NextResponse("Keine Berechtigung.", { status: 403 });
    }

    const { data: targetProfile, error: targetProfileError } = await supabase
      .from("profiles")
      .select("id, badges")
      .eq("id", targetUserId)
      .maybeSingle();

    if (targetProfileError) {
      return new NextResponse(targetProfileError.message, { status: 500 });
    }

    if (!targetProfile) {
      return new NextResponse("Profil nicht gefunden.", { status: 404 });
    }

    const currentBadges = normalizeBadges(targetProfile.badges);

    let nextBadges = currentBadges;

    if (action === "add") {
      nextBadges = Array.from(new Set([...currentBadges, badge]));
    }

    if (action === "remove") {
      nextBadges = currentBadges.filter((item) => item !== badge);
    }

    const { data: updatedProfile, error: updateError } = await supabase
      .from("profiles")
      .update({ badges: nextBadges })
      .eq("id", targetUserId)
      .select("badges")
      .maybeSingle();

    if (updateError) {
      return new NextResponse(updateError.message, { status: 500 });
    }

    const persistedBadges = normalizeBadges(updatedProfile?.badges);

    return NextResponse.json({
      badges:
        persistedBadges.length > 0 || nextBadges.length === 0
          ? persistedBadges
          : nextBadges,
    });
  } catch (error) {
    console.error(error);
    return new NextResponse("Badge konnte nicht aktualisiert werden.", {
      status: 500,
    });
  }
}

