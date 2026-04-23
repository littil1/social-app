import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type PostCommentCountSource = {
  id: number;
};

type CommentRow = Pick<
  Database["public"]["Tables"]["comments"]["Row"],
  "post_id"
>;

export async function resolvePostCommentCounts(
  supabase: SupabaseClient<Database>,
  posts: PostCommentCountSource[]
) {
  const counts = new Map<number, number>();
  const postIds = posts.map((post) => post.id);

  if (postIds.length === 0) {
    return counts;
  }

  const { data, error } = await supabase
    .from("comments")
    .select("post_id")
    .is("deleted_at", null)
    .in("post_id", postIds);

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

  for (const postId of postIds) {
    counts.set(postId, liveCounts.get(postId) ?? 0);
  }

  return counts;
}
