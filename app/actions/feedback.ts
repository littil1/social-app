"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { recomputeUserBadgeFamilies } from "@/features/badges/lib";
import type { Database } from "@/shared/types/database";
import {
  checkRateLimit,
  getActorRateLimitKey,
} from "@/lib/rate-limit";

export type RoadAchievementState = {
  error: string | null;
  success: string | null;
};

const initialRoadAchievementState: RoadAchievementState = {
  error: null,
  success: null,
};

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

function normalizeOptionalText(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeRoadStatus(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "DEPLOYED")
    .trim()
    .toUpperCase();

  return normalized.length > 0 ? normalized : "DEPLOYED";
}

export async function addFeatureRequest(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!user || title.length < 3 || description.length < 3) return;

  const rateLimit = checkRateLimit({
    key: await getActorRateLimitKey("feedback-idea", user.id),
    limit: 3,
    windowMs: 60 * 60 * 1000,
  });

  if (!rateLimit.allowed) return;

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

  revalidateMany(["/input", ownUsername ? `/u/${ownUsername}` : null]);
}

export async function deleteFeatureRequest(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const requestId = Number(formData.get("request_id"));

  if (!user || !requestId) return;

  const rateLimit = checkRateLimit({
    key: await getActorRateLimitKey("reaction", user.id),
    limit: 100,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.allowed) return;

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
    "/input",
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

  revalidateMany(["/input"]);
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

  const rateLimit = checkRateLimit({
    key: await getActorRateLimitKey("create-comment", user.id),
    limit: 20,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.allowed) return;

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
    "/input",
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
    "/input",
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
    "/input",
    authorUsername ? `/u/${authorUsername}` : null,
  ]);
}

export async function saveRoadAchievement(
  _prevState: RoadAchievementState,
  formData: FormData
): Promise<RoadAchievementState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: "Sign in to manage Road achievements.",
      success: null,
    };
  }

  const isAdmin = await isCurrentUserAdmin(supabase, user.id);
  if (!isAdmin) {
    return {
      error: "Only admins can manage Road achievements.",
      success: null,
    };
  }

  const requestId = Number(formData.get("request_id"));
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const status = normalizeRoadStatus(formData.get("status"));
  const icon = normalizeOptionalText(formData.get("icon"));
  const imageUrl = normalizeOptionalText(formData.get("image_url"));
  const rawSortOrder = normalizeOptionalText(formData.get("sort_order"));
  const sortOrder = rawSortOrder === null ? null : Number(rawSortOrder);
  const isPublished = formData.get("is_published") === "on";

  if (!requestId) {
    return { error: "Choose an INPUT idea first.", success: null };
  }

  if (title.length < 3) {
    return { error: "Add a Road title.", success: null };
  }

  if (description.length < 8) {
    return {
      error: "Add a short Road description.",
      success: null,
    };
  }

  if (rawSortOrder !== null && !Number.isFinite(Number(rawSortOrder))) {
    return {
      error: "Sort order must be a number.",
      success: null,
    };
  }

  const { data: request, error: requestError } = await supabase
    .from("feature_requests")
    .select("id, title, description, user_id, status, implemented_at")
    .eq("id", requestId)
    .maybeSingle();

  if (requestError || !request) {
    return {
      error: "Could not load this INPUT idea. Try again.",
      success: null,
    };
  }

  if (request.status !== "implemented") {
    return {
      error: "Only deployed INPUT ideas can become Road achievements.",
      success: null,
    };
  }

  const sourceUsername = await getProfileUsernameByUserId(
    supabase,
    request.user_id
  );

  const achievementPayload = {
    source_feature_request_id: requestId,
    title,
    description,
    status,
    icon,
    image_url: imageUrl,
    source_user_id: request.user_id,
    source_user_username_snapshot: sourceUsername ?? "deleted user",
    created_by_admin_id: user.id,
    implemented_at: request.implemented_at ?? new Date().toISOString(),
    sort_order: sortOrder,
    is_published: isPublished,
    updated_at: new Date().toISOString(),
  };

  const { data: existingAchievement, error: existingError } = await supabase
    .from("road_achievements")
    .select("id")
    .eq("source_feature_request_id", requestId)
    .maybeSingle();

  if (existingError) {
    return {
      error: "Could not check the existing Road achievement. Try again.",
      success: null,
    };
  }

  const saveResult = existingAchievement
    ? await supabase
        .from("road_achievements")
        .update(achievementPayload)
        .eq("id", existingAchievement.id)
    : await supabase.from("road_achievements").insert({
        ...achievementPayload,
        created_at: new Date().toISOString(),
      });

  if (saveResult.error) {
    return {
      error: "Could not save the Road achievement. Try again.",
      success: null,
    };
  }

  await recomputeUserBadgeFamilies(supabase, request.user_id, ["builder"]);

  const authorUsername = await getProfileUsernameByUserId(
    supabase,
    request.user_id
  );

  revalidateMany([
    "/",
    "/input",
    "/input/road",
    authorUsername ? `/u/${authorUsername}` : null,
  ]);

  return {
    ...initialRoadAchievementState,
    success: existingAchievement
      ? "Road Achievement updated."
      : "Road Achievement created.",
  };
}

