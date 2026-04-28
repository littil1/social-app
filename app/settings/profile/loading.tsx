export default function ProfileSettingsLoading() {
  return (
    <div className="min-h-screen bg-[#fafafa]">
      <main className="mx-auto max-w-2xl px-4 pb-28 pt-6 sm:px-6 sm:pt-10 lg:pt-14">
        <section className="app-skeleton app-skeleton-dark mb-6 rounded-[32px] p-6 sm:mb-8 sm:rounded-[40px] sm:p-10">
          <div className="h-3 w-40 app-skeleton-line" />
          <div className="mt-6 h-12 w-64 app-skeleton-line" />
          <div className="mt-5 h-4 max-w-md app-skeleton-line" />
          <div className="mt-3 h-4 max-w-sm app-skeleton-line" />
        </section>

        <section className="app-skeleton rounded-[32px] p-5 sm:p-8 lg:p-10">
          <div className="h-7 w-44 app-skeleton-line" />
          <div className="mt-8 flex items-center gap-6">
            <div className="h-28 w-28 rounded-[24px] bg-neutral-100" />
            <div className="flex-1 space-y-3">
              <div className="h-4 w-28 app-skeleton-line" />
              <div className="h-4 w-48 app-skeleton-line" />
            </div>
          </div>
          <div className="mt-8 h-14 rounded-2xl bg-neutral-100" />
          <div className="mt-6 h-32 rounded-2xl bg-neutral-100" />
          <div className="mt-8 h-14 rounded-2xl bg-neutral-200" />
        </section>
      </main>
    </div>
  );
}
