"use client";

import { useState } from "react";
import { createClientImplicit } from "@/lib/supabase/client-implicit";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getAuthErrorMessage } from "@/lib/auth-errors";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const router = useRouter();

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
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const supabase = createClientImplicit();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${origin}/auth/confirm` },
    });
    setLoading(false);

    if (signUpError) {
      setError(getAuthErrorMessage(signUpError));
      return;
    }

    if (data.user && !data.session) {
      setEmailSent(true);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-surface-variant">
        <div className="card w-full max-w-[400px] p-8 text-center">
          <h1 className="text-2xl font-medium text-[var(--color-card-text)] mb-2">
            Check your email
          </h1>
          <p className="text-sm text-[var(--color-on-surface-variant)] mb-6">
            We sent a confirmation link to <strong className="text-[var(--color-card-text)]">{email}</strong>. Click the link to activate your account, then sign in.
          </p>
          <Link href="/login" className="btn btn-primary btn-md w-full inline-block text-center">
            Go to Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-surface-variant">
      <div className="card w-full max-w-[400px] p-8">
        <h1 className="text-2xl font-medium text-[var(--color-card-text)] text-center mb-1">
          Sign up
        </h1>
        <p className="text-center text-sm text-[var(--color-on-surface-variant)] mb-6">
          Create an account to get started
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
              className="w-full border border-[var(--color-outline)] rounded-lg px-3 py-2.5 text-[var(--color-card-text)] bg-[var(--color-surface)] placeholder:text-[var(--color-on-surface-variant)]"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[var(--color-card-text)] mb-1.5">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full border border-[var(--color-outline)] rounded-lg px-3 py-2.5 text-[var(--color-card-text)] bg-[var(--color-surface)] placeholder:text-[var(--color-on-surface-variant)]"
              placeholder="At least 6 characters"
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-[var(--color-card-text)] mb-1.5">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full border border-[var(--color-outline)] rounded-lg px-3 py-2.5 text-[var(--color-card-text)] bg-[var(--color-surface)] placeholder:text-[var(--color-on-surface-variant)]"
              placeholder="Repeat password"
            />
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary btn-md w-full">
            {loading ? "Creating account…" : "Sign up"}
          </button>
        </form>
        <p className="text-center text-sm text-[var(--color-on-surface-variant)] mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
