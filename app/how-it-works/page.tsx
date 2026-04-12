import Link from "next/link";
import NavBar from "@/app/components/layout/navbar";
import { createClient } from "@/lib/supabase-server";

// =====================================================
// Page Component
// =====================================================

export default async function VibePage() {
  const supabase = await createClient();
  
  // User-Daten abrufen für die NavBar
  const { data: { user } } = await supabase.auth.getUser();
  let navUser = null;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, avatar_url, is_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (profile) {
      navUser = {
        username: profile.username,
        avatar_url: profile.avatar_url ?? null,
        is_admin: profile.is_admin ?? false,
      };
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fafafa]">
      <NavBar user={navUser} />

      {/* Background Decor */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-10%] h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-amber-100/40 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-5xl px-6 py-12 lg:py-20">
        
        {/* Header Section */}
        <section className="mb-20 text-center">
          <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-900 shadow-sm">
            The Manifesto
          </span>
          <h1 className="mt-8 text-5xl font-black tracking-tighter text-neutral-950 sm:text-7xl lg:text-8xl">
            Content is King.<br />
            <span className="text-neutral-400">Identity is Earned.</span>
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-lg font-medium leading-relaxed text-neutral-600 sm:text-xl">
            APP isn’t just another digital playground. It’s an arena for the sharpest minds. 
            Your name doesn't matter here — your impact does.
          </p>
        </section>

        {/* The Core Mechanics */}
        <div className="grid gap-6 md:grid-cols-3">
          <FeatureCard 
            badge="01"
            title="Total Anonymity"
            text="Everyone starts in the shadows. No profiles, no bias. Only your thoughts fight for the top spot."
          />
          <FeatureCard 
            badge="02"
            title="The Daily Race"
            text="The leaderboard resets every 24 hours. Rise with value, or fade into the background. Every day is a new chance."
          />
          <FeatureCard 
            badge="03"
            title="The Legend Badge"
            text="Only the daily champion is revealed and awarded the Legend badge."
          />
        </div>

        {/* The Reward Section */}
        <section className="mt-24 rounded-[40px] border border-neutral-200 bg-white p-8 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.05)] sm:p-16">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-amber-600">Premium Status</span>
              <h2 className="mt-4 text-4xl font-black tracking-tight text-neutral-950 sm:text-5xl">
                Earn your badge.<br />Own your legacy.
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-neutral-600">
                The Legend Badge is more than an icon. It’s proof that you owned the day. Once you win, your contribution is immortalized in the Hall of Fame.
              </p>
              <ul className="mt-8 space-y-4">
                <li className="flex items-center gap-3 font-semibold text-neutral-800">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-600 text-xs">✓</span>
                  Permanent Hall of Fame visibility
                </li>
                <li className="flex items-center gap-3 font-semibold text-neutral-800">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-600 text-xs">✓</span>
                  Verified profile status after victory
                </li>
                <li className="flex items-center gap-3 font-semibold text-neutral-800">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-600 text-xs">✓</span>
                  Ultimate flex
                </li>
              </ul>
            </div>
            <div className="relative flex justify-center">
              <div className="relative h-64 w-64 rounded-[48px] bg-gradient-to-br from-amber-100 to-amber-50 shadow-inner flex items-center justify-center">
                 <span className="text-8xl animate-bounce">🏆</span>
                 <div className="absolute -bottom-4 rounded-2xl bg-white px-6 py-3 shadow-xl border border-amber-100">
                    <p className="text-xs font-black uppercase tracking-tighter text-amber-900">Legend Status</p>
                 </div>
              </div>
            </div>
          </div>
        </section>

        {/* Standards Section */}
        <section className="mt-24">
          <h2 className="text-center text-3xl font-black tracking-tight text-neutral-950 sm:text-5xl">
            Survival of the Fittest.
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <div className="rounded-[32px] bg-neutral-950 p-8 text-white shadow-2xl">
              <h3 className="text-xl font-bold text-amber-400">What Rises</h3>
              <p className="mt-4 text-neutral-400">Raw insights, radical honesty, life-changing advice, or perspectives that challenge the status quo.</p>
            </div>
            <div className="rounded-[32px] border border-neutral-200 bg-white p-8">
              <h3 className="text-xl font-bold text-neutral-950">What Fades</h3>
              <p className="mt-4 text-neutral-500">Superficial small talk, AI-generated spam, blatant self-promotion, or meaningless one-liners.</p>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="mt-32 text-center pb-20">
          <h2 className="text-4xl font-black tracking-tight text-neutral-950 sm:text-6xl">Ready to Race?</h2>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/leaderboard"
              className="w-full rounded-full bg-neutral-950 px-10 py-4 text-lg font-bold text-white transition hover:scale-105 sm:w-auto text-center"
            >
              Enter the Arena
            </Link>
            <Link
              href="/hall-of-fame"
              className="w-full rounded-full border border-neutral-200 bg-white px-10 py-4 text-lg font-bold text-neutral-950 transition hover:bg-neutral-50 sm:w-auto text-center"
            >
              See the Hall
            </Link>
          </div>
        </section>

      </div>
    </main>
  );
}

// =====================================================
// Helper Component
// =====================================================

function FeatureCard({ badge, title, text }: { badge: string; title: string; text: string }) {
  return (
    <div className="group rounded-[32px] border border-neutral-200 bg-white/50 p-8 transition-all hover:border-amber-300 hover:bg-white hover:shadow-xl">
      <span className="text-xs font-black tracking-widest text-amber-500">{badge}</span>
      <h3 className="mt-4 text-2xl font-black tracking-tight text-neutral-950">{title}</h3>
      <p className="mt-4 text-neutral-600 leading-relaxed font-medium">{text}</p>
    </div>
  );
}