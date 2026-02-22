"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getCustomerPayments } from "./actions";
import type { PaymentListItem } from "./actions";
import { usePayments } from "./PaymentsContext";
import { PaymentsDataProvider } from "./PaymentsDataContext";
import { PaymentsViewSwitcher } from "./PaymentsViewSwitcher";

const PER_PAGE_OPTIONS = [50, 100, 200] as const;

export function PaymentsDataLoader({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const { companyId, setRefreshPayments } = usePayments();
  const [refreshKey, setRefreshKey] = useState(0);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const perPage = (() => {
    const raw = searchParams.get("perPage") ?? "100";
    const n = parseInt(raw, 10);
    return (PER_PAGE_OPTIONS as readonly number[]).includes(n)
      ? (n as (typeof PER_PAGE_OPTIONS)[number])
      : 100;
  })();
  const customerId = searchParams.get("customerId") ?? "";
  const status = searchParams.get("status") ?? "";

  const [data, setData] = useState<{ totalCount: number; list: PaymentListItem[] } | null>(null);

  useEffect(() => {
    setRefreshPayments(() => () => setRefreshKey((k) => k + 1));
  }, [setRefreshPayments]);

  useEffect(() => {
    getCustomerPayments(companyId, page, perPage, {
      customerId: customerId || undefined,
      status: status || undefined,
    }).then((res) => setData(res));
  }, [companyId, page, perPage, customerId, status, refreshKey]);

  if (!data) {
    return (
      <div className="-m-4 flex min-h-0 flex-1 overflow-hidden lg:-m-6">
        <aside className="w-80 flex-shrink-0 overflow-hidden border-r border-[var(--color-outline)] bg-base">
          <div className="flex flex-1 items-center justify-center p-4 text-sm text-[var(--color-on-surface-variant)]">
            Loading…
          </div>
        </aside>
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex flex-1 items-center justify-center p-4 text-sm text-[var(--color-on-surface-variant)]">
            Loading…
          </div>
        </main>
      </div>
    );
  }

  return (
    <PaymentsDataProvider
      payments={data.list}
      companyId={companyId}
      totalCount={data.totalCount}
      page={page}
      perPage={perPage}
      perPageOptions={PER_PAGE_OPTIONS}
      customerId={customerId}
      status={status}
    >
      <PaymentsViewSwitcher>{children}</PaymentsViewSwitcher>
    </PaymentsDataProvider>
  );
}
