import Link from "next/link";

export default function EstimatesPage() {
  return (
    <div className="flex h-full min-h-[400px] flex-col items-center justify-center p-8 text-center">
      <p className="text-sm text-[var(--color-on-surface-variant)]">
        Select an estimate from the list or create a new one.
      </p>
      <Link
        href="/dashboard/estimates/new"
        className="btn btn-primary btn-sm mt-4"
      >
        New estimate
      </Link>
    </div>
  );
}
