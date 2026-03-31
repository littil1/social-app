import Link from "next/link";
import FeedbackCommentsSection from "@/app/components/feedback/FeedbackCommentsSection";
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
  const isOwnRequest = currentUserId === item.user_id;
  const canDelete = isOwnRequest || currentUserIsAdmin;

  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      {/* ===================================================== */}
      {/* Header */}
      {/* ===================================================== */}

      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-sm font-semibold text-gray-600">
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

        <div className="min-w-0 flex-1">
          {item.username ? (
            <Link
              href={`/u/${item.username}`}
              className="block truncate text-sm text-gray-700 hover:underline"
            >
              @{item.username}
            </Link>
          ) : (
            <p className="text-sm text-gray-500">@unbekannt</p>
          )}
        </div>

        <div className="shrink-0">
          {item.status === "implemented" ? (
            <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
              Umgesetzt
            </span>
          ) : (
            <span className="inline-flex rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700">
              Offen
            </span>
          )}
        </div>
      </div>

      {/* ===================================================== */}
      {/* Content */}
      {/* ===================================================== */}

      <h3 className="mb-2 break-words text-xl font-semibold text-gray-900">
        {item.title}
      </h3>

      <p className="mb-4 whitespace-pre-wrap break-words text-gray-800">
        {item.description}
      </p>

      {/* ===================================================== */}
      {/* Meta + actions */}
      {/* ===================================================== */}

      <div className="mb-4 flex flex-col gap-3 border-b border-gray-100 pb-4">
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
          <span>
            {item.likeCount}{" "}
            {item.likeCount === 1 ? "Zustimmung" : "Zustimmungen"}
          </span>

          <span>
            {item.commentCount}{" "}
            {item.commentCount === 1 ? "Kommentar" : "Kommentare"}
          </span>

          {currentUserId && item.likedByViewer && (
            <span className="text-pink-600">Von dir unterstützt</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {currentUserId ? (
            <form action={toggleFeatureRequestLike}>
              <input type="hidden" name="request_id" value={item.id} />
              <button
                type="submit"
                className={`rounded-xl border px-3 py-1.5 text-sm transition ${
                  item.likedByViewer
                    ? "border-pink-300 bg-pink-50 text-pink-700"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                {item.likedByViewer ? "♥ Unterstützt" : "♡ Unterstützen"}
              </button>
            </form>
          ) : (
            <a
              href="/login"
              className="inline-flex rounded-xl border border-gray-300 px-3 py-1.5 text-sm text-gray-700 transition hover:bg-gray-50"
            >
              ♡ Unterstützen
            </a>
          )}

          {currentUserIsAdmin &&
            (item.status !== "implemented" ? (
              <form action={updateFeatureRequestStatus}>
                <input type="hidden" name="request_id" value={item.id} />
                <input type="hidden" name="status" value="implemented" />
                <button
                  type="submit"
                  className="rounded-xl border border-green-300 px-3 py-1.5 text-sm text-green-700 transition hover:bg-green-50"
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
                  className="rounded-xl border border-yellow-300 px-3 py-1.5 text-sm text-yellow-700 transition hover:bg-yellow-50"
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
                className="rounded-xl border border-red-300 px-3 py-1.5 text-sm text-red-600 transition hover:bg-red-50"
              >
                {isOwnRequest ? "Löschen" : "Als Admin löschen"}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* ===================================================== */}
      {/* Comments */}
      {/* ===================================================== */}

      <FeedbackCommentsSection
        requestId={item.id}
        comments={item.comments}
        currentUserId={currentUserId}
        currentUserIsAdmin={currentUserIsAdmin}
      />
    </article>
  );
}