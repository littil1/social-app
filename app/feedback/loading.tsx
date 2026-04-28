export default function FeedbackLoading() {
  return (
    <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pt-14">
      <div className="mb-10 h-72 animate-pulse rounded-[32px] bg-neutral-100 sm:mb-14 lg:mb-16" />
      <div className="mb-12 grid gap-6 lg:mb-16 lg:grid-cols-2 lg:gap-8">
        <div className="h-72 animate-pulse rounded-[32px] bg-neutral-100" />
        <div className="h-72 animate-pulse rounded-[32px] bg-neutral-100" />
      </div>
      <div className="grid gap-8 xl:grid-cols-2 xl:gap-12">
        <div className="h-96 animate-pulse rounded-[32px] bg-neutral-100" />
        <div className="h-96 animate-pulse rounded-[32px] bg-neutral-100" />
      </div>
    </main>
  );
}
