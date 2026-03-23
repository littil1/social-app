import NavBar from "../navbar";
import ExploreFeed from "@/app/components/feed/ExploreFeed";
import { EXPLORE_PAGE_SIZE, getTrendingFeedPage } from "@/lib/explore-feed";

export const dynamic = "force-dynamic";

export default async function ExplorePage() {
  const initialPosts = await getTrendingFeedPage(0, EXPLORE_PAGE_SIZE);

  return (
    <>
      <NavBar />

      <main className="mx-auto max-w-2xl p-6">
        <h1 className="mb-2 text-3xl font-bold">Explore</h1>
        <p className="mb-6 text-sm text-gray-500">
          Trending posts sorted by likes, comments, and recency.
        </p>

        <ExploreFeed initialPosts={initialPosts} pageSize={EXPLORE_PAGE_SIZE} />
      </main>
    </>
  );
}