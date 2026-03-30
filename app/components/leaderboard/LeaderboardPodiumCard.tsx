"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CommentsSection from "@/app/components/posts/CommentsSection";
import type { ReactionCounts, ReactionType } from "@/types/feed";

// =====================================================
// Types
// =====================================================

type LeaderboardPost = {
  id: number;
  post_content: string;
  post_created_at: string;
  comments_count: number;
  relevance_score: number;
  author_username: string | null;
  reactions_count: number;
  reaction_counts: ReactionCounts;
  viewer_reaction: ReactionType | null;
};

type LeaderboardPodiumCardProps = {
  position: 1 | 2 | 3;
  post: LeaderboardPost | null;
};

// =====================================================
// Constants
// =====================================================

const REACTIONS: Array<{
  value: ReactionType;
  emoji: string;
  label: string;
  countKey: keyof ReactionCounts;
}> = [
  { value: "like", emoji: "❤️", label: "Gefällt mir", countKey: "like" },
  { value: "funny", emoji: "😂", label: "Lustig", countKey: "funny" },
  { value: "wow", emoji: "😮", label: "Wow", countKey: "wow" },
  { value: "fire", emoji: "🔥", label: "Stark", countKey: "fire" },
];

// =====================================================
// Helpers
// =====================================================

function formatDateTime(dateString: string) {
  const date = new Date(dateString);

  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getPodiumStyles(position: 1 | 2 | 3) {
  if (position === 1) {
    return {
      articleClass:
        "relative flex h-[560px] cursor-pointer flex-col overflow-hidden rounded-2xl border border-amber-300/80 bg-gradient-to-br from-amber-50 via-white to-white p-5 shadow-[0_10px_30px_rgba(245,158,11,0.10)] transition hover:-translate-y-0.5",
      expandedArticleClass:
        "relative flex min-h-[560px] cursor-pointer flex-col overflow-hidden rounded-2xl border border-amber-300/80 bg-gradient-to-br from-amber-50 via-white to-white p-5 shadow-[0_10px_30px_rgba(245,158,11,0.10)] transition hover:-translate-y-0.5",
      accentClass: "bg-amber-400",
      badgeClass:
        "rounded-full border border-amber-200 bg-amber-100/80 px-3 py-1 text-xs font-semibold text-amber-800",
      badgeText: "🏆 #1 Today",
      title: "Gold",
      emoji: "🥇",
      clampClass:
        "[display:-webkit-box] overflow-hidden whitespace-pre-wrap break-words [-webkit-box-orient:vertical] [-webkit-line-clamp:12]",
      previewLength: 520,
    };
  }

  if (position === 2) {
    return {
      articleClass:
        "relative flex h-[480px] cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-300 bg-gradient-to-br from-slate-50 via-white to-white p-5 shadow-[0_10px_24px_rgba(100,116,139,0.08)] transition hover:-translate-y-0.5",
      expandedArticleClass:
        "relative flex min-h-[480px] cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-300 bg-gradient-to-br from-slate-50 via-white to-white p-5 shadow-[0_10px_24px_rgba(100,116,139,0.08)] transition hover:-translate-y-0.5",
      accentClass: "bg-slate-400",
      badgeClass:
        "rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700",
      badgeText: "✨ #2 Today",
      title: "Silber",
      emoji: "🥈",
      clampClass:
        "[display:-webkit-box] overflow-hidden whitespace-pre-wrap break-words [-webkit-box-orient:vertical] [-webkit-line-clamp:8]",
      previewLength: 360,
    };
  }

  return {
    articleClass:
      "relative flex h-[400px] cursor-pointer flex-col overflow-hidden rounded-2xl border border-orange-300/80 bg-gradient-to-br from-orange-50 via-white to-white p-5 shadow-[0_10px_24px_rgba(249,115,22,0.08)] transition hover:-translate-y-0.5",
    expandedArticleClass:
      "relative flex min-h-[400px] cursor-pointer flex-col overflow-hidden rounded-2xl border border-orange-300/80 bg-gradient-to-br from-orange-50 via-white to-white p-5 shadow-[0_10px_24px_rgba(249,115,22,0.08)] transition hover:-translate-y-0.5",
    accentClass: "bg-orange-400",
    badgeClass:
      "rounded-full border border-orange-200 bg-orange-100/80 px-3 py-1 text-xs font-semibold text-orange-800",
    badgeText: "🔥 #3 Today",
    title: "Bronze",
    emoji: "🥉",
    clampClass:
      "[display:-webkit-box] overflow-hidden whitespace-pre-wrap break-words [-webkit-box-orient:vertical] [-webkit-line-clamp:6]",
    previewLength: 260,
  };
}

function applyReactionUpdate(
  reactionCounts: ReactionCounts,
  currentReaction: ReactionType | null,
  nextReaction: ReactionType | null
) {
  const nextCounts = { ...reactionCounts };

  if (currentReaction) {
    nextCounts[currentReaction] = Math.max(0, nextCounts[currentReaction] - 1);
  }

  if (nextReaction) {
    nextCounts[nextReaction] += 1;
  }

  return nextCounts;
}

// =====================================================
// Component
// =====================================================

export default function LeaderboardPodiumCard({
  position,
  post,
}: LeaderboardPodiumCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [reactionLoading, setReactionLoading] = useState(false);
  const [localCommentsCount, setLocalCommentsCount] = useState(
    post?.comments_count ?? 0
  );
  const [localReactionCounts, setLocalReactionCounts] = useState<ReactionCounts>(
    post?.reaction_counts ?? {
      like: 0,
      funny: 0,
      wow: 0,
      fire: 0,
    }
  );
  const [viewerReaction, setViewerReaction] = useState<ReactionType | null>(
    post?.viewer_reaction ?? null
  );

  const router = useRouter();
  const styles = getPodiumStyles(position);

  useEffect(() => {
    setLocalCommentsCount(post?.comments_count ?? 0);
    setLocalReactionCounts(
      post?.reaction_counts ?? {
        like: 0,
        funny: 0,
        wow: 0,
        fire: 0,
      }
    );
    setViewerReaction(post?.viewer_reaction ?? null);
  }, [post]);

  const isLongPost = useMemo(() => {
    if (!post) return false;
    return post.post_content.length > styles.previewLength;
  }, [post, styles.previewLength]);

  const articleClassName =
    expanded || showComments ? styles.expandedArticleClass : styles.articleClass;

  function openPost() {
    if (!post) return;
    router.push(`/posts/${post.id}`);
  }

  async function handleReactionClick(
    e: React.MouseEvent<HTMLButtonElement>,
    reaction: ReactionType
  ) {
    e.stopPropagation();

    if (!post || reactionLoading) return;

    const previousReaction = viewerReaction;
    const nextReaction = previousReaction === reaction ? null : reaction;
    const optimisticCounts = applyReactionUpdate(
      localReactionCounts,
      previousReaction,
      nextReaction
    );

    setReactionLoading(true);
    setViewerReaction(nextReaction);
    setLocalReactionCounts(optimisticCounts);

    try {
      const res = await fetch(`/api/posts/${post.id}/like`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reaction }),
      });

      if (!res.ok) {
        throw new Error("Reaction konnte nicht gespeichert werden.");
      }

      const data = (await res.json()) as {
        success: boolean;
        reaction: ReactionType | null;
      };

      setViewerReaction(data.reaction);
      router.refresh();
    } catch (error) {
      console.error(error);
      setViewerReaction(previousReaction);
      setLocalReactionCounts(post.reaction_counts);
      alert("Reaction konnte nicht gespeichert werden.");
    } finally {
      setReactionLoading(false);
    }
  }

  function handleToggleComments(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    setShowComments((prev) => !prev);
  }

  function handleToggleExpanded(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    setExpanded((prev) => !prev);
  }

  function handleOpenPostClick(e: React.MouseEvent<HTMLElement>) {
    e.stopPropagation();
  }

  function handleCommentCreated() {
    setLocalCommentsCount((prev) => prev + 1);
    setShowComments(true);
    router.refresh();
  }

  function handleCommentsLoaded(count: number) {
    setLocalCommentsCount(count);
  }

  function handleCommentDeleted() {
    setLocalCommentsCount((prev) => Math.max(0, prev - 1));
    router.refresh();
  }

  if (!post) {
    return (
      <article onClick={openPost} className={articleClassName}>
        <div
          className={`absolute inset-y-0 left-0 w-1.5 ${styles.accentClass}`}
          aria-hidden="true"
        />

        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-2xl">{styles.emoji}</p>
            <p className="mt-2 text-lg font-bold">{styles.title}</p>
          </div>

          <span className={styles.badgeClass}>{styles.badgeText}</span>
        </div>

        <p className="text-sm text-gray-500">
          Für diesen Platz gibt es noch keinen Post.
        </p>
      </article>
    );
  }

  return (
    <article onClick={openPost} className={articleClassName}>
      <div
        className={`absolute inset-y-0 left-0 w-1.5 ${styles.accentClass}`}
        aria-hidden="true"
      />

      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-2xl">{styles.emoji}</p>
          <p className="mt-2 text-lg font-bold">{styles.title}</p>
        </div>

        <span className={styles.badgeClass}>{styles.badgeText}</span>
      </div>

      <div className={`mb-4 ${expanded ? "" : "overflow-hidden"}`}>
        <Link
          href={`/posts/${post.id}`}
          onClick={handleOpenPostClick}
          className="block rounded-xl"
        >
          <p
            className={`text-[16px] leading-7 text-gray-900 ${
              expanded ? "whitespace-pre-wrap break-words" : styles.clampClass
            }`}
          >
            {post.post_content}
          </p>
        </Link>

        {isLongPost && (
          <button
            type="button"
            onClick={handleToggleExpanded}
            className="mt-3 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            {expanded ? "Weniger anzeigen" : "Mehr anzeigen"}
          </button>
        )}
      </div>

      <div className="mb-4 space-y-1 text-sm text-gray-600">
        <p>
          <span className="font-medium text-gray-800">Autor:</span>{" "}
          {post.author_username ? (
            <Link
              href={`/u/${encodeURIComponent(post.author_username)}`}
              onClick={handleOpenPostClick}
              className="hover:underline"
            >
              @{post.author_username}
            </Link>
          ) : (
            "Unbekannt"
          )}
        </p>
        <p>
          <span className="font-medium text-gray-800">Erstellt:</span>{" "}
          {formatDateTime(post.post_created_at)}
        </p>
      </div>

      <div
        className="mt-auto rounded-2xl border border-gray-100 bg-gray-50/80 p-3"
        onClick={handleOpenPostClick}
      >
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
          {REACTIONS.map((reaction) => {
            const isActive = viewerReaction === reaction.value;

            return (
              <button
                key={reaction.value}
                type="button"
                onClick={(e) => handleReactionClick(e, reaction.value)}
                disabled={reactionLoading}
                className={`rounded-full px-3 py-1.5 transition disabled:opacity-50 ${
                  isActive
                    ? "border border-amber-200 bg-amber-50 text-amber-800 ring-1 ring-amber-200"
                    : "bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-100"
                }`}
                aria-pressed={isActive}
                title={reaction.label}
              >
                <span className="mr-1">{reaction.emoji}</span>
                {localReactionCounts[reaction.countKey]}
              </button>
            );
          })}

          <button
            type="button"
            onClick={handleToggleComments}
            className="rounded-full bg-white px-3 py-1.5 text-gray-700 ring-1 ring-gray-200 transition hover:bg-gray-100"
          >
            <span className="mr-1">💬</span>
            {localCommentsCount} {showComments ? "Hide comments" : "Show comments"}
          </button>

          <span className="rounded-full bg-white px-3 py-1.5 text-gray-700 ring-1 ring-gray-200">
            ⚡ {post.relevance_score}
          </span>
        </div>
      </div>

      {showComments && (
        <div className="mt-4" onClick={handleOpenPostClick}>
          <CommentsSection
            postId={post.id}
            onCommentCreated={handleCommentCreated}
            onCommentsLoaded={handleCommentsLoaded}
            onCommentDeleted={handleCommentDeleted}
          />
        </div>
      )}
    </article>
  );
}