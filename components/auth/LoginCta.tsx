"use client";

import { usePathname } from "next/navigation";
import { useAuthModal } from "@/components/auth/AuthModalProvider";

// =====================================================
// Component
// =====================================================

export default function LoginCta() {
  const pathname = usePathname();
  const { openLogin } = useAuthModal();

  return (
    <div className="relative mb-8 overflow-hidden rounded-[28px] border border-neutral-200 bg-white p-6 shadow-[0_15px_40px_-15px_rgba(0,0,0,0.05)] sm:p-8">
      {/* Subtle Background Decor */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-4 -top-4 h-24 w-24 rounded-full bg-amber-50/50 blur-2xl" />
        <div className="absolute -right-4 -bottom-4 h-24 w-24 rounded-full bg-indigo-50/50 blur-2xl" />
      </div>

      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-xl">
          <div className="mb-2 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-neutral-300" />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">
              Spectator Mode
            </p>
          </div>
          <h3 className="text-xl font-black tracking-tight text-neutral-950 sm:text-2xl">
            Ready to join the race?
          </h3>
          <p className="mt-1 text-sm font-medium leading-relaxed text-neutral-500">
            Log in to post your thoughts, react to others, and become a Legend.
          </p>
        </div>

        <button
          onClick={() => openLogin(pathname || "/")}
          className="relative flex items-center justify-center overflow-hidden rounded-2xl bg-neutral-950 px-8 py-3.5 text-sm font-bold text-white transition-all hover:scale-[1.03] active:scale-[0.98] shadow-lg shadow-neutral-200"
        >
          Sign In / Register
        </button>
      </div>
    </div>
  );
}
