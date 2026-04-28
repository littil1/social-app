export default function VibeLoading() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fafafa]">
      <div className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pt-14">
        <div className="h-[520px] animate-pulse rounded-[36px] bg-neutral-100" />
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="h-80 animate-pulse rounded-[32px] bg-neutral-100" />
          <div className="h-80 animate-pulse rounded-[32px] bg-neutral-100" />
        </div>
      </div>
    </main>
  );
}
