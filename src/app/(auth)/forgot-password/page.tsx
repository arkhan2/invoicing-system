"use client";

import { useState, useEffect, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { getAuthErrorMessage } from "@/lib/auth-errors";

/** When Supabase returns "too many attempts", wait this long before allowing retry (Supabase limit is server-side). */
const RATE_LIMIT_COOLDOWN_SEC = 5 * 60; // 5 minutes

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"request" | "reset">("request");
  const [cooldownSec, setCooldownSec] = useState(0);
  const message = searchParams.get("message");

  useEffect(() => {
    if (cooldownSec <= 0) return;
    const t = setInterval(() => {
      setCooldownSec((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [cooldownSec]);

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const supabase = createClient();
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(`${origin}/auth/reset-password`)}`,
    });
    setLoading(false);
    if (err) {
      const msg = getAuthErrorMessage(err);
      setError(msg);
      const isRateLimit =
        msg.includes("Too many attempts") ||
        err.message?.toLowerCase().includes("rate limit") ||
        err.message?.toLowerCase().includes("too many");
      if (isRateLimit) {
        setCooldownSec(RATE_LIMIT_COOLDOWN_SEC);
      }
      return;
    }
    setStep("reset");
  }

  async function handleResetPassword(e: React.FormEvent) {
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
    const token = code.trim().replace(/\s/g, "");
    if (token.length < 6 || token.length > 10) {
      setError("Enter the code from your email (6–10 digits).");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error: verifyErr } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "recovery",
    });
    if (verifyErr) {
      setLoading(false);
      setError(getAuthErrorMessage(verifyErr));
      return;
    }
    const { error: updateErr } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateErr) {
      setError(getAuthErrorMessage(updateErr));
      return;
    }
    router.push("/login?message=Password+updated.+Sign+in+with+your+new+password.");
    router.refresh();
  }

  if (step === "reset") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-surface-variant">
        <div className="card w-full max-w-[400px] p-8">
          <h1 className="text-2xl font-medium text-[var(--color-card-text)] text-center mb-1">
            Set new password
          </h1>
          <p className="text-center text-sm text-[var(--color-on-surface-variant)] mb-6">
            We sent a code to <strong className="text-[var(--color-card-text)]">{email}</strong>. Enter it below with your new password.
          </p>
          <form onSubmit={handleResetPassword} className="space-y-4">
            {error && (
              <div
                className="text-sm p-3 rounded-xl border border-[var(--color-error)] bg-[var(--color-error-bg)] text-[var(--color-error)]"
                role="alert"
              >
                {error}
              </div>
            )}
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-[var(--color-card-text)] mb-1.5">
                Code from email
              </label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={10}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="e.g. 79119087"
                className="w-full border border-[var(--color-outline)] rounded-xl px-3 py-2.5 text-[var(--color-card-text)] bg-[var(--color-input-bg)] placeholder:text-[var(--color-on-surface-variant)] text-center tracking-widest text-lg"
              />
            </div>
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
                className="w-full border border-[var(--color-outline)] rounded-xl px-3 py-2.5 text-[var(--color-card-text)] bg-[var(--color-input-bg)] placeholder:text-[var(--color-on-surface-variant)]"
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
                className="w-full border border-[var(--color-outline)] rounded-xl px-3 py-2.5 text-[var(--color-card-text)] bg-[var(--color-input-bg)] placeholder:text-[var(--color-on-surface-variant)]"
                placeholder="Repeat password"
              />
            </div>
            <button type="submit" disabled={loading} className="btn btn-primary btn-sm w-full">
              {loading ? "Updating…" : "Reset password"}
            </button>
          </form>
          <p className="text-center text-sm text-[var(--color-on-surface-variant)] mt-6">
            <button
              type="button"
              onClick={() => setStep("request")}
              className="text-primary font-medium hover:underline"
            >
              Use a different email
            </button>
            {" · "}
            <Link href="/login" className="text-primary font-medium hover:underline">
              Back to Sign in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-surface-variant">
      <div className="card w-full max-w-[400px] p-8">
        <h1 className="text-2xl font-medium text-[var(--color-card-text)] text-center mb-1">
          Forgot password
        </h1>
        <p className="text-center text-sm text-[var(--color-on-surface-variant)] mb-6">
          Enter your email and we’ll send you a code. Enter the code on the next screen with your new password.
        </p>
        <form onSubmit={handleSendCode} className="space-y-4">
          {message && (
            <div
              className="text-sm p-3 rounded-xl border border-[var(--color-outline)] bg-[var(--color-badge-success-bg)] text-[var(--color-badge-success-text)]"
              role="status"
            >
              {decodeURIComponent(message)}
            </div>
          )}
          {error && (
            <div
              className="text-sm p-3 rounded-xl border border-[var(--color-error)] bg-[var(--color-error-bg)] text-[var(--color-error)]"
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
              className="w-full border border-[var(--color-outline)] rounded-xl px-3 py-2.5 text-[var(--color-card-text)] bg-[var(--color-input-bg)] placeholder:text-[var(--color-on-surface-variant)]"
              placeholder="you@example.com"
            />
          </div>
          {cooldownSec > 0 && (
            <p className="text-sm text-[var(--color-on-surface-variant)] text-center">
              You can request another code in {Math.floor(cooldownSec / 60)}:{String(cooldownSec % 60).padStart(2, "0")}.
            </p>
          )}
          <button
            type="submit"
            disabled={loading || cooldownSec > 0}
            className="btn btn-primary btn-sm w-full"
          >
            {loading ? "Sending…" : cooldownSec > 0 ? "Wait before trying again" : "Send code"}
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

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-6 bg-surface-variant">
          <div className="card w-full max-w-[400px] p-8 text-center text-[var(--color-on-surface-variant)]">
            Loading…
          </div>
        </div>
      }
    >
      <ForgotPasswordForm />
    </Suspense>
  );
}
