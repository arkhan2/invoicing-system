"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { CustomerSpreadsheetView } from "./CustomerSpreadsheetView";
import { CustomersTopBar } from "./CustomersTopBar";
import { CustomerSidebar } from "./CustomerSidebar";
import { useCustomersData } from "./CustomersDataContext";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useState } from "react";

function customersListParams(searchParams: URLSearchParams) {
  const p = new URLSearchParams();
  p.set("page", searchParams.get("page") ?? "1");
  p.set("perPage", searchParams.get("perPage") ?? "100");
  const q = searchParams.get("q")?.trim();
  if (q) p.set("q", q);
  return p.toString();
}

export function CustomersPageContent() {
  const searchParams = useSearchParams();
  const listQs = customersListParams(searchParams);
  const isLg = useMediaQuery("(min-width: 1024px)");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const {
    customers,
    sidebarList,
    companyId,
    totalCount,
    page,
    perPage,
    perPageOptions,
    searchQuery,
  } = useCustomersData();

  if (isLg) {
    return (
      <CustomerSpreadsheetView
        customers={customers}
        companyId={companyId}
        totalCount={totalCount}
        page={page}
        perPage={perPage}
        perPageOptions={perPageOptions}
        searchQuery={searchQuery}
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <CustomersTopBar
        showViewSwitcher={false}
        left={
          <h2 className="truncate text-lg font-semibold text-[var(--color-on-surface)]">
            Customers
          </h2>
        }
        right={
          <Link
            href={`/dashboard/customers/new?${listQs}`}
            className="btn btn-add btn-icon shrink-0"
            aria-label="New customer"
            title="New customer"
          >
            <Plus className="size-4" />
          </Link>
        }
      />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <CustomerSidebar
          customers={sidebarList}
          companyId={companyId}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          totalCount={totalCount}
          page={page}
          perPage={perPage}
          perPageOptions={perPageOptions}
          searchQuery={searchQuery}
        />
      </div>
    </div>
  );
}
