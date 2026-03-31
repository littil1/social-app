"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthModal } from "@/app/components/auth/AuthModalProvider";

// =====================================================
// Component
// =====================================================

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { openLogin } = useAuthModal();

  useEffect(() => {
    const redirect = searchParams.get("redirect") ?? "/";

    openLogin(redirect);
    router.replace(redirect);
  }, [openLogin, router, searchParams]);

  return null;
}