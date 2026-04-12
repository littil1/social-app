"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import FeedbackCommentsSection from "@/app/components/feedback/FeedbackCommentsSection";
import { useAuthModal } from "@/app/components/auth/AuthModalProvider";
import {
  deleteFeatureRequest,
  toggleFeatureRequestLike,
  updateFeatureRequestStatus,
} from "@/app/actions/feedback";
import type { FeedbackItem } from "@/lib/feedback-data";

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

  // Schließt Menü bei Klick außerhalb
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleLikeClick() {
    if (!currentUserId) {
      requireLoginAndResume(() => likeFormRef.current?.requestSubmit(), window.location.pathname);
      return;
    }
    likeFormRef.current?.requestSubmit();
  }

  return (
    <article className="relative rounded-[32px] border border-neutral-100 bg-white p-6 shadow-sm transition-all hover:shadow-md">
      
      {/* HEADER: Profile & Actions */}
      <div className="mb-6 flex items-center justify-between">
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
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Community Suggestion</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
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
                        {isImplemented ? "↺ Re-open Request" : "✓ Mark Deployed"}
                      </button>
                    </form>
                  )}
                  <form action={deleteFeatureRequest}>
                    <input type="hidden" name="request_id" value={item.id} />
                    <button type="submit" className="w-full px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 transition-colors">
                      ✕ Delete Request
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="mb-6 rounded-[24px] border border-neutral-50 bg-neutral-50/50 p-5">
        <h3 className="text-xl font-black tracking-tight text-neutral-950 sm:text-2xl">
          {item.title}
        </h3>
        <p className="mt-3 whitespace-pre-wrap text-sm font-medium leading-relaxed text-neutral-600 sm:text-base">
          {item.description}
        </p>
      </div>

      {/* ACTIONS */}
      <div className="flex flex-wrap items-center gap-3">
        <form ref={likeFormRef} action={toggleFeatureRequestLike}>
          <input type="hidden" name="request_id" value={item.id} />
          <button
            type="button"
            onClick={handleLikeClick}
            className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-black uppercase tracking-widest transition-all active:scale-95 ${
              item.likedByViewer 
                ? "bg-neutral-950 text-white shadow-lg" 
                : "bg-neutral-50 text-neutral-500 hover:bg-neutral-100"
            }`}
          >
            {item.likedByViewer ? "❤️ Supported" : "🤍 Support"}
            <span className="ml-1 opacity-50">{item.likeCount}</span>
          </button>
        </form>

        <button
          onClick={() => setShowComments(!showComments)}
          className={`rounded-full px-5 py-2.5 text-xs font-black uppercase tracking-widest transition-all ${
            showComments ? "bg-neutral-200 text-neutral-900" : "bg-neutral-50 text-neutral-500 hover:bg-neutral-100"
          }`}
        >
          💬 {item.commentCount} Comments
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