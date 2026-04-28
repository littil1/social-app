"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { recomputeUserBadgeFamilies } from "@/features/badges/lib";
import type { Database } from "@/shared/types/database";

function revalidateMany(paths: Array<string | null | undefined>) {
  const uniquePaths = [...new Set(paths.filter(Boolean))] as string[];

  for (const path of uniquePaths) {
    revalidatePath(path);
  }
}

async function isCurrentUserAdmin(
  supabase: SupabaseClient<Database>,
  userId: string
) {
  const { data } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();

  return !!data?.is_admin;
}

async function getProfileUsernameByUserId(
  supabase: SupabaseClient<Database>,
  userId: string | null
) {
  if (!userId) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", userId)
    .maybeSingle();

  return profile?.username ?? null;
}

async function getFeatureRequestAuthorInfo(
  supabase: SupabaseClient<Database>,
  requestId: number
) {
  const { data: request } = await supabase
    .from("feature_requests")
    .select("user_id")
    .eq("id", requestId)
    .maybeSingle();

  if (!request?.user_id) {
    return {
      authorId: null,
      authorUsername: null,
    };
  }

  const authorUsername = await getProfileUsernameByUserId(
    supabase,
    request.user_id
  );

  return {
    authorId: request.user_id as string,
    authorUsername,
  };
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

  await recomputeUserBadgeFamilies(supabase, user.id, ["contributor"]);

  const ownUsername = await getProfileUsernameByUserId(supabase, user.id);

  revalidateMany(["/feedback", ownUsername ? `/u/${ownUsername}` : null]);
}

export async function deleteFeatureRequest(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const requestId = Number(formData.get("request_id"));

  if (!user || !requestId) return;

  const { authorId, authorUsername } = await getFeatureRequestAuthorInfo(
    supabase,
    requestId
  );

  const isAdmin = await isCurrentUserAdmin(supabase, user.id);
  if (!isAdmin && authorId !== user.id) return;

  let deleteRequestQuery = supabase
    .from("feature_requests")
    .delete()
    .eq("id", requestId);

  if (!isAdmin) {
    deleteRequestQuery = deleteRequestQuery.eq("user_id", user.id);
  }

  await deleteRequestQuery;

  if (authorId) {
    await recomputeUserBadgeFamilies(supabase, authorId, [
      "contributor",
      "builder",
      "most_discussed",
    ]);
  }

  revalidateMany([
    "/",
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

  const rawParentId = formData.get("parent_id");
  const parentId =
    rawParentId === null || String(rawParentId).trim() === ""
      ? null
      : Number(rawParentId);

  if (!user || !requestId || content.length < 1 || content.length > 500) return;
  if (parentId !== null && !Number.isFinite(parentId)) return;

  const { authorId, authorUsername } = await getFeatureRequestAuthorInfo(
    supabase,
    requestId
  );

  await supabase.from("feature_request_comments").insert([
    {
      feature_request_id: requestId,
      user_id: user.id,
      content,
      parent_id: parentId,
    },
  ]);

  await recomputeUserBadgeFamilies(supabase, user.id, [
    "top_commentator",
  ]);

  if (authorId) {
    await recomputeUserBadgeFamilies(supabase, authorId, [
      "most_discussed",
    ]);
  }

  const ownUsername = await getProfileUsernameByUserId(supabase, user.id);

  revalidateMany([
    "/feedback",
    ownUsername ? `/u/${ownUsername}` : null,
    authorUsername ? `/u/${authorUsername}` : null,
  ]);
}

export async function deleteFeatureRequestComment(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const commentId = Number(formData.get("comment_id"));

  if (!user || !commentId) return;

  const { data: comment } = await supabase
    .from("feature_request_comments")
    .select("id, user_id, feature_request_id")
    .eq("id", commentId)
    .maybeSingle();

  if (!comment) return;

  const isAdmin = await isCurrentUserAdmin(supabase, user.id);
  if (!isAdmin && comment.user_id !== user.id) return;

  const { authorId, authorUsername } = await getFeatureRequestAuthorInfo(
    supabase,
    comment.feature_request_id
  );

  const deletedCommentAuthorUsername = await getProfileUsernameByUserId(
    supabase,
    comment.user_id
  );

  let deleteCommentQuery = supabase
    .from("feature_request_comments")
    .delete()
    .eq("id", commentId);

  if (!isAdmin) {
    deleteCommentQuery = deleteCommentQuery.eq("user_id", user.id);
  }

  await deleteCommentQuery;

  if (comment.user_id) {
    await recomputeUserBadgeFamilies(supabase, comment.user_id, [
      "top_commentator",
    ]);
  }

  if (authorId) {
    await recomputeUserBadgeFamilies(supabase, authorId, [
      "most_discussed",
    ]);
  }

  revalidateMany([
    "/feedback",
    deletedCommentAuthorUsername
      ? `/u/${deletedCommentAuthorUsername}`
      : null,
    authorUsername ? `/u/${authorUsername}` : null,
  ]);
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

  const { authorId, authorUsername } = await getFeatureRequestAuthorInfo(
    supabase,
    requestId
  );

  await supabase
    .from("feature_requests")
    .update({
      status,
      implemented_at:
        status === "implemented" ? new Date().toISOString() : null,
    })
    .eq("id", requestId);

  if (authorId) {
    await recomputeUserBadgeFamilies(supabase, authorId, ["builder"]);
  }

  revalidateMany([
    "/",
    "/feedback",
    authorUsername ? `/u/${authorUsername}` : null,
  ]);
}

