"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import LoginModal from "@/app/components/auth/LoginModal";

// =====================================================
// Types
// =====================================================

type AuthModalContextValue = {
  isOpen: boolean;
  redirectPath: string;
  openLogin: (redirectPath?: string) => void;
  closeLogin: () => void;
};

// =====================================================
// Context
// =====================================================

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

// =====================================================
// Helper
// =====================================================

function getSafeRedirectPath(value?: string) {
  const redirectPath = String(value ?? "").trim();

  if (!redirectPath.startsWith("/")) return "/";
  if (redirectPath.startsWith("//")) return "/";
  if (redirectPath.startsWith("/login")) return "/";

  return redirectPath || "/";
}

// =====================================================
// Component
// =====================================================

export default function AuthModalProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [redirectPath, setRedirectPath] = useState("/");

  const openLogin = useCallback((nextRedirectPath?: string) => {
    setRedirectPath(getSafeRedirectPath(nextRedirectPath));
    setIsOpen(true);
  }, []);

  const closeLogin = useCallback(() => {
    setIsOpen(false);
  }, []);

  const value = useMemo<AuthModalContextValue>(
    () => ({
      isOpen,
      redirectPath,
      openLogin,
      closeLogin,
    }),
    [isOpen, redirectPath, openLogin, closeLogin]
  );

  return (
    <AuthModalContext.Provider value={value}>
      {children}
      <LoginModal />
    </AuthModalContext.Provider>
  );
}

// =====================================================
// Hook
// =====================================================

export function useAuthModal() {
  const context = useContext(AuthModalContext);

  if (!context) {
    throw new Error("useAuthModal must be used within AuthModalProvider");
  }

  return context;
}