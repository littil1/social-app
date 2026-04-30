"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import UserMenu from "@/shared/components/layout/UserMenu";
import { useAuthModal } from "@/features/auth/components/AuthModalProvider";
import { createClient } from "@/lib/supabase/browser";

type NavBarUser = {
  username: string;
  avatar_url: string | null;
  is_admin: boolean;
};

type NavBarProps = {
  user?: NavBarUser | null;
};

export default function NavBar({ user: initialUser = null }: NavBarProps) {
  const pathname = usePathname();
  const { openLogin } = useAuthModal();
  const [user, setUser] = useState<NavBarUser | null>(initialUser);

  useEffect(() => {
    setUser(initialUser);
  }, [initialUser]);

  useEffect(() => {
    const supabase = createClient();
    let isActive = true;

    async function loadNavbarUser() {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!isActive) return;

      if (!authUser) {
        setUser(null);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("username, avatar_url, is_admin")
        .eq("id", authUser.id)
        .maybeSingle();

      if (!isActive) return;

      if (!profile?.username) {
        setUser(null);
        return;
      }

      setUser({
        username: profile.username,
        avatar_url: profile.avatar_url ?? null,
        is_admin: !!profile.is_admin,
      });
    }

    void loadNavbarUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void loadNavbarUser();
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, []);

  const navItems = [
    { name: "Live", href: "/leaderboard", icon: "🔥" },
    { name: "Legends", href: "/hall-of-fame", icon: "👑" },
    { name: "Input", href: "/feedback", icon: "💡" },
    { name: "Vibe", href: "/vibe", icon: "✨" },
  ];

  function getLinkClass(path: string) {
    const isActive = pathname === path;

    return [
      "relative flex h-10 flex-1 items-center justify-center overflow-hidden rounded-full text-[10px] font-black uppercase tracking-[0.12em] transition-all duration-300 sm:h-10 sm:w-24 sm:flex-none sm:text-[11px] sm:tracking-[0.14em]",
      isActive
        ? "bg-white text-neutral-950 shadow-[0_10px_28px_-18px_rgba(255,255,255,0.75)]"
        : "text-neutral-400 hover:bg-white/10 hover:text-white",
    ].join(" ");
  }

  return (
    <nav className="animate-in fade-in slide-in-from-bottom-4 fixed bottom-5 left-1/2 z-[60] w-full max-w-[calc(100vw-1.25rem)] -translate-x-1/2 px-2 transition-all duration-500 sm:bottom-7 sm:max-w-fit sm:px-4">
      <div className="flex min-h-16 w-full items-center gap-1 rounded-full border border-white/10 bg-neutral-950/80 p-1.5 shadow-[0_18px_42px_-28px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl sm:h-14 sm:min-h-0 sm:w-auto sm:gap-1.5">
        <div className="flex min-w-0 flex-1 items-center justify-between sm:flex-none sm:gap-1.5">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={getLinkClass(item.href)}
            >
              <div className="flex min-w-0 flex-col items-center justify-center gap-1 sm:flex-row sm:gap-1.5">
                <span className="shrink-0 text-sm leading-none sm:text-base">
                  {item.icon}
                </span>
                <span
                  className={`pointer-events-none min-h-[0.75rem] max-w-full truncate whitespace-nowrap text-[8px] font-black uppercase leading-none tracking-[0.12em] transition-opacity duration-200 sm:min-h-0 sm:text-[10px] sm:tracking-[0.15em] ${
                    pathname === item.href
                      ? "visible opacity-100"
                      : "invisible opacity-0 sm:visible sm:opacity-100"
                  }`}
                >
                  {item.name}
                </span>
              </div>
            </Link>
          ))}
        </div>

        <div className="mx-1 h-5 w-px bg-white/10 sm:mx-1.5" />

        <div className="shrink-0 pr-0.5">
          {user ? (
            <div className="scale-[0.86] sm:scale-95">
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
              className="rounded-full bg-emerald-500 px-3.5 py-2.5 text-[10px] font-black uppercase tracking-widest text-white shadow-[0_12px_26px_-18px_rgba(16,185,129,0.9)] transition hover:bg-emerald-400 active:scale-95 sm:px-5 sm:py-2"
            >
              Join
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

