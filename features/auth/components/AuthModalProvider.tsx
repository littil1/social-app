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
import LoginModal from "@/features/auth/components/LoginModal";
import { createClient } from "@/lib/supabase/browser";
import {
  identifyAnalyticsUser,
  resetAnalyticsUser,
  trackEvent,
} from "@/shared/lib/analytics";

// =====================================================
// Types
// =====================================================

type PendingAuthAction = () => void | Promise<void>;
type LoginModalSource =
  | "create_post"
  | "comment"
  | "reaction"
  | "boost"
  | "report"
  | "input"
  | "manual"
  | "unknown";

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
  loginSource: LoginModalSource;
  openLogin: (redirectPath?: string, source?: LoginModalSource) => void;
  closeLogin: () => void;
  requireLoginAndResume: (
    action: PendingAuthAction,
    redirectPath?: string,
    source?: LoginModalSource
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
  const pendingLoginSourceRef = useRef<LoginModalSource | null>(null);
  const loginCompletedTrackedUserRef = useRef<string | null>(null);
  const [loginSource, setLoginSource] = useState<LoginModalSource>("manual");

  const trackLoginCompleted = useCallback((userId: string, source?: LoginModalSource | null) => {
    if (loginCompletedTrackedUserRef.current === userId) return;

    loginCompletedTrackedUserRef.current = userId;
    trackEvent("login_completed", {
      source: source ?? "unknown",
    });
  }, []);

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
        identifyAnalyticsUser(sessionUser.id);
        if (window.sessionStorage.getItem("app_signup_confirmation_pending")) {
          window.sessionStorage.removeItem("app_signup_confirmation_pending");
          trackLoginCompleted(sessionUser.id, "unknown");
        }
        await loadProfile(sessionUser.id);
      } else {
        resetAnalyticsUser();
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
          pendingLoginSourceRef.current = null;
          loginCompletedTrackedUserRef.current = null;
          setLoginSource("manual");
          resetAnalyticsUser();
          setIsOpen(false);
          router.refresh();
          return;
        }

        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          identifyAnalyticsUser(sessionUser?.id);
          if (event === "SIGNED_IN" && sessionUser?.id) {
            window.sessionStorage.removeItem("app_signup_confirmation_pending");
            trackLoginCompleted(sessionUser.id, pendingLoginSourceRef.current);
          }
          if (!pendingActionRef.current && !resumeInProgressRef.current) {
            router.refresh();
          }
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [router, supabase, loadProfile, trackLoginCompleted]);

  const openLogin = useCallback((nextRedirectPath?: string, source: LoginModalSource = "manual") => {
    setRedirectPath(getSafeRedirectPath(nextRedirectPath));
    pendingLoginSourceRef.current = source;
    setLoginSource(source);
    trackEvent("login_modal_opened", { source });
    setIsOpen(true);
  }, []);

  const closeLogin = useCallback(() => {
    pendingActionRef.current = null;
    resumeInProgressRef.current = false;
    pendingLoginSourceRef.current = null;
    setLoginSource("manual");
    setIsOpen(false);
  }, []);

  const requireLoginAndResume = useCallback(
    (
      action: PendingAuthAction,
      nextRedirectPath?: string,
      source: LoginModalSource = "unknown"
    ) => {
      pendingActionRef.current = action;
      resumeInProgressRef.current = false;
      pendingLoginSourceRef.current = source;
      setLoginSource(source);
      setRedirectPath(getSafeRedirectPath(nextRedirectPath));
      trackEvent("login_modal_opened", { source });
      setIsOpen(true);
    },
    []
  );

  const handleAuthSuccess = useCallback(() => {
    if (resumeInProgressRef.current) return;

    const pendingAction = pendingActionRef.current;
    const pendingLoginSource = pendingLoginSourceRef.current;

    resumeInProgressRef.current = true;
    pendingActionRef.current = null;
    pendingLoginSourceRef.current = null;

    setIsOpen(false);

    void supabase.auth
      .getUser()
      .then(async ({ data, error }) => {
        if (error) {
          console.error("Authenticated user could not be loaded:", error);
          resumeInProgressRef.current = false;
          return;
        }

        const nextUser = data.user ?? null;

        if (!nextUser) {
          resumeInProgressRef.current = false;
          return;
        }

        setIsAuthenticated(true);
        setAuthReady(true);
        setUser(nextUser);
        identifyAnalyticsUser(nextUser.id);
        trackLoginCompleted(nextUser.id, pendingLoginSource);
        await loadProfile(nextUser.id);

        if (!pendingAction) {
          resumeInProgressRef.current = false;
          router.refresh();
          return;
        }

        if (pendingLoginSource && pendingLoginSource !== "manual") {
          trackEvent("login_completed_after_gated_action", {
            source: pendingLoginSource,
          });
        }

        window.setTimeout(() => {
          void Promise.resolve(pendingAction())
            .catch((actionError) => {
              console.error("Pending auth action failed:", actionError);
            })
            .finally(() => {
              resumeInProgressRef.current = false;
              router.refresh();
            });
        }, 150);
      })
      .catch((error) => {
        console.error("Authenticated user could not be loaded:", error);
        resumeInProgressRef.current = false;
      });
  }, [router, supabase, loadProfile, trackLoginCompleted]);

  useEffect(() => {
    function handleOpenLoginModal(event: Event) {
      const customEvent = event as CustomEvent<{
        redirectPath?: string;
        source?: LoginModalSource;
      }>;
      openLogin(customEvent.detail?.redirectPath, customEvent.detail?.source);
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
      loginSource,
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
      loginSource,
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

