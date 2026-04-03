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

  const totalSupporters = feedback.reduce((sum, item) => sum + item.likeCount, 0);
  const totalComments = feedback.reduce((sum, item) => sum + item.commentCount, 0);

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

      <main className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <div className="space-y-8 sm:space-y-10 lg:space-y-12">
          {/* ===================================================== */}
          {/* Hero */}
          {/* ===================================================== */}

          <section className="relative overflow-hidden rounded-[32px] border border-indigo-100/80 bg-gradient-to-br from-white via-indigo-50/80 to-sky-100/70 px-5 py-6 shadow-[0_35px_90px_-45px_rgba(99,102,241,0.28)] sm:px-8 sm:py-9 lg:px-10 lg:py-11">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute left-1/2 top-0 h-40 w-40 -translate-x-1/2 rounded-full bg-indigo-200/30 blur-3xl" />
              <div className="absolute left-0 top-10 h-28 w-28 rounded-full bg-sky-200/25 blur-3xl" />
              <div className="absolute bottom-0 right-0 h-36 w-36 rounded-full bg-violet-200/25 blur-3xl" />
            </div>

            <div className="relative grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
              <div className="max-w-3xl">
                <div className="mb-4 inline-flex rounded-full border border-indigo-200 bg-white/85 px-4 py-1.5 text-sm font-semibold text-indigo-900 backdrop-blur">
                  Wünsche & Feedback
                </div>

                <h1 className="text-3xl font-bold tracking-tight text-gray-950 sm:text-5xl lg:text-6xl">
                  Hilf mit, APP besser zu machen.
                </h1>

                <p className="mt-4 max-w-2xl text-sm leading-6 text-gray-700 sm:text-base sm:leading-7">
                  Gute Ideen sollen nicht verloren gehen. Teile konkrete
                  Verbesserungen, unterstütze starke Vorschläge und gestalte die
                  Plattform gemeinsam mit.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/70 bg-white/80 px-3 py-1.5 text-sm font-medium text-gray-700 backdrop-blur">
                    Mitgestalten
                  </span>
                  <span className="rounded-full border border-white/70 bg-white/80 px-3 py-1.5 text-sm font-medium text-gray-700 backdrop-blur">
                    Priorisieren
                  </span>
                  <span className="rounded-full border border-white/70 bg-white/80 px-3 py-1.5 text-sm font-medium text-gray-700 backdrop-blur">
                    Sichtbar umsetzen
                  </span>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                <div className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-sm backdrop-blur">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700">
                    Offen
                  </p>
                  <p className="mt-2 text-3xl font-bold tracking-tight text-gray-950">
                    {openIdeas.length}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    Ideen warten aktuell auf Unterstützung oder Umsetzung.
                  </p>
                </div>

                <div className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-sm backdrop-blur">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700">
                    Unterstützungen
                  </p>
                  <p className="mt-2 text-3xl font-bold tracking-tight text-gray-950">
                    {totalSupporters}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    So oft wurden Ideen bereits von der Community gestärkt.
                  </p>
                </div>

                <div className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-sm backdrop-blur">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700">
                    Umgesetzt
                  </p>
                  <p className="mt-2 text-3xl font-bold tracking-tight text-gray-950">
                    {implementedIdeas.length}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    Gute Vorschläge werden sichtbar weitergetragen.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ===================================================== */}
          {/* Idea form */}
          {/* ===================================================== */}

          <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div className="rounded-[30px] border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-700">
                Warum diese Seite wichtig ist
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl">
                Gute Ideen sollen Wirkung bekommen
              </h2>

              <div className="mt-4 space-y-3 text-sm leading-6 text-gray-600 sm:text-base">
                <p>
                  Nicht jede Verbesserung entsteht intern. Oft sehen Nutzer am
                  schnellsten, was fehlt, was stört und was echten Mehrwert
                  bringen würde.
                </p>
                <p>
                  Je konkreter deine Idee ist, desto eher kann sie verstanden,
                  diskutiert und umgesetzt werden.
                </p>
              </div>

              <div className="mt-5 grid gap-3">
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4">
                  <p className="text-sm font-semibold text-gray-950">
                    Gute Ideen sind konkret
                  </p>
                  <p className="mt-1 text-sm leading-6 text-gray-600">
                    Beschreibe klar, welches Problem gelöst wird und wie sich
                    die App dadurch verbessert.
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm font-semibold text-gray-950">
                    Unterstützung zeigt Relevanz
                  </p>
                  <p className="mt-1 text-sm leading-6 text-gray-600">
                    Stimme für Vorschläge ab, die für viele Menschen echten
                    Nutzen bringen.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[30px] border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-700">
                  Neue Idee einreichen
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl">
                  Was sollte als Nächstes besser werden?
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600 sm:text-base">
                  Teile eine klare, hilfreiche Idee mit der Community. Gute
                  Vorschläge können unterstützt, diskutiert und später umgesetzt
                  werden.
                </p>
              </div>

              {user ? (
                <form action={addFeatureRequest} className="space-y-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="feedback-title"
                      className="text-sm font-medium text-gray-800"
                    >
                      Titel
                    </label>
                    <input
                      id="feedback-title"
                      type="text"
                      name="title"
                      placeholder="Zum Beispiel: Gespeicherte Beiträge anzeigen"
                      required
                      minLength={3}
                      maxLength={120}
                      className="w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none transition focus:border-indigo-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="feedback-description"
                      className="text-sm font-medium text-gray-800"
                    >
                      Beschreibung
                    </label>
                    <textarea
                      id="feedback-description"
                      name="description"
                      placeholder="Beschreibe konkret, was verbessert werden sollte, warum es hilfreich wäre und wie du dir die Lösung vorstellst ..."
                      required
                      minLength={3}
                      maxLength={1000}
                      rows={6}
                      className="w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none transition focus:border-indigo-400"
                    />
                  </div>

                  <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-gray-600">
                      Du reichst diese Idee ein als{" "}
                      <span className="font-semibold text-gray-950">
                        @{viewerProfile?.username ?? "user"}
                      </span>
                    </p>

                    <button
                      type="submit"
                      className="inline-flex items-center justify-center rounded-2xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
                    >
                      Idee einreichen
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-800">
                      Titel
                    </label>
                    <input
                      type="text"
                      placeholder="Zum Beispiel: Gespeicherte Beiträge anzeigen"
                      disabled
                      className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-400 outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-800">
                      Beschreibung
                    </label>
                    <textarea
                      placeholder="Beschreibe konkret, was verbessert werden sollte ..."
                      rows={6}
                      disabled
                      className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-400 outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-gray-600">
                      Zum Einreichen deiner Idee öffnet sich der Login.
                    </p>

                    <a
                      href="/login"
                      className="inline-flex items-center justify-center rounded-2xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
                    >
                      Idee einreichen
                    </a>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* ===================================================== */}
          {/* Feedback columns */}
          {/* ===================================================== */}

          <div className="grid gap-6 xl:grid-cols-2">
            <section className="space-y-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-700">
                    Community
                  </p>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl">
                    Offen
                  </h2>
                </div>

                <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-900">
                  {openIdeas.length}
                </span>
              </div>

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
                  <div className="rounded-[28px] border border-gray-200 bg-white p-6 text-center text-gray-500 shadow-sm sm:p-8">
                    Noch keine offenen Ideen vorhanden.
                  </div>
                )}
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                    Fortschritt
                  </p>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl">
                    Umgesetzt
                  </h2>
                </div>

                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900">
                  {implementedIdeas.length}
                </span>
              </div>

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
                  <div className="rounded-[28px] border border-gray-200 bg-white p-6 text-center text-gray-500 shadow-sm sm:p-8">
                    Noch keine umgesetzten Ideen vorhanden.
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* ===================================================== */}
          {/* Footer stats */}
          {/* ===================================================== */}

          <section className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">Offene Ideen</p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-gray-950">
                {openIdeas.length}
              </p>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">Kommentare insgesamt</p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-gray-950">
                {totalComments}
              </p>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">Unterstützungen insgesamt</p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-gray-950">
                {totalSupporters}
              </p>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}