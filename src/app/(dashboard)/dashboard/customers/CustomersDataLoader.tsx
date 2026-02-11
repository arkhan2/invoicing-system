"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getCustomersList } from "./actions";
import { CustomersDataProvider } from "./CustomersDataContext";
import { CustomersViewSwitcher } from "./CustomersViewSwitcher";
import type { Customer } from "./CustomerForm";

const PER_PAGE_OPTIONS = [50, 100, 200] as const;

export function CustomersDataLoader({
  companyId,
  children,
}: {
  companyId: string;
  children: React.ReactNode;
}) {
  const searchParams = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const perPage = (() => {
    const raw = searchParams.get("perPage") ?? "100";
    const n = parseInt(raw, 10);
    return (PER_PAGE_OPTIONS as readonly number[]).includes(n)
      ? (n as (typeof PER_PAGE_OPTIONS)[number])
      : 100;
  })();
  const searchQuery = searchParams.get("q") ?? "";

  const [data, setData] = useState<{
    totalCount: number;
    list: Customer[];
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCustomersList(companyId, page, perPage, searchQuery || undefined).then((res) => {
      if (cancelled) return;
      const customers: Customer[] = res.list.map((c) => ({
        id: c.id,
        name: c.name,
        contact_person_name: c.contact_person_name ?? null,
        ntn_cnic: c.ntn_cnic ?? null,
        address: c.address ?? null,
        city: c.city ?? null,
        province: c.province ?? null,
        country: c.country ?? null,
        registration_type: c.registration_type ?? null,
        phone: c.phone ?? null,
        email: c.email ?? null,
        created_at: c.created_at,
        updated_at: c.updated_at ?? null,
      }));
      setData({ totalCount: res.totalCount, list: customers });
    });
    return () => {
      cancelled = true;
    };
  }, [companyId, page, perPage, searchQuery]);

  if (!data) {
    return (
      <div className="-m-6 flex min-h-0 flex-1 overflow-hidden">
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
    <CustomersDataProvider
      customers={data.list}
      companyId={companyId}
      totalCount={data.totalCount}
      page={page}
      perPage={perPage}
      perPageOptions={PER_PAGE_OPTIONS}
      searchQuery={searchQuery}
    >
      <CustomersViewSwitcher>{children}</CustomersViewSwitcher>
    </CustomersDataProvider>
  );
}
