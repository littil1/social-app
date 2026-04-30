export default function AppLoading() {
  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_50%_0%,rgba(251,191,36,0.16),transparent_34%),linear-gradient(180deg,#fffdf7,#fafafa_48%,#f5f5f5)] px-5 pb-28">
      <section className="w-full max-w-sm">
        <div className="mx-auto grid h-28 w-28 place-items-center rounded-[32px] border border-amber-100 bg-white/80 shadow-[0_24px_70px_-44px_rgba(146,64,14,0.55)]">
          <div className="relative h-20 w-20 rounded-full border-[7px] border-amber-400 bg-neutral-950 shadow-inner">
            <div className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-300" />
            <div className="absolute left-2 top-2 h-3 w-3 rounded-full bg-amber-50" />
            <div className="absolute bottom-4 right-3 h-2.5 w-2.5 rounded-full bg-amber-50" />
          </div>
        </div>

        <div className="mt-8 rounded-[32px] border border-neutral-100 bg-white/85 p-5 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.55)]">
          <div className="h-3 w-24 app-skeleton-line" />
          <div className="mt-5 h-6 w-48 app-skeleton-line" />
          <div className="mt-6 space-y-3">
            <div className="h-16 rounded-2xl bg-neutral-100/80" />
            <div className="h-16 rounded-2xl bg-neutral-100/70" />
          </div>
        </div>
      </section>
    </main>
  );
}
