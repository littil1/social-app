"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase-server";

function revalidateMany(paths: Array<string | null | undefined>) {
  const uniquePaths = [...new Set(paths.filter(Boolean))] as string[];

  for (const path of uniquePaths) {
    revalidatePath(path);
  }
}

export async function addFeatureRequest(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!user || title.length < 3 || description.length < 3) return;

  await supabase.from("feature_requests").insert([
    {
      title,
      description,
      user_id: user.id,
      status: "open",
    },
  ]);

  revalidateMany(["/feedback"]);
}

export async function deleteFeatureRequest(formData: FormData) {
  const supabase = await createClient();

  const requestId = Number(formData.get("request_id"));

  if (!requestId) return;

  await supabase.from("feature_requests").delete().eq("id", requestId);

  revalidateMany(["/feedback"]);
}

export async function toggleFeatureRequestLike(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const requestId = Number(formData.get("request_id"));

  if (!user || !requestId) return;

  const { data: existingLike } = await supabase
    .from("feature_request_likes")
    .select("id")
    .eq("feature_request_id", requestId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingLike) {
    await supabase
      .from("feature_request_likes")
      .delete()
      .eq("feature_request_id", requestId)
      .eq("user_id", user.id);
  } else {
    await supabase.from("feature_request_likes").insert([
      {
        feature_request_id: requestId,
        user_id: user.id,
      },
    ]);
  }

  revalidateMany(["/feedback"]);
}

export async function addFeatureRequestComment(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const requestId = Number(formData.get("request_id"));
  const content = String(formData.get("content") ?? "").trim();

  if (!user || !requestId || content.length < 1 || content.length > 500) return;

  await supabase.from("feature_request_comments").insert([
    {
      feature_request_id: requestId,
      user_id: user.id,
      content,
    },
  ]);

  revalidateMany(["/feedback"]);
}

export async function deleteFeatureRequestComment(formData: FormData) {
  const supabase = await createClient();

  const commentId = Number(formData.get("comment_id"));

  if (!commentId) return;

  await supabase.from("feature_request_comments").delete().eq("id", commentId);

  revalidateMany(["/feedback"]);
}