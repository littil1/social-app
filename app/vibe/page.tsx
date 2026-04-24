import Link from "next/link";
import NavBar from "@/shared/components/layout/navbar";
import { createClient } from "@/lib/supabase/server";

// =====================================================
// Page Component
// =====================================================

export default async function VibePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

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
        <div className="absolute bottom-[-10%] right-[-8%] h-[360px] w-[360px] rounded-full bg-sky-100/40 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-5xl px-6 py-12 lg:py-20">
        {/* Header Section */}
        <section className="mb-24 text-center sm:mb-32">
          <span className="inline-flex rounded-full border border-neutral-200 bg-white px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 shadow-sm">
            The Vibe
          </span>

          <h1 className="mt-10 text-6xl font-black tracking-tighter text-neutral-950 sm:text-8xl">
            Impact
            <br />
            <span className="text-neutral-400">over Fame.</span>
          </h1>

          <p className="mx-auto mt-10 max-w-2xl text-lg font-medium leading-relaxed text-neutral-500">
            Great ideas shouldn&apos;t need a following to go viral.
            We built A Perfect Place to give you the stage you deserve.
            On APP, your content is the only thing that matters.
            Post anonymously, let your content speak for itself, and prove what you&apos;ve got.
            Only the daily winner is revealed and immortalized forever.
            <br />
            <span className="font-black text-neutral-950">Your talent. Your stage.</span>
          </p>
        </section>

        {/* The Core Mechanics */}
        <div className="grid gap-6 md:grid-cols-3">
          <FeatureCard
            badge="01"
            title="Post Anonymously"
            text="Every post starts anonymous. No names, no bias, no unfair advantages. Here, people react to the idea, not the person."
          />
          <FeatureCard
            badge="02"
            title="Win the Day"
            text="Our live-ranked feed ensures the best content rises to the top. Every 24 hours, the clock resets, giving everyone a fresh shot at the title."
          />
          <FeatureCard
            badge="03"
            title="Become a Legend"
            text="Only the daily champion is revealed, saved in the Hall and awarded the Legend badge. That makes first place rare, memorable and worth talking about."
          />
        </div>

        {/* The Reward Section */}
        <section className="mt-20 rounded-[40px] border border-neutral-200 bg-white p-8 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.05)] sm:mt-24 sm:p-16">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-amber-600">
                Premium Status
              </span>

              <h2 className="mt-4 text-4xl font-black tracking-tight text-neutral-950 sm:text-5xl">
                Win the day.
                <br />
                Own the flex.
              </h2>

              <p className="mt-6 text-lg leading-relaxed text-neutral-600">
                On APP, attention is earned. If your post takes the top spot,
                your name is revealed, your win is remembered, and your post
                becomes part of APP history.
              </p>

              <ul className="mt-8 space-y-4">
                <li className="flex items-center gap-3 font-semibold text-neutral-800">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-xs text-amber-600">
                    ✓
                  </span>
                  Your identity is revealed only if you win
                </li>
                <li className="flex items-center gap-3 font-semibold text-neutral-800">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-xs text-amber-600">
                    ✓
                  </span>
                  Permanent Hall of Fame visibility
                </li>
                <li className="flex items-center gap-3 font-semibold text-neutral-800">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-xs text-amber-600">
                    ✓
                  </span>
                  A real digital flex worth earning
                </li>
              </ul>
            </div>

            <div className="relative flex justify-center">
              <div className="relative flex h-64 w-64 items-center justify-center rounded-[48px] bg-gradient-to-br from-amber-100 to-amber-50 shadow-inner">
                <span className="animate-bounce text-8xl">🏆</span>
                <div className="absolute -bottom-4 rounded-2xl border border-amber-100 bg-white px-6 py-3 shadow-xl">
                  <p className="text-xs font-black uppercase tracking-tighter text-amber-900">
                    Legend Status
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How APP Works */}
        <section className="mt-20 grid gap-8 lg:grid-cols-[1.15fr_0.85fr] sm:mt-24">
          <div className="rounded-[32px] border border-neutral-200 bg-white p-10 shadow-sm">
            <h2 className="text-2xl font-black tracking-tight text-neutral-950">
              How A Perfect Place (APP) works
            </h2>

            <div className="mt-8 space-y-4">
              <InfoRow
                emoji="⚡"
                title="Quality at a glance - See the best first."
                text="The best content greets you first. No noise, no filler—just the posts that resonated most with the community. Dive in or keep scrolling to find the next rising star."
              />
              <InfoRow
                emoji="🎭"
                title="Content over Character."
                text="Every post begins in total anonymity. We judge ideas, humor, and insight—not the person or their follower count. Here, your thoughts carry the weight."
              />
              <InfoRow
                emoji="🔥"
                title="The Wisdom of the Crowd."
                text="The feed is alive. As people react and engage, the most impactful ideas naturally rise. It’s a dynamic reflection of what truly matters right now."
              />
              <InfoRow
                emoji="🏆"
                title="The Daily Revelation."
                text="Each day, only the most resonant voice is unmasked. It’s a rare moment of recognition—a chance to be discovered and remembered for what you’ve created."
              />
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="rounded-[32px] bg-neutral-950 p-8 text-white shadow-2xl">
              <h3 className="text-xl font-bold text-amber-400">
                Why it feels better
              </h3>
              <p className="mt-4 leading-relaxed text-neutral-400">
                APP brings clarity to the chaos of social media.
                You don’t have to sift through clutter to find value.
                Here, the best content rises naturally, creating a curated space where quality is the only currency.
              </p>
            </div>

            <div className="rounded-[32px] border border-neutral-200 bg-white p-8">
              <h3 className="text-xl font-bold text-neutral-950">
                Why it matters
              </h3>
              <p className="mt-4 leading-relaxed text-neutral-500">
                Because your voice deserves a fair shot.
                Post without the pressure of a name, rise on the strength of your thoughts,
                and let the world see the person behind the impact.
              </p>
            </div>
          </div>
        </section>

        {/* What wins / what loses */}
        <section className="mt-24 mb-20 grid gap-8 lg:grid-cols-2">
          <div className="rounded-[32px] border border-neutral-200 bg-white p-10 shadow-sm">
            <h2 className="text-2xl font-black tracking-tight text-neutral-950">
              What rises
            </h2>

            <div className="mt-8 space-y-4">
              <div className="flex gap-4 rounded-2xl bg-neutral-50 p-4">
                <span className="text-xl">💡</span>
                <div>
                  <p className="font-bold text-neutral-900">Sharp thoughts</p>
                  <p className="text-sm text-neutral-500">
                    Posts that are clear, specific, memorable, or instantly
                    useful.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 rounded-2xl bg-neutral-50 p-4">
                <span className="text-xl">😂</span>
                <div>
                  <p className="font-bold text-neutral-900">
                    Humor with punch
                  </p>
                  <p className="text-sm text-neutral-500">
                    Funny posts can rise too if people genuinely react to
                    them.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 rounded-2xl bg-neutral-50 p-4">
                <span className="text-xl">🧠</span>
                <div>
                  <p className="font-bold text-neutral-900">
                    Honest perspective
                  </p>
                  <p className="text-sm text-neutral-500">
                    Insight, truth, lived experience, and strong takes that make
                    people stop scrolling.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[32px] border border-neutral-200 bg-white p-10 shadow-sm">
            <h2 className="text-2xl font-black tracking-tight text-neutral-950">
              What fades
            </h2>

            <div className="mt-8 space-y-4">
              <div className="flex gap-4 rounded-2xl bg-neutral-50 p-4">
                <span className="text-xl">🤖</span>
                <div>
                  <p className="font-bold text-neutral-900">Spammy filler</p>
                  <p className="text-sm text-neutral-500">
                    Low-effort noise, empty filler, and obvious slop lose fast.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 rounded-2xl bg-neutral-50 p-4">
                <span className="text-xl">📢</span>
                <div>
                  <p className="font-bold text-neutral-900">
                    Cheap self-promotion
                  </p>
                  <p className="text-sm text-neutral-500">
                    APP is not built for clout farming. The post has to carry
                    itself.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 rounded-2xl bg-neutral-50 p-4">
                <span className="text-xl">🥱</span>
                <div>
                  <p className="font-bold text-neutral-900">
                    Forgettable one-liners
                  </p>
                  <p className="text-sm text-neutral-500">
                    If it does not hit, help, entertain, or provoke thought, it
                    sinks.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="mt-24 pb-24 text-center sm:mt-32 sm:pb-20">
          <h2 className="text-[8vw] font-black tracking-tight text-neutral-950 sm:text-[5vw] lg:text-5xl">
            Welcome to APP <span className="block sm:inline">- A Perfect Place</span>
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-lg font-medium leading-relaxed text-neutral-500">
            Check the top posts. See what is rising. Then post something strong
            enough to take the day.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/leaderboard"
              className="w-full rounded-full bg-neutral-950 px-10 py-4 text-center text-lg font-bold text-white transition hover:scale-105 sm:w-auto"
            >
              Take the Stage
            </Link>

            <Link
              href="/hall-of-fame"
              className="w-full rounded-full border border-neutral-200 bg-white px-10 py-4 text-center text-lg font-bold text-neutral-950 transition hover:bg-neutral-50 sm:w-auto"
            >
              See the Hall
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

function FeatureCard({
  badge,
  title,
  text,
}: {
  badge: string;
  title: string;
  text: string;
}) {
  return (
    <div className="group rounded-[32px] border border-neutral-200 bg-white/50 p-8 transition-all hover:border-amber-300 hover:bg-white hover:shadow-xl">
      <span className="text-xs font-black tracking-widest text-amber-500">
        {badge}
      </span>
      <h3 className="mt-4 text-2xl font-black tracking-tight text-neutral-950">
        {title}
      </h3>
      <p className="mt-4 font-medium leading-relaxed text-neutral-600">
        {text}
      </p>
    </div>
  );
}

function InfoRow({
  emoji,
  title,
  text,
}: {
  emoji: string;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-4 rounded-2xl bg-neutral-50 p-4">
      <span className="text-xl">{emoji}</span>
      <div>
        <p className="font-bold text-neutral-900">{title}</p>
        <p className="text-sm text-neutral-500">{text}</p>
      </div>
    </div>
  );
}
