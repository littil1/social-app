"use client";

import { useEffect, useRef, useState } from "react";
import type { FeedPost } from "@/types/feed";

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
  // State
  // =====================================================

  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  // =====================================================
  // Refs
  // =====================================================

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const pendingSubmitAfterLoginRef = useRef(false);
  const skipLoginCheckRef = useRef(false);

  // =====================================================
  // Derived Values
  // =====================================================

  const trimmed = content.trim();
  const remainingCharacters = 500 - content.length;
  const canSubmit = !loading && trimmed.length >= 2;

   // =====================================================
  // Effects
  // =====================================================

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "0px";
    const nextHeight = Math.min(textarea.scrollHeight, 140);
    textarea.style.height = `${nextHeight}px`;
  }, [content]);

  useEffect(() => {
    function handleAuthLoginSuccess() {
      if (!pendingSubmitAfterLoginRef.current) return;

      pendingSubmitAfterLoginRef.current = false;
      skipLoginCheckRef.current = true;

      window.setTimeout(() => {
        const form = textareaRef.current?.form;
        form?.requestSubmit();
      }, 0);
    }

    window.addEventListener("auth-login-success", handleAuthLoginSuccess);

    return () => {
      window.removeEventListener("auth-login-success", handleAuthLoginSuccess);
    };
  }, []);

  // =====================================================
  // Helpers
  // =====================================================

  function requireLogin() {
    window.dispatchEvent(
      new CustomEvent("open-login-modal", {
        detail: {
          redirectPath: window.location.pathname,
        },
      })
    );
  }

    // =====================================================
  // Actions
  // =====================================================

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const skipLoginCheck = skipLoginCheckRef.current;
    skipLoginCheckRef.current = false;

    if (!skipLoginCheck && !isLoggedIn) {
      pendingSubmitAfterLoginRef.current = true;
      requireLogin();
      return;
    }

    if (!canSubmit) return;

    setLoading(true);

    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: trimmed }),
      });

      if (!res.ok) {
        throw new Error("Post konnte nicht erstellt werden.");
      }

      const newPost: FeedPost = await res.json();
      onPostCreated(newPost);
      setContent("");
    } catch (error) {
      console.error(error);
      alert("Post konnte nicht erstellt werden.");
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // Render
  // =====================================================

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full px-3 py-3 sm:px-4 sm:py-3"
    >
      {/* Input */}
      <div className="flex items-center gap-2">
        <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm text-gray-600 sm:flex">
          ✍️
        </div>

        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              isLoggedIn
                ? "Teile eine Erkenntnis..."
                : "Login erforderlich zum Posten..."
            }
            rows={1}
            disabled={loading}
            className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-gray-400 focus:bg-white"
            style={{
              maxHeight: "140px",
              scrollbarWidth: "none",
            }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[11px] text-gray-400">
          {remainingCharacters}
        </span>

        <button
          type="submit"
          className="rounded-lg bg-black px-4 py-1.5 text-xs text-white disabled:opacity-50"
        >
          {loading ? "..." : "Posten"}
        </button>
      </div>
    </form>
  );
}