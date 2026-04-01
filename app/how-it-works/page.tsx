import Link from "next/link";

// =====================================================
// Component
// =====================================================

export default function HowItWorksPage() {
  return (
    <main className="relative overflow-hidden bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.95),rgba(248,250,252,1)_38%,rgba(241,245,249,1)_100%)]">
      {/* =====================================================
          Background Decor
      ===================================================== */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-120px] h-[320px] w-[320px] -translate-x-1/2 rounded-full bg-black/5 blur-3xl" />
        <div className="absolute right-[-80px] top-[220px] h-[260px] w-[260px] rounded-full bg-amber-200/30 blur-3xl" />
        <div className="absolute left-[-100px] top-[520px] h-[260px] w-[260px] rounded-full bg-slate-300/20 blur-3xl" />
      </div>

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-6 sm:px-6 sm:py-10 lg:gap-10">
        {/* =====================================================
            Hero
        ===================================================== */}
        <section className="relative overflow-hidden rounded-[32px] border border-white/60 bg-gradient-to-br from-black via-neutral-900 to-neutral-800 px-6 py-8 text-white shadow-[0_25px_80px_rgba(0,0,0,0.22)] sm:px-8 sm:py-10 lg:px-10 lg:py-12">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_32%)]" />
            <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-amber-300/10 blur-3xl" />
          </div>

          <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div className="flex flex-col gap-5">
              <span className="inline-flex w-fit rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-white/80 backdrop-blur">
                So funktioniert APP
              </span>

              <div className="flex flex-col gap-4">
                <h1 className="max-w-4xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                  Entdecke,
                  <br />
                  was dich wirklich
                  <span className="text-white/70"> weiterbringt.</span>
                </h1>

                <p className="max-w-2xl text-base leading-7 text-white/75 sm:text-lg sm:leading-8">
                  a perfect place (APP) ist keine weitere social-media App.
                  <br />
                  Wir sind die einzige, die du jemals wieder brauchst.
                  <br />
                  Hier geht es nicht um möglichst viele Posts, sondern um wirklich gute.
                </p>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <Link
                  href="/"
                  className="inline-flex items-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:scale-[1.02] hover:opacity-95"
                >
                  Zum Feed
                </Link>

                <Link
                  href="/#create-post"
                  className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15"
                >
                  Beitrag erstellen
                </Link>
              </div>
            </div>

            <div className="grid gap-3">
              <HeroStat
                value="Keine Ablenkung"
                text="Kein unnötiger Content, keine Aufmerksamkeitsspiralen."
              />
              <HeroStat
                value="Qualität zuerst"
                text="Inhalte, die dich weiterbringen – nicht nur unterhalten."
              />
              <HeroStat
                value="Anonym bis zur Spitze"
                text="Deine Ideen zählen. Dein Name erst, wenn sie überzeugen."
              />
            </div>
          </div>
        </section>

        {/* =====================================================
            Was du hier findest
        ===================================================== */}
        <section className="rounded-[28px] border border-black/5 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur sm:p-8">
          <div className="mb-6 flex flex-col gap-2">
            <span className="text-sm font-medium uppercase tracking-[0.16em] text-gray-400">
              Der Unterschied
            </span>

            <h2 className="text-2xl font-semibold tracking-tight text-black sm:text-3xl">
              Warum du mit uns weiterkommst.
            </h2>

            <p className="max-w-2xl text-base leading-7 text-gray-700">
              Während andere Apps darauf optimiert sind, dich möglichst lange am Bildschirm zu halten,
              ist „a perfect place“ darauf optimiert, dir im echten Leben weiterzuhelfen.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <InfoCard
              title="Kein endloses Scrollen"
              text="Hast du alle Posts des Tages gesehen, ist fertig für heute. Alle 24 Stunden startet der Feed von neuem."
            />
            <InfoCard
              title="Das Beste bleibt"
              text="Gute Ideen verlieren nicht nach 24 Stunden ihren Wert. Und die besten werden für immer verewigt. Setz ein Zeichen statt nur einen Like."
            />
            <InfoCard
              title="Qualität entscheidet"
              text="Durch unser Community-Ranking steigen nur Beiträge auf, welche es Wert sind. Der Rest verschwindet."
            />
          </div>
        </section>

        {/* =====================================================
            Guter Post
        ===================================================== */}
        <section className="grid gap-5 rounded-[28px] border border-black/5 bg-gradient-to-br from-white to-slate-50 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)] sm:p-8">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium uppercase tracking-[0.16em] text-gray-400">
              Qualitätsstandard
            </span>

            <h2 className="text-2xl font-semibold tracking-tight text-black sm:text-3xl">
              Was einen Beitrag wertvoll macht
            </h2>

            <p className="max-w-2xl text-base leading-7 text-gray-700">
              Qualität ist wichtiger als Quantität. Ein guter Beitrag hilft anderen konkret weiter.
              Er basiert auf echter Erfahrung, klaren Gedanken oder einer neuen Perspektive.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-[24px] border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-sm">
              <div className="mb-4 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                Hilfreich
              </div>

              <h3 className="text-xl font-semibold text-black">
                Ein starker Beitrag...
              </h3>

              <ul className="mt-5 space-y-3 text-sm leading-6 text-gray-700">
                <li>• beschreibt eine echte Erkenntnis oder Erfahrung</li>
                <li>• liefert einen konkreten Gedanken, Tipp oder Perspektivwechsel</li>
                <li>• erklärt, warum etwas funktioniert oder sinnvoll ist</li>
                <li>• hilft anderen, bessere Entscheidungen zu treffen</li>
              </ul>
            </div>

            <div className="rounded-[24px] border border-rose-100 bg-gradient-to-br from-rose-50 to-white p-6 shadow-sm">
              <div className="mb-4 inline-flex rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-rose-700">
                Weniger hilfreich
              </div>

              <h3 className="text-xl font-semibold text-black">
                Weniger Mehrwert haben ...
              </h3>

              <ul className="mt-5 space-y-3 text-sm leading-6 text-gray-700">
                <li>• allgemeine Aussagen ohne Substanz</li>
                <li>• reine Selbstdarstellung oder Werbung</li>
                <li>• Belanglose Einzeiler</li>
                <li>• Gedanken ohne konkreten Nutzen</li>
              </ul>
            </div>
          </div>
        </section>

        {/* =====================================================
            Ranking
        ===================================================== */}
        <section className="rounded-[28px] border border-black/5 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur sm:p-8">
          <div className="mb-6 flex flex-col gap-2">
            <span className="text-sm font-medium uppercase tracking-[0.16em] text-gray-400">
              Sichtbarkeit
            </span>

            <h2 className="text-2xl font-semibold tracking-tight text-black sm:text-3xl">
              Wie gute Gedanken sichtbar werden
            </h2>

            <p className="max-w-2xl text-base leading-7 text-gray-700">
              Gute Gedanken verdienen eine Bühne. In APP zählt zuerst der Inhalt.
              Nicht dein Name, nicht deine Reichweite – sondern der Wert deines Beitrags.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="group rounded-[24px] border border-black/5 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
              <div className="mb-4 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
                Dynamisch
              </div>

              <h3 className="text-xl font-semibold text-black">Das Leaderboard</h3>

              <p className="mt-3 text-sm leading-7 text-gray-700">
                Die besten Beiträge des Tages steigen ins Leaderboard auf.
                Alle 24 Stunden beginnt alles von vorne – jeder hat die gleiche Chance.
                Im Feed bleibst du anonym.
                Erst wenn dein Beitrag wirklich überzeugt, wird sichtbar, wer dahintersteht.
              </p>
            </div>

            <div className="group rounded-[24px] border border-black/5 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
              <div className="mb-4 inline-flex rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-indigo-700">
                Dauerhaft
              </div>

              <h3 className="text-xl font-semibold text-black">Die Hall of Fame</h3>

              <p className="mt-3 text-sm leading-7 text-gray-700">
                Die stärksten Beiträge werden dauerhaft gespeichert.
                Wer es schafft, echten Mehrwert für viele Menschen zu liefern, wird sichtbar – und bleibt es.
                Nicht durch Lautstärke, sondern durch Qualität.
              </p>
            </div>
          </div>
        </section>

        {/* =====================================================
            Prinzipien
        ===================================================== */}
        <section className="rounded-[28px] border border-black/5 bg-gradient-to-br from-slate-50 to-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)] sm:p-8">
          <div className="mb-6 flex flex-col gap-2">
            <span className="text-sm font-medium uppercase tracking-[0.16em] text-gray-400">
              Prinzipien
            </span>

            <h2 className="text-2xl font-semibold tracking-tight text-black sm:text-3xl">
              Wofür APP steht
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <InfoCard
              title="Qualität vor Quantität"
              text="Ein starker Beitrag bringt mehr als viele durchschnittliche."
            />
            <InfoCard
              title="Von Menschen für Menschen"
              text="APP lebt von echten Erfahrungen und ehrlichen Empfehlungen."
            />
            <InfoCard
              title="Mensch vor KI"
              text="KI darf unterstützen, aber keine reinen KI-Beiträge ersetzen echte Erlebnisse."
            />
            <InfoCard
              title="Hilfreich statt laut"
              text="Nicht Aufmerksamkeit ist das Ziel, sondern echter Nutzen."
            />
          </div>
        </section>

        {/* =====================================================
            Call to Action
        ===================================================== */}
        <section className="relative overflow-hidden rounded-[32px] border border-black/10 bg-black px-6 py-8 text-white shadow-[0_25px_80px_rgba(0,0,0,0.18)] sm:px-8 sm:py-10">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute right-[-40px] top-[-40px] h-40 w-40 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute bottom-[-50px] left-[-40px] h-40 w-40 rounded-full bg-amber-300/10 blur-3xl" />
          </div>

          <div className="relative flex flex-col gap-5">
            <div className="flex flex-col gap-3">
              <span className="text-sm font-medium uppercase tracking-[0.16em] text-white/50">
                Jetzt bist du dran
              </span>

              <h2 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
                Teile einen Gedanken, der anderen wirklich hilft.
              </h2>

              <p className="max-w-2xl text-sm leading-7 text-gray-300 sm:text-base">
                Teile eine Erkenntnis, einen Tipp oder eine Erfahrung, die für andere einen Unterschied macht.
                Bleib anonym – bis dein Beitrag zeigt, wie viel er wert ist.
              </p>
            </div>

            <div>
              <Link
                href="/#create-post"
                className="inline-flex items-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:scale-[1.02] hover:opacity-95"
              >
                Jetzt Beitrag erstellen
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

// =====================================================
// Helper Components
// =====================================================

type InfoCardProps = {
  title: string;
  text: string;
};

function InfoCard({ title, text }: InfoCardProps) {
  return (
    <div className="group rounded-[24px] border border-black/5 bg-white/90 p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
      <div className="mb-4 h-1.5 w-12 rounded-full bg-gradient-to-r from-black to-gray-300" />
      <h3 className="text-lg font-semibold tracking-tight text-black">
        {title}
      </h3>
      <p className="mt-3 text-sm leading-7 text-gray-700">{text}</p>
    </div>
  );
}

type HeroStatProps = {
  value: string;
  text: string;
};

function HeroStat({ value, text }: HeroStatProps) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/10 p-4 backdrop-blur-md">
      <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-white">
        {value}
      </h3>
      <p className="mt-2 text-sm leading-6 text-white/70">{text}</p>
    </div>
  );
}