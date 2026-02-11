"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus, X } from "lucide-react";
import { CustomerSpreadsheetView } from "./CustomerSpreadsheetView";
import { CustomersTopBar } from "./CustomersTopBar";
import { useCustomersData } from "./CustomersDataContext";

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
  const view = searchParams.get("view");
  const isSpreadsheet = view === "spreadsheet";
  const listQs = customersListParams(searchParams);
  const {
    customers,
    companyId,
    totalCount,
    page,
    perPage,
    perPageOptions,
    searchQuery,
  } = useCustomersData();

  if (isSpreadsheet) {
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
        left={
          <h2 className="truncate text-lg font-semibold text-[var(--color-on-surface)]">
            Customers
          </h2>
        }
        right={
          <>
            <Link
              href={`/dashboard/customers/new?${listQs}`}
              className="btn btn-add btn-icon shrink-0"
              aria-label="New customer"
              title="New customer"
            >
              <Plus className="size-4" />
            </Link>
            <Link
              href={`/dashboard/customers?view=spreadsheet&${listQs}`}
              className="btn btn-secondary btn-icon shrink-0"
              aria-label="Switch to spreadsheet view"
              title="Spreadsheet view"
            >
              <X className="size-4" />
            </Link>
          </>
        }
      />
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-8">
        <div className="rounded-xl border border-dashed border-[var(--color-outline)] bg-[var(--color-surface-variant)]/30 px-6 py-10 text-center">
          <p className="text-sm text-[var(--color-on-surface-variant)]">
            Select a customer from the list or create a new one.
          </p>
        </div>
      </div>
    </div>
  );
}
