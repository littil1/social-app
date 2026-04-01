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
  return path === "/" ? pathname === "/" : pathname.startsWith(path);
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
      "inline-flex items-center rounded-full px-3 py-2 text-sm transition",
      isActive
        ? "bg-black text-white font-semibold"
        : "text-gray-600 hover:bg-gray-100 hover:text-black",
    ].join(" ");
  }

  return (
    <header className="border-b bg-white">
      <div className="mx-auto max-w-5xl px-4 py-3 sm:px-6 sm:py-4">
        {/* =====================================================
            Top row
        ===================================================== */}
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="shrink-0 text-lg font-bold text-black">
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
                onClick={() => openLogin(pathname || "/")}
                className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Login
              </button>
            )}
          </div>
        </div>

        {/* =====================================================
            Navigation
        ===================================================== */}
        <nav className="mt-3">
          <div className="flex flex-wrap gap-2">
            <Link href="/" className={getLinkClass("/")}>
              Home
            </Link>

            <Link href="/leaderboard" className={getLinkClass("/leaderboard")}>
              Leaderboard
            </Link>

            <Link href="/hall-of-fame" className={getLinkClass("/hall-of-fame")}>
              Hall of Fame
            </Link>

            <Link href="/feedback" className={getLinkClass("/feedback")}>
              Wünsche
            </Link>

            <Link href="/how-it-works" className={getLinkClass("/how-it-works")}>
              So funktioniert APP
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}