import NavBar from "./navbar";
import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import HomeFeed from "@/app/components/feed/HomeFeed";
import WeeklyTopPostHighlight from "@/app/components/feed/WeeklyTopPostHighlight";
import { FEED_PAGE_SIZE, getFeedPage } from "@/lib/feed";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const initialPosts = await getFeedPage(0, FEED_PAGE_SIZE);

  return (
    <>
      <NavBar />

      <main className="mx-auto max-w-2xl p-6">
        <h1 className="mb-6 text-3xl font-bold">Home</h1>

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