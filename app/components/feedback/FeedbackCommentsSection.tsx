import Link from "next/link";
import {
  addFeatureRequestComment,
  deleteFeatureRequestComment,
} from "@/app/actions/feedback";
import type { FeedbackComment } from "@/lib/feedback-data";

type FeedbackCommentsSectionProps = {
  requestId: number;
  comments: FeedbackComment[];
  currentUserId: string | null;
  currentUserIsAdmin: boolean;
};

export default function FeedbackCommentsSection({
  requestId,
  comments,
  currentUserId,
  currentUserIsAdmin,
}: FeedbackCommentsSectionProps) {
  return (
    <div className="mt-5 rounded-[24px] border border-gray-200 bg-gray-50 p-4 sm:p-5">
      {/* ===================================================== */}
      {/* Header */}
      {/* ===================================================== */}

      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-gray-800">
          Kommentare ({comments.length})
        </p>
      </div>

      {/* ===================================================== */}
      {/* Comments list */}
      {/* ===================================================== */}

      <div className="space-y-3">
        {comments.map((comment) => (
          <div
            key={comment.id}
            className="rounded-2xl border border-gray-200 bg-white p-3 sm:p-4"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-xs font-semibold text-gray-600">
                  {comment.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={comment.avatar_url}
                      alt={`${comment.username ?? "User"} avatar`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    (comment.username ?? "u").charAt(0).toUpperCase()
                  )}
                </div>

                {comment.username ? (
                  <Link
                    href={`/u/${comment.username}`}
                    className="truncate text-sm font-medium text-gray-700 hover:underline"
                  >
                    @{comment.username}
                  </Link>
                ) : (
                  <span className="text-sm text-gray-500">@unbekannt</span>
                )}
              </div>

              {(comment.isOwnComment || currentUserIsAdmin) && (
                <form action={deleteFeatureRequestComment}>
                  <input type="hidden" name="comment_id" value={comment.id} />
                  <button
                    type="submit"
                    className="text-xs font-medium text-red-600 transition hover:underline"
                  >
                    {comment.isOwnComment ? "Löschen" : "Als Admin löschen"}
                  </button>
                </form>
              )}
            </div>

            <p className="whitespace-pre-wrap break-words text-sm leading-6 text-gray-800">
              {comment.content}
            </p>
          </div>
        ))}

        {comments.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white/70 p-4 text-sm text-gray-500">
            Noch keine Kommentare vorhanden.
          </div>
        )}
      </div>

      {/* ===================================================== */}
      {/* Comment form */}
      {/* ===================================================== */}

      {currentUserId ? (
        <form
          action={addFeatureRequestComment}
          className="mt-4 flex flex-col gap-2 sm:flex-row"
        >
          <input type="hidden" name="request_id" value={requestId} />

          <input
            type="text"
            name="content"
            placeholder="Schreibe einen Kommentar ..."
            required
            maxLength={500}
            className="flex-1 rounded-2xl border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-indigo-400"
          />

          <button
            type="submit"
            className="rounded-2xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
          >
            Kommentieren
          </button>
        </form>
      ) : (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            placeholder="Schreibe einen Kommentar ..."
            disabled
            className="flex-1 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-400 outline-none"
          />

          <a
            href="/login"
            className="inline-flex items-center justify-center rounded-2xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
          >
            Kommentieren
          </a>
        </div>
      )}
    </div>
  );
}