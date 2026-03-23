import Link from "next/link";
import NavBar from "@/app/navbar";
import FeedbackCard from "@/app/FeedbackCard";
import { addFeatureRequest } from "@/app/actions/feedback";
import { createClient } from "@/lib/supabase-server";
import { getFeedbackBundle } from "@/lib/feedback-data";

export const dynamic = "force-dynamic";

export default async function FeedbackPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const feedback = await getFeedbackBundle(supabase, user?.id ?? null);

  let viewerProfile:
    | {
        username: string | null;
        is_admin: boolean;
      }
    | null = null;

  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("username, is_admin")
      .eq("id", user.id)
      .maybeSingle();

    viewerProfile = data;
  }

  const openIdeas = feedback.filter((item) => item.status === "open");
  const implementedIdeas = feedback.filter(
    (item) => item.status === "implemented"
  );

  return (
    <>
      <NavBar />

      <main className="mx-auto max-w-6xl p-6">
        <div className="mb-6">
          <h1 className="mb-2 text-3xl font-bold">Verbesserungswünsche</h1>
          <p className="text-gray-600">
            Share ideas, vote on what matters most, and discuss what should be
            built next.
          </p>
        </div>

        {user ? (
          <div className="mb-8 rounded-xl bg-white p-4 shadow">
            <form action={addFeatureRequest} className="space-y-3">
              <input
                type="text"
                name="title"
                placeholder="Short title for your idea..."
                required
                minLength={3}
                maxLength={120}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none"
              />

              <textarea
                name="description"
                placeholder="Describe your idea..."
                required
                minLength={3}
                maxLength={1000}
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none"
              />

              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-gray-500">
                  Posting as @{viewerProfile?.username ?? "user"}
                </p>

                <button
                  type="submit"
                  className="rounded-lg bg-black px-4 py-2 text-white"
                >
                  Submit idea
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="mb-8 rounded-xl bg-white p-4 shadow">
            <p className="mb-3 text-gray-700">
              Log in to submit ideas, like requests, and comment on them.
            </p>
            <Link
              href="/login"
              className="inline-block rounded-lg bg-black px-4 py-2 text-white"
            >
              Go to Login / Signup
            </Link>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <section>
            <h2 className="mb-4 text-2xl font-semibold">Open</h2>
            <div className="space-y-4">
              {openIdeas.map((item) => (
                <FeedbackCard
                  key={item.id}
                  item={item}
                  currentUserId={user?.id ?? null}
                  currentUserIsAdmin={viewerProfile?.is_admin ?? false}
                />
              ))}

              {openIdeas.length === 0 && (
                <div className="rounded-xl bg-white p-6 text-center text-gray-500 shadow">
                  No open ideas yet.
                </div>
              )}
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold">Implemented</h2>
            <div className="space-y-4">
              {implementedIdeas.map((item) => (
                <FeedbackCard
                  key={item.id}
                  item={item}
                  currentUserId={user?.id ?? null}
                  currentUserIsAdmin={viewerProfile?.is_admin ?? false}
                />
              ))}

              {implementedIdeas.length === 0 && (
                <div className="rounded-xl bg-white p-6 text-center text-gray-500 shadow">
                  No implemented ideas yet.
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}