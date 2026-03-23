"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FeedPost } from "@/types/feed";
import CreatePostForm from "@/app/components/feed/CreatePostForm";
import PostCard from "@/app/components/feed/PostCard";

type HomeFeedProps = {
  initialPosts: FeedPost[];
  pageSize: number;
  isLoggedIn: boolean;
};

export default function HomeFeed({
  initialPosts,
  pageSize,
  isLoggedIn,
}: HomeFeedProps) {
  const [posts, setPosts] = useState<FeedPost[]>(initialPosts);
  const [offset, setOffset] = useState(initialPosts.length);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialPosts.length === pageSize);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const seenIds = useMemo(() => new Set(posts.map((post) => post.id)), [posts]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);

    try {
      const res = await fetch(`/api/feed?offset=${offset}&limit=${pageSize}`, {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("Feed konnte nicht geladen werden.");
      }

      const data: FeedPost[] = await res.json();

      setPosts((prev) => {
        const existingIds = new Set(prev.map((post) => post.id));
        const next = data.filter((post) => !existingIds.has(post.id));
        return [...prev, ...next];
      });

      setOffset((prev) => prev + data.length);
      setHasMore(data.length === pageSize);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, offset, pageSize]);

  useEffect(() => {
    const element = sentinelRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first?.isIntersecting) {
          loadMore();
        }
      },
      {
        rootMargin: "300px",
      }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [loadMore]);

  function handlePostCreated(newPost: FeedPost) {
    setPosts((prev) => {
      if (seenIds.has(newPost.id)) return prev;
      return [newPost, ...prev];
    });
    setOffset((prev) => prev + 1);
  }

  function handleLikeUpdated(postId: number, liked: boolean) {
    setPosts((prev) =>
      prev.map((post) => {
        if (post.id !== postId) return post;

        return {
          ...post,
          viewer_has_liked: liked,
          likes_count: liked
            ? post.likes_count + 1
            : Math.max(0, post.likes_count - 1),
        };
      })
    );
  }

  function handleCommentCreated(postId: number) {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? { ...post, comments_count: post.comments_count + 1 }
          : post
      )
    );
  }

  function handlePostDeleted(postId: number) {
    setPosts((prev) => prev.filter((post) => post.id !== postId));
  }

  return (
    <div className="space-y-6">
      {isLoggedIn && <CreatePostForm onPostCreated={handlePostCreated} />}

      <div className="space-y-4">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onLikeUpdated={handleLikeUpdated}
            onCommentCreated={handleCommentCreated}
            onPostDeleted={handlePostDeleted}
          />
        ))}

        {posts.length === 0 && (
          <div className="rounded-xl bg-white p-6 text-center text-gray-500 shadow">
            No posts yet.
          </div>
        )}
      </div>

      <div ref={sentinelRef} className="h-10" />

      {loadingMore && (
        <p className="pb-8 text-center text-sm text-gray-500">
          Lade mehr Posts ...
        </p>
      )}

      {!hasMore && posts.length > 0 && (
        <p className="pb-8 text-center text-sm text-gray-500">
          Keine weiteren Posts.
        </p>
      )}
    </div>
  );
}