"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getAuthErrorMessage } from "@/lib/auth-errors";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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
              autoComplete="current-password"
              className="w-full border border-[var(--color-outline)] rounded-lg px-3 py-2.5 text-[var(--color-card-text)] bg-[var(--color-surface)] placeholder:text-[var(--color-on-surface-variant)]"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-md w-full"
          >
            {loading ? "Signing in…" : "Sign in"}
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
