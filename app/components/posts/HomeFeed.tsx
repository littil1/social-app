"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FeedPost, ReactionType } from "@/types/feed";
import CreatePostForm from "@/app/components/posts/CreatePostForm";
import PostCard from "@/app/components/posts/PostCard";

// =====================================================
// Types
// =====================================================

type HomeFeedProps = {
  initialPosts: FeedPost[];
  pageSize: number;
  isLoggedIn: boolean;
  currentUserProfile?: {
    username: string;
    avatar_url: string | null;
  } | null;
  showTopSection?: boolean;
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
  nextReaction: ReactionType | null
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
  currentUserProfile = null,
  showTopSection = true,
}: HomeFeedProps) {
  const [posts, setPosts] = useState<FeedPost[]>(initialPosts);
  const [offset, setOffset] = useState(initialPosts.length);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialPosts.length === pageSize);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [showOlderPosts, setShowOlderPosts] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const seenIds = useMemo(() => new Set(posts.map((post) => post.id)), [posts]);

  const todaysPosts = useMemo(
    () => posts.filter((post) => isTodayInZurich(post.created_at)),
    [posts]
  );

  const olderPosts = useMemo(
    () => posts.filter((post) => !isTodayInZurich(post.created_at)),
    [posts]
  );

  const topPosts = useMemo(() => getDailyTopPosts(todaysPosts), [todaysPosts]);

  const topPostIds = useMemo(
    () => new Set(topPosts.map((post) => post.id)),
    [topPosts]
  );

  const regularTodaysPosts = useMemo(
    () => todaysPosts.filter((post) => !topPostIds.has(post.id)),
    [todaysPosts, topPostIds]
  );

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

  useEffect(() => {
    if (!isCreateOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isCreateOpen]);

  function handlePostCreated(newPost: FeedPost) {
    setPosts((prev) => {
      if (seenIds.has(newPost.id)) return prev;
      return [newPost, ...prev];
    });
    setOffset((prev) => prev + 1);
  }

  function handleReactionUpdated(
    postId: number,
    nextReaction: ReactionType | null
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

  function handleCommentsCountChange(postId: number, count: number) {
    setPosts((prev) =>
      prev.map((post) => {
        if (post.id !== postId) return post;
        if (post.comments_count === count) return post;

        return {
          ...post,
          comments_count: count,
        };
      })
    );
  }

  function handlePostDeleted(postId: number) {
    setPosts((prev) => prev.filter((post) => post.id !== postId));
  }

  function openCreateModal() {
    setIsCreateOpen(true);
  }

  function closeCreateModal() {
    setIsCreateOpen(false);
  }

  return (
    <>
      <div className="space-y-6">
        {showTopSection && topPosts.length > 0 && (
          <section className="space-y-4">
            {topPosts.map((post) => (
              <PostCard
                key={`top-${post.id}`}
                post={post}
                dailyRank={post.dailyRank}
                detailHref={`/posts/${post.id}`}
                onReactionUpdated={handleReactionUpdated}
                onCommentCreated={handleCommentCreated}
                onCommentsCountChange={handleCommentsCountChange}
                onPostDeleted={handlePostDeleted}
                isLoggedIn={isLoggedIn}
              />
            ))}
          </section>
        )}

        {regularTodaysPosts.length > 0 && (
          <section className="space-y-4 pt-1">
            <div className="px-1 pb-1">
              <p className="text-base font-semibold text-gray-900">
                In the shadows
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Content is king. Your identity remains hidden until you become a Legend.
              </p>
            </div>

            {regularTodaysPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                detailHref={`/posts/${post.id}`}
                onReactionUpdated={handleReactionUpdated}
                onCommentCreated={handleCommentCreated}
                onCommentsCountChange={handleCommentsCountChange}
                onPostDeleted={handlePostDeleted}
                isLoggedIn={isLoggedIn}
              />
            ))}
          </section>
        )}

        {todaysPosts.length > 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
            <p className="text-base font-semibold text-gray-900">
              You’re all caught up.
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Create your own post or see who made history.
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center rounded-full bg-black px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Create Post
              </button>

              {olderPosts.length > 0 && !showOlderPosts && (
                <button
                  type="button"
                  onClick={() => setShowOlderPosts(true)}
                  className="inline-flex items-center rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  View Archive
                </button>
              )}

              <Link
                href="/hall-of-fame"
                className="inline-flex items-center rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                See the Hall
              </Link>
            </div>
          </div>
        )}

        {showOlderPosts && olderPosts.length > 0 && (
          <section className="space-y-4 pt-2">
            <div className="px-1 pb-1">
              <p className="text-base font-semibold text-gray-900">
                View Archive
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Past Posts.
              </p>
            </div>

            <div className="space-y-4 opacity-55">
              {olderPosts.map((post) => (
                <PostCard
                  key={`older-${post.id}`}
                  post={post}
                  detailHref={`/posts/${post.id}`}
                  onReactionUpdated={handleReactionUpdated}
                  onCommentCreated={handleCommentCreated}
                  onCommentsCountChange={handleCommentsCountChange}
                  onPostDeleted={handlePostDeleted}
                  isLoggedIn={isLoggedIn}
                />
              ))}
            </div>
          </section>
        )}

        {posts.length === 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
            <p className="text-base font-semibold text-gray-900">
              Lead the race.
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Make an impact.
            </p>

            <div className="mt-4">
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center rounded-full bg-black px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Create Post
              </button>
            </div>
          </div>
        )}
      </div>

      <div ref={sentinelRef} className="h-10" />

      {loadingMore && (
        <p className="pb-8 text-center text-sm text-gray-500">
          Show more ...
        </p>
      )}

      {!hasMore && posts.length > 0 && olderPosts.length > 0 && showOlderPosts && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
          <p className="text-base font-semibold text-gray-900">
            That's it.
          </p>
          <p className="mt-2 text-sm text-gray-500">
            You've seen everything.
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center rounded-full bg-black px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Create Post
            </button>

            <Link
              href="/hall-of-fame"
              className="inline-flex items-center rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              See the Hall
            </Link>
          </div>
        </div>
      )}

      {!hasMore && posts.length > 0 && olderPosts.length === 0 && (
        <p className="pb-24 text-center text-sm text-gray-400">
          Nothing more today.
        </p>
      )}

      <button
        type="button"
        onClick={openCreateModal}
        aria-label="Beitrag erstellen"
        className="fixed bottom-6 right-6 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-black text-3xl font-light text-white shadow-lg transition hover:scale-[1.03] hover:bg-gray-900"
      >
        +
      </button>

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-6">
          <div
            className="absolute inset-0"
            onClick={closeCreateModal}
            aria-hidden="true"
          />

          <div className="relative z-10 w-full rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-xl sm:rounded-3xl sm:p-6">
            <CreatePostForm
              onPostCreated={handlePostCreated}
              isLoggedIn={isLoggedIn}
              onClose={closeCreateModal}
              currentUserProfile={currentUserProfile}
            />
          </div>
        </div>
      )}
    </>
  );
}