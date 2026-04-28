"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import FeedbackCommentsSection from "@/features/feedback/components/FeedbackCommentsSection";
import { useAuthModal } from "@/features/auth/components/AuthModalProvider";
import {
  deleteFeatureRequest,
  toggleFeatureRequestLike,
  updateFeatureRequestStatus,
} from "@/app/actions/feedback";
import type { FeedbackItem } from "@/features/feedback/lib/feedback-data";

type FeedbackCardProps = {
  item: FeedbackItem;
  currentUserId: string | null;
  currentUserIsAdmin: boolean;
};

export default function FeedbackCard({
  item,
  currentUserId,
  currentUserIsAdmin,
}: FeedbackCardProps) {
  const { requireLoginAndResume } = useAuthModal();
  const [showComments, setShowComments] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const likeFormRef = useRef<HTMLFormElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const isOwnRequest = currentUserId === item.user_id;
  const canManage = isOwnRequest || currentUserIsAdmin;
  const isImplemented = item.status === "implemented";

  // Close the menu when clicking outside it.
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleLikeClick() {
    if (!currentUserId) {
      requireLoginAndResume(
        () => likeFormRef.current?.requestSubmit(),
        window.location.pathname
      );
      return;
    }
    likeFormRef.current?.requestSubmit();
  }

  return (
    <article className="relative rounded-[32px] border border-neutral-100 bg-white p-5 shadow-sm transition-all hover:shadow-md sm:p-6">
      
      {/* HEADER: Profile & Actions */}
      <div className="mb-5 flex items-center justify-between gap-3 sm:mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-100 text-sm font-bold text-neutral-400">
            {item.avatar_url ? (
              <img src={item.avatar_url} alt="avatar" className="h-full w-full object-cover" />
            ) : (
              (item.username ?? "U").charAt(0).toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            <Link href={`/u/${item.username}`} className="block truncate text-sm font-black text-neutral-900 hover:underline">
              @{item.username ?? "anonymous"}
            </Link>
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Community idea</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {/* Status Badge */}
          {isImplemented ? (
            <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-emerald-600">Deployed</span>
          ) : (
            <span className="rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-amber-600">Open</span>
          )}

          {/* ADMIN/OWNER MENU */}
          {canManage && (
            <div className="relative" ref={menuRef}>
              <button 
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="Open idea actions"
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-neutral-50 text-neutral-400 transition-colors"
              >
                <span className="text-xl font-black leading-none mb-2">...</span>
              </button>
              
              {menuOpen && (
                <div className="absolute right-0 top-10 z-50 w-48 overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-xl animate-in fade-in zoom-in-95 duration-200">
                  {currentUserIsAdmin && (
                    <form action={updateFeatureRequestStatus}>
                      <input type="hidden" name="request_id" value={item.id} />
                      <input type="hidden" name="status" value={isImplemented ? "open" : "implemented"} />
                      <button type="submit" className="w-full px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-neutral-600 hover:bg-neutral-50 transition-colors border-b border-neutral-50">
                        {isImplemented ? "Re-open idea" : "Mark Deployed"}
                      </button>
                    </form>
                  )}
                  <form action={deleteFeatureRequest}>
                    <input type="hidden" name="request_id" value={item.id} />
                    <button type="submit" className="w-full px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 transition-colors">
                      Delete idea
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="mb-5 rounded-[24px] border border-neutral-50 bg-neutral-50/50 p-4 sm:mb-6 sm:p-6">
        <h3 className="text-xl font-black tracking-tight text-neutral-950 sm:text-2xl">
          {item.title}
        </h3>
        <p className="mt-3 whitespace-pre-wrap text-sm font-medium leading-relaxed text-neutral-600 sm:text-base">
          {item.description}
        </p>
      </div>

      {/* ACTIONS */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <form ref={likeFormRef} action={toggleFeatureRequestLike}>
          <input type="hidden" name="request_id" value={item.id} />
          <button
            type="button"
            onClick={handleLikeClick}
            aria-label={`${item.likedByViewer ? "Remove support from" : "Support"} idea, ${item.likeCount} supporters`}
            className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-2 text-sm font-bold transition-all active:scale-90 sm:px-4 ${
              item.likedByViewer 
                ? "bg-neutral-950 text-white shadow-lg" 
                : "bg-neutral-50 text-neutral-500 hover:bg-neutral-100"
            }`}
          >
            <span>{item.likedByViewer ? "❤️" : "🤍"}</span>
            <span className={item.likedByViewer ? "text-white" : "text-neutral-900"}>
              {item.likeCount}
            </span>
            <span className="text-xs font-black uppercase tracking-widest">
              Support idea
            </span>
          </button>
        </form>

        <button
          onClick={() => setShowComments(!showComments)}
          aria-label={`${showComments ? "Hide" : "Show"} idea comments, ${item.commentCount} comments`}
            className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-2 text-sm font-bold transition-all sm:px-4 ${
            showComments ? "bg-neutral-200 text-neutral-900" : "bg-neutral-50 text-neutral-500 hover:bg-neutral-100"
          }`}
        >
          <span>💬</span>
          <span className="text-neutral-900">{item.commentCount}</span>
          <span className="text-xs font-black uppercase tracking-widest">
            Comments
          </span>
        </button>
      </div>

      {showComments && (
        <div className="mt-6 border-t border-neutral-100 pt-6 animate-in fade-in slide-in-from-top-2 duration-300">
          <FeedbackCommentsSection
            requestId={item.id}
            comments={item.comments}
            currentUserId={currentUserId}
            currentUserIsAdmin={currentUserIsAdmin}
          />
        </div>
      )}
    </article>
  );
}

