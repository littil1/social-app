"use client";

import { useEffect, useRef, useState } from "react";
import type { FeedPost } from "@/types/feed";
import { useAuthModal } from "@/app/components/auth/AuthModalProvider";

type CreatePostFormProps = {
  onPostCreated: (post: FeedPost) => void;
  isLoggedIn: boolean;
};

// =====================================================
// Component
// =====================================================

export default function CreatePostForm({
  onPostCreated,
  isLoggedIn,
}: CreatePostFormProps) {
  // =====================================================
  // Hooks
  // =====================================================

  const { requireLoginAndResume, isAuthenticated, authReady } = useAuthModal();

  // =====================================================
  // State
  // =====================================================

  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // =====================================================
  // Refs
  // =====================================================

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // =====================================================
  // Derived Values
  // =====================================================

  const effectiveIsLoggedIn = authReady ? isAuthenticated : isLoggedIn;
  const trimmed = content.trim();
  const remainingCharacters = 500 - content.length;
  const canSubmit = !loading && trimmed.length >= 2;
  const isExpanded = isFocused || content.length > 0;

  // =====================================================
  // Effects
  // =====================================================

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "0px";
    const nextHeight = Math.min(textarea.scrollHeight, 180);
    textarea.style.height = `${nextHeight}px`;
  }, [content]);

  // =====================================================
  // Actions
  // =====================================================

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
      setIsFocused(false);
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

  // =====================================================
  // Render
  // =====================================================

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5"
    >
      <div className="mb-4">
        <div className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-600">
          Neuer Beitrag
        </div>

        <h2 className="mt-3 text-xl font-bold tracking-tight text-black sm:text-2xl">
          Teile etwas, das andere weiterbringt
        </h2>

        <p className="mt-1 text-sm leading-6 text-gray-600">
          Kurz, konkret und hilfreich.
        </p>
      </div>

      <div
        className={`rounded-2xl border bg-gray-50 p-3 transition sm:p-4 ${
          isExpanded
            ? "border-gray-300 bg-white shadow-sm"
            : "border-gray-200"
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black text-sm text-white">
            ✍️
          </div>

          <div className="min-w-0 flex-1">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={
                effectiveIsLoggedIn
                  ? "Was sollten andere unbedingt wissen?"
                  : "Melde dich an, um etwas zu teilen"
              }
              rows={1}
              disabled={loading}
              className="w-full resize-none border-0 bg-transparent px-0 py-1 text-[15px] leading-7 text-gray-900 outline-none placeholder:text-gray-400 sm:text-base"
              style={{
                maxHeight: "180px",
                scrollbarWidth: "none",
              }}
            />
          </div>
        </div>

        <div className="mt-4 border-t border-gray-200 pt-4">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-500">
                Ein guter Beitrag hilft wirklich weiter.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <span className="text-sm text-gray-400">{remainingCharacters}</span>

              <button
                type="submit"
                disabled={!canSubmit || loading}
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-900 disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                {loading ? "Postet..." : "Posten"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}