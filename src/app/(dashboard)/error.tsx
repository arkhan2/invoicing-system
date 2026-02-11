"use client";

import { useEffect } from "react";
import { ConnectionUnavailable } from "@/components/ConnectionUnavailable";
import { isConnectionError } from "@/lib/supabase/connection-error";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  if (isConnectionError(error)) {
    return <ConnectionUnavailable />;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-base px-4">
      <div className="max-w-md rounded-2xl border border-[var(--color-outline)] bg-surface p-8 text-center shadow-elevated">
        <h1 className="text-lg font-semibold text-[var(--color-on-surface)]">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
          An unexpected error occurred. Try again.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-[var(--color-on-primary)] transition-colors hover:opacity-90"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
