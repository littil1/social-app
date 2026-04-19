import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type PostCommentCountSource = {
  id: number;
  comments_count: number | null;
};

type CommentRow = Pick<
  Database["public"]["Tables"]["comments"]["Row"],
  "post_id"
>;

export async function resolvePostCommentCounts(
  supabase: SupabaseClient<Database>,
  posts: PostCommentCountSource[]
) {
  const counts = new Map<number, number>(
    posts.map((post) => [post.id, Math.max(0, post.comments_count ?? 0)])
  );

  const postIdsToHydrate = posts
    .filter((post) => (post.comments_count ?? 0) <= 0)
    .map((post) => post.id);

  if (postIdsToHydrate.length === 0) {
    return counts;
  }

  const { data, error } = await supabase
    .from("comments")
    .select("post_id")
    .in("post_id", postIdsToHydrate);

  if (error) {
    throw new Error(error.message);
  }

  const liveCounts = new Map<number, number>();

  for (const comment of (data ?? []) as CommentRow[]) {
    liveCounts.set(
      comment.post_id,
      (liveCounts.get(comment.post_id) ?? 0) + 1
    );
  }

  for (const postId of postIdsToHydrate) {
    counts.set(postId, liveCounts.get(postId) ?? 0);
  }

  return counts;
}
