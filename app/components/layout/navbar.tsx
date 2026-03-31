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
// Component
// =====================================================

export default function NavBar({ user = null }: NavBarProps) {
  const pathname = usePathname();
  const { openLogin } = useAuthModal();

  function getLinkClass(path: string) {
    const isActive =
      path === "/" ? pathname === "/" : pathname.startsWith(path);

    return `relative px-1 py-0.5 ${
      isActive
        ? "border-b-2 border-black font-semibold text-black"
        : "text-gray-600 hover:text-black"
    }`;
  }

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-bold">
            APP
          </Link>

          <nav className="flex items-center gap-4 text-sm">
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
              Verbesserungswünsche
            </Link>

            <Link href="/how-it-works" className={getLinkClass("/how-it-works")}>
              So funktioniert APP
            </Link>
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
            <button
              type="button"
              onClick={() => openLogin(pathname || "/")}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 transition hover:bg-gray-50"
            >
              Login
            </button>
          )}
        </div>
      </div>
    </header>
  );
}