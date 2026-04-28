export default function AdminLoading() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pb-28 pt-6 sm:px-6 sm:pt-8 lg:gap-8 lg:px-8 lg:pt-10">
      <div className="h-44 animate-pulse rounded-[32px] bg-neutral-100 sm:rounded-[36px]" />
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-8">
        <div className="h-96 animate-pulse rounded-[32px] bg-neutral-100" />
        <div className="h-96 animate-pulse rounded-[32px] bg-neutral-100" />
      </div>
    </main>
  );
}
