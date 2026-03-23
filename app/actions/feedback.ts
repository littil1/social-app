"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase-server";

function revalidateMany(paths: Array<string | null | undefined>) {
  const uniquePaths = [...new Set(paths.filter(Boolean))] as string[];

  for (const path of uniquePaths) {
    revalidatePath(path);
  }
}

async function isCurrentUserAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();

  return !!data?.is_admin;
}

async function getFeatureRequestAuthorUsername(supabase: any, requestId: number) {
  const { data: request } = await supabase
    .from("feature_requests")
    .select("user_id")
    .eq("id", requestId)
    .maybeSingle();

  if (!request?.user_id) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", request.user_id)
    .maybeSingle();

  return profile?.username ?? null;
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

  const authorUsername = await getFeatureRequestAuthorUsername(supabase, requestId);

  await supabase.from("feature_requests").delete().eq("id", requestId);

  revalidateMany([
    "/",
    "/explore",
    "/following",
    "/feedback",
    authorUsername ? `/u/${authorUsername}` : null,
  ]);
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

export async function updateFeatureRequestStatus(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const requestId = Number(formData.get("request_id"));
  const status = String(formData.get("status") ?? "");

  if (!user || !requestId) return;
  if (status !== "open" && status !== "implemented") return;

  const isAdmin = await isCurrentUserAdmin(supabase, user.id);
  if (!isAdmin) return;

  const authorUsername = await getFeatureRequestAuthorUsername(supabase, requestId);

  await supabase
    .from("feature_requests")
    .update({
      status,
      implemented_at: status === "implemented" ? new Date().toISOString() : null,
    })
    .eq("id", requestId);

  revalidateMany([
    "/",
    "/explore",
    "/following",
    "/feedback",
    authorUsername ? `/u/${authorUsername}` : null,
  ]);
}