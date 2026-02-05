"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * Shown after the user clicks the email confirmation link.
 * Displays "Email confirmed" and asks them to sign in, with a button to the login page.
 */
export default function AuthConfirmPage() {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    const errorDescription = params.get("error_description");

    if (error) {
      const msg = errorDescription ?? error;
      window.location.replace(
        `/login?error=${encodeURIComponent(decodeURIComponent(msg))}`
      );
      return;
    }

    setShowContent(true);
  }, []);

  if (!showContent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-surface-variant">
        <div className="card w-full max-w-[400px] p-8 text-center">
          <p className="text-[var(--color-card-text)]">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-surface-variant">
      <div className="card w-full max-w-[400px] p-8 text-center">
        <h1 className="text-xl font-medium text-[var(--color-card-text)] mb-2">
          Email confirmed
        </h1>
        <p className="text-sm text-[var(--color-on-surface-variant)] mb-6">
          Your email has been verified. Please sign in with your email and password to continue.
        </p>
        <Link href="/login" className="btn btn-primary btn-sm w-full inline-block text-center">
          Go to Sign in
        </Link>
      </div>
    </div>
  );
}
