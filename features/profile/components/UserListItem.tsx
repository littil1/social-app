import Link from "next/link";
import Image from "next/image";
import type { ProfileSummary } from "@/features/profile/lib/follow-data";
import LegendBadgeMarker from "@/features/badges/components/LegendBadgeMarker";

export default function UserListItem({
  user,
}: {
  user: ProfileSummary;
}) {
  const content = (
    <>
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[22px] bg-neutral-50 text-lg font-black text-amber-700 shadow-inner ring-1 ring-amber-100/70 sm:h-16 sm:w-16">
          {user.avatar_url ? (
            <Image
              src={user.avatar_url}
              alt={`${user.username ?? "User"} avatar`}
              width={56}
              height={56}
              sizes="56px"
              unoptimized
              className="h-full w-full object-cover"
            />
          ) : (
            (user.username ?? "u").charAt(0).toUpperCase()
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="block truncate text-lg font-black tracking-tight text-neutral-950">
              @{user.username ?? "unknown"}
            </p>

            {user.isCurrentUser && (
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-neutral-600">
                You
              </span>
            )}
            {user.hasLegendBadge && <LegendBadgeMarker className="text-sm" />}
          </div>

          <p className="mt-1 truncate text-sm font-medium text-neutral-500">
            {user.bio ?? "No bio yet."}
          </p>
        </div>
      </div>
    </>
  );

  if (!user.username) {
    return (
      <div className="motion-card rounded-[28px] border border-neutral-100 bg-white p-4 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.48)]">
        {content}
      </div>
    );
  }

  return (
    <Link
      href={`/u/${user.username}`}
      className="motion-card block rounded-[28px] border border-neutral-100 bg-white p-4 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.48)] transition hover:-translate-y-0.5 hover:border-amber-100 hover:shadow-[0_26px_60px_-46px_rgba(15,23,42,0.56)]"
    >
      {content}
    </Link>
  );
}

