"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Trash2, Copy, X, ChevronLeft, ChevronRight, Settings } from "lucide-react";
import { EstimateStatusBadge } from "./EstimateStatusBadge";
import { usePathname, useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { IconButton } from "@/components/IconButton";
import {
  deleteEstimate,
  deleteEstimates,
  convertEstimateToInvoice,
  cloneEstimate,
} from "./actions";
import { startGlobalProcessing, endGlobalProcessing } from "@/components/GlobalProcessing";
import { formatEstimateDate } from "@/lib/formatDate";
import type { EstimateListItem } from "./EstimateForm";

type SingleDeleteState = { type: "single"; estimateId: string; loading: boolean };
type BulkDeleteState = { type: "bulk"; loading: boolean };

export function EstimateSidebar({
  estimates,
  companyId,
  totalCount,
  page,
  perPage,
  perPageOptions = [50, 100, 200],
  searchQuery: searchQueryProp = "",
  filterCustomerId,
}: {
  estimates: EstimateListItem[];
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
  const [searchInput, setSearchInput] = useState(searchQueryProp);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteState, setDeleteState] = useState<SingleDeleteState | BulkDeleteState | null>(null);
  const [convertState, setConvertState] = useState<{ estimateId: string; loading: boolean } | null>(null);
  const [cloneLoadingId, setCloneLoadingId] = useState<string | null>(null);
  const [perPageOpen, setPerPageOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if ((searchQueryProp ?? "").trim() !== "") setSearchInput(searchQueryProp);
  }, [searchQueryProp]);

  const showFooter = totalCount != null && page != null && perPage != null;
  const totalPages = perPage != null && perPage > 0 ? Math.max(1, Math.ceil((totalCount ?? 0) / perPage)) : 1;
  const startItem = (totalCount ?? 0) === 0 ? 0 : ((page ?? 1) - 1) * (perPage ?? 0) + 1;
  const endItem = (totalCount ?? 0) === 0 ? 0 : Math.min((page ?? 1) * (perPage ?? 0), totalCount ?? 0);

  const filtered = estimates;
  const qs = (params: { page?: number; perPage?: number; q?: string; customerId?: string | null }) => {
    const p = new URLSearchParams();
    p.set("page", String(params.page ?? page ?? 1));
    p.set("perPage", String(params.perPage ?? perPage ?? 100));
    const q = params.q !== undefined ? params.q : searchQueryProp;
    if (q && q.trim()) p.set("q", q.trim());
    if (params.customerId) p.set("customerId", params.customerId);
    return `/dashboard/estimates?${p.toString()}`;
  };

  const clearCustomerFilterUrl = () => {
    const p = new URLSearchParams();
    p.set("page", String(page ?? 1));
    p.set("perPage", String(perPage ?? 100));
    if (searchQueryProp?.trim()) p.set("q", searchQueryProp.trim());
    return `/dashboard/estimates?${p.toString()}`;
  };

  const listParams = () => {
    const p = new URLSearchParams();
    p.set("page", String(page ?? 1));
    p.set("perPage", String(perPage ?? 100));
    if (searchInput.trim()) p.set("q", searchInput.trim());
    if (filterCustomerId) p.set("customerId", filterCustomerId);
    return p.toString();
  };
  const estimateHref = (estimateId: string) => {
    const query = listParams();
    return `/dashboard/estimates/${estimateId}${query ? `?${query}` : ""}`;
  };
  const estimateEditHref = (estimateId: string) => {
    const query = listParams();
    return `/dashboard/estimates/${estimateId}/edit${query ? `?${query}` : ""}`;
  };

  const activeId = pathname.startsWith("/dashboard/estimates/") && pathname !== "/dashboard/estimates" && pathname !== "/dashboard/estimates/new" && pathname !== "/dashboard/estimates/import"
    ? pathname.replace("/dashboard/estimates/", "").split("/")[0]
    : null;

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((e) => selectedIds.has(e.id));

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
      const filteredIds = new Set(filtered.map((e) => e.id));
      setSelectedIds((prev) => new Set([...prev].filter((id) => !filteredIds.has(id))));
    } else {
      setSelectedIds((prev) => new Set([...prev, ...filtered.map((e) => e.id)]));
    }
  }

  const canConvert = (status: string) =>
    status !== "Converted" && status !== "Expired";

  const ROW_HEIGHT_ESTIMATE = 92;
  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT_ESTIMATE,
    overscan: 8,
  });

  function openDelete(e: React.MouseEvent, estimateId: string) {
    e.preventDefault();
    e.stopPropagation();
    setDeleteState({ type: "single", estimateId, loading: false });
  }

  function openBulkDelete() {
    setDeleteState({ type: "bulk", loading: false });
  }

  function openConvert(e: React.MouseEvent, estimateId: string) {
    e.preventDefault();
    e.stopPropagation();
    setConvertState({ estimateId, loading: false });
  }

  async function confirmDelete() {
    if (!deleteState) return;
    setDeleteState((prev) => (prev ? { ...prev, loading: true } : null));
    startGlobalProcessing("Deleting…");
    try {
      if (deleteState.type === "single") {
        const result = await deleteEstimate(deleteState.estimateId);
        setDeleteState(null);
        if (result?.error) {
          endGlobalProcessing({ error: result.error });
          return;
        }
        endGlobalProcessing({ success: "Estimate deleted." });
        router.refresh();
        router.push("/dashboard/estimates");
      } else {
        const ids = Array.from(selectedIds);
        const result = await deleteEstimates(companyId, ids);
        setDeleteState(null);
        if (result?.error) {
          endGlobalProcessing({ error: result.error });
          return;
        }
        const msg = result.deletedCount === 1 ? "Estimate deleted." : "Estimates deleted.";
        endGlobalProcessing({ success: msg });
        setSelectedIds(new Set());
        router.refresh();
        if (ids.includes(activeId ?? "")) router.push("/dashboard/estimates");
      }
    } finally {
      endGlobalProcessing();
    }
  }

  async function confirmConvert() {
    if (!convertState) return;
    setConvertState((prev) => (prev ? { ...prev, loading: true } : null));
    startGlobalProcessing("Converting to invoice…");
    try {
      const result = await convertEstimateToInvoice(convertState.estimateId);
      setConvertState(null);
      if (result?.error) {
        endGlobalProcessing({ error: result.error });
        return;
      }
      endGlobalProcessing({ success: "Invoice created." });
      router.refresh();
      if (result.invoiceId) router.push(`/dashboard/sales/${result.invoiceId}`);
    } finally {
      endGlobalProcessing();
    }
  }

  async function handleClone(e: React.MouseEvent, estimateId: string) {
    e.preventDefault();
    e.stopPropagation();
    setCloneLoadingId(estimateId);
    startGlobalProcessing("Cloning estimate…");
    try {
      const result = await cloneEstimate(estimateId);
      setCloneLoadingId(null);
      if (result?.error) {
        endGlobalProcessing({ error: result.error });
        return;
      }
      endGlobalProcessing({ success: "Estimate cloned." });
      router.refresh();
      if (result.estimateId) router.push(estimateEditHref(result.estimateId));
    } finally {
      endGlobalProcessing();
    }
  }

  const inputClass =
    "w-full border border-[var(--color-input-border)] rounded-xl px-3 py-2 text-sm text-[var(--color-on-surface)] bg-[var(--color-input-bg)] placeholder:text-[var(--color-on-surface-variant)] transition-colors duration-200 focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";

  return (
    <>
      <div className="flex h-full flex-col border-r border-[var(--color-outline)] bg-base">
        <div className="flex flex-shrink-0 flex-col gap-2 px-3 pt-3 pb-2">
          <div className="relative flex items-center">
            <input
              type="search"
              placeholder="Search estimates… (press Enter to search)"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const q = searchInput.trim();
                  router.push(qs({ page: 1, perPage: perPage ?? 100, q: q || undefined }));
                }
              }}
              className={inputClass + " input-no-search-cancel min-h-[2rem] pr-9"}
              aria-label="Search estimates"
            />
            {searchInput.trim() !== "" && (
              <IconButton
                variant="secondary"
                icon={<X className="w-4 h-4" />}
                label="Clear search"
                onClick={() => {
                  setSearchInput("");
                  router.push(qs({ page: 1, q: "" }));
                }}
                className="absolute right-1 top-1/2 -translate-y-1/2 shrink-0 rounded-md p-1.5 text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-variant)] hover:text-[var(--color-on-surface)]"
              />
            )}
          </div>
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
              {estimates.length === 0 ? "No estimates yet" : "No matches"}
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
                const e = filtered[virtualRow.index];
                const isActive = activeId === e.id;
                const isSelected = selectedIds.has(e.id);
                const cardClass = `flex items-start gap-2 rounded-xl border px-3 py-2.5 text-left transition-colors duration-200 ${
                  isActive
                    ? "border-[var(--color-primary)] bg-[var(--color-primary-container)]"
                    : "border-[var(--color-outline)] bg-surface hover:bg-[var(--color-surface-variant)]"
                }`;
                return (
                  <div
                    key={e.id}
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
                    <Link href={estimateHref(e.id)} className={`h-full ${cardClass}`}>
                      <label
                        className="flex shrink-0 cursor-pointer items-start pt-0.5"
                        onClick={(ev) => {
                          ev.preventDefault();
                          ev.stopPropagation();
                        }}
                      >
                        <input
                          key={`${e.id}-${isSelected}`}
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(e.id)}
                          className="rounded-md border-[var(--color-outline)]"
                          aria-label={`Select ${e.estimate_number}`}
                        />
                      </label>
                      <div className="flex flex-1 min-w-0 flex-col">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`truncate text-sm font-medium ${isActive ? "text-[var(--color-on-primary-container)]" : "text-[var(--color-card-text)]"}`}>
                            {e.estimate_number}
                          </span>
                          {e.estimate_date && (
                            <span className={`shrink-0 text-[10px] ${isActive ? "text-[var(--color-on-primary-container)]/80" : "text-[var(--color-on-surface-variant)]"}`}>
                              {formatEstimateDate(e.estimate_date)}
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center justify-between gap-2">
                          <span className={`truncate text-xs ${isActive ? "text-[var(--color-on-primary-container)]/90" : "text-[var(--color-card-text)]"}`}>
                            {e.customer_name || "—"}
                          </span>
                          <span className={`shrink-0 text-xs ${isActive ? "text-[var(--color-on-primary-container)]" : "text-[var(--color-card-text)]"}`}>
                            {e.total_amount != null ? Number(e.total_amount).toFixed(0) : "—"}
                          </span>
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                          <EstimateStatusBadge status={e.status} className="px-2 py-0.5 text-[10px]" />
                          <span className="flex items-center gap-1">
                            {canConvert(e.status) && (
                              <button
                                type="button"
                                onClick={(ev) => openConvert(ev, e.id)}
                                className="text-[10px] text-[var(--color-secondary)] hover:underline"
                              >
                                Convert
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(ev) => handleClone(ev, e.id)}
                              disabled={cloneLoadingId === e.id}
                              className={`shrink-0 rounded p-0.5 transition-colors ${isActive ? "text-[var(--color-on-primary-container)] hover:bg-[var(--color-on-primary-container)]/10 hover:text-[var(--color-on-primary-container)]" : "text-[var(--color-on-surface-variant)] hover:bg-[var(--color-secondary-bg)] hover:text-[var(--color-secondary)]"} ${cloneLoadingId === e.id ? "opacity-50" : ""}`}
                              aria-label="Clone estimate"
                              title="Clone to next estimate number"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(ev) => openDelete(ev, e.id)}
                              className={`shrink-0 rounded p-0.5 ${isActive ? "text-[var(--color-on-primary-container)] hover:bg-[var(--color-on-primary-container)]/10" : "text-[var(--color-error)] hover:bg-[var(--color-error-bg)]"}`}
                              aria-label="Delete"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </span>
                        </div>
                      </div>
                    </Link>
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
                              router.push(qs({ page: 1, perPage: n }));
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
        title={deleteState?.type === "bulk" ? "Delete estimates?" : "Delete estimate?"}
        message={
          deleteState?.type === "bulk"
            ? `Delete ${selectedIds.size} estimate${selectedIds.size !== 1 ? "s" : ""}? This cannot be undone.`
            : "This estimate will be removed. This cannot be undone."
        }
        confirmLabel="Delete"
        variant="danger"
        loading={deleteState?.type === "single" ? deleteState.loading : deleteState?.type === "bulk" ? deleteState.loading : false}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteState(null)}
      />
      <ConfirmDialog
        open={!!convertState}
        title="Convert to invoice?"
        message="A new draft sales invoice will be created from this estimate."
        confirmLabel="Convert"
        variant="primary"
        loadingLabel="Converting…"
        loading={convertState?.loading ?? false}
        onConfirm={confirmConvert}
        onCancel={() => setConvertState(null)}
      />
    </>
  );
}
