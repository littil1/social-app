import Link from "next/link";
import type { ProfileSummary } from "@/lib/follow-data";

export default function UserListItem({
  user,
}: {
  user: ProfileSummary;
}) {
  return (
    <div className="rounded-xl bg-white p-4 shadow">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-lg font-semibold text-gray-600">
          {user.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatar_url}
              alt={`${user.username ?? "User"} avatar`}
              className="h-full w-full object-cover"
            />
          ) : (
            (user.username ?? "u").charAt(0).toUpperCase()
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {user.username ? (
              <Link
                href={`/u/${user.username}`}
                className="block truncate text-lg font-semibold text-gray-900 hover:underline"
              >
                @{user.username}
              </Link>
            ) : (
              <p className="text-lg font-semibold text-gray-900">@unknown</p>
            )}

            {user.isCurrentUser && (
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-neutral-600">
                You
              </span>
            )}
          </div>

          <p className="mt-1 truncate text-sm text-gray-600">
            {user.bio ?? "No bio yet."}
          </p>
        </div>
      </div>
    </div>
  );
}