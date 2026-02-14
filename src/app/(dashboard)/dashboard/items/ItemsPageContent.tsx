"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus, X } from "lucide-react";
import { ItemSpreadsheetView } from "./ItemSpreadsheetView";
import { ItemsTopBar } from "./ItemsTopBar";
import { useItemsData } from "./ItemsDataContext";

function itemsListParams(searchParams: URLSearchParams) {
  const p = new URLSearchParams();
  p.set("page", searchParams.get("page") ?? "1");
  p.set("perPage", searchParams.get("perPage") ?? "100");
  const q = searchParams.get("q")?.trim();
  if (q) p.set("q", q);
  return p.toString();
}

export function ItemsPageContent() {
  const searchParams = useSearchParams();
  const view = searchParams.get("view");
  const isSpreadsheet = view === "spreadsheet";
  const listQs = itemsListParams(searchParams);
  const {
    items,
    companyId,
    totalCount,
    page,
    perPage,
    perPageOptions,
    searchQuery,
  } = useItemsData();

  const fromSpreadsheet = view === "spreadsheet";
  const newItemHref = `/dashboard/items/new?${new URLSearchParams({
    page: String(page ?? 1),
    perPage: String(perPage ?? 100),
    ...(searchQuery?.trim() && { q: searchQuery.trim() }),
    ...(fromSpreadsheet && { view: "spreadsheet" }),
  }).toString()}`;

  if (isSpreadsheet) {
    return (
      <ItemSpreadsheetView
        items={items}
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
    <div className="flex min-h-0 flex-col">
      <ItemsTopBar
        left={
          <h2 className="truncate text-lg font-semibold text-[var(--color-on-surface)]">
            Items
          </h2>
        }
        right={
          <>
            <Link
              href={newItemHref}
              className="btn btn-add btn-icon shrink-0"
              aria-label="New item"
              title="New item"
            >
              <Plus className="size-4" />
            </Link>
            <Link
              href={`/dashboard/items?view=spreadsheet&${listQs}`}
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
            Select an item from the list or create a new one.
          </p>
        </div>
      </div>
    </div>
  );
}
