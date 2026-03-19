import NavBar from "../navbar";
import PostCard from "../PostCard";
import { createClient } from "@/lib/supabase-server";
import {
  getPostsBundle,
  sortTrendingToday,
  sortTrendingWeek,
} from "@/lib/social-data";

export const dynamic = "force-dynamic";

export default async function ExplorePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const allPosts = await getPostsBundle(supabase, {
    viewerId: user?.id ?? null,
  });

  const todayPosts = sortTrendingToday(allPosts);
  const weekPosts = sortTrendingWeek(allPosts);

  return (
    <>
      <NavBar />

      <main className="mx-auto max-w-5xl p-6">
        <h1 className="mb-6 text-3xl font-bold">Explore</h1>

        <div className="grid gap-6 md:grid-cols-2">
          <section>
            <h2 className="mb-4 text-xl font-semibold">Trending today</h2>
            <div className="space-y-4">
              {todayPosts.map((post) => (
                <PostCard
                  key={`today-${post.id}`}
                  post={post}
                  currentUserId={user?.id ?? null}
                  path="/explore"
                />
              ))}

              {todayPosts.length === 0 && (
                <div className="rounded-xl bg-white p-6 text-center text-gray-500 shadow">
                  No posts yet.
                </div>
              )}
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold">Trending this week</h2>
            <div className="space-y-4">
              {weekPosts.map((post) => (
                <PostCard
                  key={`week-${post.id}`}
                  post={post}
                  currentUserId={user?.id ?? null}
                  path="/explore"
                />
              ))}

              {weekPosts.length === 0 && (
                <div className="rounded-xl bg-white p-6 text-center text-gray-500 shadow">
                  No posts yet.
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}