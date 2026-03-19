"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, signupAction, type AuthState } from "./actions";

const initialState: AuthState = {
  error: null,
  success: null,
};

export default function LoginPage() {
  const [loginState, loginFormAction, loginPending] = useActionState(
    loginAction,
    initialState
  );

  const [signupState, signupFormAction, signupPending] = useActionState(
    signupAction,
    initialState
  );

  return (
    <main className="mx-auto max-w-md p-6">
      <Link
        href="/"
        className="mb-4 inline-block text-sm text-gray-500 hover:underline"
      >
        ← Back
      </Link>

      <h1 className="mb-6 text-3xl font-bold">Login / Signup</h1>

      <div className="space-y-6">
        <div className="rounded-xl bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold">Login</h2>

          <form action={loginFormAction} className="space-y-4">
            <div>
              <label
                htmlFor="login-email"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Email
              </label>
              <input
                id="login-email"
                name="email"
                type="email"
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <input
                id="login-password"
                name="password"
                type="password"
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none"
              />
            </div>

            {loginState.error && (
              <p className="text-sm text-red-600">{loginState.error}</p>
            )}

            <button
              type="submit"
              disabled={loginPending}
              className="rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50"
            >
              {loginPending ? "Logging in..." : "Login"}
            </button>
          </form>
        </div>

        <div className="rounded-xl bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold">Create account</h2>

          <form action={signupFormAction} className="space-y-4">
            <div>
              <label
                htmlFor="signup-email"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Email
              </label>
              <input
                id="signup-email"
                name="email"
                type="email"
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="signup-password"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <input
                id="signup-password"
                name="password"
                type="password"
                required
                minLength={6}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none"
              />
            </div>

            {signupState.error && (
              <p className="text-sm text-red-600">{signupState.error}</p>
            )}

            {signupState.success && (
              <p className="text-sm text-green-600">{signupState.success}</p>
            )}

            <button
              type="submit"
              disabled={signupPending}
              className="rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50"
            >
              {signupPending ? "Creating account..." : "Sign up"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}