"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { FeedPost, FeedResponse, ReactionType } from "@/shared/types/feed";
import { getZurichHourBucket } from "@/features/winners/lib/daily-ranking";
import PostCard from "@/features/posts/components/PostCard";
import { KNOW_EVERYTHING_BADGE_KEY } from "@/features/badges/lib/profile-badges";
import { scheduleRefresh } from "@/lib/refresh-batcher";
import FormError from "@/shared/components/ui/FormError";
import {
  applyOptimisticPostBoost,
  applyOptimisticPostReaction,
  type OptimisticPostReactionMeta,
} from "@/shared/lib/optimistic-post";

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

const FEED_SCROLL_STORAGE_KEY = "app-feed-scroll-y";

function deduplicatePosts(posts: FeedPost[]): FeedPost[] {
  const seen = new Set<number>();
  return posts.filter((post) => {
    if (post.moderation_status === "removed") {
      return false;
    }

    if (seen.has(post.id)) {
      return false;
    }

    seen.add(post.id);
    return true;
  });
}

function getFeedSignature(posts: FeedPost[]) {
  return posts
    .map((post) =>
      [
        post.id,
        post.created_at,
        post.content,
        post.moderation_status,
        post.moderation_reason ?? "",
        post.moderation_report_count ?? 0,
        post.moderation_ai_checked_at ?? "",
        post.comments_count,
        post.reactions_count,
        post.viewer_reaction ?? "",
        post.reaction_counts?.like ?? 0,
        post.reaction_counts?.funny ?? 0,
        post.reaction_counts?.wow ?? 0,
        post.reaction_counts?.fire ?? 0,
        post.boost_count,
        post.viewer_has_boosted ? 1 : 0,
        post.viewer_boost_available_today ? 1 : 0,
        post.is_today_post ? 1 : 0,
        post.can_boost ? 1 : 0,
        post.can_delete ? 1 : 0,
      ].join(":")
    )
    .join("|");
}

function areFeedsEqual(currentPosts: FeedPost[], nextPosts: FeedPost[]) {
  return getFeedSignature(currentPosts) === getFeedSignature(nextPosts);
}

function mergeVisibleFeed(currentPosts: FeedPost[], nextPosts: FeedPost[]) {
  return nextPosts.length >= currentPosts.length
    ? nextPosts
    : nextPosts.filter((post) => post.moderation_status !== "removed");
}

function rememberFeedScroll() {
  window.sessionStorage.setItem(
    FEED_SCROLL_STORAGE_KEY,
    String(window.scrollY)
  );
}

function restoreFeedScroll() {
  const savedScroll = window.sessionStorage.getItem(FEED_SCROLL_STORAGE_KEY);
  if (!savedScroll) return;

  window.sessionStorage.removeItem(FEED_SCROLL_STORAGE_KEY);

  window.requestAnimationFrame(() => {
    window.scrollTo(0, Number(savedScroll));
  });
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
  const [claimBadgeError, setClaimBadgeError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const pendingPostReactionsRef = useRef(
    new Map<number, ReactionType | null>()
  );

  const router = useRouter();

  const overlayPendingReactions = useCallback((posts: FeedPost[]) => {
    const pendingReactions = pendingPostReactionsRef.current;
    let changed = false;

    const nextPosts = posts.map((post) => {
      if (!pendingReactions.has(post.id)) {
        return post;
      }

      const pendingReaction = pendingReactions.get(post.id) ?? null;

      if (post.viewer_reaction === pendingReaction) {
        pendingReactions.delete(post.id);
        return post;
      }

      changed = true;
      return applyOptimisticPostReaction(post, pendingReaction);
    });

    return changed ? nextPosts : posts;
  }, []);

  useEffect(() => {
    const nextTopThreeToday = overlayPendingReactions(
      deduplicatePosts(initialTopThreeToday)
    );
    setTopThreeToday((prev) =>
      areFeedsEqual(prev, nextTopThreeToday) ? prev : nextTopThreeToday
    );
  }, [initialTopThreeToday, overlayPendingReactions]);

  useEffect(() => {
    const nextTodayFeed = overlayPendingReactions(
      deduplicatePosts(initialTodayFeed)
    );
    setTodayFeed((prev) =>
      areFeedsEqual(prev, nextTodayFeed) ? prev : nextTodayFeed
    );
  }, [initialTodayFeed, overlayPendingReactions]);

  useEffect(() => {
    const nextOlderFeed = overlayPendingReactions(
      deduplicatePosts(initialOlderFeed)
    );
    setOlderFeed((prev) => {
      const mergedFeed = mergeVisibleFeed(prev, nextOlderFeed);
      return areFeedsEqual(prev, mergedFeed) ? prev : mergedFeed;
    });
    setOffset((prev) => Math.max(prev, nextOlderFeed.length));
    setHasMore(initialOlderHasMore);
  }, [initialOlderFeed, initialOlderHasMore, overlayPendingReactions]);

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
      rememberFeedScroll();
      router.refresh();
    }, 30000);

    return () => window.clearInterval(interval);
  }, [router]);

  useEffect(() => {
    restoreFeedScroll();
  });

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

      setOlderFeed((prev) =>
        overlayPendingReactions(deduplicatePosts([...prev, ...data.posts]))
      );
      setOffset((prev) => prev + data.posts.length);
      setHasMore(data.hasMore);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingMore(false);
    }
  }, [
    hasMore,
    loadingMore,
    offset,
    overlayPendingReactions,
    pageSize,
    showOlderPosts,
  ]);

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
    (
      postId: number,
      nextReaction: ReactionType | null,
      meta?: OptimisticPostReactionMeta
    ) => {
      if (meta?.status === "rollback") {
        pendingPostReactionsRef.current.delete(postId);
      } else {
        pendingPostReactionsRef.current.set(postId, nextReaction);
      }

      updatePostLists((post) =>
        post.id === postId
          ? applyOptimisticPostReaction(post, nextReaction)
          : post
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
              relevance_score:
                typeof post.relevance_score === "number"
                  ? post.relevance_score + 2
                  : post.relevance_score,
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
          ? {
              ...post,
              comments_count: count,
              relevance_score:
                typeof post.relevance_score === "number"
                  ? Math.max(
                      0,
                      post.relevance_score + (count - post.comments_count) * 2
                    )
                  : post.relevance_score,
            }
          : post
      );
    },
    [updatePostLists]
  );

  const handleBoosted = useCallback(
    (postId: number, boostCount: number) => {
      updatePostLists((post) =>
        applyOptimisticPostBoost(post, postId, boostCount)
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
    rememberFeedScroll();
    scheduleRefresh(router);
  }, [router]);

  const handleClaimKnowEverythingBadge = useCallback(async () => {
    if (!isLoggedIn || hasKnowEverythingBadge || claimingKnowEverythingBadge) {
      return;
    }

    setClaimBadgeError(null);
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
      rememberFeedScroll();
      router.refresh();
    } catch (error) {
      console.error(error);
      setClaimBadgeError(
        error instanceof Error
          ? error.message
          : "Could not claim this badge. Try again."
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

  const todaySections = useMemo(
    () => buildTodayRankingSections(todayFeed, todaysPostsCount),
    [todayFeed, todaysPostsCount]
  );

  return (
    <div className="space-y-8 sm:space-y-12">
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
              onBoosted={handleBoosted}
              isLoggedIn={isLoggedIn}
              disableRouterRefresh
              onMutationCommitted={handlePostMutationCommitted}
            />
          ))}
        </section>
      )}

      {remainingTodayPostsCount > 0 && (
        <div className="rounded-[22px] border border-neutral-200 bg-white/80 px-4 py-2 text-sm font-medium text-neutral-600 shadow-sm backdrop-blur sm:rounded-full">
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
                      onBoosted={handleBoosted}
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

      <div className="rounded-[32px] border border-neutral-200 bg-white p-6 text-center shadow-sm sm:p-10">
        {todaysPostsCount > 0 ? (
          <p className="text-lg font-black text-neutral-950">
            That’s everything for today.
            <br />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-500">
             It&apos;s your turn now
            </span>
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

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
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
                onBoosted={handleBoosted}
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
        <div className="px-2 py-10 text-center sm:px-4 sm:py-16">
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 rounded-[32px] border border-neutral-100 bg-white p-6 shadow-sm sm:gap-8 sm:rounded-[40px] sm:p-12">
            <div className="space-y-4">
              <h3 className="text-lg font-black tracking-tight text-neutral-950">
                This is actually the end.
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
              <div className="flex w-full max-w-xs flex-col items-center gap-3">
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
                {claimBadgeError && <FormError message={claimBadgeError} />}
              </div>
            )}
          </div>
        </div>
      )}

      <div ref={sentinelRef} className="h-6 sm:h-10" />
    </div>
  );
}
