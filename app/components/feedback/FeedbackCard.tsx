import Link from "next/link";
import FeedbackCommentsSection from "@/app/components/feedback/FeedbackCommentsSection";
import {
  deleteFeatureRequest,
  toggleFeatureRequestLike,
  updateFeatureRequestStatus,
} from "@/app/actions/feedback";
import type { FeedbackItem } from "@/lib/feedback-data";

export default function FeedbackCard({
  item,
  currentUserId,
  currentUserIsAdmin,
}: {
  item: FeedbackItem;
  currentUserId: string | null;
  currentUserIsAdmin: boolean;
}) {
  const isOwnRequest = currentUserId === item.user_id;
  const canDelete = isOwnRequest || currentUserIsAdmin;

  return (
    <div className="rounded-xl bg-white p-4 shadow">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-sm font-semibold text-gray-600">
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
              className="block text-sm text-gray-700 hover:underline"
            >
              @{item.username}
            </Link>
          ) : (
            <p className="text-sm text-gray-500">@unknown</p>
          )}
        </div>

        <div>
          {item.status === "implemented" ? (
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
              Implemented
            </span>
          ) : (
            <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700">
              Open
            </span>
          )}
        </div>
      </div>

      <h3 className="mb-2 break-words text-lg font-semibold text-gray-900">
        {item.title}
      </h3>
      <p className="mb-3 whitespace-pre-wrap break-words text-gray-800">
        {item.description}
      </p>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-gray-500">{item.likeCount} Likes</span>
          <span className="text-sm text-gray-500">
            {item.commentCount} Comments
          </span>

          {currentUserId && (
            <form action={toggleFeatureRequestLike}>
              <input type="hidden" name="request_id" value={item.id} />
              <button
                type="submit"
                className={`rounded-lg border px-3 py-1 text-sm transition ${
                  item.likedByViewer
                    ? "border-pink-300 bg-pink-50 text-pink-700"
                    : "border-gray-300 text-gray-700"
                }`}
              >
                {item.likedByViewer ? "♥ Liked" : "♡ Like"}
              </button>
            </form>
          )}

          {currentUserId && item.likedByViewer && (
            <span className="text-sm text-pink-600">Liked by you</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {currentUserIsAdmin && (
            <>
              {item.status !== "implemented" ? (
                <form action={updateFeatureRequestStatus}>
                  <input type="hidden" name="request_id" value={item.id} />
                  <input type="hidden" name="status" value="implemented" />
                  <button
                    type="submit"
                    className="rounded-lg border border-green-300 px-3 py-1 text-sm text-green-700"
                  >
                    Mark implemented
                  </button>
                </form>
              ) : (
                <form action={updateFeatureRequestStatus}>
                  <input type="hidden" name="request_id" value={item.id} />
                  <input type="hidden" name="status" value="open" />
                  <button
                    type="submit"
                    className="rounded-lg border border-yellow-300 px-3 py-1 text-sm text-yellow-700"
                  >
                    Reopen
                  </button>
                </form>
              )}
            </>
          )}

          {canDelete && (
            <form action={deleteFeatureRequest}>
              <input type="hidden" name="request_id" value={item.id} />
              <button
                type="submit"
                className="rounded-lg border border-red-300 px-3 py-1 text-sm text-red-600"
              >
                {isOwnRequest ? "Delete" : "Admin delete"}
              </button>
            </form>
          )}
        </div>
      </div>

      <FeedbackCommentsSection
        requestId={item.id}
        comments={item.comments}
        currentUserId={currentUserId}
        currentUserIsAdmin={currentUserIsAdmin}
      />
    </div>
  );
}