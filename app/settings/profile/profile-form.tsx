"use client";

import Image from "next/image";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  updateProfile,
  type UpdateProfileState,
} from "@/app/settings/profile/actions";
import FormError from "@/shared/components/ui/FormError";
import { trackEvent } from "@/shared/lib/analytics";

const initialState: UpdateProfileState = {
  error: null,
  success: null,
};

function validateUsername(value: string | undefined) {
  const normalized = (value ?? "").trim().toLowerCase();

  if (normalized.length === 0) return "Choose a username.";

  if (normalized.length < 3) return "Username must be at least 3 characters.";

  if (normalized.length > 20) return "Username must be at most 20 characters.";

  if (!/^[a-z0-9_]+$/.test(normalized)) {
    return "Only a–z, 0–9 and _ allowed";
  }

  return null;
}

function validateBio(value: string | undefined) {
  const safeValue = value ?? "";

  if (safeValue.length > 200) {
    return "Your bio is too long. Keep it under 200 characters.";
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
  const [avatarError, setAvatarError] = useState<string | null>(null);
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

    trackEvent("profile_saved");
    if (avatarFile) {
      trackEvent("avatar_uploaded");
    }

    hasRedirectedRef.current = true;
    router.push(`/u/${encodeURIComponent(nextUsername)}`);
    router.refresh();
  }, [avatarFile, state.success, username, router]);

  useEffect(() => {
    if (!state.error) return;

    trackEvent("profile_save_failed", { reason: "unknown" });
  }, [state.error]);

  const usernameError = validateUsername(username);
  const bioError = validateBio(bio);
  const clientError = usernameError || bioError || avatarError;

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setAvatarError(null);

    if (file) {
      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

      if (!allowedTypes.includes(file.type)) {
        setAvatarFile(null);
        setAvatarError("Use a JPG, PNG, or WebP image.");
        trackEvent("avatar_upload_failed", { reason: "type" });
        e.target.value = "";
        return;
      }

      if (file.size > 4 * 1024 * 1024) {
        setAvatarFile(null);
        setAvatarError("Avatar image is too large. Choose an image under 4 MB.");
        trackEvent("avatar_upload_failed", { reason: "size" });
        e.target.value = "";
        return;
      }
    }

    setAvatarFile(file);

    if (file) {
      setRemoveAvatar(false);
      trackEvent("avatar_upload_started");
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
    setAvatarError(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setShowAvatarMenu(false);
  }

  return (
    <form action={formAction} className="space-y-6">
      <input
        type="hidden"
        name="remove_avatar"
        value={removeAvatar ? "on" : ""}
      />
      {/* Avatar Section */}
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
        <div ref={avatarMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setShowAvatarMenu((prev) => !prev)}
            className="group relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-[20px] border-2 border-neutral-100 bg-neutral-50 text-xl font-black text-neutral-400 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-neutral-950 sm:h-24 sm:w-24"
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
          <p className="text-xs font-medium text-neutral-500">JPG, PNG, WebP - max 4MB.</p>
        </div>

        <input
          ref={fileInputRef}
          id="avatar"
          name="avatar"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleAvatarChange}
          className="hidden"
        />
      </div>

      {/* Form Fields */}
      <div className="space-y-4">
        <div className="space-y-2">
          <label
            htmlFor="username"
            className="text-xs font-black uppercase tracking-widest text-neutral-500"
          >
            Name
          </label>

          <input
            id="username"
            name="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            placeholder="e.g. champion_01"
            className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3.5 font-medium outline-none transition placeholder:text-neutral-500 focus:border-neutral-950 focus:bg-white"
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
            Bio
          </label>

          <textarea
            id="bio"
            name="bio"
            rows={2}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={200}
            placeholder="Tell us about you..."
            className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3.5 font-medium outline-none transition placeholder:text-neutral-500 focus:border-neutral-950 focus:bg-white"
          />
          <div className="flex justify-between">
            <p className={`text-[10px] font-bold ${bio.length > 180 ? 'text-amber-600' : 'text-neutral-500'}`}>
              {bio.length} / 200
            </p>
          </div>
        </div>
      </div>

      {/* Feedback Messages */}
      <div className="space-y-2.5">
        {clientError && (
          <FormError message={clientError} />
        )}

        {!clientError && state.error && (
          <FormError message={state.error} />
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
        className="relative w-full overflow-hidden rounded-2xl bg-neutral-950 py-3.5 text-sm font-bold text-white shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:hover:scale-100"
      >
        {isPending ? "Syncing Profile..." : "Save Changes"}
      </button>
    </form>
  );
}
