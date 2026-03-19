import NavBar from "./navbar";
import PostCard from "./PostCard";
import { addPost } from "./actions/social";
import { createClient } from "@/lib/supabase-server";
import { getPostsBundle, sortTrendingToday } from "@/lib/social-data";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let viewerProfile:
    | {
        username: string | null;
      }
    | null = null;

  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();

    viewerProfile = data;
  }

  const posts = sortTrendingToday(
    await getPostsBundle(supabase, {
      viewerId: user?.id ?? null,
    })
  );

  return (
    <>
      <NavBar />

      <main className="mx-auto max-w-2xl p-6">
        <h1 className="mb-6 text-3xl font-bold">Home</h1>

        {user ? (
          <div className="mb-6 rounded-xl bg-white p-4 shadow">
            <form action={addPost} className="flex gap-2">
              <input type="hidden" name="path" value="/" />
              <input
                type="hidden"
                name="viewer_username"
                value={viewerProfile?.username ?? ""}
              />

              <input
                type="text"
                name="content"
                placeholder="Write something..."
                required
                minLength={2}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 outline-none"
              />
              <button
                type="submit"
                className="rounded-lg bg-black px-4 py-2 text-white"
              >
                Post
              </button>
            </form>
          </div>
        ) : (
          <div className="mb-6 rounded-xl bg-white p-4 shadow">
            <p className="mb-3 text-gray-700">
              You need an account to post, like, comment, and follow users.
            </p>
            <Link
              href="/login"
              className="inline-block rounded-lg bg-black px-4 py-2 text-white"
            >
              Go to Login / Signup
            </Link>
          </div>
        )}

        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={user?.id ?? null}
              path="/"
            />
          ))}

          {posts.length === 0 && (
            <div className="rounded-xl bg-white p-6 text-center text-gray-500 shadow">
              No posts yet.
            </div>
          )}
        </div>
      </main>
    </>
  );
}