"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { getAuthErrorMessage } from "@/lib/auth-errors";

const ALLOW_TEST_SMTP = process.env.NEXT_PUBLIC_ALLOW_TEST_SMTP === "true";

export default function TestSmtpPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSent(false);
    setLoading(true);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const supabase = createClient();
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(`${origin}/auth/reset-password`)}`,
    });
    setLoading(false);
    if (err) {
      setError(getAuthErrorMessage(err));
      return;
    }
    setSent(true);
  }

  if (!ALLOW_TEST_SMTP) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-surface-variant">
        <div className="card w-full max-w-[400px] p-8 text-center">
          <h1 className="text-xl font-medium text-[var(--color-card-text)] mb-2">
            Test SMTP (disabled)
          </h1>
          <p className="text-sm text-[var(--color-on-surface-variant)] mb-6">
            To test custom SMTP, add to <code className="text-xs bg-surface-variant px-1 rounded">.env.local</code>:
            <br />
            <strong className="text-[var(--color-card-text)]">NEXT_PUBLIC_ALLOW_TEST_SMTP=true</strong>
            <br />
            Then restart the dev server and open this page again.
          </p>
          <Link href="/login" className="btn btn-secondary btn-md w-full inline-block text-center">
            Back to Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-surface-variant">
      <div className="card w-full max-w-[400px] p-8">
        <h1 className="text-2xl font-medium text-[var(--color-card-text)] text-center mb-1">
          Test custom SMTP
        </h1>
        <p className="text-center text-sm text-[var(--color-on-surface-variant)] mb-6">
          Sends a password-reset email. If custom SMTP is working, the message will arrive at the address below (check spam too).
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
          {sent && (
            <div
              className="text-sm p-3 rounded-lg border border-[var(--color-outline)] bg-[var(--color-badge-success-bg)] text-[var(--color-badge-success-text)]"
              role="status"
            >
              Request sent. Check <strong>{email}</strong> for the reset email (and spam folder).
            </div>
          )}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[var(--color-card-text)] mb-1.5">
              Email address
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
          <button type="submit" disabled={loading} className="btn btn-primary btn-md w-full">
            {loading ? "Sending…" : "Send test recovery email"}
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
