"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import UserMenu from "@/components/layout/UserMenu";
import { useAuthModal } from "@/components/auth/AuthModalProvider";
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
    { name: "Legends", href: "/hall-of-fame", icon: "🏆" },
    { name: "Input", href: "/feedback", icon: "💡" },
    { name: "Vibe", href: "/vibe", icon: "✨" },
  ];

  function getLinkClass(path: string) {
    const isActive = pathname === path;

    return [
      "relative flex items-center gap-2 rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300 sm:px-6 sm:text-xs",
      isActive
        ? "bg-white text-neutral-950 shadow-lg"
        : "text-neutral-400 hover:bg-white/5 hover:text-white",
    ].join(" ");
  }

  return (
    <nav className="animate-in fade-in slide-in-from-bottom-4 fixed bottom-6 left-1/2 z-[60] w-full max-w-fit -translate-x-1/2 px-4 transition-all duration-500">
      <div className="flex h-16 items-center gap-1 rounded-full border border-white/10 bg-neutral-950/90 p-2 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.3)] backdrop-blur-xl sm:gap-2">
        <div className="flex items-center gap-1 sm:gap-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={getLinkClass(item.href)}
            >
              <span className="text-sm sm:text-base">{item.icon}</span>
              <span className={pathname === item.href ? "block" : "hidden md:block"}>
                {item.name}
              </span>
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
