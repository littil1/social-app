export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-[#fafafa]">
      <main className="mx-auto max-w-4xl px-4 pb-28 pt-8 sm:py-16">
        <section className="app-skeleton overflow-hidden rounded-[40px]">
          <div className="h-32 bg-neutral-950" />
          <div className="px-6 pb-10 sm:px-10">
            <div className="-mt-16 mb-8 flex items-end justify-between gap-4">
              <div className="h-28 w-28 rounded-[32px] border-[6px] border-white bg-neutral-100 sm:h-36 sm:w-36" />
              <div className="h-12 w-32 rounded-2xl bg-neutral-100" />
            </div>
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <div className="h-12 w-64 app-skeleton-line" />
                <div className="mt-3 h-4 w-44 app-skeleton-line" />
                <div className="mt-4 h-3 w-52 app-skeleton-line" />
              </div>
              <div className="h-20 rounded-[28px] bg-neutral-100 lg:w-[420px]" />
            </div>
          </div>
        </section>

        <section className="app-skeleton mt-8 rounded-[32px] p-5">
          <div className="h-4 w-28 app-skeleton-line" />
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="h-20 rounded-2xl bg-neutral-100" />
            <div className="h-20 rounded-2xl bg-neutral-100" />
          </div>
        </section>

        <section className="mx-auto mt-10 max-w-2xl">
          <div className="mb-5 h-8 w-52 app-skeleton-line" />
          <div className="space-y-4">
            <div className="app-skeleton h-44 rounded-[32px]" />
            <div className="app-skeleton h-44 rounded-[32px]" />
          </div>
        </section>
      </main>
    </div>
  );
}
