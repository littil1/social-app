type LikeButtonProps = {
  postId: number;
  liked: boolean;
  action: (formData: FormData) => Promise<void>;
  path: string;
  authorUsername: string | null;
};

export default function LikeButton({
  postId,
  liked,
  action,
  path,
  authorUsername,
}: LikeButtonProps) {
  return (
    <form action={action}>
      <input type="hidden" name="postId" value={postId} />
      <input type="hidden" name="path" value={path} />
      <input type="hidden" name="author_username" value={authorUsername ?? ""} />

      <button
        type="submit"
        className={`rounded-lg border px-3 py-1 text-sm transition ${
          liked
            ? "border-pink-300 bg-pink-50 text-pink-700"
            : "border-gray-300 text-gray-700"
        }`}
      >
        {liked ? "♥ Liked" : "♡ Like"}
      </button>
    </form>
  );
}