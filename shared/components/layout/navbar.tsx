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
      "relative flex h-12 flex-1 items-center justify-center overflow-hidden rounded-full text-[10px] font-black uppercase tracking-[0.12em] transition-all duration-300 sm:h-11 sm:w-28 sm:flex-none sm:text-xs sm:tracking-[0.15em]",
      isActive
        ? "bg-white text-neutral-950 shadow-lg"
        : "text-neutral-400 hover:bg-white/5 hover:text-white",
    ].join(" ");
  }

  return (
    <nav className="animate-in fade-in slide-in-from-bottom-4 fixed bottom-4 left-1/2 z-[60] w-full max-w-[calc(100vw-1rem)] -translate-x-1/2 px-2 transition-all duration-500 sm:bottom-6 sm:max-w-fit sm:px-4">
      <div className="flex min-h-[4.5rem] w-full items-center gap-1 rounded-full border border-white/10 bg-neutral-950/90 p-2 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.3)] backdrop-blur-xl sm:h-16 sm:min-h-0 sm:w-auto sm:gap-2">
        <div className="flex min-w-0 flex-1 items-center justify-between sm:flex-none sm:gap-2">
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

        <div className="mx-1 h-6 w-[1px] bg-white/10 sm:mx-2" />

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
              className="rounded-full bg-emerald-500 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-emerald-400 active:scale-95 sm:px-6 sm:py-2"
            >
              Join
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

