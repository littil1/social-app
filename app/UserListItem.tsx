import Link from "next/link";

export default function UserListItem({
  user,
}: {
  user: {
    id: string;
    username: string | null;
    avatar_url: string | null;
    bio: string | null;
  };
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
          {user.username ? (
            <Link
              href={`/u/${user.username}`}
              className="block text-lg font-semibold text-gray-900 hover:underline"
            >
              @{user.username}
            </Link>
          ) : (
            <p className="text-lg font-semibold text-gray-900">@unknown</p>
          )}

          <p className="mt-1 truncate text-sm text-gray-600">
            {user.bio ?? "No bio yet."}
          </p>
        </div>
      </div>
    </div>
  );
}