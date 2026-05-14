"use client";

import Image from "next/image";
import { memo, useActionState, useCallback, useRef, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import FeedbackCommentsSection from "@/features/input/components/FeedbackCommentsSection";
import { useAuthModal } from "@/features/auth/components/AuthModalProvider";
import {
  deleteFeatureRequest,
  saveRoadAchievement,
  toggleFeatureRequestLike,
  updateFeatureRequestStatus,
} from "@/app/actions/feedback";
import type { FeedbackItem } from "@/features/input/lib/feedback-data";
import FormError from "@/shared/components/ui/FormError";
import { scheduleScrollIntoViewIfNeeded } from "@/shared/lib/scroll-into-view-if-needed";

type FeedbackCardProps = {
  item: FeedbackItem;
  currentUserId: string | null;
  currentUserIsAdmin: boolean;
};

function FeedbackCard({
  item,
  currentUserId,
  currentUserIsAdmin,
}: FeedbackCardProps) {
  const { requireLoginAndResume } = useAuthModal();
  const [showComments, setShowComments] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [roadEditorOpen, setRoadEditorOpen] = useState(false);
  const likeFormRef = useRef<HTMLFormElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const commentsContainerRef = useRef<HTMLDivElement | null>(null);
  const shouldScrollToCommentsRef = useRef(false);

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

  const handleLikeClick = useCallback(() => {
    if (!currentUserId) {
      requireLoginAndResume(
        () => likeFormRef.current?.requestSubmit(),
        window.location.pathname
      );
      return;
    }
    likeFormRef.current?.requestSubmit();
  }, [currentUserId, requireLoginAndResume]);

  const handleToggleComments = useCallback(() => {
    setShowComments((prev) => {
      const next = !prev;
      if (next) {
        shouldScrollToCommentsRef.current = true;
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!showComments || !shouldScrollToCommentsRef.current) return;

    shouldScrollToCommentsRef.current = false;
    scheduleScrollIntoViewIfNeeded(commentsContainerRef.current);
  }, [showComments]);

  return (
    <article id={`input-idea-${item.id}`} className="motion-card soft-enter relative rounded-[32px] border border-neutral-100 bg-white p-5 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.5)] transition-all hover:-translate-y-0.5 hover:border-amber-100 hover:shadow-[0_28px_70px_-50px_rgba(15,23,42,0.58)] sm:p-6">
      
      {/* HEADER: Profile & Actions */}
      <div className="mb-5 flex items-center justify-between gap-3 sm:mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-100 text-sm font-bold text-neutral-400">
            {item.avatar_url ? (
              <Image
                src={item.avatar_url}
                alt="avatar"
                width={40}
                height={40}
                sizes="40px"
                unoptimized
                className="h-full w-full object-cover"
              />
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
                className="motion-button flex h-8 w-8 items-center justify-center rounded-full hover:bg-neutral-50 text-neutral-400 transition-colors"
              >
                <span className="text-xl font-black leading-none mb-2">...</span>
              </button>
              
              {menuOpen && (
                <div className="absolute right-0 top-10 z-50 w-48 overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-xl animate-in fade-in zoom-in-95 duration-200">
                  {currentUserIsAdmin && (
                    <>
                      <form action={updateFeatureRequestStatus}>
                        <input type="hidden" name="request_id" value={item.id} />
                        <input type="hidden" name="status" value={isImplemented ? "open" : "implemented"} />
                        <button type="submit" className="w-full px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-neutral-600 hover:bg-neutral-50 transition-colors border-b border-neutral-50">
                          {isImplemented ? "Re-open idea" : "Mark Deployed"}
                        </button>
                      </form>
                      {isImplemented && (
                        <button
                          type="button"
                          onClick={() => {
                            setRoadEditorOpen(true);
                            setMenuOpen(false);
                          }}
                          className="w-full border-b border-neutral-50 px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-amber-700 transition-colors hover:bg-amber-50"
                        >
                          {item.roadAchievement
                            ? "Edit Road Achievement"
                            : "Create Road Achievement"}
                        </button>
                      )}
                    </>
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
      <div className="mb-5 rounded-[24px] border border-neutral-100/80 bg-neutral-50/45 p-4 sm:mb-6 sm:p-5">
        <h3 className="text-xl font-black tracking-tight text-neutral-950 sm:text-2xl">
          {item.title}
        </h3>
        <p className="mt-3 whitespace-pre-wrap text-sm font-medium leading-relaxed text-neutral-600 sm:text-base">
          {item.description}
        </p>
        {item.roadAchievement?.is_published && (
          <Link
            href={`/input/road#road-achievement-${item.roadAchievement.id}`}
            className="mt-4 inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-amber-700 transition hover:bg-amber-100"
          >
            Now on the Road
          </Link>
        )}
      </div>

      {roadEditorOpen && currentUserIsAdmin && isImplemented && (
        <RoadAchievementEditor
          item={item}
          onClose={() => setRoadEditorOpen(false)}
        />
      )}

      {/* ACTIONS */}
      <div className="flex flex-wrap items-center gap-2 rounded-[24px] border border-neutral-100 bg-white/70 p-1.5 sm:gap-2">
        <form ref={likeFormRef} action={toggleFeatureRequestLike}>
          <input type="hidden" name="request_id" value={item.id} />
          <button
            type="button"
            onClick={handleLikeClick}
            data-active={item.likedByViewer}
            aria-label={`${item.likedByViewer ? "Remove support from" : "Support"} idea, ${item.likeCount} supporters`}
            className={`motion-reaction inline-flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-2 text-sm font-bold transition-all sm:px-4 ${
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
          onClick={handleToggleComments}
          aria-label={`${showComments ? "Hide" : "Show"} idea comments, ${item.commentCount} comments`}
            className={`motion-button inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-3 py-2 text-sm font-bold transition-all sm:px-4 ${
            showComments ? "border-neutral-200 bg-neutral-200 text-neutral-900" : "border-neutral-200/70 bg-white text-neutral-500 shadow-sm hover:border-amber-200 hover:bg-amber-50/60 hover:text-neutral-900"
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
        <div
          ref={commentsContainerRef}
          className="mt-6 border-t border-neutral-100 pt-6 animate-in fade-in slide-in-from-top-2 duration-300"
        >
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

function getRoadDescriptionDefault(item: FeedbackItem) {
  const normalized = item.description.trim().replace(/\s+/g, " ");
  return normalized.length > 220 ? `${normalized.slice(0, 217)}...` : normalized;
}

function RoadAchievementEditor({
  item,
  onClose,
}: {
  item: FeedbackItem;
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(saveRoadAchievement, {
    error: null,
    success: null,
  });
  const achievement = item.roadAchievement;

  useEffect(() => {
    if (!state.success) return;
    router.refresh();
  }, [router, state.success]);

  return (
    <section className="mb-5 rounded-[26px] border border-amber-200 bg-amber-50/55 p-4 shadow-[0_18px_60px_-50px_rgba(245,158,11,0.45)] sm:mb-6 sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
            Built with you
          </p>
          <h4 className="mt-1 text-lg font-black tracking-tight text-neutral-950">
            {achievement ? "Edit Road Achievement" : "Create Road Achievement"}
          </h4>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-neutral-500 transition hover:bg-neutral-50"
        >
          Close
        </button>
      </div>

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="request_id" value={item.id} />
        <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.16em] text-neutral-500">
              Road title
            </span>
            <input
              name="title"
              defaultValue={achievement?.title ?? item.title}
              className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-bold text-neutral-900 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-amber-100"
              required
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.16em] text-neutral-500">
              Icon
            </span>
            <input
              name="icon"
              defaultValue={achievement?.icon ?? "✨"}
              className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-bold text-neutral-900 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-amber-100"
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.16em] text-neutral-500">
            Road description
          </span>
          <textarea
            name="description"
            rows={3}
            defaultValue={achievement?.description ?? getRoadDescriptionDefault(item)}
            className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium leading-6 text-neutral-700 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-amber-100"
            required
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.16em] text-neutral-500">
              Status
            </span>
            <input
              name="status"
              defaultValue={achievement?.status ?? "DEPLOYED"}
              className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-bold uppercase text-neutral-900 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-amber-100"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.16em] text-neutral-500">
              Sort
            </span>
            <input
              name="sort_order"
              type="number"
              defaultValue={achievement?.sort_order ?? ""}
              className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-bold text-neutral-900 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-amber-100"
            />
          </label>
          <label className="flex items-end">
            <span className="flex min-h-[46px] w-full items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-xs font-black uppercase tracking-widest text-neutral-600">
              <input
                name="is_published"
                type="checkbox"
                defaultChecked={achievement?.is_published ?? true}
                className="h-4 w-4 accent-neutral-950"
              />
              Published
            </span>
          </label>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.16em] text-neutral-500">
            Image URL
          </span>
          <input
            name="image_url"
            defaultValue={achievement?.image_url ?? ""}
            placeholder="Optional"
            className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-950 focus:ring-2 focus:ring-amber-100"
          />
        </label>

        {state.error && <FormError message={state.error} />}
        {state.success && (
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/90 px-4 py-3 text-xs font-bold leading-5 text-emerald-700 shadow-sm">
            {state.success}
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-full bg-neutral-950 px-5 py-3 text-sm font-black text-white shadow-lg transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {pending ? "Saving..." : "Save Road Achievement"}
        </button>
      </form>
    </section>
  );
}

export default memo(FeedbackCard);

