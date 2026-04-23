import NavBar from "@/shared/components/layout/navbar";
import FeedbackCard from "@/features/feedback/components/FeedbackCard";
import { addFeatureRequest } from "@/app/actions/feedback";
import { createClient } from "@/lib/supabase/server";
import { getFeedbackBundle } from "@/features/feedback/lib/feedback-data";

export const dynamic = "force-dynamic";

// Helper für die Echo-Berechnung (analog zur Arena)
function getEchoScore(item: any) {
  const likes = item.likeCount || 0;
  const comments = item.commentCount || 0;
  return likes + (comments * 2);
}

export default async function FeedbackPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const feedback = await getFeedbackBundle(supabase, user?.id ?? null);

  let viewerProfile = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("username, avatar_url, is_admin")
      .eq("id", user.id)
      .maybeSingle();
    viewerProfile = data;
  }

  // 1. Filtern und SORTIEREN nach Echo-Score (Absteigend)
  const openIdeas = feedback
    .filter((item) => item.status === "open")
    .sort((a, b) => getEchoScore(b) - getEchoScore(a));

  const implementedIdeas = feedback
    .filter((item) => item.status === "implemented")
    .sort((a, b) => getEchoScore(b) - getEchoScore(a));

  const totalSupporters = feedback.reduce((sum, item) => sum + item.likeCount, 0);

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <NavBar
        user={user ? {
          username: viewerProfile?.username ?? "user",
          avatar_url: viewerProfile?.avatar_url ?? null,
          is_admin: viewerProfile?.is_admin ?? false,
        } : null}
      />

      <main className="mx-auto max-w-6xl px-4 py-8 lg:py-16">
        
        {/* HERO SECTION */}
        <section className="relative mb-16 overflow-hidden rounded-[40px] bg-neutral-950 px-6 py-12 text-white shadow-2xl lg:px-16 lg:py-20">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-amber-400/10 blur-[100px]" />
            <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-indigo-500/10 blur-[100px]" />
          </div>

          <div className="relative grid gap-12 lg:grid-cols-[1fr_auto]">
            <div className="max-w-2xl">
              <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">
                Co-Creation
              </span>
              <h1 className="mt-6 text-4xl font-black tracking-tight sm:text-7xl">
                Build the <span className="text-amber-400">Future</span> of APP.
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-neutral-400">
                The community decides what stays, but you decide what comes next. 
                Share your ideas, vote for features, and let’s craft the ultimate noise-free arena together.
              </p>
            </div>

            <div className="flex flex-col justify-center gap-6">
               <div className="text-center lg:text-right">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Live Feedback</p>
                  <p className="mt-1 text-5xl font-black text-white">{openIdeas.length}</p>
                  <p className="text-sm font-medium text-neutral-400">Open Requests</p>
               </div>
               <div className="text-center lg:text-right border-t border-white/10 pt-6">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Community Power</p>
                  <p className="mt-1 text-5xl font-black text-amber-400">{totalSupporters}</p>
                  <p className="text-sm font-medium text-neutral-400">Upvotes Cast</p>
               </div>
            </div>
          </div>
        </section>

        {/* INPUT AREA */}
        <section className="mb-20 grid gap-8 lg:grid-cols-2">
          <div className="rounded-[32px] border border-neutral-200 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-black tracking-tight text-neutral-950">How to contribute</h2>
            <div className="mt-8 space-y-4">
              <div className="flex gap-4 rounded-2xl bg-neutral-50 p-4">
                <span className="text-xl">🎨</span>
                <div>
                  <p className="font-bold text-neutral-900">Be Creative</p>
                  <p className="text-sm text-neutral-500">Tell us about your dream. We are here to listen and build the future together.</p>
                </div>
              </div>
              <div className="flex gap-4 rounded-2xl bg-neutral-50 p-4">
                <span className="text-xl">🎯</span>
                <div>
                  <p className="font-bold text-neutral-900">Be Specific</p>
                  <p className="text-sm text-neutral-500">Vague ideas are hard to build. Describe the problem, then the solution.</p>
                </div>
              </div>
              <div className="flex gap-4 rounded-2xl bg-neutral-50 p-4">
                <span className="text-xl">🤝</span>
                <div>
                  <p className="font-bold text-neutral-900">Get Supported</p>
                  <p className="text-sm text-neutral-500">Support ideas that benefit the entire community.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[32px] border border-neutral-200 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-black tracking-tight text-neutral-950">Submit Request</h2>
            {user ? (
              <form action={addFeatureRequest} className="mt-6 space-y-4">
                <input
                  type="text"
                  name="title"
                  placeholder="Feature Title (e.g., Save for Later)"
                  required
                  className="w-full rounded-2xl border border-neutral-200 px-5 py-4 font-medium outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                />
                <textarea
                  name="description"
                  placeholder="Describe your idea in detail..."
                  required
                  rows={4}
                  className="w-full rounded-2xl border border-neutral-200 px-5 py-4 font-medium outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                />
                <div className="flex items-center justify-between gap-4 rounded-2xl bg-amber-50 p-4">
                  <p className="text-xs font-bold text-amber-900 uppercase tracking-tight">
                    Posting as @{viewerProfile?.username ?? "user"}
                  </p>
                  <button type="submit" className="rounded-xl bg-neutral-950 px-6 py-2.5 text-sm font-bold text-white transition hover:scale-105">
                    Submit
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 py-12 text-center">
                <p className="text-neutral-500 font-medium">Log in to help us build.</p>
                <a href="/login" className="mt-4 rounded-xl bg-neutral-950 px-8 py-3 text-sm font-bold text-white">Login</a>
              </div>
            )}
          </div>
        </section>

        {/* FEEDBACK BOARD */}
        <div className="grid gap-12 xl:grid-cols-2">
          {/* UP FOR VOTE */}
          <section>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-black tracking-tight text-neutral-950">Up for Vote</h2>
              <span className="rounded-full bg-neutral-100 px-4 py-1 text-xs font-bold text-neutral-500">{openIdeas.length}</span>
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
              {openIdeas.length === 0 && <EmptyState text="No open requests yet." />}
            </div>
          </section>

          {/* DEPLOYED */}
          <section>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-black tracking-tight text-neutral-950">Deployed</h2>
              <span className="rounded-full bg-amber-100 px-4 py-1 text-xs font-bold text-amber-600">{implementedIdeas.length}</span>
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
              {implementedIdeas.length === 0 && <EmptyState text="Nothing deployed yet." />}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-[32px] border border-neutral-100 bg-white p-12 text-center text-neutral-400 shadow-sm font-medium">
      {text}
    </div>
  );
}

