export default function HallOfFameLoading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pt-14">
      <div className="space-y-10 sm:space-y-14">
        <div className="h-64 animate-pulse rounded-[32px] bg-neutral-100 sm:rounded-[36px]" />
        <div className="h-72 animate-pulse rounded-[32px] bg-neutral-100" />
        <div className="h-96 animate-pulse rounded-[32px] bg-neutral-100" />
      </div>
    </main>
  );
}
