import Link from "next/link";
import NavBar from "@/app/navbar";
import { createClient } from "@/lib/supabase-server";
import type { Database } from "@/types/database";

export const dynamic = "force-dynamic";

type HallOfFameRow =
  Database["public"]["Tables"]["weekly_post_hall_of_fame"]["Row"];

function formatDate(dateString: string) {
  const date = new Date(dateString);

  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getCategoryLabel(category: string) {
  if (category === "likes") return "Meiste Likes";
  if (category === "relevance") return "Höchste Relevanz";
  if (category === "comments") return "Meiste Kommentare";
  return category;
}

export default async function LeaderboardPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("weekly_post_hall_of_fame")
    .select("*")
    .order("week_start", { ascending: false })
    .order("category", { ascending: true })
    .order("rank_position", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const items = (data ?? []) as HallOfFameRow[];

  return (
    <>
      <NavBar />

      <main className="mx-auto max-w-4xl p-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Hall of Fame</h1>
            <p className="mt-2 text-sm text-gray-500">
              Hier werden die Wochensieger dauerhaft ausgestellt.
            </p>
          </div>

          <Link
            href="/"
            className="rounded-lg border px-4 py-2 text-sm text-gray-700"
          >
            Back to Home
          </Link>
        </div>

        {items.length === 0 ? (
          <div className="rounded-xl bg-white p-6 text-center text-gray-500 shadow">
            Noch keine Posts in der Hall of Fame.
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <article key={item.id} className="rounded-xl bg-white p-6 shadow">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {item.week_label} · {getCategoryLabel(item.category)}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Aufgenommen am {formatDate(item.inducted_at)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                      Post #{item.post_id}
                    </span>
                    <span className="rounded-full bg-black px-3 py-1 text-xs font-medium text-white">
                      Platz #{item.rank_position}
                    </span>
                  </div>
                </div>

                <div className="mb-4 space-y-1">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium text-gray-800">Autor:</span>{" "}
                    {item.author_username ? `@${item.author_username}` : "Unbekannt"}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium text-gray-800">Erstellt:</span>{" "}
                    {formatDate(item.post_created_at)}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium text-gray-800">Woche:</span>{" "}
                    {formatDate(`${item.week_start}T00:00:00`)} bis{" "}
                    {formatDate(`${item.week_end}T00:00:00`)}
                  </p>
                </div>

                <p className="mb-5 whitespace-pre-wrap break-words text-gray-900">
                  {item.post_content}
                </p>

                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                  <span>{item.likes_count} Likes</span>
                  <span>{item.comments_count} Kommentare</span>
                  <span>Relevanz {Number(item.relevance_score).toFixed(1)}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </>
  );
}