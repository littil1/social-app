"use client";

import { usePathname } from "next/navigation";
import { useAuthModal } from "@/app/components/auth/AuthModalProvider";

// =====================================================
// Component
// =====================================================

export default function LoginCta() {
  const pathname = usePathname();
  const { openLogin } = useAuthModal();

  return (
    <div className="mb-6 rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-500">
            Du bist aktuell nicht eingeloggt
          </p>
          <p className="text-sm text-gray-700">
            Erstelle Beiträge, reagiere und folge anderen Nutzern.
          </p>
        </div>

        <button
          onClick={() => openLogin(pathname || "/")}
          className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          Login / Registrieren
        </button>
      </div>
    </div>
  );
}