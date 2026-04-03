"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import LoginModal from "@/app/components/auth/LoginModal";
import { createClient } from "@/lib/supabase-browser";

// =====================================================
// Types
// =====================================================

type PendingAuthAction = () => void | Promise<void>;

type AuthModalContextValue = {
  isOpen: boolean;
  redirectPath: string;
  isAuthenticated: boolean;
  authReady: boolean;
  openLogin: (redirectPath?: string) => void;
  closeLogin: () => void;
  requireLoginAndResume: (
    action: PendingAuthAction,
    redirectPath?: string
  ) => void;
  handleAuthSuccess: () => void;
};

// =====================================================
// Context
// =====================================================

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

// =====================================================
// Helpers
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
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [isOpen, setIsOpen] = useState(false);
  const [redirectPath, setRedirectPath] = useState("/");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  const pendingActionRef = useRef<PendingAuthAction | null>(null);
  const resumeInProgressRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialSession() {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error("Initial auth session could not be loaded:", error);
      }

      if (!isMounted) return;

      setIsAuthenticated(!!data.session);
      setAuthReady(true);
    }

    void loadInitialSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        if (!isMounted) return;

        const nextIsAuthenticated = !!session;

        setIsAuthenticated(nextIsAuthenticated);
        setAuthReady(true);

        if (event === "SIGNED_OUT") {
          pendingActionRef.current = null;
          resumeInProgressRef.current = false;
          setIsOpen(false);
          router.refresh();
          return;
        }

        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          router.refresh();
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [router, supabase]);

  const openLogin = useCallback((nextRedirectPath?: string) => {
    setRedirectPath(getSafeRedirectPath(nextRedirectPath));
    setIsOpen(true);
  }, []);

  const closeLogin = useCallback(() => {
    pendingActionRef.current = null;
    resumeInProgressRef.current = false;
    setIsOpen(false);
  }, []);

  const requireLoginAndResume = useCallback(
    (action: PendingAuthAction, nextRedirectPath?: string) => {
      pendingActionRef.current = action;
      resumeInProgressRef.current = false;
      setRedirectPath(getSafeRedirectPath(nextRedirectPath));
      setIsOpen(true);
    },
    []
  );

  const handleAuthSuccess = useCallback(() => {
    if (resumeInProgressRef.current) return;

    const pendingAction = pendingActionRef.current;

    resumeInProgressRef.current = true;
    pendingActionRef.current = null;

    setIsAuthenticated(true);
    setAuthReady(true);
    setIsOpen(false);
    router.refresh();

    if (!pendingAction) {
      resumeInProgressRef.current = false;
      return;
    }

    window.setTimeout(() => {
      void Promise.resolve(pendingAction())
        .catch((error) => {
          console.error("Pending auth action failed:", error);
        })
        .finally(() => {
          resumeInProgressRef.current = false;
        });
    }, 0);
  }, [router]);

  useEffect(() => {
    function handleOpenLoginModal(event: Event) {
      const customEvent = event as CustomEvent<{ redirectPath?: string }>;
      openLogin(customEvent.detail?.redirectPath);
    }

    window.addEventListener("open-login-modal", handleOpenLoginModal);

    return () => {
      window.removeEventListener("open-login-modal", handleOpenLoginModal);
    };
  }, [openLogin]);

  const value = useMemo<AuthModalContextValue>(
    () => ({
      isOpen,
      redirectPath,
      isAuthenticated,
      authReady,
      openLogin,
      closeLogin,
      requireLoginAndResume,
      handleAuthSuccess,
    }),
    [
      isOpen,
      redirectPath,
      isAuthenticated,
      authReady,
      openLogin,
      closeLogin,
      requireLoginAndResume,
      handleAuthSuccess,
    ]
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