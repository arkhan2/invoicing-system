"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { getItemsList } from "./actions";
import { ItemsDataProvider } from "./ItemsDataContext";
import { ItemsViewSwitcher } from "./ItemsViewSwitcher";
import type { Item } from "./ItemForm";

const PER_PAGE_OPTIONS = [50, 100, 200] as const;

export function ItemsDataLoader({
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
    list: Item[];
  } | null>(null);

  const refreshItems = useCallback(() => {
    getItemsList(companyId, page, perPage, searchQuery || undefined).then((res) => {
      const items: Item[] = res.list.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description ?? null,
        reference: r.reference ?? null,
        hs_code: r.hs_code ?? null,
        unit_rate: r.unit_rate ?? null,
        default_tax_rate_id: r.default_tax_rate_id ?? null,
        uom_id: r.uom_id ?? null,
        uom_code: r.uom_code ?? null,
        sale_type: r.sale_type ?? null,
        created_at: r.created_at,
        updated_at: r.updated_at ?? null,
      }));
      setData({ totalCount: res.totalCount, list: items });
    });
  }, [companyId, page, perPage, searchQuery]);

  useEffect(() => {
    let cancelled = false;
    getItemsList(companyId, page, perPage, searchQuery || undefined).then((res) => {
      if (cancelled) return;
      const items: Item[] = res.list.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description ?? null,
        reference: r.reference ?? null,
        hs_code: r.hs_code ?? null,
        unit_rate: r.unit_rate ?? null,
        default_tax_rate_id: r.default_tax_rate_id ?? null,
        uom_id: r.uom_id ?? null,
        uom_code: r.uom_code ?? null,
        sale_type: r.sale_type ?? null,
        created_at: r.created_at,
        updated_at: r.updated_at ?? null,
      }));
      setData({ totalCount: res.totalCount, list: items });
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
    <ItemsDataProvider
      items={data.list}
      companyId={companyId}
      totalCount={data.totalCount}
      page={page}
      perPage={perPage}
      perPageOptions={PER_PAGE_OPTIONS}
      searchQuery={searchQuery}
      refreshItems={refreshItems}
    >
      <ItemsViewSwitcher>{children}</ItemsViewSwitcher>
    </ItemsDataProvider>
  );
}
