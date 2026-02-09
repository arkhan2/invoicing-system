"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getEstimatesList } from "./actions";
import { EstimateSidebar } from "./EstimateSidebar";
import type { EstimateListItem } from "./EstimateForm";

const PER_PAGE_OPTIONS = [50, 100, 200] as const;

export function EstimateSidebarWithData({ companyId }: { companyId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const perPage = (() => {
    const raw = searchParams.get("perPage") ?? "100";
    const n = parseInt(raw, 10);
    return PER_PAGE_OPTIONS.includes(n as (typeof PER_PAGE_OPTIONS)[number])
      ? (n as (typeof PER_PAGE_OPTIONS)[number])
      : 100;
  })();
  const searchQuery = searchParams.get("q") ?? "";

  const [data, setData] = useState<{
    totalCount: number;
    list: EstimateListItem[];
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    getEstimatesList(companyId, page, perPage, searchQuery || undefined).then((res) => {
      if (!cancelled) setData(res);
    });
    return () => {
      cancelled = true;
    };
  }, [companyId, page, perPage, searchQuery, pathname]);

  if (!data) {
    return (
      <div className="flex h-full flex-col border-r border-[var(--color-outline)] bg-[var(--color-surface)]">
        <div className="flex flex-1 items-center justify-center p-4 text-sm text-[var(--color-on-surface-variant)]">
          Loading…
        </div>
      </div>
    );
  }

  return (
    <EstimateSidebar
      estimates={data.list}
      companyId={companyId}
      totalCount={data.totalCount}
      page={page}
      perPage={perPage}
      perPageOptions={PER_PAGE_OPTIONS}
      searchQuery={searchQuery}
    />
  );
}
