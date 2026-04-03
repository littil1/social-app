"use server";

import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// =====================================================
// Auth
// =====================================================

export async function logout() {
  const supabase = await createClient();

  await supabase.auth.signOut();

  revalidatePath("/", "layout");
  redirect("/");
}

// =====================================================
// Follow
// =====================================================

export async function toggleFollow(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const targetUserId = String(formData.get("targetUserId") ?? "").trim();
  const path = String(formData.get("path") ?? "/").trim() || "/";

  if (!targetUserId) {
    return;
  }

  if (targetUserId === user.id) {
    return;
  }

  const { data: existingFollow, error: existingFollowError } = await supabase
    .from("follows")
    .select("id")
    .eq("follower_id", user.id)
    .eq("following_id", targetUserId)
    .maybeSingle();

  if (existingFollowError) {
    throw new Error(existingFollowError.message);
  }

  if (existingFollow) {
    const { error: deleteError } = await supabase
      .from("follows")
      .delete()
      .eq("id", existingFollow.id);

    if (deleteError) {
      throw new Error(deleteError.message);
    }
  } else {
    const { error: insertError } = await supabase.from("follows").insert({
      follower_id: user.id,
      following_id: targetUserId,
    });

    if (insertError) {
      throw new Error(insertError.message);
    }
  }

  revalidatePath(path);
}