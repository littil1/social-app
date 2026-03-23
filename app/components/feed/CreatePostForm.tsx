"use client";

import { useState } from "react";
import type { FeedPost } from "@/types/feed";

type CreatePostFormProps = {
  onPostCreated: (post: FeedPost) => void;
};

export default function CreatePostForm({
  onPostCreated,
}: CreatePostFormProps) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const trimmed = content.trim();
    if (!trimmed || loading) return;

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

  return (
    <form className="rounded-xl bg-white p-4 shadow" onSubmit={handleSubmit}>
      <div className="flex gap-2">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write something..."
          required
          minLength={2}
          maxLength={500}
          disabled={loading}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 outline-none"
        />
        <button
          type="submit"
          disabled={loading || !content.trim()}
          className="rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {loading ? "Posting..." : "Post"}
        </button>
      </div>
    </form>
  );
}