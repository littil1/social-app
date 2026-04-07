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
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import LoginModal from "@/app/components/auth/LoginModal";
import { createClient } from "@/lib/supabase-browser";

// =====================================================
// Types
// =====================================================

type PendingAuthAction = () => void | Promise<void>;

type AuthProfile = {
  username: string | null;
  avatar_url: string | null;
};

type AuthModalContextValue = {
  isOpen: boolean;
  redirectPath: string;
  isAuthenticated: boolean;
  authReady: boolean;
  user: User | null;
  profile: AuthProfile | null;
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
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);

  const pendingActionRef = useRef<PendingAuthAction | null>(null);
  const resumeInProgressRef = useRef(false);

  const loadProfile = useCallback(
    async (userId: string | null | undefined) => {
      if (!userId) {
        setProfile(null);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.error("Auth profile could not be loaded:", error);
        setProfile(null);
        return;
      }

      setProfile({
        username: data?.username ?? null,
        avatar_url: data?.avatar_url ?? null,
      });
    },
    [supabase]
  );

  useEffect(() => {
    let isMounted = true;

    async function loadInitialSession() {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error("Initial auth session could not be loaded:", error);
      }

      if (!isMounted) return;

      const sessionUser = data.session?.user ?? null;

      setIsAuthenticated(!!data.session);
      setUser(sessionUser);
      setAuthReady(true);

      if (sessionUser?.id) {
        await loadProfile(sessionUser.id);
      } else {
        setProfile(null);
      }
    }

    void loadInitialSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (!isMounted) return;

        const sessionUser = session?.user ?? null;
        const nextIsAuthenticated = !!session;

        setIsAuthenticated(nextIsAuthenticated);
        setUser(sessionUser);
        setAuthReady(true);

        if (sessionUser?.id) {
          await loadProfile(sessionUser.id);
        } else {
          setProfile(null);
        }

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
  }, [router, supabase, loadProfile]);

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

    void supabase.auth
      .getUser()
      .then(async ({ data, error }) => {
        if (error) {
          console.error("Authenticated user could not be loaded:", error);
          return;
        }

        const nextUser = data.user ?? null;
        setUser(nextUser);

        if (nextUser?.id) {
          await loadProfile(nextUser.id);
        } else {
          setProfile(null);
        }
      })
      .catch((error) => {
        console.error("Authenticated user could not be loaded:", error);
      });

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
  }, [router, supabase, loadProfile]);

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
      user,
      profile,
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
      user,
      profile,
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