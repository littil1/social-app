export default function LeaderboardLoading() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pb-28 pt-4 sm:px-6 sm:py-6 lg:gap-7 lg:px-8 lg:py-6">
        <section className="app-skeleton app-skeleton-dark rounded-[32px] p-5 sm:rounded-[36px] sm:p-6">
          <div className="h-3 w-24 app-skeleton-line" />
          <div className="mt-5 h-9 w-56 app-skeleton-line sm:w-72" />
          <div className="mt-4 h-4 max-w-xl app-skeleton-line" />
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="app-skeleton h-56 rounded-[30px]" />
          <div className="app-skeleton h-64 rounded-[34px]" />
          <div className="app-skeleton h-56 rounded-[30px]" />
        </section>

        <section className="mx-auto grid w-full max-w-5xl gap-4">
          {[0, 1, 2].map((item) => (
            <div key={item} className="app-skeleton rounded-[32px] p-6">
              <div className="h-4 w-28 app-skeleton-line" />
              <div className="mt-6 h-5 w-full app-skeleton-line" />
              <div className="mt-3 h-5 w-3/4 app-skeleton-line" />
              <div className="mt-8 flex gap-2">
                <div className="h-9 w-20 app-skeleton-line" />
                <div className="h-9 w-20 app-skeleton-line" />
                <div className="h-9 w-20 app-skeleton-line" />
              </div>
            </div>
          ))}
        </section>
    </main>
  );
}
