import Link from "next/link";
import LikeButton from "./LikeButton";
import CommentsSection from "./CommentsSection";
import { deletePost, likePost } from "./actions/social";
import type { EnrichedPost } from "@/lib/social-data";

export default function PostCard({
  post,
  currentUserId,
  path,
}: {
  post: EnrichedPost;
  currentUserId: string | null;
  path: string;
}) {
  const isOwnPost = currentUserId === post.user_id;

  return (
    <div className="rounded-xl bg-white p-4 shadow">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-sm font-semibold text-gray-600">
          {post.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.avatar_url}
              alt={`${post.username ?? "User"} avatar`}
              className="h-full w-full object-cover"
            />
          ) : (
            (post.username ?? "u").charAt(0).toUpperCase()
          )}
        </div>

        <div>
          {post.username ? (
            <Link
              href={`/u/${post.username}`}
              className="block text-sm text-gray-700 hover:underline"
            >
              @{post.username}
            </Link>
          ) : (
            <p className="text-sm text-gray-500">@unknown</p>
          )}
        </div>
      </div>

      <p className="mb-3 whitespace-pre-wrap text-base text-gray-900">
        {post.content}
      </p>

      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-gray-500">#{post.id}</span>
          <span className="text-sm text-gray-500">
            {post.likeCountToday} Likes today
          </span>
          <span className="text-sm text-gray-500">
            {post.commentCount} Comments
          </span>

          {currentUserId && (
            <LikeButton
              postId={post.id}
              liked={post.likedByViewer}
              action={likePost}
              path={path}
              authorUsername={post.username}
            />
          )}

          {currentUserId && post.likedByViewer && (
            <span className="text-sm text-pink-600">Liked by you</span>
          )}
        </div>

        {isOwnPost && (
          <form action={deletePost}>
            <input type="hidden" name="id" value={post.id} />
            <input type="hidden" name="path" value={path} />
            <input
              type="hidden"
              name="author_username"
              value={post.username ?? ""}
            />
            <button
              type="submit"
              className="rounded-lg border border-red-300 px-3 py-1 text-sm text-red-600"
            >
              Delete
            </button>
          </form>
        )}
      </div>

      <CommentsSection
        postId={post.id}
        comments={post.comments}
        currentUserId={currentUserId}
        path={path}
        authorUsername={post.username}
      />
    </div>
  );
}