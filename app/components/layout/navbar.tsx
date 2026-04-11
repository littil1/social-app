"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import UserMenu from "@/app/components/layout/UserMenu";
import { useAuthModal } from "@/app/components/auth/AuthModalProvider";

// =====================================================
// Types
// =====================================================

type NavBarProps = {
  user?: {
    username: string;
    avatar_url: string | null;
    is_admin: boolean;
  } | null;
};

// =====================================================
// Helpers
// =====================================================

function isActivePath(pathname: string, path: string) {
  return pathname === path;
}

// =====================================================
// Component
// =====================================================

export default function NavBar({ user = null }: NavBarProps) {
  const pathname = usePathname();
  const { openLogin } = useAuthModal();

  function getLinkClass(path: string) {
    const isActive = isActivePath(pathname, path);

    return [
      "inline-flex shrink-0 items-center rounded-full px-3 py-2 text-sm whitespace-nowrap transition",
      isActive
        ? "bg-black font-semibold text-white"
        : "text-gray-600 hover:bg-gray-100 hover:text-black",
    ].join(" ");
  }

  return (
    <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/leaderboard"
            className="shrink-0 text-lg font-bold text-black"
          >
            APP
          </Link>

          <div className="shrink-0">
            {user ? (
              <UserMenu
                username={user.username}
                avatarUrl={user.avatar_url}
                isAdmin={user.is_admin}
              />
            ) : (
              <button
                type="button"
                onClick={() => openLogin(pathname || "/leaderboard")}
                className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Login
              </button>
            )}
          </div>
        </div>

        <nav className="mt-3">
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <div className="flex min-w-max gap-2 pb-1">
              <Link href="/leaderboard" className={getLinkClass("/leaderboard")}>
                Live
              </Link>

              <Link href="/hall-of-fame" className={getLinkClass("/hall-of-fame")}>
                Legends
              </Link>

              <Link href="/feedback" className={getLinkClass("/feedback")}>
                Input
              </Link>

              <Link href="/how-it-works" className={getLinkClass("/how-it-works")}>
                Vibe
              </Link>
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
}