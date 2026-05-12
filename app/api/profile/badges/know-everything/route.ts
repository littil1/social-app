import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { KNOW_EVERYTHING_BADGE_KEY } from "@/features/badges/lib/profile-badges";

function normalizeBadges(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(value.filter((item): item is string => typeof item === "string"))
  );
}

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new NextResponse("Not signed in.", { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, badges")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      return new NextResponse("Could not claim this badge. Try again.", {
        status: 500,
      });
    }

    if (!profile) {
      return new NextResponse("Profile not found.", { status: 404 });
    }

    const currentBadges = normalizeBadges(profile.badges);

    if (currentBadges.includes(KNOW_EVERYTHING_BADGE_KEY)) {
      return NextResponse.json({
        badges: currentBadges,
        claimed: false,
        alreadyClaimed: true,
      });
    }

    const nextBadges = [...currentBadges, KNOW_EVERYTHING_BADGE_KEY];
    const { data: updatedProfile, error: updateError } = await supabase
      .from("profiles")
      .update({ badges: nextBadges })
      .eq("id", user.id)
      .select("badges")
      .maybeSingle();

    if (updateError) {
      return new NextResponse("Could not claim this badge. Try again.", {
        status: 500,
      });
    }

    const persistedBadges = normalizeBadges(updatedProfile?.badges);

    if (!persistedBadges.includes(KNOW_EVERYTHING_BADGE_KEY)) {
      return new NextResponse("Could not claim this badge. Try again.", {
        status: 500,
      });
    }

    return NextResponse.json({
      badges: persistedBadges,
      claimed: true,
      alreadyClaimed: false,
    });
  } catch (error) {
    console.error(error);
    return new NextResponse("Could not claim this badge. Try again.", {
      status: 500,
    });
  }
}
