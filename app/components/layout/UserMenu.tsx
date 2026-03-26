"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { logout } from "@/app/actions/social";

type UserMenuProps = {
  username: string;
  avatarUrl: string | null;
  isAdmin: boolean;
};

export default function UserMenu({
  username,
  avatarUrl,
  isAdmin,
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
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-3 rounded-lg px-2 py-1 hover:bg-gray-50"
      >
        <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-sm font-semibold text-gray-600">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt="Your avatar"
              className="h-full w-full object-cover"
            />
          ) : (
            username.charAt(0).toUpperCase()
          )}
        </div>

        <div className="hidden text-left text-sm text-gray-600 sm:block">
          <div>@{username}</div>
          {isAdmin && <div className="text-xs text-red-600">Admin</div>}
        </div>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-52 rounded-xl border border-gray-200 bg-white py-2 shadow-lg">
          <Link
            href={`/u/${username}`}
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            onClick={() => setOpen(false)}
          >
            Mein Profil
          </Link>

          <Link
            href="/settings/profile"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            onClick={() => setOpen(false)}
          >
            Einstellungen
          </Link>

          <div className="my-1 border-t border-gray-100" />

          <form action={logout}>
            <button
              type="submit"
              className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
            >
              Logout
            </button>
          </form>
        </div>
      )}
    </div>
  );
}