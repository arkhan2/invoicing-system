"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Plus, FileSpreadsheet, LayoutList, Trash2, X, Download, ChevronLeft, ChevronRight, Settings } from "lucide-react";
import { IconButton } from "@/components/IconButton";
import { CustomerList, type CustomerListRef } from "./CustomerList";
import { exportCustomersCsv } from "./actions";
import { startGlobalProcessing, endGlobalProcessing } from "@/components/GlobalProcessing";
import type { Customer } from "./CustomerForm";

const topBarClass =
  "flex flex-shrink-0 items-center justify-between gap-4 border-b border-[var(--color-divider)] bg-base px-4 py-3";

const inputClass =
  "w-full border border-[var(--color-input-border)] rounded-xl px-3 py-2 text-sm text-[var(--color-on-surface)] bg-[var(--color-input-bg)] placeholder:text-[var(--color-on-surface-variant)] transition-colors duration-200 focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";

export function CustomerSpreadsheetView({
  customers,
  companyId,
  totalCount,
  page,
  perPage,
  perPageOptions = [50, 100, 200],
  searchQuery: searchQueryProp = "",
}: {
  customers: Customer[];
  companyId: string;
  totalCount?: number;
  page?: number;
  perPage?: number;
  perPageOptions?: readonly number[];
  searchQuery?: string;
}) {
  const listRef = useRef<CustomerListRef>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("highlight");
  const [search, setSearch] = useState(searchQueryProp);

  useEffect(() => {
    if ((searchQueryProp ?? "").trim() !== "") setSearch(searchQueryProp ?? "");
  }, [searchQueryProp]);

  useEffect(() => {
    if (!highlightId || !customers.some((c) => c.id === highlightId)) return;
    const p = new URLSearchParams(searchParams);
    p.delete("highlight");
    const qsClean = p.toString();
    router.replace(qsClean ? `/dashboard/customers?${qsClean}` : "/dashboard/customers", { scroll: false });
  }, [highlightId, customers, searchParams, router]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [exportLoading, setExportLoading] = useState(false);
  const [perPageOpen, setPerPageOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.email?.toLowerCase().includes(q) ?? false) ||
        (c.phone?.toLowerCase().includes(q) ?? false)
    );
  }, [customers, search]);
  const allFilteredSelected =
    filtered.length > 0 && filtered.every((c) => selectedIds.has(c.id));
  function toggleSelectAll() {
    if (allFilteredSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((c) => next.delete(c.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((c) => next.add(c.id));
        return next;
      });
    }
  }

  const hasPagination = totalCount != null && page != null && perPage != null;
  const totalPages = perPage != null && perPage > 0 ? Math.max(1, Math.ceil((totalCount ?? 0) / perPage)) : 1;
  const startItem = (totalCount ?? 0) === 0 ? 0 : ((page ?? 1) - 1) * (perPage ?? 0) + 1;
  const endItem = (totalCount ?? 0) === 0 ? 0 : Math.min((page ?? 1) * (perPage ?? 0), totalCount ?? 0);

  const spreadsheetQs = (params: { page?: number; perPage?: number; q?: string }) => {
    const p = new URLSearchParams();
    p.set("view", "spreadsheet");
    p.set("page", String(params.page ?? page ?? 1));
    p.set("perPage", String(params.perPage ?? perPage ?? 100));
    const q = params.q !== undefined ? params.q : searchQueryProp;
    if (q && q.trim()) p.set("q", q.trim());
    return `/dashboard/customers?${p.toString()}`;
  };

  async function handleExportCsv() {
    setExportLoading(true);
    startGlobalProcessing("Preparing export…");
    try {
      const result = await exportCustomersCsv(companyId);
      if (result?.error) {
        endGlobalProcessing({ error: result.error });
        return;
      }
      if (!result.csv) {
        endGlobalProcessing({ error: "No data to export." });
        return;
      }
      const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `customers-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      endGlobalProcessing({ success: "Export downloaded." });
    } finally {
      setExportLoading(false);
      endGlobalProcessing();
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className={topBarClass}>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <h2 className="truncate text-lg font-semibold text-[var(--color-on-surface)] shrink-0">
            Customers
          </h2>
          <div className="relative">
            <input
              type="search"
              placeholder="Search customers… (press Enter to search)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  router.push(spreadsheetQs({ page: 1, q: search.trim() || undefined }));
                }
              }}
              className={inputClass + " input-no-search-cancel max-w-[240px] min-w-0 pr-8"}
              aria-label="Search customers"
            />
            {search.trim() !== "" && (
              <IconButton
                variant="secondary"
                icon={<X className="w-4 h-4" />}
                label="Clear search"
                onClick={() => {
                  setSearch("");
                  router.push(spreadsheetQs({ page: 1, q: "" }));
                }}
                className="absolute right-1 top-1/2 -translate-y-1/2 shrink-0 rounded-md p-1.5 text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-variant)] hover:text-[var(--color-on-surface)]"
              />
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={exportLoading}
            className="btn btn-secondary btn-sm inline-flex items-center gap-2"
            title="Export up to 10,000 customers"
          >
            <Download className="w-4 h-4 shrink-0" />
            Export CSV
          </button>
          <Link
            href={`/dashboard/customers/import?${new URLSearchParams({
              page: String(page ?? 1),
              perPage: String(perPage ?? 100),
              ...(searchQueryProp?.trim() && { q: searchQueryProp.trim() }),
            }).toString()}`}
            className="btn btn-secondary btn-sm inline-flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4 shrink-0" />
            Import from CSV
          </Link>
          <Link
            href={`/dashboard/customers?${new URLSearchParams({
              page: String(page ?? 1),
              perPage: String(perPage ?? 100),
              ...(searchQueryProp?.trim() && { q: searchQueryProp.trim() }),
            }).toString()}`}
            className="btn btn-secondary btn-icon shrink-0"
            aria-label="Sidebar view"
            title="Sidebar view"
          >
            <LayoutList className="w-4 h-4" />
          </Link>
          {selectedIds.size > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--color-divider)] bg-[var(--color-surface-variant)] px-3 py-2">
              <div className="flex items-center gap-2">
                {filtered.length > 0 ? (
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--color-on-surface-variant)]">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleSelectAll}
                      className="rounded-md border-[var(--color-outline)]"
                      aria-label={allFilteredSelected ? "Deselect all" : "Select all"}
                    />
                    <span>Select all</span>
                  </label>
                ) : (
                  <span className="text-sm text-[var(--color-on-surface-variant)]">Select all</span>
                )}
                <span className="text-sm text-[var(--color-on-surface-variant)]">
                  {selectedIds.size} selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <IconButton
                  variant="danger"
                  icon={<Trash2 className="w-4 h-4" />}
                  label="Delete selected"
                  onClick={() => listRef.current?.openDeleteSelected()}
                />
                <IconButton
                  variant="secondary"
                  icon={<X className="w-4 h-4" />}
                  label="Clear selection"
                  onClick={() => listRef.current?.clearSelection()}
                />
              </div>
            </div>
          )}
          <Link
            href={`/dashboard/customers/new?${new URLSearchParams({
              page: String(page ?? 1),
              perPage: String(perPage ?? 100),
              ...(searchQueryProp?.trim() && { q: searchQueryProp.trim() }),
              view: "spreadsheet",
            }).toString()}`}
            className="btn btn-add btn-icon shrink-0"
            aria-label="Add customer"
            title="Add customer"
          >
            <Plus className="w-4 h-4" />
          </Link>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden flex flex-col">
        <div className="card rounded-none border-0 h-full min-h-0 flex flex-col overflow-hidden p-0">
          <CustomerList
            ref={listRef}
            customers={customers}
            companyId={companyId}
            hideToolbar
            search={search}
            onSearchChange={setSearch}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            scrollToCustomerId={highlightId ?? ((searchQueryProp ?? "").trim() && customers[0]?.id) ?? undefined}
          />
        </div>
      </div>
      {hasPagination && (
        <div className="flex flex-shrink-0 flex-col gap-2 border-t border-[var(--color-outline)] bg-[var(--color-surface-variant)]/30 px-4 py-2">
          <div className="flex items-center justify-between gap-2 rounded-lg border border-[var(--color-outline)] bg-surface px-2 py-1.5">
            <div className="relative">
              <button
                type="button"
                onClick={() => setPerPageOpen((o) => !o)}
                className="flex items-center gap-1.5 text-sm text-[var(--color-on-surface)]"
                aria-expanded={perPageOpen}
                aria-haspopup="listbox"
                aria-label="Items per page"
              >
                <Settings className="h-3.5 w-3.5 text-[var(--color-on-surface-variant)]" />
                <span>{perPage} per page</span>
              </button>
              {perPageOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    aria-hidden
                    onClick={() => setPerPageOpen(false)}
                  />
                  <ul
                    role="listbox"
                    className="absolute bottom-full left-0 z-20 mb-1 min-w-[8rem] rounded-lg border border-[var(--color-outline)] bg-elevated py-1 shadow-elevated"
                  >
                    {perPageOptions.map((n) => (
                      <li key={n} role="option">
                        <button
                          type="button"
                          className="w-full px-3 py-1.5 text-left text-sm text-[var(--color-on-surface)] hover:bg-[var(--color-surface-variant)]"
                          onClick={() => {
                            setPerPageOpen(false);
                            router.push(spreadsheetQs({ page: 1, perPage: n }));
                          }}
                        >
                          {n} per page
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--color-on-surface-variant)]">
                {startItem}–{endItem} of {totalCount!.toLocaleString()}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => page! > 1 && router.push(spreadsheetQs({ page: page! - 1 }))}
                  disabled={page! <= 1}
                  className="rounded p-1 text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-variant)] hover:text-[var(--color-on-surface)] disabled:opacity-40 disabled:hover:bg-transparent"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => page! < totalPages && router.push(spreadsheetQs({ page: page! + 1 }))}
                  disabled={page! >= totalPages}
                  className="rounded p-1 text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-variant)] hover:text-[var(--color-on-surface)] disabled:opacity-40 disabled:hover:bg-transparent"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
