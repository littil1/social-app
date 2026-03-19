import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { logout } from "./actions/social";

export default async function NavBar() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: {
    username: string | null;
    avatar_url: string | null;
  } | null = null;

  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    profile = data;
  }

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-bold">
            Social App
          </Link>

          <nav className="flex items-center gap-4 text-sm text-gray-600">
            <Link href="/" className="hover:underline">
              Home
            </Link>
            <Link href="/explore" className="hover:underline">
              Explore
            </Link>

            {profile?.username && (
              <Link href={`/u/${profile.username}`} className="hover:underline">
                Profile
              </Link>
            )}

            {user && (
              <Link href="/settings/profile" className="hover:underline">
                Settings
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-sm font-semibold text-gray-600">
                  {profile?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.avatar_url}
                      alt="Your avatar"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    (profile?.username ?? user.email ?? "u").charAt(0).toUpperCase()
                  )}
                </div>

                <div className="hidden text-sm text-gray-600 sm:block">
                  @{profile?.username ?? "user"}
                </div>
              </div>

              <form action={logout}>
                <button
                  type="submit"
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700"
                >
                  Logout
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}