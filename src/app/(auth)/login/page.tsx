"use client";

import { useState, useEffect, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getAuthErrorMessage } from "@/lib/auth-errors";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const msg = searchParams.get("error");
    const success = searchParams.get("message");
    if (msg) setError(decodeURIComponent(msg));
    if (success) setError(null); // clear error so we can show success
  }, [searchParams]);

  const successMessage = searchParams.get("message");
  const emailConfirmed = searchParams.get("email_confirmed") === "1";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) {
      setError(getAuthErrorMessage(err));
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  async function handleGoogleSignIn() {
    setError(null);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${origin}/auth/callback` },
    });
    if (err) {
      setError(getAuthErrorMessage(err));
      return;
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-surface-variant">
      <div className="card w-full max-w-[400px] p-8">
        <h1 className="text-2xl font-medium text-[var(--color-card-text)] text-center mb-1">
          Sign in
        </h1>
        <p className="text-center text-sm text-[var(--color-on-surface-variant)] mb-6">
          Use your email and password to continue
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {successMessage && (
            <div
              className="text-sm p-3 rounded-lg border border-[var(--color-outline)] bg-[var(--color-badge-success-bg)] text-[var(--color-badge-success-text)] space-y-2"
              role="status"
            >
              <p>{decodeURIComponent(successMessage)}</p>
              {emailConfirmed && (
                <p>
                  <Link href="/forgot-password" className="font-medium underline underline-offset-2 hover:opacity-90">
                    Set or reset your password
                  </Link>
                </p>
              )}
            </div>
          )}
          {error && (
            <div
              className="text-sm p-3 rounded-lg border border-[var(--color-error)] bg-[var(--color-error-bg)] text-[var(--color-error)]"
              role="alert"
            >
              {error}
            </div>
          )}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[var(--color-card-text)] mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full border border-[var(--color-outline)] rounded-lg px-3 py-2.5 text-[var(--color-card-text)] bg-[var(--color-input-bg)] placeholder:text-[var(--color-on-surface-variant)]"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-[var(--color-card-text)]">
                Password
              </label>
              <Link href="/forgot-password" className="text-xs text-[var(--color-primary)] hover:underline">
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full border border-[var(--color-outline)] rounded-lg px-3 py-2.5 text-[var(--color-card-text)] bg-[var(--color-input-bg)] placeholder:text-[var(--color-on-surface-variant)]"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-md w-full"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
          <div className="relative my-4">
            <span className="block text-center text-xs text-[var(--color-on-surface-variant)] before:absolute before:inset-0 before:top-1/2 before:border-t before:border-[var(--color-outline)]">
              <span className="relative bg-[var(--color-card-bg)] px-2">or</span>
            </span>
          </div>
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-[var(--color-outline)] bg-[var(--color-surface)] text-[var(--color-card-text)] hover:bg-[var(--color-surface-variant)] transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
          </button>
        </form>
        <p className="text-center text-sm text-[var(--color-on-surface-variant)] mt-6">
          No account?{" "}
          <Link href="/signup" className="text-primary font-medium hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center p-6 bg-surface-variant">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
