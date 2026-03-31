import Link from "next/link";

// =====================================================
// Component
// =====================================================

export default function HowItWorksPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-6 py-10">
      {/* =====================================================
          Hero
      ===================================================== */}
      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4">
          <span className="text-sm font-medium text-gray-500">
            So funktioniert APP
          </span>

          <div className="flex flex-col gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-black sm:text-4xl">
              Entdecke Orte, die dich wirklich weiterbringen.
            </h1>

            <p className="max-w-2xl text-base leading-7 text-gray-700 sm:text-lg">
              APP ist keine klassische Social App. Hier geht es nicht um
              möglichst viele Posts, sondern um gute. Menschen teilen Orte, die
              sie wirklich empfehlen können.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/"
              className="rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
            >
              Zum Feed
            </Link>

            <Link
              href="/create"
              className="rounded-full border px-5 py-2.5 text-sm font-medium text-black transition hover:bg-gray-50"
            >
              Beitrag erstellen
            </Link>
          </div>
        </div>
      </section>

      {/* =====================================================
          Was du hier findest
      ===================================================== */}
      <section className="grid gap-4 rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-semibold text-black">
            Was du hier findest
          </h2>

          <p className="text-base leading-7 text-gray-700">
            Menschen teilen Orte, die sie wirklich empfehlen können.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <InfoCard
            title="Keine Werbung"
            text="Im Fokus stehen echte Erfahrungen statt beliebiger Inhalte."
          />
          <InfoCard
            title="Keine belanglosen Posts"
            text="Jeder Beitrag soll inspirieren oder anderen konkret helfen."
          />
          <InfoCard
            title="Echter Mehrwert"
            text="Die besten Orte werden sichtbar, weil Menschen sie gut finden."
          />
        </div>
      </section>

      {/* =====================================================
          Guter Post
      ===================================================== */}
      <section className="grid gap-6 rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-semibold text-black">
            Was einen guten Beitrag ausmacht
          </h2>

          <p className="text-base leading-7 text-gray-700">
            Qualität ist wichtiger als Quantität. Ein guter Beitrag ist konkret,
            ehrlich und hilfreich für andere.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border bg-gray-50 p-5">
            <h3 className="text-lg font-semibold text-black">Gut ist zum Beispiel:</h3>

            <ul className="mt-4 space-y-3 text-sm leading-6 text-gray-700">
              <li>• Wann lohnt sich der Ort besonders?</li>
              <li>• Für wen ist er geeignet?</li>
              <li>• Was macht ihn besonders?</li>
              <li>• Gibt es Nachteile, die man wissen sollte?</li>
            </ul>
          </div>

          <div className="rounded-2xl border bg-gray-50 p-5">
            <h3 className="text-lg font-semibold text-black">
              Weniger hilfreich ist:
            </h3>

            <ul className="mt-4 space-y-3 text-sm leading-6 text-gray-700">
              <li>• Zu allgemeine Aussagen ohne Kontext</li>
              <li>• Reine Werbung</li>
              <li>• Belanglose Einzeiler</li>
              <li>• Beiträge ohne echte eigene Erfahrung</li>
            </ul>
          </div>
        </div>
      </section>

      {/* =====================================================
          Ranking
      ===================================================== */}
      <section className="grid gap-4 rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-semibold text-black">
            Wie das Ranking funktioniert
          </h2>

          <p className="text-base leading-7 text-gray-700">
            Gute Beiträge sollen sichtbar werden. Deshalb zählen nicht nur
            Reaktionen, sondern auch Relevanz und Austausch.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border p-5">
            <h3 className="text-lg font-semibold text-black">Leaderboard</h3>
            <p className="mt-3 text-sm leading-6 text-gray-700">
              Im Leaderboard steigen aktuell die stärksten Beiträge. Reaktionen,
              Kommentare und Relevanz helfen dabei zu entscheiden, was gerade
              besonders wertvoll ist.
            </p>
          </div>

          <div className="rounded-2xl border p-5">
            <h3 className="text-lg font-semibold text-black">Hall of Fame</h3>
            <p className="mt-3 text-sm leading-6 text-gray-700">
              In der Hall of Fame landen dauerhaft besonders gute Beiträge. Dort
              bleiben Inhalte sichtbar, die Menschen langfristig wirklich
              weiterbringen.
            </p>
          </div>
        </div>
      </section>

      {/* =====================================================
          Prinzipien
      ===================================================== */}
      <section className="grid gap-4 rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-semibold text-black">
            Wofür APP steht
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
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
      <section className="rounded-2xl border bg-black p-6 text-white shadow-sm">
        <div className="flex flex-col gap-4">
          <h2 className="text-2xl font-semibold">
            Teile einen Ort, den du wirklich empfehlen kannst.
          </h2>

          <p className="max-w-2xl text-sm leading-6 text-gray-200">
            Schreibe aus deiner eigenen Erfahrung. Hilf anderen, bessere
            Entscheidungen zu treffen und besondere Orte zu entdecken.
          </p>

          <div>
            <Link
              href="/create"
              className="inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black transition hover:opacity-90"
            >
              Jetzt Beitrag erstellen
            </Link>
          </div>
        </div>
      </section>
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
    <div className="rounded-2xl border p-5">
      <h3 className="text-lg font-semibold text-black">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-gray-700">{text}</p>
    </div>
  );
}