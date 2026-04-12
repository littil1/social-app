"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FeedPost, ReactionType } from "@/types/feed";
import PostCard from "@/app/components/posts/PostCard";

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
      if (b.reactions_count !== a.reactions_count) return b.reactions_count - a.reactions_count;
      if (b.comments_count !== a.comments_count) return b.comments_count - a.comments_count;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    })
    .slice(0, 3);

  return ranked.map((post, index) => ({
    ...post,
    dailyRank: (index + 1) as 1 | 2 | 3,
  }));
}

function applyReactionUpdate(post: FeedPost, nextReaction: ReactionType | null): FeedPost {
  const previousReaction = post.viewer_reaction;
  if (previousReaction === nextReaction) return post;

  const nextReactionCounts = { ...post.reaction_counts };
  let nextReactionsCount = post.reactions_count;

  if (previousReaction) {
    nextReactionCounts[previousReaction] = Math.max(0, nextReactionCounts[previousReaction] - 1);
    nextReactionsCount = Math.max(0, nextReactionsCount - 1);
  }
  if (nextReaction) {
    nextReactionCounts[nextReaction] += 1;
    nextReactionsCount += 1;
  }

  return { ...post, viewer_reaction: nextReaction, reaction_counts: nextReactionCounts, reactions_count: nextReactionsCount };
}

// =====================================================
// Component
// =====================================================

export default function HomeFeed({
  initialPosts,
  pageSize,
  isLoggedIn,
  showTopSection = true,
}: HomeFeedProps) {
  const [posts, setPosts] = useState<FeedPost[]>(initialPosts);
  const [offset, setOffset] = useState(initialPosts.length);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialPosts.length === pageSize);
  const [showOlderPosts, setShowOlderPosts] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const todaysPosts = useMemo(() => posts.filter((post) => isTodayInZurich(post.created_at)), [posts]);
  const olderPosts = useMemo(() => posts.filter((post) => !isTodayInZurich(post.created_at)), [posts]);
  const topPosts = useMemo(() => getDailyTopPosts(todaysPosts), [todaysPosts]);
  const topPostIds = useMemo(() => new Set(topPosts.map((post) => post.id)), [topPosts]);
  const regularTodaysPosts = useMemo(() => todaysPosts.filter((post) => !topPostIds.has(post.id)), [todaysPosts, topPostIds]);

  const triggerGlobalPost = () => {
    window.dispatchEvent(new CustomEvent("open-create-post"));
  };

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/feed?offset=${offset}&limit=${pageSize}`, { method: "GET", cache: "no-store" });
      if (!res.ok) throw new Error("Feed load failed");
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
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) loadMore();
    }, { rootMargin: "300px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, [loadMore]);

  function handleReactionUpdated(postId: number, nextReaction: ReactionType | null) {
    setPosts((prev) => prev.map((post) => post.id === postId ? applyReactionUpdate(post, nextReaction) : post));
  }

  function handleCommentCreated(postId: number) {
    setPosts((prev) => prev.map((post) => post.id === postId ? { ...post, comments_count: post.comments_count + 1 } : post));
  }

  function handleCommentsCountChange(postId: number, count: number) {
    setPosts((prev) => prev.map((post) => post.id === postId ? { ...post, comments_count: count } : post));
  }

  function handlePostDeleted(postId: number) {
    setPosts((prev) => prev.filter((post) => post.id !== postId));
  }

  return (
    <>
      <div className="space-y-12">
        {/* 1. TOP 3 TODAY */}
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

        {/* 2. REGULAR TODAY POSTS */}
        {regularTodaysPosts.length > 0 && (
          <section className="space-y-6">
            <div className="px-2">
              <h2 className="text-xl font-black tracking-tight text-neutral-950">In the shadows</h2>
              <p className="mt-1 text-sm font-medium text-neutral-400">Content is king. Every thought fights for its rank.</p>
            </div>
            <div className="space-y-4">
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
            </div>
          </section>
        )}

        {/* 3. STATUS AREA / EMPTY STATE */}
        <div className="rounded-[32px] border border-neutral-200 bg-white p-10 text-center shadow-sm">
          {todaysPosts.length > 0 ? (
            <>
              <p className="text-lg font-black tracking-tight text-neutral-950">You’re all caught up.</p>
              <p className="mt-2 text-sm font-medium text-neutral-400">Join the race or explore the legacy.</p>
            </>
          ) : (
            <>
              <div className="mb-4 inline-flex rounded-full border border-emerald-100 bg-emerald-50 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">
                Live Race
              </div>
              <h1 className="text-4xl font-black tracking-tighter text-neutral-950 sm:text-8xl">
                The Arena is <span className="text-neutral-400 text-glow-neutral">quiet.</span>
              </h1>
              <p className="mx-auto mt-4 max-w-md text-base font-medium text-neutral-500">
                Be the first to share a thought and lead today's ranking.
              </p>
            </>
          )}

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={triggerGlobalPost}
              className="rounded-full bg-neutral-950 px-8 py-4 text-sm font-bold text-white transition hover:scale-105 active:scale-95 shadow-lg"
            >
              Create Post
            </button>
            {olderPosts.length > 0 && !showOlderPosts && (
              <button
                type="button"
                onClick={() => setShowOlderPosts(true)}
                className="rounded-full border border-neutral-200 bg-white px-8 py-4 text-sm font-bold text-neutral-950 transition hover:bg-neutral-50"
              >
                View Archive
              </button>
            )}
            <Link href="/hall-of-fame" className="rounded-full border border-neutral-200 bg-white px-8 py-4 text-sm font-bold text-neutral-950 transition hover:bg-neutral-50">
              See the Hall
            </Link>
          </div>
        </div>

        {/* 4. ARCHIVE SECTION */}
        {showOlderPosts && olderPosts.length > 0 && (
          <section className="space-y-6 pt-4">
            <div className="px-2">
              <h2 className="text-xl font-black tracking-tight text-neutral-950">Archive</h2>
              <p className="mt-1 text-sm font-medium text-neutral-400">Past contributions that shaped the Place.</p>
            </div>
            <div className="space-y-4 opacity-60">
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
      </div>

      <div ref={sentinelRef} className="h-10" />
    </>
  );
}