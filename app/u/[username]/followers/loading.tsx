export default function FollowersLoading() {
  return (
    <main className="mx-auto max-w-2xl px-4 pb-28 pt-6 sm:px-6 sm:pt-10">
        <section className="app-skeleton mb-6 rounded-[32px] p-6 sm:p-8">
          <div className="h-3 w-32 app-skeleton-line" />
          <div className="mt-5 flex items-end justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="h-4 w-36 app-skeleton-line" />
              <div className="mt-3 h-11 w-48 app-skeleton-line" />
            </div>
            <div className="h-16 w-20 rounded-2xl bg-neutral-100" />
          </div>
        </section>

        <div className="mb-3 h-3 w-28 app-skeleton-line" />
        <div className="space-y-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="app-skeleton rounded-[24px] p-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-neutral-100" />
                <div className="min-w-0 flex-1">
                  <div className="h-4 w-36 app-skeleton-line" />
                  <div className="mt-2 h-3 w-24 app-skeleton-line" />
                </div>
                <div className="h-9 w-20 rounded-full bg-neutral-100" />
              </div>
            </div>
          ))}
        </div>
    </main>
  );
}
