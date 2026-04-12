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

  const navItems = [
    { name: "Live", href: "/leaderboard", icon: "🔥" },
    { name: "Legends", href: "/hall-of-fame", icon: "🏆" },
    { name: "Input", href: "/feedback", icon: "💡" },
    { name: "Vibe", href: "/how-it-works", icon: "✨" },
  ];

  function getLinkClass(path: string) {
    const isActive = pathname === path;
    return [
      "relative flex items-center gap-2 rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300 sm:px-6 sm:text-xs",
      isActive
        ? "bg-white text-neutral-950 shadow-lg"
        : "text-neutral-400 hover:text-white hover:bg-white/5",
    ].join(" ");
  }

  return (
    <nav className="fixed bottom-6 left-1/2 z-50 w-full max-w-fit -translate-x-1/2 px-4">
      <div className="flex h-16 items-center gap-1 rounded-full border border-white/10 bg-neutral-950/90 p-2 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.3)] backdrop-blur-xl sm:gap-2">
        
        {/* Navigation Items */}
        <div className="flex items-center gap-1 sm:gap-2">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className={getLinkClass(item.href)}>
              <span className="text-sm sm:text-base">{item.icon}</span>
              <span className={pathname === item.href ? "block" : "hidden md:block"}>
                {item.name}
              </span>
            </Link>
          ))}
        </div>

        {/* Vertical Divider */}
        <div className="mx-1 h-6 w-[1px] bg-white/10 sm:mx-2" />

        {/* Action Area: User Menu or Login */}
        <div className="shrink-0 pr-1">
          {user ? (
            <div className="scale-90 sm:scale-100">
              <UserMenu
                username={user.username}
                avatarUrl={user.avatar_url}
                isAdmin={user.is_admin}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => openLogin(pathname || "/leaderboard")}
              className="rounded-full bg-emerald-500 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-emerald-400 active:scale-95 sm:px-6"
            >
              Join
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}