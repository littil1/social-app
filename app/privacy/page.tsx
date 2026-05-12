const processedData = [
  "Account data, including user id and email address handled through Supabase Auth.",
  "Profile data, including username, avatar, bio, badges, and public profile information.",
  "User content, including posts, comments, feedback ideas, replies, and reports.",
  "Interaction data, including reactions, follows, badge progress, and daily winner snapshots.",
  "Technical data, including logs, IP address, device and browser data needed for security, troubleshooting, and abuse prevention.",
  "Analytics data if analytics are enabled, such as product usage events and aggregated app performance signals.",
];

const purposes = [
  "Operate and maintain APP.",
  "Authenticate users and protect accounts.",
  "Provide community features such as posting, comments, follows, badges, and Hall of Fame snapshots.",
  "Moderate content, handle reports, and keep the community safe.",
  "Prevent abuse, spam, automated misuse, and enforce rate limits.",
  "Improve the product and understand usage if analytics are enabled.",
];

const userRights = [
  "Request access to personal data.",
  "Request correction of inaccurate data.",
  "Request deletion of personal data, subject to legal and technical limits.",
  "Object to or request restriction of processing where applicable.",
  "Contact the operator at [CONTACT EMAIL] for privacy requests.",
];

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="mt-3 space-y-2">
      {items.map((item) => (
        <li key={item} className="flex gap-3">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 pb-32 pt-8 sm:pt-12">
      <section className="rounded-[32px] border border-neutral-100 bg-white p-6 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.42)] sm:p-8">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-600">
          Draft version — to be reviewed before public launch.
        </p>
        <h1 className="mt-4 text-3xl font-black tracking-tight text-neutral-950 sm:text-4xl">
          Privacy Policy / Datenschutz
        </h1>
        <p className="mt-4 text-sm font-medium leading-6 text-neutral-600">
          This draft explains how a perfect place (APP) processes data. It is
          not final legal advice and must be reviewed before public launch.
        </p>
        <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-neutral-400">
          Last updated: April 30, 2026
        </p>
      </section>

      <section className="mt-5 space-y-6 rounded-[28px] border border-neutral-100 bg-white p-6 text-sm font-medium leading-6 text-neutral-600 shadow-sm sm:p-8">
        <div>
          <h2 className="text-lg font-black tracking-tight text-neutral-950">
            Who Is Responsible
          </h2>
          <p className="mt-2">
            The responsible operator is{" "}
            <span className="font-bold text-neutral-900">[FULL LEGAL NAME]</span>,
            located at{" "}
            <span className="font-bold text-neutral-900">
              [FULL POSTAL ADDRESS]
            </span>
            . Contact:{" "}
            <span className="font-bold text-neutral-900">[CONTACT EMAIL]</span>.
            The operator is based in Switzerland.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-black tracking-tight text-neutral-950">
            What Data Is Processed
          </h2>
          <BulletList items={processedData} />
        </div>

        <div>
          <h2 className="text-lg font-black tracking-tight text-neutral-950">
            Purposes
          </h2>
          <BulletList items={purposes} />
        </div>

        <div>
          <h2 className="text-lg font-black tracking-tight text-neutral-950">
            Legal Basis
          </h2>
          <p className="mt-2">
            Depending on the context, processing may be based on contract
            performance, user consent where required, legal obligations, and the
            operator&apos;s legitimate interests in operating, securing, moderating,
            and improving APP. This wording is draft-level and should be
            reviewed for the final launch jurisdiction and product setup.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-black tracking-tight text-neutral-950">
            Service Providers
          </h2>
          <p className="mt-2">
            APP may use Supabase for authentication, database, storage, and
            backend services, and Vercel for hosting, deployment, and technical
            infrastructure. If analytics are enabled later, PostHog may be used
            for product analytics.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-black tracking-tight text-neutral-950">
            Cookies, Local Storage, and Session Storage
          </h2>
          <p className="mt-2">
            APP may use cookies, local storage, or session storage for
            authentication, session handling, login resume behavior, feed or UI
            state, security, and analytics if analytics are enabled.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-black tracking-tight text-neutral-950">
            Data Retention and Account Deletion
          </h2>
          <p className="mt-2">
            Data is retained as long as needed to operate APP, provide community
            features, comply with legal obligations, resolve disputes, and
            prevent abuse. Account deletion is available in profile settings.
            If an account is deleted, personal profile data is removed where
            feasible, while Hall of Fame snapshots may remain visible in
            anonymized form to preserve historical daily winner records.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-black tracking-tight text-neutral-950">
            User Rights
          </h2>
          <BulletList items={userRights} />
        </div>

        <div>
          <h2 className="text-lg font-black tracking-tight text-neutral-950">
            Security
          </h2>
          <p className="mt-2">
            APP uses technical and organizational measures intended to protect
            user data. No online service can guarantee absolute security.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-black tracking-tight text-neutral-950">
            Contact
          </h2>
          <p className="mt-2">
            Privacy questions or requests can be sent to{" "}
            <span className="font-bold text-neutral-900">[CONTACT EMAIL]</span>.
          </p>
        </div>
      </section>
    </main>
  );
}
