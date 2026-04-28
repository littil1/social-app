"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { FeedPost } from "@/shared/types/feed";
import { useAuthModal } from "@/features/auth/components/AuthModalProvider";

// =====================================================
// Types
// =====================================================

type CreatePostFormProps = {
  onPostCreated: (post: FeedPost) => void;
  isLoggedIn: boolean;
  onClose?: () => void;
  currentUserProfile?: {
    username: string;
    avatar_url: string | null;
  } | null;
};

// =====================================================
// Component
// =====================================================

export default function CreatePostForm({
  onPostCreated,
  isLoggedIn,
  onClose,
  currentUserProfile = null,
}: CreatePostFormProps) {
  const router = useRouter();

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

  const fallbackAvatarUrl = profile?.avatar_url?.trim() || null;
  const displayAvatarUrl =
    currentUserProfile?.avatar_url?.trim() || fallbackAvatarUrl;

  const displayUsername =
    currentUserProfile?.username || profile?.username || null;

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "0px";
    const nextHeight = Math.min(textarea.scrollHeight, 220);
    textarea.style.height = `${nextHeight}px`;
  }, [content]);

  async function submitPost(skipLoginCheck = false) {
    if (!skipLoginCheck && !effectiveIsLoggedIn) {
      onClose?.();

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
        // WICHTIG:
        // Wenn wir bereits aus einem Resume-Flow kommen, niemals erneut
        // requireLoginAndResume aufrufen, sonst entsteht eine Schleife.
        if (skipLoginCheck) {
          router.refresh();
          throw new Error("AUTH_NOT_READY_AFTER_LOGIN");
        }

        onClose?.();

        requireLoginAndResume(() => {
          void submitPost(true);
        }, window.location.pathname);

        return;
      }

      if (!res.ok) {
        throw new Error("Post could not be created.");
      }

      const newPost: FeedPost = await res.json();

      onPostCreated(newPost);
      setContent("");
      onClose?.();
    } catch (error) {
      console.error(error);

      if (
        error instanceof Error &&
        error.message === "AUTH_NOT_READY_AFTER_LOGIN"
      ) {
        alert("Please try again.");
      } else {
        alert("Post could not be saved.");
      }
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
      <div className="rounded-3xl border border-gray-200 bg-gray-50/80 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-sm font-semibold text-gray-600">
            {displayAvatarUrl ? (
              <img
                src={displayAvatarUrl}
                alt="Profile avatar"
                className="h-full w-full object-cover"
              />
            ) : displayUsername ? (
              displayUsername.charAt(0).toUpperCase()
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
                  ? "What's on your mind today?"
                  : "Log in to post"
              }
              rows={4}
              disabled={loading}
              className="w-full resize-none border-0 bg-transparent px-0 py-0.5 text-[16px] leading-7 text-gray-900 outline-none placeholder:text-gray-500"
              style={{
                maxHeight: "220px",
                scrollbarWidth: "none",
              }}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-gray-500">{remainingCharacters}</span>

        <button
          type="submit"
          disabled={!canSubmit || loading}
          className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-900 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-white"
        >
          {loading ? "Posting..." : "Post"}
        </button>
      </div>
    </form>
  );
}

