import Link from "next/link";
import NavBar from "@/app/navbar";
import FollowingFeed from "@/app/components/feed/FollowingFeed";
import { createClient } from "@/lib/supabase-server";
import { getFollowingIds } from "@/lib/follow-data";
import type { FeedPost } from "@/types/feed";

export const dynamic = "force-dynamic";

type PostRow = {
  id: number;
  content: string;
  created_at: string;
  likes_count: number | null;
  comments_count: number | null;
  user_id: string;
};

type ProfileRow = {
  id: string;
  username: string | null;
  avatar_url: string | null;
};

type LikeRow = {
  post_id: number;
};

export default async function FollowingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <>
        <NavBar />

        <main className="mx-auto max-w-2xl p-6">
          <h1 className="mb-6 text-3xl font-bold">Following</h1>

          <div className="rounded-xl bg-white p-6 shadow">
            <p className="mb-4 text-gray-700">
              Log in to see posts from people you follow.
            </p>

            <Link
              href="/login"
              className="inline-block rounded-lg bg-black px-4 py-2 text-white"
            >
              Go to Login / Signup
            </Link>
          </div>
        </main>
      </>
    );
  }

  let viewerIsAdmin = false;

  const { data: viewerProfile, error: viewerProfileError } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (viewerProfileError) {
    throw new Error(viewerProfileError.message);
  }

  viewerIsAdmin = viewerProfile?.is_admin ?? false;

  const followingIds = await getFollowingIds(supabase, user.id);

  if (followingIds.length === 0) {
    return (
      <>
        <NavBar />

        <main className="mx-auto max-w-2xl p-6">
          <h1 className="mb-6 text-3xl font-bold">Following</h1>

          <div className="rounded-xl bg-white p-6 shadow">
            <p className="text-gray-700">
              You are not following anyone yet. Visit profiles and click follow.
            </p>
          </div>
        </main>
      </>
    );
  }

  const { data: posts, error: postsError } = await supabase
    .from("posts")
    .select("id, content, created_at, likes_count, comments_count, user_id")
    .in("user_id", followingIds)
    .order("created_at", { ascending: false })
    .limit(20);

  if (postsError) {
    throw new Error(postsError.message);
  }

  const typedPosts = (posts ?? []) as PostRow[];
  const postIds = typedPosts.map((post) => post.id);
  const authorIds = [...new Set(typedPosts.map((post) => post.user_id))];

  let profilesById = new Map<string, ProfileRow>();

  if (authorIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .in("id", authorIds);

    if (profilesError) {
      throw new Error(profilesError.message);
    }

    profilesById = new Map(
      ((profiles ?? []) as ProfileRow[]).map((profile) => [profile.id, profile])
    );
  }

  let likedPostIds = new Set<number>();

  if (postIds.length > 0) {
    const { data: likes, error: likesError } = await supabase
      .from("likes")
      .select("post_id")
      .eq("user_id", user.id)
      .in("post_id", postIds);

    if (likesError) {
      throw new Error(likesError.message);
    }

    likedPostIds = new Set(
      ((likes ?? []) as LikeRow[]).map((like) => like.post_id)
    );
  }

  const feedPosts: FeedPost[] = typedPosts.map((post) => {
    const authorProfile = profilesById.get(post.user_id);

    return {
      id: post.id,
      content: post.content,
      created_at: post.created_at,
      likes_count: post.likes_count ?? 0,
      comments_count: post.comments_count ?? 0,
      viewer_has_liked: likedPostIds.has(post.id),
      can_delete: post.user_id === user.id || viewerIsAdmin,
      author_username: authorProfile?.username ?? null,
      author_avatar_url: authorProfile?.avatar_url ?? null,
    };
  });

  return (
    <>
      <NavBar />

      <main className="mx-auto max-w-2xl p-6">
        <h1 className="mb-6 text-3xl font-bold">Following</h1>
        <FollowingFeed initialPosts={feedPosts} />
      </main>
    </>
  );
}