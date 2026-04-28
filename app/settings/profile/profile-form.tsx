"use client";

import Image from "next/image";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
    return "Minimum 3 characters required";
  }

  if (normalized.length > 20) {
    return "Maximum 20 characters allowed";
  }

  if (!/^[a-z0-9_]+$/.test(normalized)) {
    return "Only a–z, 0–9 and _ allowed";
  }

  return null;
}

function validateBio(value: string | undefined) {
  const safeValue = value ?? "";

  if (safeValue.length > 200) {
    return "Bio must be under 200 characters";
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
  const router = useRouter();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const avatarMenuRef = useRef<HTMLDivElement | null>(null);
  const hasRedirectedRef = useRef(false);

  const [username, setUsername] = useState(initialUsername ?? "");
  const [bio, setBio] = useState(initialBio ?? "");
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);

  const [state, formAction, isPending] = useActionState(
    updateProfile,
    initialState
  );

  const avatarObjectUrl = useMemo(
    () => (avatarFile ? URL.createObjectURL(avatarFile) : null),
    [avatarFile]
  );
  const previewUrl = avatarObjectUrl ?? (removeAvatar ? "" : initialAvatarUrl ?? "");

  useEffect(() => {
    return () => {
      if (avatarObjectUrl) {
        URL.revokeObjectURL(avatarObjectUrl);
      }
    };
  }, [avatarObjectUrl]);

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

  useEffect(() => {
    if (!state.success || hasRedirectedRef.current) return;

    const nextUsername = username.trim().toLowerCase();
    if (!nextUsername) return;

    hasRedirectedRef.current = true;
    router.push(`/u/${encodeURIComponent(nextUsername)}`);
    router.refresh();
  }, [state.success, username, router]);

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

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setShowAvatarMenu(false);
  }

  return (
    <form action={formAction} className="space-y-8">
      {/* Avatar Section */}
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
        <div ref={avatarMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setShowAvatarMenu((prev) => !prev)}
            className="group relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-[24px] border-2 border-neutral-100 bg-neutral-50 text-2xl font-black text-neutral-400 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-neutral-950 sm:h-28 sm:w-28"
            aria-label="Open profile picture options"
          >
            {previewUrl ? (
              <Image
                src={previewUrl}
                alt="Avatar preview"
                width={112}
                height={112}
                sizes="(min-width: 640px) 112px, 96px"
                unoptimized
                className="h-full w-full object-cover"
              />
            ) : (
              username.trim().charAt(0).toUpperCase() || "U"
            )}

            <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-[10px] font-bold uppercase tracking-widest text-white opacity-0 transition group-hover:opacity-100">
              Edit
            </div>
          </button>

          {showAvatarMenu && (
            <div className="absolute left-0 top-full z-20 mt-3 w-48 overflow-hidden rounded-2xl border border-neutral-200 bg-white p-1 shadow-xl">
              <button
                type="button"
                onClick={handleChangePicture}
                className="block w-full rounded-xl px-4 py-3 text-left text-xs font-bold uppercase tracking-tight text-neutral-950 hover:bg-neutral-50"
              >
                Change Picture
              </button>

              <button
                type="button"
                onClick={handleRemovePicture}
                className="block w-full rounded-xl px-4 py-3 text-left text-xs font-bold uppercase tracking-tight text-red-600 hover:bg-red-50"
              >
                Remove Picture
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-xs font-black uppercase tracking-widest text-neutral-950">Avatar</p>
          <p className="text-xs font-medium text-neutral-500">JPG, PNG or GIF. Max 4MB.</p>
          <button
            type="button"
            onClick={handleChangePicture}
            className="mt-2 text-xs font-bold text-neutral-950 underline underline-offset-4"
          >
            Upload new image
          </button>
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
      </div>

      {/* Form Fields */}
      <div className="space-y-6">
        <div className="space-y-2">
          <label
            htmlFor="username"
            className="text-xs font-black uppercase tracking-widest text-neutral-500"
          >
            Unique Username
          </label>

          <input
            id="username"
            name="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            placeholder="e.g. champion_01"
            className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-5 py-4 font-medium outline-none transition placeholder:text-neutral-500 focus:border-neutral-950 focus:bg-white"
          />

          <p className="text-[10px] font-medium text-neutral-500 uppercase tracking-tight">
            Only a–z, 0–9 and underscores allowed.
          </p>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="bio"
            className="text-xs font-black uppercase tracking-widest text-neutral-500"
          >
            Short Bio
          </label>

          <textarea
            id="bio"
            name="bio"
            rows={4}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={200}
            placeholder="Tell the community about your journey..."
            className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-5 py-4 font-medium outline-none transition placeholder:text-neutral-500 focus:border-neutral-950 focus:bg-white"
          />

          <div className="flex justify-between">
            <p className="text-[10px] font-medium text-neutral-500 uppercase tracking-tight">
              A brief introduction.
            </p>
            <p className={`text-[10px] font-bold ${bio.length > 180 ? 'text-amber-600' : 'text-neutral-500'}`}>
              {bio.length} / 200
            </p>
          </div>
        </div>
      </div>

      {/* Feedback Messages */}
      <div className="space-y-3">
        {clientError && (
          <div className="rounded-xl bg-red-50 p-4 text-xs font-bold text-red-600 border border-red-100">
            {clientError}
          </div>
        )}

        {!clientError && state.error && (
          <div className="rounded-xl bg-red-50 p-4 text-xs font-bold text-red-600 border border-red-100">
            {state.error}
          </div>
        )}

        {!clientError && state.success && (
          <div className="rounded-xl bg-emerald-50 p-4 text-xs font-bold text-emerald-700 border border-emerald-100">
            {state.success}
          </div>
        )}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isPending || !!clientError}
        className="relative w-full overflow-hidden rounded-2xl bg-neutral-950 py-4 text-sm font-bold text-white shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:hover:scale-100"
      >
        {isPending ? "Syncing Profile..." : "Save Changes"}
      </button>
    </form>
  );
}
