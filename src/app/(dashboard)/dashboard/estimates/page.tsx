import Link from "next/link";
import { Plus } from "lucide-react";

export default function EstimatesPage() {
  return (
    <div className="flex h-full min-h-[400px] flex-col items-center justify-center p-8">
      <div className="rounded-xl border border-dashed border-[var(--color-outline)] bg-[var(--color-surface-variant)]/30 px-6 py-10 text-center">
        <p className="text-sm text-[var(--color-on-surface-variant)]">
          Select an estimate from the list or create a new one.
        </p>
        <Link
          href="/dashboard/estimates/new"
          className="btn btn-primary btn-icon mt-3"
          aria-label="New estimate"
          title="New estimate"
        >
          <Plus className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
