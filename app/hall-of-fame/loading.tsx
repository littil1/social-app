export default function HallOfFameLoading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pt-14">
        <div className="space-y-10 sm:space-y-14">
          <section className="app-skeleton app-skeleton-dark rounded-[32px] p-6 sm:rounded-[36px] sm:p-10">
            <div className="h-3 w-32 app-skeleton-line" />
            <div className="mt-6 h-12 w-64 app-skeleton-line sm:w-96" />
            <div className="mt-5 h-4 max-w-2xl app-skeleton-line" />
            <div className="mt-3 h-4 max-w-lg app-skeleton-line" />
          </section>

          <section className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
            <div className="app-skeleton h-72 rounded-[32px]" />
            <div className="app-skeleton h-72 rounded-[32px]" />
          </section>

          <section className="grid gap-4">
            {[0, 1, 2].map((item) => (
              <div key={item} className="app-skeleton rounded-[32px] p-5">
                <div className="h-3 w-28 app-skeleton-line" />
                <div className="mt-5 h-5 w-3/4 app-skeleton-line" />
                <div className="mt-3 h-5 w-1/2 app-skeleton-line" />
              </div>
            ))}
          </section>
        </div>
    </main>
  );
}
