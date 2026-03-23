import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import type { Database } from "@/types/database";

type PostRow = Database["public"]["Tables"]["posts"]["Row"];

function getCurrentWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + diffToMonday);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  return { weekStart, weekEnd };
}

export default async function WeeklyTopPostHighlight() {
  const supabase = await createClient();
  const { weekStart, weekEnd } = getCurrentWeekRange();

  const { data, error } = await supabase
    .from("posts")
    .select("id, content, created_at, user_id, likes_count, comments_count")
    .gte("created_at", weekStart.toISOString())
    .lt("created_at", weekEnd.toISOString())
    .order("likes_count", { ascending: false })
    .order("comments_count", { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(error.message);
  }

  const weeklyPosts = (data ?? []) as PostRow[];

  const topWeeklyPost =
    weeklyPosts.length > 0
      ? [...weeklyPosts]
          .map((post) => ({
            ...post,
            relevance_score:
              (post.likes_count ?? 0) * 0.5 + (post.comments_count ?? 0),
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
          })[0]
      : null;

  if (!topWeeklyPost) {
    return null;
  }

  return (
    <div className="mb-6 rounded-xl bg-white p-5 shadow">
      <div className="mb-3 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-gray-900">
            Top Post dieser Woche
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Aktuell führend nach Relevanz
          </p>
        </div>

        <Link
          href="/leaderboard"
          className="rounded-lg border px-3 py-2 text-sm text-gray-700"
        >
          Zur Hall of Fame
        </Link>
      </div>

      <p className="mb-4 whitespace-pre-wrap break-words text-gray-900">
        {topWeeklyPost.content ?? ""}
      </p>

      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
        <span>{topWeeklyPost.likes_count ?? 0} Likes</span>
        <span>{topWeeklyPost.comments_count ?? 0} Kommentare</span>
        <span>
          Relevanz{" "}
          {(
            (topWeeklyPost.likes_count ?? 0) * 0.5 +
            (topWeeklyPost.comments_count ?? 0)
          ).toFixed(1)}
        </span>
      </div>
    </div>
  );
}