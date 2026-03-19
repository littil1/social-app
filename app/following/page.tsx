import Link from "next/link";
import NavBar from "@/app/navbar";
import PostCard from "@/app/PostCard";
import { createClient } from "@/lib/supabase-server";
import { getFollowingIds } from "@/lib/follow-data";
import { getPostsBundle, sortTrendingToday } from "@/lib/social-data";

export const dynamic = "force-dynamic";

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

  const followingIds = await getFollowingIds(supabase, user.id);
  const allPosts = await getPostsBundle(supabase, {
    viewerId: user.id,
  });

  const posts = sortTrendingToday(
    allPosts.filter((post) => followingIds.includes(post.user_id))
  );

  return (
    <>
      <NavBar />

      <main className="mx-auto max-w-2xl p-6">
        <h1 className="mb-6 text-3xl font-bold">Following</h1>

        {followingIds.length === 0 ? (
          <div className="rounded-xl bg-white p-6 shadow">
            <p className="text-gray-700">
              You are not following anyone yet. Visit profiles and click follow.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={user.id}
                path="/following"
              />
            ))}

            {posts.length === 0 && (
              <div className="rounded-xl bg-white p-6 text-center text-gray-500 shadow">
                No posts from followed users yet.
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
}