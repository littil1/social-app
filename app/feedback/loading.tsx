export default function FeedbackLoading() {
  return (
    <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pt-14">
        <section className="app-skeleton app-skeleton-dark mb-10 rounded-[32px] p-6 sm:mb-14 sm:p-10 lg:mb-16 lg:p-14">
          <div className="h-3 w-28 app-skeleton-line" />
          <div className="mt-7 h-14 w-72 app-skeleton-line sm:w-[28rem]" />
          <div className="mt-5 h-4 max-w-xl app-skeleton-line" />
          <div className="mt-3 h-4 max-w-lg app-skeleton-line" />
        </section>

        <section className="mb-12 grid gap-6 lg:mb-16 lg:grid-cols-2 lg:gap-8">
          <div className="app-skeleton rounded-[32px] p-6 sm:p-8">
            <div className="h-7 w-48 app-skeleton-line" />
            <div className="mt-8 space-y-4">
              <div className="h-16 rounded-2xl bg-neutral-100" />
              <div className="h-16 rounded-2xl bg-neutral-100" />
              <div className="h-16 rounded-2xl bg-neutral-100" />
            </div>
          </div>
          <div className="app-skeleton rounded-[32px] p-6 sm:p-8">
            <div className="h-7 w-44 app-skeleton-line" />
            <div className="mt-7 h-14 rounded-2xl bg-neutral-100" />
            <div className="mt-4 h-32 rounded-2xl bg-neutral-100" />
            <div className="mt-4 h-12 rounded-full bg-neutral-200" />
          </div>
        </section>

        <section className="grid gap-8 xl:grid-cols-2 xl:gap-12">
          {[0, 1].map((column) => (
            <div key={column} className="space-y-4">
              <div className="h-8 w-36 app-skeleton-line" />
              <div className="app-skeleton h-44 rounded-[32px]" />
              <div className="app-skeleton h-44 rounded-[32px]" />
            </div>
          ))}
        </section>
    </main>
  );
}
