"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";

function revalidateMany(paths: Array<string | null | undefined>) {
  const uniquePaths = [...new Set(paths.filter(Boolean))] as string[];

  for (const path of uniquePaths) {
    revalidatePath(path);
  }
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function addPost(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const content = String(formData.get("content") ?? "").trim();
  const path = String(formData.get("path") ?? "/");
  const viewerUsername = String(formData.get("viewer_username") ?? "");

  if (!user || content.length < 2) return;

  await supabase.from("posts").insert([
    {
      content,
      user_id: user.id,
    },
  ]);

  revalidateMany([
    "/",
    "/explore",
    path,
    viewerUsername ? `/u/${viewerUsername}` : null,
  ]);
}

export async function deletePost(formData: FormData) {
  const supabase = await createClient();

  const id = Number(formData.get("id"));
  const path = String(formData.get("path") ?? "/");
  const authorUsername = String(formData.get("author_username") ?? "");

  if (!id) return;

  await supabase.from("posts").delete().eq("id", id);
  await supabase.from("likes").delete().eq("post_id", id);

  revalidateMany([
    "/",
    "/explore",
    path,
    authorUsername ? `/u/${authorUsername}` : null,
  ]);
}

export async function likePost(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const postId = Number(formData.get("postId"));
  const path = String(formData.get("path") ?? "/");
  const authorUsername = String(formData.get("author_username") ?? "");

  if (!postId || !user) return;

  const { data: existingLike } = await supabase
    .from("likes")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingLike) {
    await supabase
      .from("likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", user.id);
  } else {
    await supabase.from("likes").insert([
      {
        post_id: postId,
        user_id: user.id,
      },
    ]);
  }

  revalidateMany([
    "/",
    "/explore",
    path,
    authorUsername ? `/u/${authorUsername}` : null,
  ]);
}

export async function addComment(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const postId = Number(formData.get("post_id"));
  const content = String(formData.get("content") ?? "").trim();
  const path = String(formData.get("path") ?? "/");
  const authorUsername = String(formData.get("author_username") ?? "");

  if (!user || !postId || content.length < 1 || content.length > 280) return;

  await supabase.from("comments").insert([
    {
      post_id: postId,
      user_id: user.id,
      content,
    },
  ]);

  revalidateMany([
    "/",
    "/explore",
    path,
    authorUsername ? `/u/${authorUsername}` : null,
  ]);
}

export async function deleteComment(formData: FormData) {
  const supabase = await createClient();

  const commentId = Number(formData.get("comment_id"));
  const path = String(formData.get("path") ?? "/");
  const authorUsername = String(formData.get("author_username") ?? "");

  if (!commentId) return;

  await supabase.from("comments").delete().eq("id", commentId);

  revalidateMany([
    "/",
    "/explore",
    path,
    authorUsername ? `/u/${authorUsername}` : null,
  ]);
}

export async function toggleFollow(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const targetUserId = String(formData.get("target_user_id") ?? "");
  const targetUsername = String(formData.get("target_username") ?? "");
  const path = String(formData.get("path") ?? "/");

  if (!user || !targetUserId || user.id === targetUserId) return;

  const { data: existingFollow } = await supabase
    .from("follows")
    .select("id")
    .eq("follower_id", user.id)
    .eq("following_id", targetUserId)
    .maybeSingle();

  if (existingFollow) {
    await supabase
      .from("follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("following_id", targetUserId);
  } else {
    await supabase.from("follows").insert([
      {
        follower_id: user.id,
        following_id: targetUserId,
      },
    ]);
  }

  revalidateMany([
    "/",
    "/explore",
    path,
    targetUsername ? `/u/${targetUsername}` : null,
  ]);
}