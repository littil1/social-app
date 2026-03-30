"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FeedPost, PostReactionType } from "@/types/feed";
import CreatePostForm from "@/app/components/posts/CreatePostForm";
import PostCard from "@/app/components/posts/PostCard";

type HomeFeedProps = {
  initialPosts: FeedPost[];
  pageSize: number;
  isLoggedIn: boolean;
};

type RankedTopPost = FeedPost & {
  dailyRank: 1 | 2 | 3;
};

// =====================================================
// Helpers
// =====================================================

function getZurichDayKey(date: Date | string) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Zurich",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
}

function isTodayInZurich(dateString: string) {
  return getZurichDayKey(dateString) === getZurichDayKey(new Date());
}

function getDailyTopPosts(posts: FeedPost[]): RankedTopPost[] {
  const todaysPosts = posts.filter((post) => isTodayInZurich(post.created_at));

  const ranked = [...todaysPosts]
    .sort((a, b) => {
      if (b.reactions_count !== a.reactions_count) {
        return b.reactions_count - a.reactions_count;
      }

      if (b.comments_count !== a.comments_count) {
        return b.comments_count - a.comments_count;
      }

      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    })
    .slice(0, 3);

  return ranked.map((post, index) => ({
    ...post,
    dailyRank: (index + 1) as 1 | 2 | 3,
  }));
}

function applyReactionUpdate(
  post: FeedPost,
  nextReaction: PostReactionType | null
): FeedPost {
  const previousReaction = post.viewer_reaction;

  if (previousReaction === nextReaction) {
    return post;
  }

  const nextReactionCounts = {
    ...post.reaction_counts,
  };

  let nextReactionsCount = post.reactions_count;

  if (previousReaction) {
    nextReactionCounts[previousReaction] = Math.max(
      0,
      nextReactionCounts[previousReaction] - 1
    );
    nextReactionsCount = Math.max(0, nextReactionsCount - 1);
  }

  if (nextReaction) {
    nextReactionCounts[nextReaction] += 1;
    nextReactionsCount += 1;
  }

  return {
    ...post,
    viewer_reaction: nextReaction,
    reaction_counts: nextReactionCounts,
    reactions_count: nextReactionsCount,
  };
}

// =====================================================
// Component
// =====================================================

export default function HomeFeed({
  initialPosts,
  pageSize,
  isLoggedIn,
}: HomeFeedProps) {
  // =====================================================
  // State
  // =====================================================

  const [posts, setPosts] = useState<FeedPost[]>(initialPosts);
  const [offset, setOffset] = useState(initialPosts.length);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialPosts.length === pageSize);

  // =====================================================
  // Refs
  // =====================================================

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // =====================================================
  // Derived Values
  // =====================================================

  const seenIds = useMemo(() => new Set(posts.map((post) => post.id)), [posts]);

  const topPosts = useMemo(() => getDailyTopPosts(posts), [posts]);

  const topPostIds = useMemo(
    () => new Set(topPosts.map((post) => post.id)),
    [topPosts]
  );

  const regularPosts = useMemo(
    () => posts.filter((post) => !topPostIds.has(post.id)),
    [posts, topPostIds]
  );

  // =====================================================
  // Data Loading
  // =====================================================

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

  // =====================================================
  // Effects
  // =====================================================

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

  // =====================================================
  // Actions
  // =====================================================

  function handlePostCreated(newPost: FeedPost) {
    setPosts((prev) => {
      if (seenIds.has(newPost.id)) return prev;
      return [newPost, ...prev];
    });
    setOffset((prev) => prev + 1);
  }

  function handleReactionUpdated(
    postId: number,
    nextReaction: PostReactionType | null
  ) {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId ? applyReactionUpdate(post, nextReaction) : post
      )
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

  // =====================================================
  // Render
  // =====================================================

  return (
    <div className="space-y-4 pb-40">
      <div className="space-y-4">
        {topPosts.map((post) => (
          <PostCard
            key={`top-${post.id}`}
            post={post}
            dailyRank={post.dailyRank}
            detailHref={`/posts/${post.id}`}
            onReactionUpdated={handleReactionUpdated}
            onCommentCreated={handleCommentCreated}
            onPostDeleted={handlePostDeleted}
          />
        ))}

        {regularPosts.map((post, index) => (
          <div key={post.id} className="space-y-4">
            <PostCard
              post={post}
              detailHref={`/posts/${post.id}`}
              onReactionUpdated={handleReactionUpdated}
              onCommentCreated={handleCommentCreated}
              onPostDeleted={handlePostDeleted}
            />

            {index === 99 && (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow">
                <p className="text-base font-semibold text-gray-900">Pause?</p>
                <p className="mt-2 text-sm text-gray-500">
                  Du hast bereits 100 weitere Posts gesehen.
                </p>
              </div>
            )}
          </div>
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

      {isLoggedIn && (
        <div className="pointer-events-none fixed bottom-4 left-1/2 z-30 w-full max-w-[860px] -translate-x-1/2 px-4">
          <div className="pointer-events-auto">
            <div className="rounded-2xl border border-gray-200 bg-white/95 shadow-2xl backdrop-blur">
              <CreatePostForm onPostCreated={handlePostCreated} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}