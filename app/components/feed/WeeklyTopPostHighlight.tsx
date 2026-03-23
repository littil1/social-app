import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import type { Database } from "@/types/database";

type PostRow = Pick<
  Database["public"]["Tables"]["posts"]["Row"],
  "id" | "content" | "created_at" | "user_id" | "likes_count" | "comments_count"
>;

type RankedPost = PostRow & {
  relevance_score: number;
};

function getTodayRange() {
  const now = new Date();

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 1);

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

function getRelevanceScore(post: PostRow) {
  return (post.likes_count ?? 0) * 0.5 + (post.comments_count ?? 0);
}

function rankPosts(posts: PostRow[]) {
  return [...posts]
    .map((post) => ({
      ...post,
      relevance_score: getRelevanceScore(post),
    }))
    .sort((a, b) => {
      if (b.relevance_score !== a.relevance_score) {
        return b.relevance_score - a.relevance_score;
      }

      if ((b.comments_count ?? 0) !== (a.comments_count ?? 0)) {
        return (b.comments_count ?? 0) - (a.comments_count ?? 0);
      }

      if ((b.likes_count ?? 0) !== (a.likes_count ?? 0)) {
        return (b.likes_count ?? 0) - (a.likes_count ?? 0);
      }

      return (
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });
}

function getMedal(index: number) {
  if (index === 0) return "🥇";
  if (index === 1) return "🥈";
  return "🥉";
}

function getTitle(index: number) {
  if (index === 0) return "Top 1 des Tages";
  if (index === 1) return "Top 2 des Tages";
  return "Top 3 des Tages";
}

export default async function WeeklyTopPostHighlight() {
  const supabase = await createClient();
  const { startIso, endIso } = getTodayRange();

  const { data, error } = await supabase
    .from("posts")
    .select("id, content, created_at, user_id, likes_count, comments_count")
    .gte("created_at", startIso)
    .lt("created_at", endIso)
    .order("likes_count", { ascending: false })
    .order("comments_count", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(50);

  if (error) {
    throw new Error(error.message);
  }

  const todaysPosts = (data ?? []) as PostRow[];
  const topThree = rankPosts(todaysPosts).slice(0, 3);

  if (topThree.length === 0) {
    return (
      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-amber-900">
              🏆 Tagesbeste
            </p>
            <p className="mt-1 text-xs text-amber-800/70">
              Heute gibt es noch keine Top Posts.
            </p>
          </div>

          <Link
            href="/leaderboard"
            className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-gray-700"
          >
            Zur Hall of Fame
          </Link>
        </div>

        <p className="text-sm text-gray-700">
          Sei heute der erste Post, der es auf das Tagespodest schafft.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-amber-900">🏆 Top 3 des Tages</p>
          <p className="mt-1 text-xs text-amber-800/70">
            Täglich neu bewertet nach Likes und Kommentaren
          </p>
        </div>

        <Link
          href="/leaderboard"
          className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-gray-700"
        >
          Zur Hall of Fame
        </Link>
      </div>

      <div className="space-y-3">
        {topThree.map((post, index) => (
          <article
            key={post.id}
            className="rounded-xl bg-white/80 p-4 shadow-sm ring-1 ring-black/5"
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="text-lg">{getMedal(index)}</span>
              <p className="text-sm font-semibold text-gray-900">
                {getTitle(index)}
              </p>
            </div>

            <p className="mb-3 whitespace-pre-wrap break-words text-gray-900">
              {post.content ?? ""}
            </p>

            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-700">
              <span>{post.likes_count ?? 0} Likes</span>
              <span>{post.comments_count ?? 0} Kommentare</span>
              <span>Relevanz {post.relevance_score.toFixed(1)}</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}