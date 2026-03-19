"use client";

import { useActionState, useEffect, useState } from "react";
import { updateProfile, type UpdateProfileState } from "./actions";

const initialState: UpdateProfileState = {
  error: null,
  success: null,
};

function validateUsername(value: string | undefined) {
  const normalized = (value ?? "").trim().toLowerCase();

  if (normalized.length < 3) {
    return "Username must be at least 3 characters.";
  }

  if (normalized.length > 20) {
    return "Username must be at most 20 characters.";
  }

  if (!/^[a-z0-9_]+$/.test(normalized)) {
    return "Only lowercase letters, numbers, and underscores are allowed.";
  }

  return null;
}

function validateBio(value: string | undefined) {
  const safeValue = value ?? "";

  if (safeValue.length > 160) {
    return "Bio must be at most 160 characters.";
  }

  return null;
}

export default function ProfileForm({
  initialUsername,
  initialBio,
  initialAvatarUrl,
}: {
  initialUsername: string;
  initialBio: string;
  initialAvatarUrl: string;
}) {
  const [username, setUsername] = useState(initialUsername ?? "");
  const [bio, setBio] = useState(initialBio ?? "");
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState(initialAvatarUrl ?? "");

  const [state, formAction, isPending] = useActionState(
    updateProfile,
    initialState
  );

  useEffect(() => {
    if (!avatarFile) {
      setPreviewUrl(removeAvatar ? "" : initialAvatarUrl ?? "");
      return;
    }

    const objectUrl = URL.createObjectURL(avatarFile);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [avatarFile, removeAvatar, initialAvatarUrl]);

  const usernameError = validateUsername(username);
  const bioError = validateBio(bio);
  const clientError = usernameError || bioError;

  return (
    <form action={formAction} className="space-y-5">
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-xl font-semibold text-gray-600">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Avatar preview"
              className="h-full w-full object-cover"
            />
          ) : (
            username.trim().charAt(0).toUpperCase() || "U"
          )}
        </div>

        <div className="text-sm text-gray-500">
          Current avatar preview
        </div>
      </div>

      <div>
        <label
          htmlFor="username"
          className="mb-2 block text-sm font-medium text-gray-700"
        >
          Username
        </label>

        <input
          id="username"
          name="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          minLength={3}
          maxLength={20}
          className="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none"
        />

        <p className="mt-2 text-sm text-gray-500">
          Allowed: lowercase letters, numbers, underscore
        </p>
      </div>

      <div>
        <label
          htmlFor="bio"
          className="mb-2 block text-sm font-medium text-gray-700"
        >
          Bio
        </label>

        <textarea
          id="bio"
          name="bio"
          rows={4}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={160}
          className="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none"
          placeholder="Tell people a bit about yourself..."
        />

        <p className="mt-2 text-sm text-gray-500">{bio.length}/160</p>
      </div>

      <div>
        <label
          htmlFor="avatar"
          className="mb-2 block text-sm font-medium text-gray-700"
        >
          Upload avatar
        </label>

        <input
          id="avatar"
          name="avatar"
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null;
            setAvatarFile(file);
            if (file) setRemoveAvatar(false);
          }}
          className="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none"
        />

        <p className="mt-2 text-sm text-gray-500">
          Max size: 2 MB
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          name="remove_avatar"
          checked={removeAvatar}
          onChange={(e) => {
            setRemoveAvatar(e.target.checked);
            if (e.target.checked) {
              setAvatarFile(null);
            }
          }}
        />
        Remove current avatar
      </label>

      {clientError && <p className="text-sm text-red-600">{clientError}</p>}

      {!clientError && state.error && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}

      {!clientError && state.success && (
        <p className="text-sm text-green-600">{state.success}</p>
      )}

      <button
        type="submit"
        disabled={isPending || !!clientError}
        className="rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50"
      >
        {isPending ? "Saving..." : "Save profile"}
      </button>
    </form>
  );
}