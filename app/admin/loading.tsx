export default function AdminLoading() {
  return (
    <main className="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-4 overflow-x-hidden px-4 pb-28 pt-5 sm:px-6 sm:pt-7 lg:gap-5 lg:px-8 lg:pt-8">
        <section className="app-skeleton rounded-[32px] p-5 sm:rounded-[36px] sm:p-6">
          <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="h-3 w-20 app-skeleton-line" />
              <div className="mt-4 h-10 w-56 app-skeleton-line" />
              <div className="mt-4 h-4 max-w-2xl app-skeleton-line" />
            </div>
            <div className="grid h-20 w-full max-w-52 grid-cols-2 gap-2 rounded-[26px] bg-neutral-100" />
          </div>
        </section>

        <section className="app-skeleton rounded-[28px] p-2">
          <div className="flex gap-2">
            <div className="h-10 w-24 rounded-full bg-neutral-200" />
            <div className="h-10 w-20 rounded-full bg-neutral-100" />
            <div className="h-10 w-24 rounded-full bg-neutral-100" />
          </div>
        </section>

        <section className="grid w-full min-w-0 gap-5 overflow-hidden lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-6">
          <div className="app-skeleton rounded-[32px] p-5 sm:p-6">
            <div className="h-3 w-24 app-skeleton-line" />
            <div className="mt-4 h-8 w-56 app-skeleton-line" />
            <div className="mt-6 space-y-3">
              <div className="h-20 rounded-2xl bg-neutral-100" />
              <div className="h-20 rounded-2xl bg-neutral-100" />
              <div className="h-20 rounded-2xl bg-neutral-100" />
            </div>
          </div>
          <div className="app-skeleton rounded-[32px] p-5 sm:p-6">
            <div className="h-3 w-32 app-skeleton-line" />
            <div className="mt-4 h-8 w-60 app-skeleton-line" />
            <div className="mt-6 h-36 rounded-3xl bg-neutral-100" />
            <div className="mt-5 h-40 rounded-3xl bg-neutral-100" />
          </div>
        </section>
    </main>
  );
}
