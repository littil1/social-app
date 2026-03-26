import NavBar from "../navbar";
import ExploreFeed from "@/app/components/posts/ExploreFeed";
import { EXPLORE_PAGE_SIZE, getTrendingFeedPage } from "@/lib/explore-feed";
import { createClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function ExplorePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let navUser: {
    username: string;
    avatar_url: string | null;
    is_admin: boolean;
  } | null = null;

  if (user) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("username, avatar_url, is_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      throw new Error(profileError.message);
    }

    if (profile?.username) {
      navUser = {
        username: profile.username,
        avatar_url: profile.avatar_url ?? null,
        is_admin: profile.is_admin ?? false,
      };
    }
  }

  const initialPosts = await getTrendingFeedPage(0, EXPLORE_PAGE_SIZE);

  return (
    <>
      <NavBar user={navUser} />

      <main className="mx-auto max-w-2xl p-6">
        <p className="mb-6 text-sm text-gray-500">
          Trending posts sorted by likes, comments, and recency.
        </p>

        <ExploreFeed initialPosts={initialPosts} pageSize={EXPLORE_PAGE_SIZE} />
      </main>
    </>
  );
}