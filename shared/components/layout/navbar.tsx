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
  moderation_count?: number;
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

      if (profile.is_admin) {
        const response = await fetch("/api/admin/moderation/count", {
          cache: "no-store",
        }).catch(() => null);

        if (!isActive || !response?.ok) {
          return;
        }

        const payload = (await response.json().catch(() => null)) as {
          count?: number;
        } | null;

        setUser((current) =>
          current
            ? {
                ...current,
                moderation_count:
                  typeof payload?.count === "number" ? payload.count : 0,
              }
            : current
        );
      }
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
    { name: "LIVE", href: "/live", icon: "🔥" },
    { name: "LEGENDS", href: "/legends", icon: "👑" },
    { name: "INPUT", href: "/input", icon: "💡" },
    { name: "VIBE", href: "/vibe", icon: "✨" },
  ];

  function isNavItemActive(path: string) {
    return pathname === path || pathname.startsWith(`${path}/`);
  }

  function getLinkClass(path: string) {
    const isActive = isNavItemActive(path);

    return [
      "relative flex h-12 flex-1 items-center justify-center overflow-hidden rounded-full text-[10px] font-black uppercase tracking-[0.12em] transition-all duration-300 sm:h-10 sm:w-24 sm:flex-none sm:text-[11px] sm:tracking-[0.14em]",
      isActive
        ? "bg-white text-neutral-950 shadow-[0_10px_28px_-18px_rgba(255,255,255,0.75)]"
        : "text-neutral-400 hover:bg-white/10 hover:text-white",
    ].join(" ");
  }

  function getLinkContentClass(path: string) {
    const isActive = isNavItemActive(path);

    return [
      "flex min-w-0 items-center justify-center sm:flex-row sm:gap-1.5",
      isActive ? "flex-col gap-1" : "gap-0",
    ].join(" ");
  }

  return (
    <nav className="animate-in fade-in slide-in-from-bottom-4 fixed bottom-5 left-1/2 z-[60] w-full max-w-[calc(100vw-1.25rem)] -translate-x-1/2 px-2 transition-all duration-500 sm:bottom-7 sm:max-w-fit sm:px-4">
      <div className="flex min-h-[4.5rem] w-full items-center gap-1 rounded-full border border-white/10 bg-neutral-950/80 p-2 shadow-[0_18px_42px_-28px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl sm:h-14 sm:min-h-0 sm:w-auto sm:gap-1.5 sm:p-1.5">
        <div className="flex min-w-0 flex-1 items-center justify-between sm:flex-none sm:gap-1.5">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={getLinkClass(item.href)}
            >
              <div className={getLinkContentClass(item.href)}>
                <span className="grid h-5 w-5 shrink-0 place-items-center text-sm leading-none sm:h-auto sm:w-auto sm:text-base">
                  {item.icon}
                </span>
                <span
                  className={`pointer-events-none max-w-full truncate whitespace-nowrap text-[8px] font-black uppercase leading-none tracking-[0.12em] transition-opacity duration-200 sm:text-[10px] sm:tracking-[0.15em] ${
                    isNavItemActive(item.href)
                      ? "block opacity-100"
                      : "hidden opacity-0 sm:block sm:opacity-100"
                  }`}
                >
                  {item.name}
                </span>
              </div>
            </Link>
          ))}
        </div>

        <div className="mx-1 h-5 w-px bg-white/10 sm:mx-1.5" />

        <div className="flex shrink-0 items-center pr-0.5">
          {user ? (
            <div className="flex origin-center scale-90 items-center sm:scale-95">
              <UserMenu
                username={user.username}
                avatarUrl={user.avatar_url}
                isAdmin={user.is_admin}
                moderationCount={user.moderation_count ?? 0}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => openLogin(pathname || "/live")}
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

