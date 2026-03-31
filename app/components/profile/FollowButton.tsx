import { toggleFollow } from "../../actions/social";

// =====================================================
// Types
// =====================================================

type FollowButtonProps = {
  isFollowing: boolean;
  targetUserId: string;
  targetUsername: string;
  path: string;
};

// =====================================================
// Component
// =====================================================

export default function FollowButton({
  isFollowing,
  targetUserId,
  targetUsername,
  path,
}: FollowButtonProps) {
  return (
    <form action={toggleFollow}>
      <input type="hidden" name="target_user_id" value={targetUserId} />
      <input type="hidden" name="target_username" value={targetUsername} />
      <input type="hidden" name="path" value={path} />

      <button
        type="submit"
        className={`rounded-full px-4 py-2 text-sm font-medium transition ${
          isFollowing
            ? "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            : "bg-black text-white hover:opacity-90"
        }`}
      >
        {isFollowing ? "Gefolgt" : "Folgen"}
      </button>
    </form>
  );
}