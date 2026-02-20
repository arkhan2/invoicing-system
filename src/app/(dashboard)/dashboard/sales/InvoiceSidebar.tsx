"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Trash2, Pencil, X, ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";
import { useGlobalSearch } from "@/components/global-search/useGlobalSearch";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { IconButton } from "@/components/IconButton";
import { PerPageDropdown } from "@/components/PerPageDropdown";
import { deleteInvoice, deleteInvoices } from "./actions";
import { startGlobalProcessing, endGlobalProcessing } from "@/components/GlobalProcessing";
import { formatEstimateDate } from "@/lib/formatDate";

export type InvoiceListItem = {
  id: string;
  invoice_number: string;
  invoice_date: string;
  status: string;
  total_amount: number | null;
  total_tax: number | null;
  customer_name: string;
  customer_id: string;
  estimate_number: string | null;
};

type SingleDeleteState = { type: "single"; invoiceId: string; loading: boolean };
type BulkDeleteState = { type: "bulk"; loading: boolean };

export function InvoiceSidebar({
  invoices,
  companyId,
  totalCount,
  page,
  perPage,
  perPageOptions = [50, 100, 200],
  searchQuery: searchQueryProp = "",
  filterCustomerId,
}: {
  invoices: InvoiceListItem[];
  companyId: string;
  totalCount?: number;
  page?: number;
  perPage?: number;
  perPageOptions?: readonly number[];
  searchQuery?: string;
  filterCustomerId?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const globalSearch = useGlobalSearch();
  const effectiveQuery = (globalSearch?.searchQuery ?? searchQueryProp ?? "").trim();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteState, setDeleteState] = useState<SingleDeleteState | BulkDeleteState | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const showFooter = totalCount != null && page != null && perPage != null;
  const totalPages = perPage != null && perPage > 0 ? Math.max(1, Math.ceil((totalCount ?? 0) / perPage)) : 1;
  const startItem = (totalCount ?? 0) === 0 ? 0 : ((page ?? 1) - 1) * (perPage ?? 0) + 1;
  const endItem = (totalCount ?? 0) === 0 ? 0 : Math.min((page ?? 1) * (perPage ?? 0), totalCount ?? 0);

  const filtered = useMemo(() => {
    if (!effectiveQuery) return invoices;
    const q = effectiveQuery.toLowerCase();
    return invoices.filter(
      (inv) =>
        inv.invoice_number?.toLowerCase().includes(q) ||
        inv.customer_name?.toLowerCase().includes(q) ||
        (inv.status?.toLowerCase().includes(q) ?? false) ||
        (inv.estimate_number?.toLowerCase().includes(q) ?? false)
    );
  }, [invoices, effectiveQuery]);

  const qs = (params: { page?: number; perPage?: number; q?: string; customerId?: string | null }) => {
    const p = new URLSearchParams();
    p.set("page", String(params.page ?? page ?? 1));
    p.set("perPage", String(params.perPage ?? perPage ?? 100));
    const q = params.q !== undefined ? params.q : effectiveQuery;
    if (q) p.set("q", q);
    if (params.customerId) p.set("customerId", params.customerId);
    return `/dashboard/sales?${p.toString()}`;
  };

  const clearCustomerFilterUrl = () => {
    const p = new URLSearchParams();
    p.set("page", String(page ?? 1));
    p.set("perPage", String(perPage ?? 100));
    if (effectiveQuery) p.set("q", effectiveQuery);
    return `/dashboard/sales?${p.toString()}`;
  };

  const listParams = () => {
    const p = new URLSearchParams();
    p.set("page", String(page ?? 1));
    p.set("perPage", String(perPage ?? 100));
    if (effectiveQuery) p.set("q", effectiveQuery);
    if (filterCustomerId) p.set("customerId", filterCustomerId);
    return p.toString();
  };

  const invoiceHref = (invoiceId: string) => {
    const query = listParams();
    return `/dashboard/sales/${invoiceId}${query ? `?${query}` : ""}`;
  };

  const invoiceEditHref = (invoiceId: string) => {
    const query = listParams();
    return `/dashboard/sales/${invoiceId}/edit${query ? `?${query}` : ""}`;
  };

  const activeId = pathname.startsWith("/dashboard/sales/") && pathname !== "/dashboard/sales" && pathname !== "/dashboard/sales/new"
    ? pathname.replace("/dashboard/sales/", "").split("/")[0]
    : null;

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((inv) => selectedIds.has(inv.id));

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allFilteredSelected) {
      const filteredIds = new Set(filtered.map((inv) => inv.id));
      setSelectedIds((prev) => new Set([...prev].filter((id) => !filteredIds.has(id))));
    } else {
      setSelectedIds((prev) => new Set([...prev, ...filtered.map((inv) => inv.id)]));
    }
  }

  const ROW_HEIGHT_ESTIMATE = 92;
  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT_ESTIMATE,
    overscan: 8,
  });

  function openDelete(e: React.MouseEvent, invoiceId: string) {
    e.preventDefault();
    e.stopPropagation();
    setDeleteState({ type: "single", invoiceId, loading: false });
  }

  function openBulkDelete() {
    setDeleteState({ type: "bulk", loading: false });
  }

  async function confirmDelete() {
    if (!deleteState) return;
    setDeleteState((prev) => (prev ? { ...prev, loading: true } : null));
    startGlobalProcessing("Deleting…");
    try {
      if (deleteState.type === "single") {
        const result = await deleteInvoice(deleteState.invoiceId);
        setDeleteState(null);
        if (result?.error) {
          endGlobalProcessing({ error: result.error });
          return;
        }
        endGlobalProcessing({ success: "Invoice deleted." });
        router.refresh();
        router.push("/dashboard/sales");
      } else {
        const ids = Array.from(selectedIds);
        const result = await deleteInvoices(companyId, ids);
        setDeleteState(null);
        if (result?.error) {
          endGlobalProcessing({ error: result.error });
          return;
        }
        const msg = result.deletedCount === 1 ? "Invoice deleted." : "Invoices deleted.";
        endGlobalProcessing({ success: msg });
        setSelectedIds(new Set());
        router.refresh();
        if (ids.includes(activeId ?? "")) router.push("/dashboard/sales");
      }
    } finally {
      endGlobalProcessing();
    }
  }

  return (
    <>
      <div className="flex h-full flex-col border-r border-[var(--color-outline)] bg-base">
        <div className="flex flex-shrink-0 flex-col gap-2 px-3 pt-3 pb-2">
          {filterCustomerId && (
            <div className="flex items-center gap-2 rounded-lg border border-[var(--color-outline)] bg-[var(--color-surface-variant)]/50 px-2 py-1.5 text-sm">
              <span className="truncate text-[var(--color-on-surface-variant)]">Filter: customer</span>
              <Link
                href={clearCustomerFilterUrl()}
                className="shrink-0 font-medium text-[var(--color-primary)] hover:underline"
              >
                Clear
              </Link>
            </div>
          )}
          {selectedIds.size > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--color-divider)] bg-[var(--color-surface-variant)]/50 px-3 py-2">
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
                  onClick={openBulkDelete}
                />
                <IconButton
                  variant="secondary"
                  icon={<X className="w-4 h-4" />}
                  label="Clear selection"
                  onClick={() => setSelectedIds(new Set())}
                />
              </div>
            </div>
          )}
        </div>
        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto px-3 pb-3"
        >
          {filtered.length === 0 ? (
            <div className="py-6 text-center text-sm text-[var(--color-on-surface-variant)]">
              {effectiveQuery ? "No matches" : "No invoices yet"}
            </div>
          ) : (
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                position: "relative",
                width: "100%",
              }}
            >
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const inv = filtered[virtualRow.index];
                const isActive = activeId === inv.id;
                const isSelected = selectedIds.has(inv.id);
                const cardClass = `flex items-start gap-2 rounded-xl border px-3 py-2.5 text-left transition-colors duration-200 ${
                  isActive
                    ? "border-[var(--color-primary)] bg-[var(--color-primary-container)]"
                    : "border-[var(--color-outline)] bg-surface hover:bg-[var(--color-surface-variant)]"
                }`;
                return (
                  <div
                    key={inv.id}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    className="pb-2"
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      className={`h-full cursor-pointer ${cardClass}`}
                      onClick={() => router.push(invoiceHref(inv.id))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          router.push(invoiceHref(inv.id));
                        }
                      }}
                    >
                      <label
                        className="flex shrink-0 cursor-pointer items-start pt-0.5"
                        onClick={(ev) => {
                          ev.preventDefault();
                          ev.stopPropagation();
                        }}
                      >
                        <input
                          key={`${inv.id}-${isSelected}`}
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(inv.id)}
                          className="rounded-md border-[var(--color-outline)]"
                          aria-label={`Select ${inv.invoice_number}`}
                        />
                      </label>
                      <div className="flex flex-1 min-w-0 flex-col">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`truncate text-sm font-medium ${isActive ? "text-[var(--color-on-primary-container)]" : "text-[var(--color-card-text)]"}`}>
                            {inv.invoice_number}
                          </span>
                          {inv.invoice_date && (
                            <span className={`shrink-0 text-[10px] ${isActive ? "text-[var(--color-on-primary-container)]/80" : "text-[var(--color-on-surface-variant)]"}`}>
                              {formatEstimateDate(inv.invoice_date)}
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center justify-between gap-2">
                          <span className={`truncate text-xs ${isActive ? "text-[var(--color-on-primary-container)]/90" : "text-[var(--color-card-text)]"}`}>
                            {inv.customer_name || "—"}
                          </span>
                          <span className={`shrink-0 text-xs ${isActive ? "text-[var(--color-on-primary-container)]" : "text-[var(--color-card-text)]"}`}>
                            {inv.total_amount != null ? Number(inv.total_amount).toFixed(0) : "—"}
                          </span>
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                          <span className={`invoice-status-badge text-[10px] px-2 py-0.5 ${isActive ? "!bg-[var(--color-on-primary-container)]/20 !text-[var(--color-on-primary-container)]" : ""}`} data-status={inv.status?.toLowerCase() ?? "draft"}>
                            {inv.status}
                          </span>
                          <span className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                router.push(invoiceEditHref(inv.id));
                              }}
                              className={`shrink-0 rounded p-0.5 transition-colors ${isActive ? "text-[var(--color-on-primary-container)] hover:bg-[var(--color-on-primary-container)]/10 hover:text-[var(--color-on-primary-container)]" : "text-[var(--color-on-surface-variant)] hover:bg-[var(--color-secondary-bg)] hover:text-[var(--color-secondary)]"}`}
                              aria-label="Edit invoice"
                              title="Edit"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(ev) => openDelete(ev, inv.id)}
                              className={`shrink-0 rounded p-0.5 ${isActive ? "text-[var(--color-on-primary-container)] hover:bg-[var(--color-on-primary-container)]/10" : "text-[var(--color-error)] hover:bg-[var(--color-error-bg)]"}`}
                              aria-label="Delete"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {showFooter && (
          <div className="flex flex-shrink-0 flex-col gap-2 border-t border-[var(--color-outline)] bg-[var(--color-surface-variant)]/30 px-3 py-2">
            <p className="text-xs font-medium text-[var(--color-on-surface-variant)]">
              Total Count: {totalCount!.toLocaleString()}
            </p>
            <div className="flex items-center justify-between gap-2 rounded-lg border border-[var(--color-outline)] bg-surface px-2 py-1.5">
              <div className="relative">
                <PerPageDropdown
                  perPage={perPage ?? 100}
                  perPageOptions={perPageOptions}
                  onSelect={(n) => router.push(qs({ page: 1, perPage: n }))}
                  aria-label="Items per page"
                />
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => page! > 1 && router.push(qs({ page: page! - 1 }))}
                  disabled={page! <= 1}
                  className="rounded p-1 text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-variant)] hover:text-[var(--color-on-surface)] disabled:opacity-40 disabled:hover:bg-transparent"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="min-w-[5rem] text-center text-sm text-[var(--color-on-surface)]">
                  {startItem} – {endItem}
                </span>
                <button
                  type="button"
                  onClick={() => page! < totalPages && router.push(qs({ page: page! + 1 }))}
                  disabled={page! >= totalPages}
                  className="rounded p-1 text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-variant)] hover:text-[var(--color-on-surface)] disabled:opacity-40 disabled:hover:bg-transparent"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteState}
        title={deleteState?.type === "bulk" ? "Delete invoices?" : "Delete invoice?"}
        message={
          deleteState?.type === "bulk"
            ? `Delete ${selectedIds.size} invoice${selectedIds.size !== 1 ? "s" : ""}? This cannot be undone.`
            : "This invoice will be removed. This cannot be undone."
        }
        confirmLabel="Delete"
        variant="danger"
        loading={deleteState?.type === "single" ? deleteState.loading : deleteState?.type === "bulk" ? deleteState.loading : false}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteState(null)}
      />
    </>
  );
}
