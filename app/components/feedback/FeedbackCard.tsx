"use client";

import { useRef, useState } from "react";
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

function getResumePath() {
  if (typeof window === "undefined") return "/";
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export default function FeedbackCard({
  item,
  currentUserId,
  currentUserIsAdmin,
}: FeedbackCardProps) {
  const { requireLoginAndResume } = useAuthModal();

  const isOwnRequest = currentUserId === item.user_id;
  const canDelete = isOwnRequest || currentUserIsAdmin;
  const isImplemented = item.status === "implemented";

  const [showComments, setShowComments] = useState(false);

  const likeFormRef = useRef<HTMLFormElement | null>(null);

  function handleLikeClick() {
    if (!currentUserId) {
      requireLoginAndResume(() => {
        likeFormRef.current?.requestSubmit();
      }, getResumePath());
      return;
    }

    likeFormRef.current?.requestSubmit();
  }

  return (
    <article className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      {/* ===================================================== */}
      {/* Header */}
      {/* ===================================================== */}

      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-sm font-semibold text-gray-600">
            {item.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.avatar_url}
                alt={`${item.username ?? "User"} avatar`}
                className="h-full w-full object-cover"
              />
            ) : (
              (item.username ?? "u").charAt(0).toUpperCase()
            )}
          </div>

          <div className="min-w-0">
            {item.username ? (
              <Link
                href={`/u/${item.username}`}
                className="block truncate text-sm font-semibold text-gray-800 hover:underline"
              >
                @{item.username}
              </Link>
            ) : (
              <p className="text-sm text-gray-500">@unbekannt</p>
            )}

            <p className="mt-1 text-xs text-gray-400">Community-Vorschlag</p>
          </div>
        </div>

        <div className="shrink-0">
          {isImplemented ? (
            <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
              Umgesetzt
            </span>
          ) : (
            <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
              Offen
            </span>
          )}
        </div>
      </div>

      {/* ===================================================== */}
      {/* Content */}
      {/* ===================================================== */}

      <div className="rounded-[24px] border border-gray-100 bg-gray-50/80 p-4 sm:p-5">
        <h3 className="break-words text-xl font-bold tracking-tight text-gray-950 sm:text-2xl">
          {item.title}
        </h3>

        <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-gray-700 sm:text-base">
          {item.description}
        </p>
      </div>

      {/* ===================================================== */}
      {/* Meta */}
      {/* ===================================================== */}

      <div className="mt-5 flex flex-wrap gap-2">
        <span className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700">
          {item.likeCount} {item.likeCount === 1 ? "Zustimmung" : "Zustimmungen"}
        </span>

        <button
          type="button"
          onClick={() => setShowComments((prev) => !prev)}
          className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 transition hover:bg-gray-50"
        >
          💬 {item.commentCount}{" "}
          {item.commentCount === 1 ? "Kommentar" : "Kommentare"}{" "}
          {showComments ? "ausblenden" : "anzeigen"}
        </button>

        {currentUserId && item.likedByViewer && (
          <span className="rounded-full border border-pink-200 bg-pink-50 px-3 py-1.5 text-sm font-medium text-pink-700">
            Von dir unterstützt
          </span>
        )}
      </div>

      {/* ===================================================== */}
      {/* Actions */}
      {/* ===================================================== */}

      <div className="mt-5 flex flex-wrap items-center gap-2 border-b border-gray-100 pb-5">
        <form ref={likeFormRef} action={toggleFeatureRequestLike}>
          <input type="hidden" name="request_id" value={item.id} />
          <button
            type="button"
            onClick={handleLikeClick}
            className={`rounded-2xl border px-4 py-2 text-sm font-medium transition ${
              item.likedByViewer
                ? "border-pink-300 bg-pink-50 text-pink-700"
                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            {item.likedByViewer ? "♥ Unterstützt" : "♡ Unterstützen"}
          </button>
        </form>

        {currentUserIsAdmin &&
          (!isImplemented ? (
            <form action={updateFeatureRequestStatus}>
              <input type="hidden" name="request_id" value={item.id} />
              <input type="hidden" name="status" value="implemented" />
              <button
                type="submit"
                className="rounded-2xl border border-emerald-300 bg-white px-4 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50"
              >
                Als umgesetzt markieren
              </button>
            </form>
          ) : (
            <form action={updateFeatureRequestStatus}>
              <input type="hidden" name="request_id" value={item.id} />
              <input type="hidden" name="status" value="open" />
              <button
                type="submit"
                className="rounded-2xl border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-50"
              >
                Wieder öffnen
              </button>
            </form>
          ))}

        {canDelete && (
          <form action={deleteFeatureRequest}>
            <input type="hidden" name="request_id" value={item.id} />
            <button
              type="submit"
              className="rounded-2xl border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
            >
              {isOwnRequest ? "Löschen" : "Als Admin löschen"}
            </button>
          </form>
        )}
      </div>

      {/* ===================================================== */}
      {/* Comments */}
      {/* ===================================================== */}

      {showComments && (
        <FeedbackCommentsSection
          requestId={item.id}
          comments={item.comments}
          currentUserId={currentUserId}
          currentUserIsAdmin={currentUserIsAdmin}
        />
      )}
    </article>
  );
}