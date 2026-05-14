import {
  recomputeUserBadgeFamilies as recomputeUserBadgeFamiliesWithClient,
  type BadgeFamily,
} from "@/features/badges/lib";
import { createAdminClient } from "@/lib/supabase/admin";

export async function recomputeUserBadgeFamiliesWithAdmin(
  userId: string,
  families: BadgeFamily[]
) {
  const adminSupabase = createAdminClient();
  await recomputeUserBadgeFamiliesWithClient(adminSupabase, userId, families);
}

export async function safeRecomputeUserBadgeFamiliesWithAdmin(
  userId: string | null | undefined,
  families: BadgeFamily[],
  context: string
) {
  if (!userId) return;

  try {
    await recomputeUserBadgeFamiliesWithAdmin(userId, families);
  } catch (error) {
    console.error(`[badge-recompute] ${context} failed`, error);
  }
}
