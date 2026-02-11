"use client";

import Link from "next/link";

export function ConnectionUnavailable() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-base px-4">
      <div className="max-w-md rounded-2xl border border-[var(--color-outline)] bg-surface p-8 text-center shadow-elevated">
        <h1 className="text-lg font-semibold text-[var(--color-on-surface)]">
          Can&apos;t reach the server
        </h1>
        <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
          Check your internet connection and try again. If you use a VPN or firewall, it may be blocking the connection.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/dashboard"
            className="rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-[var(--color-on-primary)] transition-colors hover:opacity-90"
          >
            Retry
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-[var(--color-outline)] bg-[var(--color-surface)] px-4 py-2.5 text-sm font-medium text-[var(--color-on-surface)] transition-colors hover:bg-[var(--color-surface-variant)]"
          >
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
