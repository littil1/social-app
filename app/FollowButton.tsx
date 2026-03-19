import { toggleFollow } from "./actions/social";

export default function FollowButton({
  isFollowing,
  targetUserId,
  targetUsername,
  path,
}: {
  isFollowing: boolean;
  targetUserId: string;
  targetUsername: string;
  path: string;
}) {
  return (
    <form action={toggleFollow}>
      <input type="hidden" name="target_user_id" value={targetUserId} />
      <input type="hidden" name="target_username" value={targetUsername} />
      <input type="hidden" name="path" value={path} />

      <button
        type="submit"
        className={`rounded-lg px-4 py-2 text-sm ${
          isFollowing
            ? "border border-gray-300 text-gray-700"
            : "bg-black text-white"
        }`}
      >
        {isFollowing ? "Following" : "Follow"}
      </button>
    </form>
  );
}