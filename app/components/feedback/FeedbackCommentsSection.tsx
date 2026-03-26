import Link from "next/link";
import {
  addFeatureRequestComment,
  deleteFeatureRequestComment,
} from "@/app/actions/feedback";
import type { FeedbackComment } from "@/lib/feedback-data";

export default function FeedbackCommentsSection({
  requestId,
  comments,
  currentUserId,
  currentUserIsAdmin,
}: {
  requestId: number;
  comments: FeedbackComment[];
  currentUserId: string | null;
  currentUserIsAdmin: boolean;
}) {
  return (
    <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
      <p className="mb-3 text-sm font-medium text-gray-700">
        Comments ({comments.length})
      </p>

      <div className="space-y-3">
        {comments.map((comment) => (
          <div key={comment.id} className="rounded-lg bg-white p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-xs font-semibold text-gray-600">
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
                    className="text-sm text-gray-700 hover:underline"
                  >
                    @{comment.username}
                  </Link>
                ) : (
                  <span className="text-sm text-gray-500">@unknown</span>
                )}
              </div>

              {(comment.isOwnComment || currentUserIsAdmin) && (
                <form action={deleteFeatureRequestComment}>
                  <input type="hidden" name="comment_id" value={comment.id} />
                  <button
                    type="submit"
                    className="text-xs text-red-600 hover:underline"
                  >
                    {comment.isOwnComment ? "Delete" : "Admin delete"}
                  </button>
                </form>
              )}
            </div>

            <p className="whitespace-pre-wrap text-sm text-gray-800">
              {comment.content}
            </p>
          </div>
        ))}

        {comments.length === 0 && (
          <p className="text-sm text-gray-500">No comments yet.</p>
        )}
      </div>

      {currentUserId && (
        <form action={addFeatureRequestComment} className="mt-4 flex gap-2">
          <input type="hidden" name="request_id" value={requestId} />

          <input
            type="text"
            name="content"
            placeholder="Write a comment..."
            required
            maxLength={500}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none"
          />

          <button
            type="submit"
            className="rounded-lg bg-black px-3 py-2 text-sm text-white"
          >
            Comment
          </button>
        </form>
      )}
    </div>
  );
}