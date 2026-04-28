export default function LeaderboardLoading() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pb-28 pt-4 sm:px-6 sm:py-6 lg:gap-7 lg:px-8 lg:py-6">
      <div className="h-28 animate-pulse rounded-[32px] bg-neutral-100" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-56 animate-pulse rounded-[30px] bg-neutral-100" />
        <div className="h-64 animate-pulse rounded-[34px] bg-neutral-100" />
        <div className="h-56 animate-pulse rounded-[30px] bg-neutral-100" />
      </div>
      <div className="mx-auto h-64 w-full max-w-5xl animate-pulse rounded-[32px] bg-neutral-100" />
    </main>
  );
}
