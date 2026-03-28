import Link from "next/link";
import { notFound } from "next/navigation";
import NavBar from "@/app/components/layout/navbar";
import SinglePostView from "@/app/components/posts/SinglePostView";
import { createClient } from "@/lib/supabase-server";
import type { FeedPost } from "@/types/feed";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{ id: string }>;
};

type PostRow = {
  id: number;
  content: string | null;
  created_at: string;
  user_id: string | null;
};

type ProfileRow = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  is_admin?: boolean | null;
};

type LikeRow = {
  post_id: number | null;
  user_id: string;
};

type CommentRow = {
  post_id: number | null;
};

// =====================================================
// Page
// =====================================================

export default async function PostDetailPage({ params }: PageProps) {
  // =====================================================
  // Params
  // =====================================================

  const { id } = await params;
  const postId = Number(id);

  if (!Number.isFinite(postId)) {
    notFound();
  }

  // =====================================================
  // Auth / Nav User
  // =====================================================

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let viewerIsAdmin = false;

  let navUser: {
    username: string;
    avatar_url: string | null;
    is_admin: boolean;
  } | null = null;

  if (user) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, is_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      throw new Error(profileError.message);
    }

    const typedProfile = (profile ?? null) as ProfileRow | null;

    viewerIsAdmin = typedProfile?.is_admin ?? false;

    if (typedProfile?.username) {
      navUser = {
        username: typedProfile.username,
        avatar_url: typedProfile.avatar_url ?? null,
        is_admin: typedProfile.is_admin ?? false,
      };
    }
  }

  // =====================================================
  // Load Post
  // =====================================================

  const { data: postData, error: postError } = await supabase
    .from("posts")
    .select("id, content, created_at, user_id")
    .eq("id", postId)
    .maybeSingle();

  if (postError) {
    throw new Error(postError.message);
  }

  if (!postData) {
    notFound();
  }

  const post = postData as PostRow;

  // =====================================================
  // Load Author
  // =====================================================

  let authorProfile: ProfileRow | null = null;

  if (post.user_id) {
    const { data: authorData, error: authorError } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .eq("id", post.user_id)
      .maybeSingle();

    if (authorError) {
      throw new Error(authorError.message);
    }

    authorProfile = (authorData ?? null) as ProfileRow | null;
  }

  // =====================================================
  // Load Live Counts / Viewer Like State
  // =====================================================

  const { data: likesData, error: likesError } = await supabase
    .from("likes")
    .select("post_id, user_id")
    .eq("post_id", postId);

  if (likesError) {
    throw new Error(likesError.message);
  }

  const likes = (likesData ?? []) as LikeRow[];
  const likesCount = likes.length;
  const viewerHasLiked = !!user && likes.some((like) => like.user_id === user.id);

  const { data: commentsData, error: commentsError } = await supabase
    .from("comments")
    .select("post_id")
    .eq("post_id", postId);

  if (commentsError) {
    throw new Error(commentsError.message);
  }

  const comments = (commentsData ?? []) as CommentRow[];
  const commentsCount = comments.length;

  // =====================================================
  // Build Feed Post
  // =====================================================

  const initialPost: FeedPost = {
    id: post.id,
    content: post.content ?? "",
    created_at: post.created_at,
    likes_count: likesCount,
    comments_count: commentsCount,
    viewer_has_liked: viewerHasLiked,
    can_delete: !!user && (post.user_id === user.id || viewerIsAdmin),
    author_username: authorProfile?.username ?? null,
    author_avatar_url: authorProfile?.avatar_url ?? null,
  };

  // =====================================================
  // Render
  // =====================================================

  return (
    <>
      <NavBar user={navUser} />

      <main className="mx-auto max-w-2xl p-6">

        {/* Auth Notice */}
        {!user && (
          <div className="mb-6 rounded-xl bg-white p-4 shadow">
            <p className="mb-3 text-gray-700">
              You need an account to like, comment, and interact with posts.
            </p>
            <Link
              href="/login"
              className="inline-block rounded-lg bg-black px-4 py-2 text-white"
            >
              Go to Login / Signup
            </Link>
          </div>
        )}

        {/* Post */}
        <SinglePostView initialPost={initialPost} />
      </main>
    </>
  );
}