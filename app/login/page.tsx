"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthModal } from "@/features/auth/components/AuthModalProvider";

// =====================================================
// Inner Component (mit useSearchParams)
// =====================================================

function LoginPageInner() {
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

// =====================================================
// Page Wrapper (mit Suspense)
// =====================================================

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}

