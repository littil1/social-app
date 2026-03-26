"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  updateProfile,
  type UpdateProfileState,
} from "@/app/settings/profile/actions";

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

  if (safeValue.length > 200) {
    return "Bio must be at most 200 characters.";
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const avatarMenuRef = useRef<HTMLDivElement | null>(null);

  const [username, setUsername] = useState(initialUsername ?? "");
  const [bio, setBio] = useState(initialBio ?? "");
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState(initialAvatarUrl ?? "");
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);

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

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        avatarMenuRef.current &&
        !avatarMenuRef.current.contains(event.target as Node)
      ) {
        setShowAvatarMenu(false);
      }
    }

    if (showAvatarMenu) {
      document.addEventListener("mousedown", handleOutsideClick);
    }

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [showAvatarMenu]);

  const usernameError = validateUsername(username);
  const bioError = validateBio(bio);
  const clientError = usernameError || bioError;

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setAvatarFile(file);

    if (file) {
      setRemoveAvatar(false);
    }

    setShowAvatarMenu(false);
  }

  function handleChangePicture() {
    fileInputRef.current?.click();
    setShowAvatarMenu(false);
  }

  function handleRemovePicture() {
    setRemoveAvatar(true);
    setAvatarFile(null);
    setPreviewUrl("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setShowAvatarMenu(false);
  }

  return (
    <form action={formAction} className="space-y-5">
      <div className="flex flex-col items-start gap-3">
        <div ref={avatarMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setShowAvatarMenu((prev) => !prev)}
            className="group relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-xl font-semibold text-gray-600 focus:outline-none focus:ring-2 focus:ring-black"
            aria-label="Open profile picture options"
          >
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

            <span className="absolute inset-0 flex items-center justify-center bg-black/35 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100">
              Edit
            </span>
          </button>

          {showAvatarMenu && (
            <div className="absolute left-0 top-full z-20 mt-2 w-44 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
              <button
                type="button"
                onClick={handleChangePicture}
                className="block w-full px-4 py-3 text-left text-sm text-gray-800 hover:bg-gray-50"
              >
                Change picture
              </button>

              <button
                type="button"
                onClick={handleRemovePicture}
                className="block w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-gray-50"
              >
                Remove picture
              </button>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          id="avatar"
          name="avatar"
          type="file"
          accept="image/*"
          onChange={handleAvatarChange}
          className="hidden"
        />

        <p className="text-sm text-gray-500">Max size: 4 MB</p>
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
          maxLength={200}
          className="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none"
          placeholder="Tell people a bit about yourself..."
        />

        <p className="mt-2 text-sm text-gray-500">{bio.length}/200</p>
      </div>

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