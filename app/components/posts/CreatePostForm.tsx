"use client";

import { useEffect, useRef, useState } from "react";
import type { FeedPost } from "@/types/feed";
import { useAuthModal } from "@/app/components/auth/AuthModalProvider";

type CreatePostFormProps = {
  onPostCreated: (post: FeedPost) => void;
  isLoggedIn: boolean;
  onClose?: () => void;
};

export default function CreatePostForm({
  onPostCreated,
  isLoggedIn,
  onClose,
}: CreatePostFormProps) {
  const {
    requireLoginAndResume,
    isAuthenticated,
    authReady,
    user,
    profile,
  } = useAuthModal();

  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const effectiveIsLoggedIn = authReady ? isAuthenticated : isLoggedIn;
  const trimmed = content.trim();
  const remainingCharacters = 500 - content.length;
  const canSubmit = !loading && trimmed.length >= 2;

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "0px";
    const nextHeight = Math.min(textarea.scrollHeight, 220);
    textarea.style.height = `${nextHeight}px`;
  }, [content]);

  async function submitPost(skipLoginCheck = false) {
    if (!skipLoginCheck && !effectiveIsLoggedIn) {
      requireLoginAndResume(() => {
        void submitPost(true);
      }, window.location.pathname);
      return;
    }

    if (!canSubmit || loading) return;

    setLoading(true);

    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: trimmed }),
      });

      if (res.status === 401 || res.status === 403) {
        requireLoginAndResume(() => {
          void submitPost(true);
        }, window.location.pathname);
        return;
      }

      if (!res.ok) {
        throw new Error("Beitrag konnte nicht erstellt werden.");
      }

      const newPost: FeedPost = await res.json();

      onPostCreated(newPost);
      setContent("");
      onClose?.();
    } catch (error) {
      console.error(error);
      alert("Beitrag konnte nicht erstellt werden.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await submitPost();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-base font-semibold text-gray-900">
        Was denkst du gerade?
      </p>

      <div className="rounded-3xl border border-gray-200 bg-gray-50/80 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-sm font-semibold text-gray-600">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="avatar"
                className="h-full w-full object-cover"
              />
            ) : profile?.username ? (
              profile.username.charAt(0).toUpperCase()
            ) : user?.email ? (
              user.email.charAt(0).toUpperCase()
            ) : (
              "?"
            )}
          </div>

          <div className="min-w-0 flex-1">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => {
                if (e.target.value.length <= 500) {
                  setContent(e.target.value);
                }
              }}
              placeholder={
                effectiveIsLoggedIn
                  ? "Schreib es hier auf ..."
                  : "Melde dich an, um etwas zu posten"
              }
              rows={4}
              disabled={loading}
              className="w-full resize-none border-0 bg-transparent px-0 py-0.5 text-[16px] leading-7 text-gray-900 outline-none placeholder:text-gray-400"
              style={{
                maxHeight: "220px",
                scrollbarWidth: "none",
              }}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-gray-400">{remainingCharacters}</span>

        <button
          type="submit"
          disabled={!canSubmit || loading}
          className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-900 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-white"
        >
          {loading ? "Postet..." : "Posten"}
        </button>
      </div>
    </form>
  );
}