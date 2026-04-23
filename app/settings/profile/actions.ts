"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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

  if (bio && bio.length > 160) {
    return {
      error: "Bio must be at most 160 characters.",
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
        error: uploadError.message,
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
      error: error.message,
      success: null,
    };
  }

  revalidatePath("/");
  revalidatePath("/explore");
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
