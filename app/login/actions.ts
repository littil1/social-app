"use server";

import { createClient } from "@/lib/supabase/server";

// =====================================================
// Types
// =====================================================

export type AuthState = {
  error: string | null;
  success: string | null;
};

// =====================================================
// Actions
// =====================================================

export async function loginAction(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const supabase = await createClient();

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return {
      error: "Please enter your email and password.",
      success: null,
    };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      error: "Login failed. Please check your details.",
      success: null,
    };
  }

  return {
    error: null,
    success: "OK",
  };
}

export async function signupAction(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const supabase = await createClient();

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return {
      error: "Please enter your email and password.",
      success: null,
    };
  }

  if (password.length < 6) {
    return {
      error: "Password must be at least 6 characters.",
      success: null,
    };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return {
      error: "Sign up failed. Please check your details.",
      success: null,
    };
  }

  if (data.session) {
    return {
      error: null,
      success: "OK",
    };
  }

  return {
    error: null,
    success:
      "Account created. Please confirm your email, then sign in.",
  };
}
