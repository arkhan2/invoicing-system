"use client";

import { useState, useEffect, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("code");
    const hash = typeof window !== "undefined" ? window.location.hash?.slice(1) : "";
    const hashParams = hash ? new URLSearchParams(hash) : null;
    const access_token = hashParams?.get("access_token");
    const refresh_token = hashParams?.get("refresh_token");

    if (code) {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      window.location.replace(
        `${origin}/auth/callback?code=${encodeURIComponent(code)}&next=${encodeURIComponent(`${origin}/auth/reset-password`)}`
      );
      return;
    }

    if (access_token && refresh_token) {
      fetch("/api/auth/set-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token, refresh_token }),
        credentials: "same-origin",
      })
        .then(() => setReady(true))
        .catch(() => setError("Could not continue. Please use the latest link from your email."));
      return;
    }

    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setReady(!!user);
      if (!user) setError("Invalid or expired link. Please request a new password reset.");
    });
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.push("/login?message=Password+updated.+Sign+in+with+your+new+password.");
    router.refresh();
  }

  if (!ready && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-surface-variant">
        <div className="card w-full max-w-[400px] p-8 text-center">
          <p className="text-[var(--color-card-text)]">Loading…</p>
        </div>
      </div>
    );
  }

  if (error && !ready) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-surface-variant">
        <div className="card w-full max-w-[400px] p-8 text-center">
          <p className="text-[var(--color-card-text)] mb-4">{error}</p>
          <Link href="/forgot-password" className="btn btn-primary btn-md inline-block">
            Request new link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-surface-variant">
      <div className="card w-full max-w-[400px] p-8">
        <h1 className="text-2xl font-medium text-[var(--color-card-text)] text-center mb-1">
          Set new password
        </h1>
        <p className="text-center text-sm text-[var(--color-on-surface-variant)] mb-6">
          Enter your new password below.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div
              className="text-sm p-3 rounded-lg border border-[var(--color-error)] bg-[var(--color-error-bg)] text-[var(--color-error)]"
              role="alert"
            >
              {error}
            </div>
          )}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[var(--color-card-text)] mb-1.5">
              New password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full border border-[var(--color-outline)] rounded-lg px-3 py-2.5 text-[var(--color-card-text)] bg-[var(--color-input-bg)] placeholder:text-[var(--color-on-surface-variant)]"
              placeholder="At least 6 characters"
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-[var(--color-card-text)] mb-1.5">
              Confirm new password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full border border-[var(--color-outline)] rounded-lg px-3 py-2.5 text-[var(--color-card-text)] bg-[var(--color-input-bg)] placeholder:text-[var(--color-on-surface-variant)]"
              placeholder="Repeat password"
            />
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary btn-md w-full">
            {loading ? "Updating…" : "Update password"}
          </button>
        </form>
        <p className="text-center text-sm text-[var(--color-on-surface-variant)] mt-6">
          <Link href="/login" className="text-primary font-medium hover:underline">
            Back to Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-6 bg-surface-variant">
          <div className="card w-full max-w-[400px] p-8 text-center">
            <p className="text-[var(--color-card-text)]">Loading…</p>
          </div>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
