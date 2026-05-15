import Link from "next/link";
import FeedbackCard from "@/features/input/components/FeedbackCard";
import InputIdeaForm from "@/features/input/components/InputIdeaForm";
import { addFeatureRequest } from "@/app/actions/feedback";
import { createClient } from "@/lib/supabase/server";
import { getFeedbackBundle } from "@/features/input/lib/feedback-data";
import type { FeedbackItem } from "@/features/input/lib/feedback-data";

export const dynamic = "force-dynamic";

// Helper for the Echo score, matching the arena weighting.
function getEchoScore(item: FeedbackItem) {
  const likes = item.likeCount || 0;
  const comments = item.commentCount || 0;
  return likes + (comments * 2);
}

export default async function InputPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const feedbackPromise = getFeedbackBundle(supabase, user?.id ?? null);
  const viewerProfilePromise = user
    ? supabase
      .from("profiles")
      .select("username, avatar_url, is_admin")
      .eq("id", user.id)
      .maybeSingle()
    : Promise.resolve({ data: null, error: null });

  const [feedback, { data: viewerProfile, error: viewerProfileError }] =
    await Promise.all([feedbackPromise, viewerProfilePromise]);

  if (viewerProfileError) {
    throw new Error(viewerProfileError.message);
  }

  // Sort ideas by Echo score, highest first.
  const openIdeas = feedback
    .filter((item) => item.status === "open")
    .sort((a, b) => getEchoScore(b) - getEchoScore(a));

  const implementedIdeas = feedback
    .filter((item) => item.status === "implemented")
    .sort((a, b) => getEchoScore(b) - getEchoScore(a));

  const totalSupporters = feedback.reduce((sum, item) => sum + item.likeCount, 0);

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <main className="mx-auto max-w-6xl px-4 pb-32 pt-4 sm:px-6 sm:pt-8 lg:px-8 lg:pt-12">
        
        {/* HERO SECTION */}
        <section className="relative mb-5 overflow-hidden rounded-[32px] bg-neutral-950 px-4 py-4 text-white shadow-[0_34px_90px_-34px_rgba(0,0,0,0.55)] sm:mb-9 sm:rounded-[40px] sm:px-8 sm:py-8 lg:mb-10 lg:px-12 lg:py-9">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-amber-400/10 blur-[100px]" />
            <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-white/5 blur-[100px]" />
          </div>

          <div className="relative grid gap-4 lg:grid-cols-[1fr_auto] lg:gap-8">
            <div className="max-w-2xl">
              <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-white/70 sm:px-4 sm:py-1.5 sm:text-[10px] sm:tracking-[0.2em]">
                Co-Creation
              </span>
              <h1 className="mt-3 text-[2rem] font-black leading-none tracking-tighter sm:mt-6 sm:text-6xl">
                Help us build the <span className="text-amber-400">Future</span> of APP.
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-neutral-400 sm:mt-6 sm:text-lg">
               Share your ideas and support what matters to you.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:flex lg:flex-col lg:justify-center lg:gap-6">
               <div className="text-center lg:text-right">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Live Input</p>
                  <p className="mt-1 text-3xl font-black text-white sm:text-5xl">{openIdeas.length}</p>
                  <p className="text-xs font-medium text-neutral-400 sm:text-sm">Open ideas</p>
               </div>
               <div className="border-l border-white/10 pl-3 text-center lg:border-l-0 lg:border-t lg:pl-0 lg:pt-6 lg:text-right">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Community Power</p>
                  <p className="mt-1 text-3xl font-black text-amber-400 sm:text-5xl">{totalSupporters}</p>
                  <p className="text-xs font-medium text-neutral-400 sm:text-sm">Supports cast</p>
               </div>
            </div>
          </div>
        </section>

        <div className="space-y-8">
        <section className="rounded-[30px] bg-[linear-gradient(160deg,#ffffff_0%,#fcfaf6_100%)] p-5 shadow-[0_20px_52px_-38px_rgba(15,23,42,0.28)] sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
                Built with you
              </p>
              <h2 className="mt-2 text-xl font-black tracking-tight text-neutral-950 sm:text-2xl">
                See what we&apos;ve accomplished because of YOUR INPUT.
              </h2>
            </div>
            <Link
              href="/input/road"
              className="inline-flex items-center justify-center rounded-full bg-neutral-950 px-6 py-3 text-sm font-black text-white shadow-lg transition hover:scale-105"
            >
              Explore the Road
            </Link>
          </div>
        </section>

        {/* INPUT AREA */}
        <section className="grid gap-4 rounded-[30px] bg-[linear-gradient(145deg,#ffffff_0%,#faf9f6_100%)] p-4 shadow-[0_24px_58px_-40px_rgba(15,23,42,0.3)] sm:p-5 lg:grid-cols-[1.25fr_0.75fr] lg:gap-6 lg:p-6">
          <div
            id="submit-idea"
            className="scroll-mt-24 rounded-[26px] bg-white p-5 shadow-[0_16px_40px_-30px_rgba(15,23,42,0.24)] sm:scroll-mt-28 sm:p-6"
          >
            <h2 className="text-2xl font-black tracking-tight text-neutral-950">Submit your idea</h2>
            <p className="mt-3 rounded-xl border border-sky-100 bg-sky-50/70 px-3 py-2 text-xs font-semibold text-sky-800">
              Found a bug or UX issue? Submit it here too.
            </p>
            <InputIdeaForm
              action={addFeatureRequest}
              username={viewerProfile?.username ?? "guest"}
              isLoggedIn={!!user}
            />
          </div>

          <div className="rounded-[26px] bg-white/75 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] sm:p-5">
            <h2 className="text-xl font-black tracking-tight text-neutral-950 sm:text-2xl">How to contribute</h2>
            <div className="mt-5 space-y-3.5">
              <div className="flex gap-3.5 rounded-xl bg-neutral-50/75 px-3 py-2.5">
                <span className="text-xl">🎨</span>
                <div>
                  <p className="font-bold text-neutral-900">Be Creative</p>
                  <p className="text-sm text-neutral-500">Share your vision. We are here to listen.</p>
                </div>
              </div>
              <div className="flex gap-3.5 rounded-xl bg-neutral-50/75 px-3 py-2.5">
                <span className="text-xl">🎯</span>
                <div>
                  <p className="font-bold text-neutral-900">Be Specific</p>
                  <p className="text-sm text-neutral-500">Solve a problem. Clear goals are easier to build.</p>
                </div>
              </div>
              <div className="flex gap-3.5 rounded-xl bg-neutral-50/75 px-3 py-2.5">
                <span className="text-xl">🤝</span>
                <div>
                  <p className="font-bold text-neutral-900">Get support</p>
                  <p className="text-sm text-neutral-500">Support great ideas. Help the best ones stand out.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* INPUT BOARD */}
        <div className="grid gap-4 xl:grid-cols-2 xl:gap-5">
          {/* OPEN IDEAS */}
          <section className="rounded-[30px] bg-[linear-gradient(165deg,#ffffff_0%,#fcfaf6_100%)] p-4 shadow-[0_22px_52px_-38px_rgba(15,23,42,0.24)] sm:p-5">
            <div className="mb-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-2xl font-black tracking-tight text-neutral-950">Open ideas</h2>
                <span className="rounded-full border border-amber-200 bg-white px-3 py-0.5 text-[11px] font-black uppercase tracking-[0.12em] text-amber-800">
                  {openIdeas.length}
                </span>
              </div>
              <p className="mt-2 text-sm font-medium text-neutral-600">
                Still open and actively supportable by the community.
              </p>
            </div>
            <div className="space-y-3">
              {openIdeas.map((item) => (
                <FeedbackCard
                  key={item.id}
                  item={item}
                  currentUserId={user?.id ?? null}
                  currentUserIsAdmin={viewerProfile?.is_admin ?? false}
                />
              ))}
              {openIdeas.length === 0 && <EmptyState text="No open ideas yet." />}
            </div>
          </section>

          {/* DEPLOYED */}
          <section className="rounded-[30px] bg-[linear-gradient(165deg,#ffffff_0%,#f8fcfa_100%)] p-4 shadow-[0_22px_52px_-38px_rgba(15,23,42,0.24)] sm:p-5">
            <div className="mb-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-2xl font-black tracking-tight text-neutral-950">Deployed</h2>
                <span className="rounded-full border border-emerald-200 bg-white px-3 py-0.5 text-[11px] font-black uppercase tracking-[0.12em] text-emerald-800">
                  {implementedIdeas.length}
                </span>
              </div>
              <p className="mt-2 text-sm font-medium text-neutral-600">
                Already built and tracked as delivered progress.
              </p>
            </div>
            <div className="space-y-3">
              {implementedIdeas.map((item) => (
                <FeedbackCard
                  key={item.id}
                  item={item}
                  currentUserId={user?.id ?? null}
                  currentUserIsAdmin={viewerProfile?.is_admin ?? false}
                />
              ))}
              {implementedIdeas.length === 0 && <EmptyState text="Nothing deployed yet." />}
            </div>
          </section>
        </div>
        </div>
      </main>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-[32px] border border-neutral-100 bg-white p-8 text-center text-[10px] font-black uppercase tracking-[0.24em] text-neutral-300 shadow-sm sm:p-12 sm:tracking-[0.3em]">
      {text}
    </div>
  );
}

