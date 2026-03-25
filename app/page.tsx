import Link from "next/link";
import NavBar from "./navbar";
import { createClient } from "@/lib/supabase-server";
import HomeFeed from "@/app/components/feed/HomeFeed";
import { FEED_PAGE_SIZE, getFeedPage } from "@/lib/feed";

export const dynamic = "force-dynamic";

export default async function Home() {
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

  const initialPosts = await getFeedPage(0, FEED_PAGE_SIZE);

  return (
    <>
      <NavBar user={navUser} />

      <main className="mx-auto max-w-2xl p-6">
        {!user && (
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

        <HomeFeed
          initialPosts={initialPosts}
          pageSize={FEED_PAGE_SIZE}
          isLoggedIn={!!user}
        />
      </main>
    </>
  );
}