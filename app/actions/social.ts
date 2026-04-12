"use server";

import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// =====================================================
// Auth & Session
// =====================================================

export async function logout() {
  const supabase = await createClient();

  // 1. Session in Supabase beenden
  await supabase.auth.signOut();

  // 2. Den Cache für die gesamte App löschen (wichtig für die NavBar)
  revalidatePath("/", "layout");
  
  // 3. Zur Homepage leiten und einen harten Reload erzwingen
  redirect("/");
}

// =====================================================
// Posts
// =====================================================

export async function createPost(formData: FormData) {
  const supabase = await createClient();

  // Check ob User eingeloggt ist
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const content = String(formData.get("content") ?? "").trim();

  if (!content || content.length > 500) {
    throw new Error("Content is required and must be under 500 characters.");
  }

  const { error } = await supabase.from("posts").insert({
    content,
    user_id: user.id,
  });

  if (error) throw new Error(error.message);

  // Cache aktualisieren, damit der neue Post sofort im Feed erscheint
  revalidatePath("/leaderboard");
  revalidatePath("/");
  
  return { success: true };
}

// =====================================================
// Follow System
// =====================================================

export async function toggleFollow(formData: FormData) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  // Falls nicht eingeloggt, zum Login schicken
  if (!user) redirect("/login");

  const targetUserId = String(formData.get("targetUserId") ?? "").trim();
  const path = String(formData.get("path") ?? "/").trim() || "/";

  if (!targetUserId || targetUserId === user.id) return;

  // Check ob Follow bereits existiert
  const { data: existingFollow, error: existingFollowError } = await supabase
    .from("follows")
    .select("id")
    .eq("follower_id", user.id)
    .eq("following_id", targetUserId)
    .maybeSingle();

  if (existingFollowError) throw new Error(existingFollowError.message);

  if (existingFollow) {
    // Unfollow
    const { error: deleteError } = await supabase
      .from("follows")
      .delete()
      .eq("id", existingFollow.id);

    if (deleteError) throw new Error(deleteError.message);
  } else {
    // Follow
    const { error: insertError } = await supabase.from("follows").insert({
      follower_id: user.id,
      following_id: targetUserId,
    });

    if (insertError) throw new Error(insertError.message);
  }

  // Die Seite aktualisieren, auf der man sich gerade befindet
  revalidatePath(path);
}