"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";

const topBarClass =
  "dashboard-top-bar flex flex-shrink-0 items-center justify-between gap-4 border-b border-[var(--color-divider)] bg-base px-4 py-3 max-lg:sticky max-lg:top-0 max-lg:z-10";

export function PaymentsTopBar() {
  const searchParams = useSearchParams();
  const page = searchParams.get("page") ?? "1";
  const perPage = searchParams.get("perPage") ?? "100";
  const newHref = `/dashboard/payments/new?page=${page}&perPage=${perPage}`;

  return (
    <div className={topBarClass}>
      <h2 className="truncate text-lg font-semibold text-[var(--color-on-surface)]">
        Payments
      </h2>
      <div className="flex shrink-0 items-center gap-2">
        <Link
          href={newHref}
          className="btn btn-add btn-icon shrink-0"
          aria-label="New payment"
          title="New payment"
        >
          <Plus className="size-4" />
        </Link>
      </div>
    </div>
  );
}
