import Link from "next/link";

// =====================================================
// Page Component
// =====================================================

export default function VibePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fafafa]">
      {/* Background Decor */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-10%] h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-amber-100/40 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-8%] h-[360px] w-[360px] rounded-full bg-amber-50/50 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-5xl px-5 py-10 sm:px-6 lg:py-16">
        {/* Header Section */}
        <section className="mb-16 text-center sm:mb-20">
          <span className="inline-flex rounded-full border border-neutral-200 bg-white px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 shadow-sm">
            The Vibe
          </span>

          <h1 className="mt-10 text-6xl font-black tracking-tighter text-neutral-950 sm:text-8xl">
            Impact
            <br />
            <span className="text-neutral-400">over Fame.</span>
          </h1>

          <p className="mx-auto mt-10 max-w-2xl text-lg font-medium leading-relaxed text-neutral-500">
            Great ideas don&apos;t need a following.
            <br />
            We built A Perfect Place to give you the stage you deserve.
            <br />
            On APP, your content speaks for itself.
            Post anonymously and prove yourself.
            <br />
            Only the daily winner is revealed and immortalized forever.
            <br />
            <span className="font-black text-neutral-950">Your idea. Your stage.</span>
          </p>
        </section>

        {/* ECHO Explanation */}
        <section className="relative -mt-6 mb-14 overflow-visible rounded-[36px] border border-neutral-200 bg-neutral-950 p-5 text-white shadow-[0_40px_100px_-28px_rgba(0,0,0,0.36)] sm:-mt-8 sm:mb-16 sm:p-8 lg:p-10">
          <style>{`
            @media (prefers-reduced-motion: no-preference) {
              .echo-winner-card {
                animation:
                  echoWinnerEnter 520ms cubic-bezier(0.16, 1, 0.3, 1) both,
                  echoWinnerGlow 3.2s ease-in-out 650ms infinite;
                transform-origin: center;
              }
            }

            @keyframes echoWinnerEnter {
              from {
                opacity: 0;
                transform: translateY(8px) scale(1.01);
              }
              to {
                opacity: 1;
                transform: translateY(0) scale(1.02);
              }
            }

            @keyframes echoWinnerGlow {
              0%, 100% {
                box-shadow: 0 28px 70px -36px rgba(245, 158, 11, 0.85);
              }
              50% {
                box-shadow:
                  0 30px 78px -34px rgba(245, 158, 11, 0.98),
                  0 0 0 1px rgba(252, 211, 77, 0.2);
              }
            }
          `}</style>

          <div className="pointer-events-none absolute inset-x-8 -top-10 h-16 rounded-full bg-amber-100/35 blur-3xl" />

          <div className="relative grid gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-center">
            <div>

              <h2 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">
                ECHO shows,
              </h2>

              <p className="mt-5 text-2xl font-black tracking-tight text-amber-300">
                what&apos;s really worth it
              </p>

              <div className="mt-6 grid gap-2.5">
                {[
                  "Reactions boost your score.",
                  "Comments carry more weight.",
                  "New posts can still break through.",
                  "The most ECHO wins the day.",
                ].map((text) => (
                  <div
                    key={text}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-neutral-200"
                  >
                    <span className="h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_18px_rgba(252,211,77,0.75)]" />
                    {text}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <EchoExampleCard
                label="Quick Reactions"
                content="A sharp take that gets quick taps from the crowd."
                echoScore={64}
                reactionCounts={{
                  like: 42,
                  funny: 18,
                  wow: 9,
                  fire: 6,
                }}
                comments={3}
              />
              <EchoExampleCard
                label="Deep Conversation"
                content="A post that gets people replying, debating, and building on it."
                echoScore={91}
                reactionCounts={{
                  like: 24,
                  funny: 10,
                  wow: 6,
                  fire: 4,
                }}
                comments={14}
                isWinner
              />
            </div>
          </div>
        </section>

        {/* Daily BOOST */}
        <section className="mb-14 rounded-[32px] border border-amber-200/70 bg-white/85 p-5 shadow-[0_28px_80px_-52px_rgba(245,158,11,0.48)] backdrop-blur sm:mb-16 sm:p-7 lg:p-8">
          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div>
              <h2 className="text-3xl font-black tracking-tight text-neutral-950 sm:text-4xl">
                🚀 BOOST: your strongest signal
              </h2>
              <p className="mt-4 max-w-xl text-base font-medium leading-relaxed text-neutral-600">
                Amplify the post that deserves it most.
              </p>
              <p className="mt-4 text-sm font-black text-amber-700">
                Choose carefully.
              </p>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-3">
              {[
                "1 daily BOOST",
                "Non-purchasable.",
                "Can't be undone.",
              ].map((text) => (
                <div
                  key={text}
                  className="flex min-h-[76px] items-center justify-center rounded-2xl border border-neutral-200 bg-neutral-50/80 px-4 py-3 text-center text-sm font-bold text-neutral-700"
                >
                  {text}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* The Core Mechanics */}
        <div className="grid gap-5 md:grid-cols-3">
          <FeatureCard
            badge="01"
            title="Post Anonymously"
            text="Every post starts anonymous. No names, no bias, no unfair advantages. Here, people react to the idea, not the person."
          />
          <FeatureCard
            badge="02"
            title="Win the Day"
            text="Our live-ranked feed ensures the best content rises to the top. Every 24 hours, the feed resets."
          />
          <FeatureCard
            badge="03"
            title="Become a Legend"
            text="Only the daily champion is revealed, saved in the Hall and awarded the Legend badge."
          />
        </div>

        {/* The Reward Section */}
        <section className="mt-14 rounded-[36px] border border-neutral-200 bg-white p-6 shadow-[0_34px_90px_-30px_rgba(0,0,0,0.08)] sm:mt-16 sm:p-10 lg:p-12">
          <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-10">
            <div>

                <h2 className="mt-4 font-black tracking-tight text-neutral-950">
                  <span className="block text-4xl sm:text-5xl">
                    Only one wins.
                  </span>

                  <span className="block text-4xl sm:text-5xl">
                    Be that{" "}
                    <span className="bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 bg-clip-text text-transparent">
                      one
                    </span>
                    .
                  </span>

                  <span className="mt-3 block text-lg sm:text-xl font-medium text-neutral-600">
                    And everything changes.
                  </span>
                </h2>

              <ul className="mt-6 space-y-3">
                <li className="flex items-center gap-3 font-semibold text-neutral-800">
                  👤 Your name is revealed
                </li>
                <li className="flex items-center gap-3 font-semibold text-neutral-800">
                  👑 Your post is remembered
                </li>
                <li className="flex items-center gap-3 font-semibold text-neutral-800">
                  🔥 You become a Legend
                </li>
              </ul>
            </div>

            <div className="relative flex justify-center lg:justify-end">
              <div className="relative flex h-52 w-52 items-center justify-center rounded-[42px] bg-gradient-to-br from-amber-100 to-amber-50 shadow-inner sm:h-60 sm:w-60 sm:rounded-[48px]">
                <span className="animate-bounce text-7xl sm:text-8xl">👑</span>
                <div className="absolute -bottom-4 rounded-2xl border border-amber-100 bg-white px-6 py-3 shadow-xl">
                  <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 rounded-full border border-amber-200 bg-white px-5 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-amber-700 shadow-sm">
                    Legend Status
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How APP Works */}
        <section className="mt-14 grid gap-6 lg:grid-cols-[1.15fr_0.85fr] sm:mt-16">
          <div className="rounded-[32px] border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-2xl font-black tracking-tight text-neutral-950">
              How A Perfect Place (APP) works
            </h2>

            <div className="mt-6 space-y-3">
              <InfoRow
                emoji="⚡"
                title="Quality at a glance - See the best first."
                text="The best content greets you first. No noise, no filler — just the posts that resonated most with the community."
              />
              <InfoRow
                emoji="🎭"
                title="Content over Character."
                text="Every post begins in total anonymity. We judge ideas, humor, and insight — not the person or their follower count."
              />
              <InfoRow
                emoji="🔥"
                title="The Wisdom of the Crowd."
                text="As people react and engage, the most impactful ideas naturally rise. It’s a dynamic reflection of what truly matters today."
              />
              <InfoRow
                emoji="👑"
                title="The Daily Revelation."
                text="Each day, only the most resonant voice is unmasked."
              />
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <div className="rounded-[32px] bg-neutral-950 p-6 text-white shadow-2xl sm:p-7">
              <h3 className="text-xl font-bold text-amber-400">
                Why it feels better
              </h3>
              <p className="mt-4 leading-relaxed text-neutral-400">
                APP brings clarity to the chaos of social media.
                Here, the best content rises naturally, creating a curated space where quality is the only currency.
              </p>
            </div>

            <div className="rounded-[32px] border border-neutral-200 bg-white p-6 sm:p-7">
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

        {/* Final CTA */}
        <section className="mt-16 pb-24 text-center sm:mt-20 sm:pb-20">
          <h2 className="text-[8vw] font-black tracking-tight text-neutral-950 sm:text-[5vw] lg:text-5xl">
            Welcome to APP
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-lg font-medium leading-relaxed text-neutral-500">
            A Perfect Place
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/live"
              className="w-full rounded-full bg-neutral-950 px-10 py-4 text-center text-lg font-bold text-white transition hover:scale-105 sm:w-auto"
            >
              Take the Stage
            </Link>

            <Link
              href="/legends"
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
    <div className="group rounded-[32px] border border-neutral-200 bg-white/60 p-6 transition-all hover:border-amber-300 hover:bg-white hover:shadow-xl sm:p-7">
      <span className="text-xs font-black tracking-widest text-amber-500">
        {badge}
      </span>
      <h3 className="mt-4 text-2xl font-black tracking-tight text-neutral-950">
        {title}
      </h3>
      <p className="mt-3 font-medium leading-relaxed text-neutral-600">
        {text}
      </p>
    </div>
  );
}

function EchoExampleCard({
  label,
  content,
  echoScore,
  reactionCounts,
  comments,
  isWinner = false,
}: {
  label: string;
  content: string;
  echoScore: number;
  reactionCounts: {
    like: number;
    funny: number;
    wow: number;
    fire: number;
  };
  comments: number;
  isWinner?: boolean;
}) {
  const reactions = [
    { key: "like", emoji: "\u2764\uFE0F", count: reactionCounts.like },
    { key: "funny", emoji: "\uD83D\uDE02", count: reactionCounts.funny },
    { key: "wow", emoji: "\uD83E\uDD2F", count: reactionCounts.wow },
    { key: "fire", emoji: "\uD83D\uDD25", count: reactionCounts.fire },
  ];

  return (
    <article
      className={`relative rounded-[30px] border p-4 transition-all sm:p-5 ${
        isWinner
          ? "echo-winner-card overflow-hidden border-amber-300 bg-[radial-gradient(circle_at_50%_0%,rgba(251,191,36,0.34),transparent_40%),radial-gradient(circle_at_100%_20%,rgba(245,158,11,0.18),transparent_34%),linear-gradient(145deg,#fff5cc,#ffffff_62%,#fffbeb)] text-neutral-950 shadow-[0_34px_88px_-34px_rgba(245,158,11,0.98),0_10px_32px_-28px_rgba(120,53,15,0.8)] ring-1 ring-amber-200/75 motion-reduce:scale-[1.02]"
          : "overflow-hidden border-white/10 bg-white/[0.06] text-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <p
          className={`text-[10px] font-black uppercase tracking-[0.16em] ${
            isWinner ? "text-amber-700" : "text-amber-200"
          }`}
        >
          {label}
        </p>

        <div
          className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] shadow-sm ${
            isWinner
              ? "border-amber-200 bg-amber-100 text-amber-950"
              : "border-white/10 bg-white/10 text-amber-100"
          }`}
        >
          <span>ECHO</span>
          <span className="text-xs tabular-nums">{echoScore}</span>
        </div>
      </div>

      <p
        className={`mt-6 min-h-[88px] rounded-3xl border p-4 text-base font-black leading-snug tracking-tight sm:p-5 sm:text-lg ${
          isWinner
            ? "border-amber-100 bg-white/90 text-neutral-950"
            : "border-white/10 bg-white/[0.05] text-white"
        }`}
      >
        {content}
      </p>

      <div className="mt-4 flex flex-nowrap items-center gap-1 overflow-hidden sm:gap-1.5">
        {reactions.map((reaction) => (
          <span
            key={reaction.key}
            className={`inline-flex h-8 min-w-0 shrink items-center justify-center gap-1 rounded-full px-1.5 py-1.5 text-[10px] font-bold sm:px-2 sm:text-[11px] ${
              isWinner
                ? "bg-white/90 text-neutral-500"
                : "bg-neutral-50 text-neutral-500"
            }`}
          >
            <span>{reaction.emoji}</span>
            <span className="tabular-nums text-neutral-900">
              {reaction.count}
            </span>
          </span>
        ))}

        <span
          className={`inline-flex h-8 min-w-0 shrink items-center justify-center gap-1 rounded-full px-1.5 py-1.5 text-[10px] font-bold sm:px-2 sm:text-[11px] ${
            isWinner
              ? "bg-neutral-950 text-neutral-300"
              : "bg-neutral-50 text-neutral-500"
          }`}
        >
          <span>{"\uD83D\uDCAC"}</span>
          <span
            className={`tabular-nums ${
              isWinner ? "text-white" : "text-neutral-900"
            }`}
          >
            {comments}
          </span>
        </span>
      </div>
    </article>
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
    <div className="flex gap-3 rounded-2xl bg-neutral-50 p-3.5 sm:gap-4 sm:p-4">
      <span className="text-xl">{emoji}</span>
      <div>
        <p className="font-bold text-neutral-900">{title}</p>
        <p className="text-sm text-neutral-500">{text}</p>
      </div>
    </div>
  );
}
