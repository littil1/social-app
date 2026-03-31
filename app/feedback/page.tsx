import NavBar from "@/app/components/layout/navbar";
import FeedbackCard from "@/app/components/feedback/FeedbackCard";
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
        avatar_url: string | null;
        is_admin: boolean;
      }
    | null = null;

  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("username, avatar_url, is_admin")
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
      <NavBar
        user={
          user
            ? {
                username: viewerProfile?.username ?? "user",
                avatar_url: viewerProfile?.avatar_url ?? null,
                is_admin: viewerProfile?.is_admin ?? false,
              }
            : null
        }
      />

      <main className="mx-auto max-w-6xl p-6">
        {/* ===================================================== */}
        {/* Header */}
        {/* ===================================================== */}

        <div className="mb-6">
          <h1 className="mb-2 text-3xl font-bold">Verbesserungswünsche</h1>
          <p className="text-gray-600">
            Teile konkrete Ideen, stimme für wichtige Verbesserungen ab und
            diskutiere mit, was als Nächstes gebaut werden soll.
          </p>
        </div>

        {/* ===================================================== */}
        {/* Idea form */}
        {/* ===================================================== */}

        <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          {user ? (
            <form action={addFeatureRequest} className="space-y-3">
              <input
                type="text"
                name="title"
                placeholder="Kurzer Titel deiner Idee ..."
                required
                minLength={3}
                maxLength={120}
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 outline-none transition focus:border-gray-400"
              />

              <textarea
                name="description"
                placeholder="Beschreibe deine Idee konkret ..."
                required
                minLength={3}
                maxLength={1000}
                rows={4}
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 outline-none transition focus:border-gray-400"
              />

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-500">
                  Du postest als @{viewerProfile?.username ?? "user"}
                </p>

                <button
                  type="submit"
                  className="rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
                >
                  Idee einreichen
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Kurzer Titel deiner Idee ..."
                disabled
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-gray-400 outline-none"
              />

              <textarea
                placeholder="Beschreibe deine Idee konkret ..."
                rows={4}
                disabled
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-gray-400 outline-none"
              />

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-500">
                  Zum Einreichen einer Idee öffnet sich beim Absenden der Login.
                </p>

                <a
                  href="/login"
                  className="inline-flex items-center justify-center rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
                >
                  Idee einreichen
                </a>
              </div>
            </div>
          )}
        </div>

        {/* ===================================================== */}
        {/* Feedback columns */}
        {/* ===================================================== */}

        <div className="grid gap-6 lg:grid-cols-2">
          <section>
            <h2 className="mb-4 text-2xl font-semibold">Offen</h2>

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
                <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center text-gray-500 shadow-sm">
                  Noch keine offenen Ideen vorhanden.
                </div>
              )}
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold">Umgesetzt</h2>

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
                <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center text-gray-500 shadow-sm">
                  Noch keine umgesetzten Ideen vorhanden.
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}