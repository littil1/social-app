"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { FeedPost, FeedResponse, ReactionType } from "@/shared/types/feed";
import { getZurichHourBucket } from "@/features/winners/lib/daily-ranking";
import PostCard from "@/features/posts/components/PostCard";
import { KNOW_EVERYTHING_BADGE_KEY } from "@/features/badges/lib/profile-badges";

type HomeFeedProps = {
  initialTopThreeToday: FeedPost[];
  initialTodayFeed: FeedPost[];
  initialOlderFeed: FeedPost[];
  initialOlderHasMore: boolean;
  pageSize: number;
  isLoggedIn: boolean;
  initialHasKnowEverythingBadge?: boolean;
  showTopSection?: boolean;
};

type RankedFeedSection = {
  key: string;
  title: string;
  posts: FeedPost[];
  sectionClassName: string;
};

function deduplicatePosts(posts: FeedPost[]): FeedPost[] {
  const seen = new Set<number>();
  return posts.filter((post) => {
    if (seen.has(post.id)) {
      return false;
    }

    seen.add(post.id);
    return true;
  });
}

function applyReactionUpdate(
  post: FeedPost,
  nextReaction: ReactionType | null
): FeedPost {
  const previousReaction = post.viewer_reaction;
  if (previousReaction === nextReaction) return post;

  const nextReactionCounts = { ...post.reaction_counts };
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

function slicePostsForRanks(
  posts: FeedPost[],
  startRank: number,
  endRank: number
) {
  if (endRank < startRank) {
    return [];
  }

  const startIndex = Math.max(0, startRank - 4);
  const endIndex = Math.max(startIndex, endRank - 3);

  return posts.slice(startIndex, endIndex);
}

function buildTodayRankingSections(
  posts: FeedPost[],
  totalPostsToday: number
): RankedFeedSection[] {
  if (posts.length === 0 || totalPostsToday <= 3) {
    return [];
  }

  const sections: RankedFeedSection[] = [];
  let nextRankStart = 4;

  if (totalPostsToday >= 1000) {
    const top1Posts = slicePostsForRanks(
      posts,
      nextRankStart,
      Math.min(totalPostsToday, 10)
    );

    if (top1Posts.length > 0) {
      sections.push({
        key: "top-1-percent",
        title: "🏅 Top 1% Today",
        posts: top1Posts,
        sectionClassName:
          "rounded-[32px] border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-teal-50 to-white p-5 shadow-[0_24px_60px_-44px_rgba(16,185,129,0.28)] sm:p-6",
      });
      nextRankStart = 11;
    }

    const top10Posts = slicePostsForRanks(
      posts,
      nextRankStart,
      Math.min(totalPostsToday, 100)
    );

    if (top10Posts.length > 0) {
      sections.push({
        key: "top-10-percent",
        title: "⚡ Top 10% Today",
        posts: top10Posts,
        sectionClassName:
          "rounded-[32px] border border-sky-200/70 bg-gradient-to-br from-sky-50 via-cyan-50 to-white p-5 shadow-[0_24px_60px_-42px_rgba(14,165,233,0.35)] sm:p-6",
      });
      nextRankStart = 101;
    }
  } else if (totalPostsToday >= 100) {
    const top10Posts = slicePostsForRanks(
      posts,
      nextRankStart,
      Math.min(totalPostsToday, 10)
    );

    if (top10Posts.length > 0) {
      sections.push({
        key: "top-10-percent",
        title: "⚡ Top 10% Today",
        posts: top10Posts,
        sectionClassName:
          "rounded-[32px] border border-sky-200/70 bg-gradient-to-br from-sky-50 via-cyan-50 to-white p-5 shadow-[0_24px_60px_-42px_rgba(14,165,233,0.35)] sm:p-6",
      });
      nextRankStart = 11;
    }
  }

  const remainingPosts = slicePostsForRanks(
    posts,
    nextRankStart,
    totalPostsToday
  );

  if (remainingPosts.length > 0) {
    sections.push({
      key: "more-from-today",
      title: "🌀 More from Today",
      posts: remainingPosts,
      sectionClassName:
        "rounded-[32px] border border-neutral-200/80 bg-gradient-to-br from-neutral-50 via-white to-white p-5 shadow-[0_24px_60px_-48px_rgba(15,23,42,0.18)] sm:p-6",
    });
  }

  return sections;
}

export default function HomeFeed({
  initialTopThreeToday,
  initialTodayFeed,
  initialOlderFeed,
  initialOlderHasMore,
  pageSize,
  isLoggedIn,
  initialHasKnowEverythingBadge = false,
  showTopSection = true,
}: HomeFeedProps) {
  const [topThreeToday, setTopThreeToday] = useState<FeedPost[]>(() =>
    deduplicatePosts(initialTopThreeToday)
  );
  const [todayFeed, setTodayFeed] = useState<FeedPost[]>(() =>
    deduplicatePosts(initialTodayFeed)
  );
  const [olderFeed, setOlderFeed] = useState<FeedPost[]>(() =>
    deduplicatePosts(initialOlderFeed)
  );
  const [offset, setOffset] = useState(initialOlderFeed.length);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialOlderHasMore);
  const [showOlderPosts, setShowOlderPosts] = useState(false);
  const [hasKnowEverythingBadge, setHasKnowEverythingBadge] = useState(
    initialHasKnowEverythingBadge
  );
  const [claimingKnowEverythingBadge, setClaimingKnowEverythingBadge] =
    useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const router = useRouter();

  useEffect(() => {
    setTopThreeToday(deduplicatePosts(initialTopThreeToday));
  }, [initialTopThreeToday]);

  useEffect(() => {
    setTodayFeed(deduplicatePosts(initialTodayFeed));
  }, [initialTodayFeed]);

  useEffect(() => {
    setOlderFeed(deduplicatePosts(initialOlderFeed));
    setOffset(initialOlderFeed.length);
    setHasMore(initialOlderHasMore);
  }, [initialOlderFeed, initialOlderHasMore]);

  useEffect(() => {
    setHasKnowEverythingBadge(initialHasKnowEverythingBadge);
  }, [initialHasKnowEverythingBadge]);

  useEffect(() => {
    let currentBucket = getZurichHourBucket(new Date());

    const interval = window.setInterval(() => {
      const nextBucket = getZurichHourBucket(new Date());
      if (nextBucket === currentBucket) {
        return;
      }

      currentBucket = nextBucket;
      router.refresh();
    }, 30000);

    return () => window.clearInterval(interval);
  }, [router]);

  const updatePostLists = useCallback(
    (updater: (post: FeedPost) => FeedPost) => {
      setTopThreeToday((prev) => prev.map(updater));
      setTodayFeed((prev) => prev.map(updater));
      setOlderFeed((prev) => prev.map(updater));
    },
    []
  );

  const todaysPostsCount = topThreeToday.length + todayFeed.length;
  const remainingTodayPostsCount = todayFeed.length;

  useEffect(() => {
    if (todaysPostsCount < 10 && olderFeed.length > 0 && !showOlderPosts) {
      setShowOlderPosts(true);
    }
  }, [todaysPostsCount, olderFeed.length, showOlderPosts]);

  const loadMore = useCallback(async () => {
    if (!showOlderPosts || loadingMore || !hasMore) return;

    setLoadingMore(true);

    try {
      const res = await fetch(`/api/feed?offset=${offset}&limit=${pageSize}`, {
        method: "GET",
        cache: "no-store",
      });
      const data: FeedResponse = await res.json();

      setOlderFeed((prev) => deduplicatePosts([...prev, ...data.posts]));
      setOffset((prev) => prev + data.posts.length);
      setHasMore(data.hasMore);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, offset, pageSize, showOlderPosts]);

  useEffect(() => {
    if (!showOlderPosts || !hasMore) return;

    const element = sentinelRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "300px" }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [hasMore, loadMore, showOlderPosts]);

  const handleReactionUpdated = useCallback(
    (postId: number, nextReaction: ReactionType | null) => {
      updatePostLists((post) =>
        post.id === postId ? applyReactionUpdate(post, nextReaction) : post
      );
    },
    [updatePostLists]
  );

  const handleCommentCreated = useCallback(
    (postId: number) => {
      updatePostLists((post) =>
        post.id === postId
          ? {
              ...post,
              comments_count: post.comments_count + 1,
            }
          : post
      );
    },
    [updatePostLists]
  );

  const handleCommentsCountChange = useCallback(
    (postId: number, count: number) => {
      updatePostLists((post) =>
        post.id === postId && post.comments_count !== count
          ? { ...post, comments_count: count }
          : post
      );
    },
    [updatePostLists]
  );

  const handlePostDeleted = useCallback((postId: number) => {
    setTopThreeToday((prev) => prev.filter((post) => post.id !== postId));
    setTodayFeed((prev) => prev.filter((post) => post.id !== postId));
    setOlderFeed((prev) => prev.filter((post) => post.id !== postId));
  }, []);

  const handlePostMutationCommitted = useCallback(() => {
    router.refresh();
  }, [router]);

  const handleClaimKnowEverythingBadge = useCallback(async () => {
    if (!isLoggedIn || hasKnowEverythingBadge || claimingKnowEverythingBadge) {
      return;
    }

    setClaimingKnowEverythingBadge(true);

    try {
      const res = await fetch("/api/profile/badges/know-everything", {
        method: "POST",
      });

      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Badge claim failed.");
      }

      const data = (await res.json()) as { badges?: string[] };
      if (!data.badges?.includes(KNOW_EVERYTHING_BADGE_KEY)) {
        throw new Error("Badge claim did not persist.");
      }

      setHasKnowEverythingBadge(true);
      router.refresh();
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error ? error.message : "Badge could not be claimed."
      );
    } finally {
      setClaimingKnowEverythingBadge(false);
    }
  }, [
    claimingKnowEverythingBadge,
    hasKnowEverythingBadge,
    isLoggedIn,
    router,
  ]);

  const todaySections = buildTodayRankingSections(todayFeed, todaysPostsCount);

  return (
    <div className="space-y-12">
      {showTopSection && topThreeToday.length > 0 && (
        <section className="space-y-4">
          {topThreeToday.map((post, index) => (
            <PostCard
              key={`top-${post.id}`}
              post={post}
              dailyRank={(index + 1) as 1 | 2 | 3}
              onReactionUpdated={handleReactionUpdated}
              onCommentCreated={handleCommentCreated}
              onCommentsCountChange={handleCommentsCountChange}
              onPostDeleted={handlePostDeleted}
              isLoggedIn={isLoggedIn}
              disableRouterRefresh
              onMutationCommitted={handlePostMutationCommitted}
            />
          ))}
        </section>
      )}

      {remainingTodayPostsCount > 0 && (
        <div className="rounded-full border border-neutral-200 bg-white/80 px-4 py-2 text-sm font-medium text-neutral-600 shadow-sm backdrop-blur">
          {remainingTodayPostsCount} more posts in the race — {remainingTodayPostsCount + 3} today
        </div>
      )}

      {todaySections.length > 0 && (
        <div className="-mt-4 space-y-8 sm:-mt-5">
          {todaySections.map((section) => (
            <section key={section.key} className={section.sectionClassName}>
              <div className="space-y-5">
                <div className="px-1">
                  <h2 className="text-xl font-black text-neutral-950">
                    {section.title}
                  </h2>
                </div>

                <div className="space-y-4">
                  {section.posts.map((post) => (
                    <PostCard
                      key={`today-${section.key}-${post.id}`}
                      post={post}
                      onReactionUpdated={handleReactionUpdated}
                      onCommentCreated={handleCommentCreated}
                      onCommentsCountChange={handleCommentsCountChange}
                      onPostDeleted={handlePostDeleted}
                      isLoggedIn={isLoggedIn}
                      disableRouterRefresh
                      onMutationCommitted={handlePostMutationCommitted}
                    />
                  ))}
                </div>
              </div>
            </section>
          ))}
        </div>
      )}

      <div className="rounded-[32px] border border-neutral-200 bg-white p-10 text-center shadow-sm">
        {todaysPostsCount > 0 ? (
          <p className="text-lg font-black text-neutral-950">
            That’s everything for today.
          </p>
        ) : (
          <>
            <div className="mb-4 inline-flex rounded-full border border-emerald-100 bg-emerald-50 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">
              Live Race
            </div>

            <h1 className="text-4xl font-black text-neutral-950 sm:text-6xl">
              The Arena is <span className="text-neutral-400">quiet.</span>
            </h1>
          </>
        )}

        <div className="mt-8 flex justify-center gap-3">
          <button
            onClick={() =>
              window.dispatchEvent(new CustomEvent("open-create-post"))
            }
            className="rounded-full bg-neutral-950 px-8 py-4 text-sm font-bold text-white shadow-lg transition hover:scale-105"
          >
            Create Post
          </button>

          {!showOlderPosts && olderFeed.length > 0 && (
            <button
              onClick={() => setShowOlderPosts(true)}
              className="rounded-full border border-neutral-200 bg-white px-8 py-4 text-sm font-bold text-neutral-950"
            >
              View Archive
            </button>
          )}
        </div>
      </div>

      {showOlderPosts && olderFeed.length > 0 && (
        <section className="space-y-6 opacity-60">
          <div className="px-2">
            <h2 className="text-xl font-black text-neutral-950">
              What resonated before
            </h2>
          </div>

          <div className="space-y-4">
            {olderFeed.map((post) => (
              <PostCard
                key={`older-${post.id}`}
                post={post}
                onReactionUpdated={handleReactionUpdated}
                onCommentCreated={handleCommentCreated}
                onCommentsCountChange={handleCommentsCountChange}
                onPostDeleted={handlePostDeleted}
                isLoggedIn={isLoggedIn}
                disableRouterRefresh
                onMutationCommitted={handlePostMutationCommitted}
              />
            ))}
          </div>

          {loadingMore && hasMore && (
            <div className="flex items-center justify-center gap-2 py-4 text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-400">
              <span className="h-2 w-2 animate-pulse rounded-full bg-neutral-300" />
              Loading more posts
            </div>
          )}
        </section>
      )}

      {!hasMore && olderFeed.length > 0 && showOlderPosts && (
        <div className="py-16 px-4 text-center">
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-8 rounded-[40px] border border-neutral-100 bg-white p-12 shadow-sm">
            <div className="space-y-4">
              <h3 className="text-lg font-black tracking-tight text-neutral-950">
                That is actually the end.
              </h3>

              <div className="inline-flex items-center gap-3">
                <div className="h-[1px] w-8 bg-neutral-200" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-500">
                  You have seen everything
                </span>
                <div className="h-[1px] w-8 bg-neutral-200" />
              </div>
            </div>

            {isLoggedIn && !hasKnowEverythingBadge && (
              <button
                type="button"
                onClick={() => void handleClaimKnowEverythingBadge()}
                disabled={claimingKnowEverythingBadge}
                className="rounded-full bg-neutral-950 px-6 py-3 text-sm font-black text-white shadow-lg transition hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {claimingKnowEverythingBadge
                  ? "Claiming..."
                  : "Claim special badge"}
              </button>
            )}
          </div>
        </div>
      )}

      <div ref={sentinelRef} className="h-6 sm:h-10" />
    </div>
  );
}
