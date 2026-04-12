"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { FeedPost, ReactionType } from "@/types/feed";
import PostCard from "@/app/components/posts/PostCard";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser"; 

type HomeFeedProps = {
  initialPosts: FeedPost[];
  pageSize: number;
  isLoggedIn: boolean;
  showTopSection?: boolean;
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

// Wir nutzen die Gewichtung: Reactions (1) + Comments (2)
function getEchoScore(post: FeedPost) {
  return (post.reactions_count || 0) + ((post.comments_count || 0) * 2);
}

// Zentrale Funktion um Duplikate nach ID hart zu entfernen
function deduplicatePosts(posts: FeedPost[]): FeedPost[] {
  const seen = new Set();
  return posts.filter((post) => {
    if (seen.has(post.id)) return false;
    seen.add(post.id);
    return true;
  });
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
// Main Component
// =====================================================

export default function HomeFeed({
  initialPosts,
  pageSize,
  isLoggedIn,
  showTopSection = true,
}: HomeFeedProps) {
  // Wir deduplizieren sofort beim Start
  const [posts, setPosts] = useState<FeedPost[]>(() => deduplicatePosts(initialPosts));
  const [offset, setOffset] = useState(initialPosts.length);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialPosts.length === pageSize);
  const [showOlderPosts, setShowOlderPosts] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  
  const router = useRouter();
  const supabase = createClient();

  // Sync bei Server-Updates
  useEffect(() => {
    setPosts(deduplicatePosts(initialPosts));
  }, [initialPosts]);

  // Realtime Echo
  useEffect(() => {
    const channel = supabase
      .channel('live-echo-feed')
      .on('postgres_changes', { event: '*', table: 'post_reactions', schema: 'public' }, (payload: any) => {
          const { eventType, new: newRow, old: oldRow } = payload;
          setPosts((currentPosts) => 
            currentPosts.map((post) => {
              const targetId = eventType === 'DELETE' ? oldRow.post_id : newRow.post_id;
              if (post.id !== targetId) return post;
              const diff = eventType === 'INSERT' ? 1 : eventType === 'DELETE' ? -1 : 0;
              return { ...post, reactions_count: Math.max(0, post.reactions_count + diff) };
            })
          );
          router.refresh();
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase, router]);

  // --- DIE RADIKALE AUFTEILUNG (KEINE DUPLIKATE MÖGLICH) ---
  const { topPosts, regularTodaysPosts, olderPosts } = useMemo(() => {
    // 1. Erstmal alle Posts nach ID deduplizieren (Sicherheitsnetz)
    const uniquePool = deduplicatePosts(posts);

    // 2. Heute vs. Archiv trennen
    const todays = uniquePool.filter((p) => isTodayInZurich(p.created_at));
    const older = uniquePool.filter((p) => !isTodayInZurich(p.created_at));

    // 3. Heute sortieren nach Echo Score
    const sortedTodays = [...todays].sort((a, b) => {
      const scoreA = getEchoScore(a);
      const scoreB = getEchoScore(b);
      if (scoreB !== scoreA) return scoreB - scoreA;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    // 4. Splitten: Top 3 kriegen den Rank, der Rest ist Regular
    const top = sortedTodays.slice(0, 3).map((p, i) => ({
      ...p,
      dailyRank: (i + 1) as 1 | 2 | 3
    }));

    // slice(3) nimmt ALLES ab Index 3. Da slice(0,3) davor aufhört, ist ein Duplikat unmöglich.
    const regular = sortedTodays.slice(3);

    return { topPosts: top, regularTodaysPosts: regular, olderPosts: older };
  }, [posts]);

  // Automatisches Archiv bei leerem Tag
  useEffect(() => {
    if (topPosts.length === 0 && regularTodaysPosts.length === 0 && olderPosts.length > 0 && !showOlderPosts) {
      setShowOlderPosts(true);
    }
  }, [topPosts.length, regularTodaysPosts.length, olderPosts.length, showOlderPosts]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/feed?offset=${offset}&limit=${pageSize}`, { method: "GET", cache: "no-store" });
      const data: FeedPost[] = await res.json();
      setPosts((prev) => deduplicatePosts([...prev, ...data]));
      setOffset((prev) => prev + data.length);
      setHasMore(data.length === pageSize);
    } catch (error) { console.error(error); } 
    finally { setLoadingMore(false); }
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

  // Handler
  function handleReactionUpdated(postId: number, nextReaction: ReactionType | null) {
    setPosts((prev) => prev.map((post) => post.id === postId ? applyReactionUpdate(post, nextReaction) : post));
    router.refresh();
  }

  function handleCommentCreated(postId: number) {
    setPosts((prev) => prev.map((post) => post.id === postId ? { ...post, comments_count: post.comments_count + 1 } : post));
    router.refresh();
  }

  function handleCommentsCountChange(postId: number, count: number) {
  setPosts((prev) => prev.map((post) => {
    if (post.id === postId && post.comments_count !== count) {
      return { ...post, comments_count: count };
    }
    return post;
  }));
}

  function handlePostDeleted(postId: number) {
    setPosts((prev) => prev.filter((post) => post.id !== postId));
    router.refresh();
  }

  return (
    <div className="space-y-12">
      {/* PODIUM */}
      {showTopSection && topPosts.length > 0 && (
        <section className="space-y-4">
          {topPosts.map((post) => (
            <PostCard key={`top-${post.id}`} post={post} dailyRank={post.dailyRank} onReactionUpdated={handleReactionUpdated} onCommentCreated={handleCommentCreated} onCommentsCountChange={handleCommentsCountChange} onPostDeleted={handlePostDeleted} isLoggedIn={isLoggedIn} />
          ))}
        </section>
      )}

      {/* REGULAR FEED */}
      {regularTodaysPosts.length > 0 && (
        <section className="space-y-6">
          <div className="px-2"><h2 className="text-xl font-black text-neutral-950">In the shadows</h2></div>
          <div className="space-y-4">
            {regularTodaysPosts.map((post) => (
              <PostCard key={`regular-${post.id}`} post={post} onReactionUpdated={handleReactionUpdated} onCommentCreated={handleCommentCreated} onCommentsCountChange={handleCommentsCountChange} onPostDeleted={handlePostDeleted} isLoggedIn={isLoggedIn} />
            ))}
          </div>
        </section>
      )}

      {/* STATUS AREA */}
      <div className="rounded-[32px] border border-neutral-200 bg-white p-10 text-center shadow-sm">
        {(topPosts.length + regularTodaysPosts.length) > 0 ? (
          <p className="text-lg font-black text-neutral-950">You’re all caught up.</p>
        ) : (
          <>
            <div className="mb-4 inline-flex rounded-full border border-emerald-100 bg-emerald-50 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">Live Race</div>
            <h1 className="text-4xl font-black text-neutral-950 sm:text-6xl">The Arena is <span className="text-neutral-400">quiet.</span></h1>
          </>
        )}
        <div className="mt-8 flex justify-center gap-3">
          <button onClick={() => window.dispatchEvent(new CustomEvent("open-create-post"))} className="rounded-full bg-neutral-950 px-8 py-4 text-sm font-bold text-white shadow-lg transition hover:scale-105">Create Post</button>
          {!showOlderPosts && olderPosts.length > 0 && (
            <button onClick={() => setShowOlderPosts(true)} className="rounded-full border border-neutral-200 bg-white px-8 py-4 text-sm font-bold text-neutral-950">View Archive</button>
          )}
        </div>
      </div>

      {/* ARCHIVE */}
      {showOlderPosts && olderPosts.length > 0 && (
        <section className="space-y-6 opacity-60">
          <div className="px-2"><h2 className="text-xl font-black text-neutral-950">Archive</h2></div>
          <div className="space-y-4">
            {olderPosts.map((post) => (
              <PostCard key={`older-${post.id}`} post={post} onReactionUpdated={handleReactionUpdated} onCommentCreated={handleCommentCreated} onCommentsCountChange={handleCommentsCountChange} onPostDeleted={handlePostDeleted} isLoggedIn={isLoggedIn} />
            ))}
          </div>
        </section>
      )}

      {/* END MARKER */}
      {!hasMore && posts.length > 0 && (
        <div className="py-16 text-center">
          <div className="inline-flex items-center gap-3">
            <div className="h-[1px] w-8 bg-neutral-200" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-300">End of History</span>
            <div className="h-[1px] w-8 bg-neutral-200" />
          </div>
        </div>
      )}
      <div ref={sentinelRef} className="h-10" />
    </div>
  );
}