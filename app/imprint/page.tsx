import Link from "next/link";

const operatorDetails = [
  ["Operator", "[FULL LEGAL NAME]"],
  ["Address", "[FULL POSTAL ADDRESS]"],
  ["Email", "[CONTACT EMAIL]"],
  ["Location / applicable legal context", "Switzerland"],
];

export default function ImprintPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 pb-32 pt-10 sm:pt-16">
      <section className="rounded-[32px] border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-600">
          Draft version — to be reviewed before public launch.
        </p>
        <h1 className="mt-4 text-3xl font-black tracking-tight text-neutral-950 sm:text-4xl">
          Imprint / Impressum
        </h1>
        <p className="mt-4 text-sm font-medium leading-6 text-neutral-600">
          This imprint identifies the operator responsible for a perfect place
          (APP). The details below are draft placeholders and must be completed
          with accurate legal information before public launch.
        </p>
      </section>

      <section className="mt-6 rounded-[28px] border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-lg font-black tracking-tight text-neutral-950">
          Operator / Responsible Person
        </h2>
        <div className="mt-5 divide-y divide-neutral-100 rounded-2xl border border-neutral-100">
          {operatorDetails.map(([label, value]) => (
            <div
              key={label}
              className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-[180px_1fr] sm:gap-4"
            >
              <span className="font-black uppercase tracking-[0.14em] text-neutral-400">
                {label}
              </span>
              <span className="font-semibold text-neutral-800">{value}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 space-y-5 rounded-[28px] border border-neutral-200 bg-white p-6 text-sm font-medium leading-6 text-neutral-600 shadow-sm sm:p-8">
        <div>
          <h2 className="text-lg font-black tracking-tight text-neutral-950">
            Contact
          </h2>
          <p className="mt-2">
            For legal, privacy, or platform-related requests, please contact:
            <span className="font-bold text-neutral-900"> [CONTACT EMAIL]</span>.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-black tracking-tight text-neutral-950">
            Disclaimer
          </h2>
          <p className="mt-2">
            APP is provided as an evolving online service. Content, features,
            rankings, and availability may change. No guarantee is made that
            the service will be uninterrupted, error-free, or permanently
            available.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-black tracking-tight text-neutral-950">
            Copyright / Intellectual Property
          </h2>
          <p className="mt-2">
            Unless otherwise stated, the APP interface, branding, and original
            platform materials are protected by applicable intellectual property
            laws. User-generated content remains subject to the Terms of Service
            and applicable law.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-black tracking-tight text-neutral-950">
            Applicable Law
          </h2>
          <p className="mt-2">
            This draft is prepared for an operator located in Switzerland.
            Subject to mandatory consumer protection or other mandatory rules,
            Swiss law is intended to apply where legally appropriate.
          </p>
        </div>
      </section>

      <nav className="mt-6 flex flex-wrap gap-3 text-xs font-black uppercase tracking-[0.16em] text-neutral-500">
        <Link href="/privacy" className="hover:text-neutral-950">
          Privacy Policy
        </Link>
        <Link href="/terms" className="hover:text-neutral-950">
          Terms of Service
        </Link>
      </nav>
    </main>
  );
}
