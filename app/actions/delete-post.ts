"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase-server";

export async function deletePost(postId: number) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Nicht eingeloggt.");
  }

  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("id, user_id")
    .eq("id", postId)
    .single();

  if (postError || !post) {
    throw new Error("Post nicht gefunden.");
  }

  if (post.user_id !== user.id) {
    throw new Error("Du darfst diesen Post nicht löschen.");
  }

  const { error: deleteError } = await supabase
    .from("posts")
    .delete()
    .eq("id", postId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  revalidatePath("/");
  revalidatePath("/explore");
}