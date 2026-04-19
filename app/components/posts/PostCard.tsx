"use client";

import Link from "next/link";
import { memo, useCallback, useEffect, useState } from "react";
import type { FeedPost, ReactionType } from "@/types/feed";
import CommentsSection from "@/app/components/posts/CommentsSection";
import PostReportButton from "@/app/components/posts/PostReportButton";
import { useAuthModal } from "@/app/components/auth/AuthModalProvider";
import { useRouter } from "next/navigation";

type PostCardProps = {
  post: FeedPost;
  onReactionUpdated: (postId: number, nextReaction: ReactionType | null) => void;
  onCommentCreated?: (postId: number) => void;
  onCommentsCountChange?: (postId: number, count: number) => void;
  onPostDeleted: (postId: number) => void;
  dailyRank?: 1 | 2 | 3;
  detailHref?: string;
  isLoggedIn?: boolean;
};

const REACTIONS: Array<{
  value: ReactionType;
  emoji: string;
  label: string;
  countKey: keyof NonNullable<FeedPost["reaction_counts"]>;
}> = [
  { value: "like", emoji: "❤️", label: "Impact", countKey: "like" },
  { value: "funny", emoji: "😂", label: "Funny", countKey: "funny" },
  { value: "wow", emoji: "🤯", label: "Wow", countKey: "wow" },
  { value: "fire", emoji: "🔥", label: "Strong", countKey: "fire" },
];

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffInSeconds < 60) return "Just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  return new Intl.DateTimeFormat("en-US", { day: "2-digit", month: "2-digit" }).format(date);
}

function getRankStyles(dailyRank?: 1 | 2 | 3) {
  if (dailyRank === 1) return { articleClass: "border-amber-200 bg-white shadow-[0_8px_30px_rgb(251,191,36,0.08)]", badgeClass: "bg-amber-100 text-amber-900 border-amber-200", badgeText: "🏆 Winner", accentClass: "bg-amber-400" };
  if (dailyRank === 2) return { articleClass: "border-slate-200 bg-white shadow-[0_8px_30px_rgb(148,163,184,0.06)]", badgeClass: "bg-slate-100 text-slate-900 border-slate-200", badgeText: "✨ Runner Up", accentClass: "bg-slate-400" };
  if (dailyRank === 3) return { articleClass: "border-orange-200 bg-white shadow-[0_8px_30px_rgb(251,146,60,0.06)]", badgeClass: "bg-orange-100 text-orange-900 border-orange-200", badgeText: "🔥 Third", accentClass: "bg-orange-400" };
  return { articleClass: "border-neutral-100 bg-white shadow-sm", badgeClass: "hidden", badgeText: "", accentClass: "hidden" };
}

function PostCardComponent({
  post,
  onReactionUpdated,
  onCommentCreated,
  onCommentsCountChange,
  onPostDeleted,
  dailyRank,
  detailHref,
  isLoggedIn = false,
}: PostCardProps) {
  const { requireLoginAndResume, isAuthenticated, authReady } = useAuthModal();
  const router = useRouter();
  const [reactionLoading, setReactionLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [localCommentsCount, setLocalCommentsCount] = useState(post.comments_count);

  const effectiveIsLoggedIn = authReady ? isAuthenticated : isLoggedIn;
  const rankStyles = getRankStyles(dailyRank);

  useEffect(() => {
    setLocalCommentsCount(post.comments_count);
  }, [post.comments_count]);

  const handleCommentCreated = useCallback(() => {
    setLocalCommentsCount((prev) => prev + 1);
    onCommentCreated?.(post.id);
  }, [onCommentCreated, post.id]);

  const handleCommentsLoaded = useCallback(
    (count: number) => {
      setLocalCommentsCount((prev) => (prev === count ? prev : count));
      onCommentsCountChange?.(post.id, count);
    },
    [onCommentsCountChange, post.id]
  );

  async function submitReaction(reaction: ReactionType) {
    if (reactionLoading) return;
    const previousReaction = post.viewer_reaction;
    const nextReaction = previousReaction === reaction ? null : reaction;

    onReactionUpdated(post.id, nextReaction);
    setReactionLoading(true);

    try {
      const res = await fetch(`/api/posts/${post.id}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reaction: nextReaction }),
      });

      if (res.status === 401 || res.status === 403) {
        onReactionUpdated(post.id, previousReaction);
        requireLoginAndResume(() => submitReaction(reaction), window.location.pathname);
        return;
      }
      
      if (!showComments) {
        router.refresh();
      }
    } catch (error) {
      onReactionUpdated(post.id, previousReaction);
    } finally {
      setReactionLoading(false);
    }
  }

  async function handleDeletePost() {
    if (!window.confirm("Delete this thought?")) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
      if (res.ok) {
        onPostDeleted(post.id);
        router.refresh();
      }
    } catch (error) {
      alert("Error.");
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <article className={`group relative overflow-hidden rounded-[32px] border p-6 transition-all duration-300 hover:shadow-md ${rankStyles.articleClass}`}>
      {dailyRank && <div className={`absolute inset-y-0 left-0 w-1 ${rankStyles.accentClass}`} />}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {dailyRank && <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest ${rankStyles.badgeClass}`}>{rankStyles.badgeText}</span>}
          <span className="text-[11px] font-bold uppercase tracking-widest text-neutral-400">{formatRelativeTime(post.created_at)}</span>
        </div>
        <div className="flex items-center gap-3">
          {effectiveIsLoggedIn && !post.can_delete && (
            <PostReportButton postId={post.id} />
          )}
          {post.can_delete && (
            <button onClick={handleDeletePost} disabled={deleteLoading} className="text-[10px] font-black uppercase tracking-widest text-neutral-300 transition hover:text-red-500 disabled:opacity-30">
              {deleteLoading ? "Removing..." : "Delete"}
            </button>
          )}
        </div>
      </div>

      <div className="mb-6">
        {detailHref ? (
          <Link href={detailHref} className="block transition-opacity hover:opacity-70">
            <p className="whitespace-pre-wrap break-words text-lg font-medium leading-relaxed tracking-tight text-neutral-900 sm:text-xl">{post.content}</p>
          </Link>
        ) : (
          <p className="whitespace-pre-wrap break-words text-lg font-medium leading-relaxed tracking-tight text-neutral-900 sm:text-xl">{post.content}</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {REACTIONS.map((reaction) => {
          const isActive = post.viewer_reaction === reaction.value;
          const count = post.reaction_counts?.[reaction.countKey] ?? 0;
          return (
            <button
              key={reaction.value}
              onClick={() => submitReaction(reaction.value)}
              disabled={reactionLoading}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-all active:scale-90 ${isActive ? "bg-neutral-950 text-white shadow-lg" : "bg-neutral-50 text-neutral-500 hover:bg-neutral-100"}`}
            >
              <span>{reaction.emoji}</span>
              <span className={isActive ? "text-white" : "text-neutral-900"}>{count}</span>
            </button>
          );
        })}
        <button
          onClick={() => setShowComments(!showComments)}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-all ${showComments ? "bg-neutral-200 text-neutral-900" : "bg-neutral-50 text-neutral-500 hover:bg-neutral-100"}`}
        >
          <span>💬</span>
          <span className="text-neutral-900">{localCommentsCount}</span>
        </button>
      </div>

      {showComments && (
        <div className="mt-2 border-t border-neutral-100 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
          <CommentsSection
            postId={post.id}
            onCommentCreated={handleCommentCreated}
            onCommentsLoaded={handleCommentsLoaded}
            isLoggedIn={effectiveIsLoggedIn}
          />
        </div>
      )}
    </article>
  );
}

const PostCard = memo(PostCardComponent);
export default PostCard;
