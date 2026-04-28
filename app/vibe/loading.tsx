export default function VibeLoading() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fafafa]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-10%] h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-amber-100/40 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-5xl px-5 py-10 sm:px-6 lg:py-16">
        <section className="mb-16 text-center sm:mb-20">
          <div className="mx-auto h-8 w-28 app-skeleton-line" />
          <div className="mx-auto mt-10 h-20 w-72 app-skeleton-line sm:h-28 sm:w-[30rem]" />
          <div className="mx-auto mt-10 h-4 max-w-2xl app-skeleton-line" />
          <div className="mx-auto mt-3 h-4 max-w-xl app-skeleton-line" />
        </section>

        <section className="app-skeleton app-skeleton-dark mb-14 rounded-[36px] p-6 sm:mb-16 sm:p-10">
          <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr]">
            <div>
              <div className="h-10 w-56 app-skeleton-line" />
              <div className="mt-5 h-7 w-48 app-skeleton-line" />
              <div className="mt-6 grid gap-2.5">
                <div className="h-12 rounded-2xl bg-white/10" />
                <div className="h-12 rounded-2xl bg-white/10" />
                <div className="h-12 rounded-2xl bg-white/10" />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="h-64 rounded-[30px] bg-white/10" />
              <div className="h-64 rounded-[30px] bg-amber-100/20" />
            </div>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-3">
          <div className="app-skeleton h-52 rounded-[32px]" />
          <div className="app-skeleton h-52 rounded-[32px]" />
          <div className="app-skeleton h-52 rounded-[32px]" />
        </section>
      </div>
    </main>
  );
}
