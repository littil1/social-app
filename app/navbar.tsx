"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import UserMenu from "@/app/components/layout/UserMenu";

type NavBarProps = {
  user: {
    username: string;
    avatar_url: string | null;
    is_admin: boolean;
  } | null;
};

export default function NavBar({ user }: NavBarProps) {
  const pathname = usePathname();

  function getLinkClass(path: string) {
    const isActive =
      path === "/"
        ? pathname === "/"
        : pathname.startsWith(path);

    return `relative px-1 py-0.5 ${
      isActive
        ? "text-black font-semibold border-b-2 border-black"
        : "text-gray-600 hover:text-black"
    }`;
  }

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-bold">
            Social App
          </Link>

          <nav className="flex items-center gap-4 text-sm">
            <Link href="/" className={getLinkClass("/")}>
              Home
            </Link>

            <Link href="/explore" className={getLinkClass("/explore")}>
              Explore
            </Link>

            <Link href="/leaderboard" className={getLinkClass("/leaderboard")}>
              Leaderboard
            </Link>

            <Link href="/hall-of-fame" className={getLinkClass("/hall-of-fame")}>
              Hall of Fame
            </Link>

            <Link href="/feedback" className={getLinkClass("/feedback")}>
              Verbesserungswünsche
            </Link>

            {user && (
              <Link href="/following" className={getLinkClass("/following")}>
                Following
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <UserMenu
              username={user.username}
              avatarUrl={user.avatar_url}
              isAdmin={user.is_admin}
            />
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