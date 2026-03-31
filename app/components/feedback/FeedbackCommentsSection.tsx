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
    <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
      {/* ===================================================== */}
      {/* Header */}
      {/* ===================================================== */}

      <p className="mb-3 text-sm font-medium text-gray-700">
        Kommentare ({comments.length})
      </p>

      {/* ===================================================== */}
      {/* Comments list */}
      {/* ===================================================== */}

      <div className="space-y-3">
        {comments.map((comment) => (
          <div
            key={comment.id}
            className="rounded-xl border border-gray-200 bg-white p-3"
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-xs font-semibold text-gray-600">
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
                    className="truncate text-sm text-gray-700 hover:underline"
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
                    className="text-xs text-red-600 transition hover:underline"
                  >
                    {comment.isOwnComment ? "Löschen" : "Als Admin löschen"}
                  </button>
                </form>
              )}
            </div>

            <p className="whitespace-pre-wrap break-words text-sm text-gray-800">
              {comment.content}
            </p>
          </div>
        ))}

        {comments.length === 0 && (
          <p className="text-sm text-gray-500">Noch keine Kommentare.</p>
        )}
      </div>

      {/* ===================================================== */}
      {/* Comment form */}
      {/* ===================================================== */}

      {currentUserId ? (
        <form action={addFeatureRequestComment} className="mt-4 flex gap-2">
          <input type="hidden" name="request_id" value={requestId} />

          <input
            type="text"
            name="content"
            placeholder="Schreibe einen Kommentar ..."
            required
            maxLength={500}
            className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-gray-400"
          />

          <button
            type="submit"
            className="rounded-xl bg-black px-3 py-2 text-sm text-white transition hover:opacity-90"
          >
            Kommentieren
          </button>
        </form>
      ) : (
        <div className="mt-4 flex gap-2">
          <input
            type="text"
            placeholder="Schreibe einen Kommentar ..."
            disabled
            className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-400 outline-none"
          />

          <a
            href="/login"
            className="inline-flex items-center rounded-xl bg-black px-3 py-2 text-sm text-white transition hover:opacity-90"
          >
            Kommentieren
          </a>
        </div>
      )}
    </div>
  );
}