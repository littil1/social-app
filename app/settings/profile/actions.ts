"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/shared/types/database";

function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

function normalizeBio(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isValidUsername(value: string) {
  return /^[a-z0-9_]{3,20}$/.test(value);
}

export type UpdateProfileState = {
  error: string | null;
  success: string | null;
};

export type DeleteAccountState = {
  error: string | null;
};

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Account deletion is not configured.");
  }

  return createSupabaseAdminClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function updateProfile(
  _prevState: UpdateProfileState,
  formData: FormData
): Promise<UpdateProfileState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: "Not authenticated.",
      success: null,
    };
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("username, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const username = normalizeUsername(String(formData.get("username") ?? ""));
  const bio = normalizeBio(String(formData.get("bio") ?? ""));
  const removeAvatar = formData.get("remove_avatar") === "on";
  const avatarFile = formData.get("avatar") as File | null;

  if (!isValidUsername(username)) {
    return {
      error:
        "Username must be 3-20 characters and only contain lowercase letters, numbers, and underscores.",
      success: null,
    };
  }

  if (bio && bio.length > 200) {
    return {
      error: "Bio must be at most 200 characters.",
      success: null,
    };
  }

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .neq("id", user.id)
    .maybeSingle();

  if (existingProfile) {
    return {
      error: "This username is already taken.",
      success: null,
    };
  }

  let avatarUrl = currentProfile?.avatar_url ?? null;

  if (removeAvatar) {
    avatarUrl = null;
  }

  if (avatarFile && avatarFile.size > 0) {
    if (!avatarFile.type.startsWith("image/")) {
      return {
        error: "Avatar must be an image file.",
        success: null,
      };
    }

    if (avatarFile.size > 2 * 1024 * 1024) {
      return {
        error: "Avatar must be smaller than 2 MB.",
        success: null,
      };
    }

    const extension = avatarFile.name.split(".").pop() || "png";
    const filePath = `${user.id}/${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, avatarFile);

    if (uploadError) {
      return {
        error: "Avatar could not be uploaded. Please try again.",
        success: null,
      };
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(filePath);

    avatarUrl = publicUrl;
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      username,
      bio,
      avatar_url: avatarUrl,
    })
    .eq("id", user.id);

  if (error) {
    return {
      error: "Profile could not be saved. Please try again.",
      success: null,
    };
  }

  revalidatePath("/");
  revalidatePath("/settings/profile");
  revalidatePath(`/u/${username}`);

  if (currentProfile?.username && currentProfile.username !== username) {
    revalidatePath(`/u/${currentProfile.username}`);
  }

  return {
    error: null,
    success: "Profile updated successfully.",
  };
}

async function deleteRowsByUserId(
  adminSupabase: ReturnType<typeof getAdminClient>,
  table:
    | "comment_reactions"
    | "post_reactions"
    | "feature_request_comment_reactions"
    | "feature_request_likes"
    | "follows"
    | "user_badges"
    | "post_reports"
    | "comment_reports",
  column: string,
  userId: string
) {
  const { error } = await adminSupabase.from(table).delete().eq(column, userId);

  if (error) {
    throw new Error(error.message);
  }
}

async function updatePostCommentCounts(
  adminSupabase: ReturnType<typeof getAdminClient>,
  postIds: number[]
) {
  for (const postId of [...new Set(postIds)]) {
    const { count, error: countError } = await adminSupabase
      .from("comments")
      .select("*", { count: "exact", head: true })
      .eq("post_id", postId)
      .is("deleted_at", null);

    if (countError) {
      throw new Error(countError.message);
    }

    const { error: updateError } = await adminSupabase
      .from("posts")
      .update({ comments_count: count ?? 0 })
      .eq("id", postId);

    if (updateError) {
      throw new Error(updateError.message);
    }
  }
}

export async function deleteAccount(
  _prevState: DeleteAccountState,
  formData: FormData
): Promise<DeleteAccountState> {
  const confirmation = String(formData.get("confirmation") ?? "").trim();

  if (confirmation !== "DELETE") {
    return { error: "Type DELETE to confirm account deletion." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to delete your account." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("username, is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return { error: "Account could not be checked. Please try again." };
  }

  if (profile?.is_admin) {
    return { error: "Admin accounts cannot be deleted from this screen." };
  }

  const adminSupabase = getAdminClient();
  const userId = user.id;

  try {
    const { data: ownPosts } = await adminSupabase
      .from("posts")
      .select("id")
      .eq("user_id", userId);
    const ownPostIds = (ownPosts ?? []).map((post) => post.id);
    const { data: winnerPosts } = await adminSupabase
      .from("daily_post_winners")
      .select("post_id")
      .eq("author_id", userId)
      .eq("rank_position", 1);
    const winnerPostIds = new Set((winnerPosts ?? []).map((row) => row.post_id));
    const deletablePostIds = ownPostIds.filter((postId) => !winnerPostIds.has(postId));
    const preservedWinnerPostIds = ownPostIds.filter((postId) =>
      winnerPostIds.has(postId)
    );

    const { data: ownFeatureRequests } = await adminSupabase
      .from("feature_requests")
      .select("id")
      .eq("user_id", userId);
    const ownFeatureRequestIds = (ownFeatureRequests ?? []).map(
      (request) => request.id
    );

    const { data: ownComments } = await adminSupabase
      .from("comments")
      .select("id, post_id")
      .eq("user_id", userId);
    const ownCommentIds = (ownComments ?? []).map((comment) => comment.id);
    const postsNeedingCommentCountUpdate = (ownComments ?? [])
      .map((comment) => comment.post_id)
      .filter((postId) => !deletablePostIds.includes(postId));

    if (ownCommentIds.length > 0) {
      const { error } = await adminSupabase
        .from("comment_reactions")
        .delete()
        .in("comment_id", ownCommentIds);
      if (error) throw new Error(error.message);
    }

    if (deletablePostIds.length > 0) {
      const { data: commentsOnOwnPosts } = await adminSupabase
        .from("comments")
        .select("id")
        .in("post_id", deletablePostIds);
      const commentsOnOwnPostIds = (commentsOnOwnPosts ?? []).map(
        (comment) => comment.id
      );

      if (commentsOnOwnPostIds.length > 0) {
        const { error: commentReactionsOnOwnPostsError } = await adminSupabase
          .from("comment_reactions")
          .delete()
          .in("comment_id", commentsOnOwnPostIds);
        if (commentReactionsOnOwnPostsError) {
          throw new Error(commentReactionsOnOwnPostsError.message);
        }

        const { error: commentReportsOnOwnPostsError } = await adminSupabase
          .from("comment_reports")
          .delete()
          .in("comment_id", commentsOnOwnPostIds);
        if (commentReportsOnOwnPostsError) {
          throw new Error(commentReportsOnOwnPostsError.message);
        }

        const { error: commentsOnOwnPostsError } = await adminSupabase
          .from("comments")
          .delete()
          .in("id", commentsOnOwnPostIds);
        if (commentsOnOwnPostsError) {
          throw new Error(commentsOnOwnPostsError.message);
        }
      }

      const { error: postReactionError } = await adminSupabase
        .from("post_reactions")
        .delete()
        .in("post_id", deletablePostIds);
      if (postReactionError) throw new Error(postReactionError.message);

      const { error: postReportsError } = await adminSupabase
        .from("post_reports")
        .delete()
        .in("post_id", deletablePostIds);
      if (postReportsError) throw new Error(postReportsError.message);
    }

    if (preservedWinnerPostIds.length > 0) {
      const { error: preservedPostError } = await adminSupabase
        .from("posts")
        .update({ user_id: null })
        .in("id", preservedWinnerPostIds);
      if (preservedPostError) throw new Error(preservedPostError.message);
    }

    await deleteRowsByUserId(adminSupabase, "comment_reactions", "user_id", userId);
    await deleteRowsByUserId(adminSupabase, "post_reactions", "user_id", userId);
    await deleteRowsByUserId(
      adminSupabase,
      "feature_request_comment_reactions",
      "user_id",
      userId
    );
    await deleteRowsByUserId(adminSupabase, "feature_request_likes", "user_id", userId);
    await deleteRowsByUserId(adminSupabase, "follows", "follower_id", userId);
    await deleteRowsByUserId(adminSupabase, "follows", "following_id", userId);
    await deleteRowsByUserId(adminSupabase, "user_badges", "user_id", userId);
    await deleteRowsByUserId(adminSupabase, "post_reports", "reporter_user_id", userId);
    await deleteRowsByUserId(adminSupabase, "post_reports", "post_owner_user_id", userId);
    await deleteRowsByUserId(adminSupabase, "comment_reports", "reporter_user_id", userId);
    await deleteRowsByUserId(
      adminSupabase,
      "comment_reports",
      "comment_owner_user_id",
      userId
    );

    if (ownFeatureRequestIds.length > 0) {
      const { data: commentsOnOwnRequests } = await adminSupabase
        .from("feature_request_comments")
        .select("id")
        .in("feature_request_id", ownFeatureRequestIds);
      const commentsOnOwnRequestIds = (commentsOnOwnRequests ?? []).map(
        (comment) => comment.id
      );

      if (commentsOnOwnRequestIds.length > 0) {
        const { error: feedbackCommentReactionError } = await adminSupabase
          .from("feature_request_comment_reactions")
          .delete()
          .in("comment_id", commentsOnOwnRequestIds);
        if (feedbackCommentReactionError) {
          throw new Error(feedbackCommentReactionError.message);
        }

        const { error: feedbackCommentsError } = await adminSupabase
          .from("feature_request_comments")
          .delete()
          .in("id", commentsOnOwnRequestIds);
        if (feedbackCommentsError) {
          throw new Error(feedbackCommentsError.message);
        }
      }

      const { error: featureRequestLikesError } = await adminSupabase
        .from("feature_request_likes")
        .delete()
        .in("feature_request_id", ownFeatureRequestIds);
      if (featureRequestLikesError) {
        throw new Error(featureRequestLikesError.message);
      }
    }

    // Hall of Fame snapshots are retained as historical records, but no longer
    // point at deleted personal profile data.
    const { error: winnerUpdateError } = await adminSupabase
      .from("daily_post_winners")
      .update({
        author_id: null,
        author_username: "deleted user",
      })
      .eq("author_id", userId);
    if (winnerUpdateError) throw new Error(winnerUpdateError.message);

    const { error: feedbackCommentsError } = await adminSupabase
      .from("feature_request_comments")
      .delete()
      .eq("user_id", userId);
    if (feedbackCommentsError) throw new Error(feedbackCommentsError.message);

    const { error: featureRequestsError } = await adminSupabase
      .from("feature_requests")
      .delete()
      .eq("user_id", userId);
    if (featureRequestsError) throw new Error(featureRequestsError.message);

    const { error: commentsError } = await adminSupabase
      .from("comments")
      .delete()
      .eq("user_id", userId);
    if (commentsError) throw new Error(commentsError.message);

    if (deletablePostIds.length > 0) {
      const { error: postsError } = await adminSupabase
        .from("posts")
        .delete()
        .in("id", deletablePostIds);
      if (postsError) throw new Error(postsError.message);
    }

    await updatePostCommentCounts(adminSupabase, postsNeedingCommentCountUpdate);

    const { error: profileDeleteError } = await adminSupabase
      .from("profiles")
      .delete()
      .eq("id", userId);
    if (profileDeleteError) throw new Error(profileDeleteError.message);

    const { error: authDeleteError } =
      await adminSupabase.auth.admin.deleteUser(userId);
    if (authDeleteError) throw new Error(authDeleteError.message);
  } catch (error) {
    console.error(error);
    return { error: "Account could not be deleted. Please contact support." };
  }

  await supabase.auth.signOut();
  revalidatePath("/");
  if (profile?.username) {
    revalidatePath(`/u/${profile.username}`);
  }

  redirect("/");
}
