"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";

export type AuthState = {
  error: string | null;
  success: string | null;
};

export async function loginAction(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const supabase = await createClient();

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return {
      error: "Please enter email and password.",
      success: null,
    };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      error: error.message,
      success: null,
    };
  }

  redirect("/");
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
      error: "Please enter email and password.",
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
      error: error.message,
      success: null,
    };
  }

  // Wenn Email-Confirmation in Supabase AUS ist, gibt es direkt eine Session
  if (data.session) {
    redirect("/");
  }

  // Wenn Email-Confirmation AN ist
  return {
    error: null,
    success: "Account created. Please check your email to confirm your account, then log in.",
  };
}