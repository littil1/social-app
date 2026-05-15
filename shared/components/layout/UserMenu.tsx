"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { logout } from "@/app/actions/social";
import { resetAnalyticsUser } from "@/shared/lib/analytics";

type UserMenuProps = {
  username: string;
  avatarUrl: string | null;
  isAdmin: boolean;
  adminPendingCount?: number;
};

export default function UserMenu({
  username,
  avatarUrl,
  isAdmin,
  adminPendingCount = 0,
}: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div className="relative flex items-center gap-2" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent("open-create-post"))}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg transition hover:bg-emerald-600 active:scale-90 sm:h-12 sm:w-12"
      >
        <span className="text-xl font-bold">＋</span>
      </button>

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 transition-all sm:h-12 sm:w-12 ${
          open
            ? "border-white bg-white shadow-xl"
            : "border-white/10 bg-neutral-800 hover:border-white/40"
        }`}
      >
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt="Your avatar"
            width={48}
            height={48}
            sizes="(min-width: 640px) 48px, 40px"
            unoptimized
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="font-black text-white">
            {username.charAt(0).toUpperCase()}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute bottom-full right-0 z-50 mb-2 w-40 overflow-hidden rounded-[20px] border border-neutral-200 bg-white p-1.5 shadow-[0_16px_38px_rgba(0,0,0,0.14)] backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2">
          <div className="mb-1 border-b border-neutral-100 px-3.5 py-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
              Signed in as
            </p>
            <p className="truncate text-sm font-bold text-neutral-950">
              @{username}
            </p>
          </div>

          <Link
            href={`/u/${username}`}
            className="block rounded-lg px-3.5 py-2 text-sm font-semibold text-neutral-500 transition hover:bg-neutral-50 hover:text-neutral-800"
            onClick={() => setOpen(false)}
          >
            Profile
          </Link>

          <Link
            href="/settings/profile"
            className="block rounded-lg px-3.5 py-2 text-sm font-semibold text-neutral-500 transition hover:bg-neutral-50 hover:text-neutral-800"
            onClick={() => setOpen(false)}
          >
            Settings
          </Link>

          {isAdmin && (
            <Link
              href="/admin"
              className="block rounded-lg px-3.5 py-2 text-sm font-bold text-emerald-600 transition hover:bg-emerald-50"
              onClick={() => setOpen(false)}
            >
              {adminPendingCount > 0
                ? `Admin Panel (${adminPendingCount})`
                : "Admin Panel"}
            </Link>
          )}

          <div className="my-1 border-t border-neutral-100" />

          <form action={logout} onSubmit={() => resetAnalyticsUser()}>
            <button
              type="submit"
              className="block w-full rounded-lg px-3.5 py-2 text-left text-sm font-bold text-red-500 transition hover:bg-red-50"
            >
              Logout
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
