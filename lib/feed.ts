import { createClient } from "@/lib/supabase-server";
import type { FeedPost } from "@/types/feed";
import type { Database } from "@/types/database";

export const FEED_PAGE_SIZE = 10;

type PostRow = Database["public"]["Tables"]["posts"]["Row"];
type LikeRow = Pick<Database["public"]["Tables"]["likes"]["Row"], "post_id" | "user_id">;
type CommentRow = Pick<
  Database["public"]["Tables"]["comments"]["Row"],
  "post_id"
>;

export async function getFeedPage(
  offset = 0,
  limit = FEED_PAGE_SIZE
): Promise<FeedPost[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let viewerIsAdmin = false;

  if (user) {
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      throw new Error(profileError.message);
    }

    viewerIsAdmin = profileData?.is_admin ?? false;
  }

  const { data: postsData, error: postsError } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (postsError) {
    throw new Error(postsError.message);
  }

  const posts = (postsData ?? []) as PostRow[];

  if (posts.length === 0) {
    return [];
  }

  const postIds = posts.map((post) => post.id);

  const { data: likesData, error: likesError } = await supabase
    .from("likes")
    .select("post_id, user_id")
    .in("post_id", postIds);

  if (likesError) {
    throw new Error(likesError.message);
  }

  const likes = (likesData ?? []) as LikeRow[];

  const likeCountMap = new Map<number, number>();
  const likedPostIds = new Set<number>();

  for (const like of likes) {
    if (typeof like.post_id !== "number") continue;

    likeCountMap.set(like.post_id, (likeCountMap.get(like.post_id) ?? 0) + 1);

    if (user && like.user_id === user.id) {
      likedPostIds.add(like.post_id);
    }
  }

  const { data: commentsData, error: commentsError } = await supabase
    .from("comments")
    .select("post_id")
    .in("post_id", postIds);

  if (commentsError) {
    throw new Error(commentsError.message);
  }

  const commentCountMap = new Map<number, number>();

  for (const comment of (commentsData ?? []) as CommentRow[]) {
    if (typeof comment.post_id !== "number") continue;

    commentCountMap.set(
      comment.post_id,
      (commentCountMap.get(comment.post_id) ?? 0) + 1
    );
  }

  return posts.map((post) => ({
    id: post.id,
    content: post.content ?? "",
    created_at: post.created_at,
    likes_count: likeCountMap.get(post.id) ?? 0,
    comments_count: commentCountMap.get(post.id) ?? 0,
    viewer_has_liked: likedPostIds.has(post.id),
    can_delete: !!user && (post.user_id === user.id || viewerIsAdmin),
  }));
}