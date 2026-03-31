"use server";

import { createClient } from "@/lib/supabase-server";

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
      error: "Bitte E-Mail und Passwort eingeben.",
      success: null,
    };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      error: "Anmeldung fehlgeschlagen. Bitte Eingaben prüfen.",
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
      error: "Bitte E-Mail und Passwort eingeben.",
      success: null,
    };
  }

  if (password.length < 6) {
    return {
      error: "Das Passwort muss mindestens 6 Zeichen lang sein.",
      success: null,
    };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return {
      error: "Registrierung fehlgeschlagen. Bitte Eingaben prüfen.",
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
      "Account erstellt. Bitte bestätige deine E-Mail und melde dich danach an.",
  };
}