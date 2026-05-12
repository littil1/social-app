const contentRules = [
  "Illegal, harmful, abusive, hateful, harassing, or threatening content.",
  "Sexual exploitation, sexualized minors, or any content that endangers children.",
  "Doxxing, sharing private personal information, impersonation, or targeted harassment.",
  "Spam, scams, automated abuse, manipulation, scraping, or attempts to bypass rate limits.",
  "Content that infringes third-party rights or violates applicable law.",
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

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 pb-32 pt-8 sm:pt-12">
      <section className="rounded-[32px] border border-neutral-100 bg-white p-6 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.42)] sm:p-8">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-600">
          Draft version — to be reviewed before public launch.
        </p>
        <h1 className="mt-4 text-3xl font-black tracking-tight text-neutral-950 sm:text-4xl">
          Terms of Service / Nutzungsbedingungen
        </h1>
        <p className="mt-4 text-sm font-medium leading-6 text-neutral-600">
          These draft terms describe the basic rules for using a perfect place
          (APP). They are not final legal advice and must be reviewed before
          public launch.
        </p>
        <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-neutral-400">
          Last updated: April 30, 2026
        </p>
      </section>

      <section className="mt-5 space-y-6 rounded-[28px] border border-neutral-100 bg-white p-6 text-sm font-medium leading-6 text-neutral-600 shadow-sm sm:p-8">
        <div>
          <h2 className="text-lg font-black tracking-tight text-neutral-950">
            Acceptance of Terms
          </h2>
          <p className="mt-2">
            By accessing or using APP, you agree to these Terms of Service. If
            you do not agree, you should not use the service.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-black tracking-tight text-neutral-950">
            Description of APP
          </h2>
          <p className="mt-2">
            APP is a community product for posting ideas, reacting, commenting,
            submitting feedback, and highlighting daily impact through rankings,
            badges, and Hall of Fame snapshots.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-black tracking-tight text-neutral-950">
            Account Responsibility
          </h2>
          <p className="mt-2">
            You are responsible for your account, the accuracy of information
            you provide, and activity carried out through your account. Keep
            login credentials secure and contact{" "}
            <span className="font-bold text-neutral-900">[CONTACT EMAIL]</span>{" "}
            if you suspect unauthorized access.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-black tracking-tight text-neutral-950">
            Anonymous Posting
          </h2>
          <p className="mt-2">
            Posts may appear anonymous publicly. However, APP may still process
            account, security, moderation, and technical data internally to
            operate the platform, prevent abuse, and comply with applicable
            obligations.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-black tracking-tight text-neutral-950">
            User Content and Community Rules
          </h2>
          <p className="mt-2">
            You remain responsible for the content you submit. Do not post,
            upload, promote, or attempt to distribute:
          </p>
          <BulletList items={contentRules} />
        </div>

        <div>
          <h2 className="text-lg font-black tracking-tight text-neutral-950">
            Moderation
          </h2>
          <p className="mt-2">
            APP may remove, limit, blur, block, or deprioritize content, and may
            restrict accounts when needed for safety, legal compliance,
            platform integrity, or community quality.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-black tracking-tight text-neutral-950">
            Hall of Fame / Daily Winners
          </h2>
          <p className="mt-2">
            Rankings, scores, and daily winner calculations may change while the
            product evolves. Historical Hall of Fame snapshots may remain
            visible, including in anonymized form if an account is deleted.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-black tracking-tight text-neutral-950">
            Feedback / Input
          </h2>
          <p className="mt-2">
            Ideas, feedback, feature requests, and comments submitted to APP may
            be used to improve the product without obligation, compensation, or
            transfer of ownership beyond the rights needed to operate and
            develop the service.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-black tracking-tight text-neutral-950">
            Availability
          </h2>
          <p className="mt-2">
            APP is provided as an evolving service. There is no guarantee of
            uninterrupted, error-free, or permanent availability.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-black tracking-tight text-neutral-950">
            Account Deletion
          </h2>
          <p className="mt-2">
            You may request or perform account deletion through profile
            settings where available. Some historical records, such as Hall of
            Fame snapshots, may remain visible in anonymized form.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-black tracking-tight text-neutral-950">
            Limitation of Liability
          </h2>
          <p className="mt-2">
            To the maximum extent permitted by applicable law, APP and its
            operator are not liable for indirect, incidental, consequential, or
            punitive damages arising from use of the service. This clause is
            draft-level and must be reviewed before launch.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-black tracking-tight text-neutral-950">
            Changes to Terms
          </h2>
          <p className="mt-2">
            These terms may be updated as APP evolves. Continued use after
            changes are posted means you accept the updated terms, where legally
            permitted.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-black tracking-tight text-neutral-950">
            Contact
          </h2>
          <p className="mt-2">
            Questions about these terms can be sent to{" "}
            <span className="font-bold text-neutral-900">[CONTACT EMAIL]</span>.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-black tracking-tight text-neutral-950">
            Applicable Law
          </h2>
          <p className="mt-2">
            These draft terms are prepared for an operator located in
            Switzerland. Subject to mandatory consumer protection or other
            mandatory rules, Swiss law is intended to apply where legally
            appropriate.
          </p>
        </div>
      </section>
    </main>
  );
}
