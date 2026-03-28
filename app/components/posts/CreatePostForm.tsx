"use client";

import { useEffect, useRef, useState } from "react";
import type { FeedPost } from "@/types/feed";

type CreatePostFormProps = {
  onPostCreated: (post: FeedPost) => void;
};

// =====================================================
// Component
// =====================================================

export default function CreatePostForm({
  onPostCreated,
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
    const nextHeight = Math.min(textarea.scrollHeight, 160);
    textarea.style.height = `${nextHeight}px`;
  }, [content]);

  // =====================================================
  // Actions
  // =====================================================

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

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
    <form onSubmit={handleSubmit} className="w-full px-4 py-4 sm:px-5 sm:py-4">
      {/* Input Row */}
      <div className="flex items-center gap-3">
        <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-base text-gray-600 sm:flex">
          ✍️
        </div>

        <div className="min-w-0 flex-1">
          <label htmlFor="create-post-content" className="sr-only">
            Post-Inhalt
          </label>

          <textarea
            id="create-post-content"
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Teile eine Erkenntnis, die andere heute weiterbringt..."
            required
            minLength={2}
            maxLength={500}
            disabled={loading}
            rows={1}
            wrap="soft"
            className="min-h-[48px] w-full resize-none overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-[15px] leading-6 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-400 focus:bg-white"
            style={{
              maxHeight: "160px",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              whiteSpace: "pre-wrap",
              overflowWrap: "break-word",
            }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between gap-3">
        <span
          className={`text-xs ${
            remainingCharacters < 60 ? "text-red-500" : "text-gray-400"
          }`}
        >
          {remainingCharacters} Zeichen übrig
        </span>

        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-xl bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Posting..." : "Posten"}
        </button>
      </div>

      {/* Local Styles */}
      <style jsx>{`
        textarea::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </form>
  );
}