"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Trash2, X, ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { useGlobalSearch } from "@/components/global-search/useGlobalSearch";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { IconButton } from "@/components/IconButton";
import { PerPageDropdown } from "@/components/PerPageDropdown";
import { deleteCustomers } from "./actions";
import { startGlobalProcessing, endGlobalProcessing } from "@/components/GlobalProcessing";

export type CustomerSidebarItem = {
  id: string;
  name: string;
  ntn_cnic: string;
};

export function CustomerSidebar({
  customers,
  companyId,
  selectedIds,
  onSelectionChange,
  totalCount,
  page,
  perPage,
  perPageOptions = [50, 100, 200],
  searchQuery: searchQueryProp = "",
}: {
  customers: CustomerSidebarItem[];
  companyId: string;
  selectedIds?: Set<string>;
  onSelectionChange?: React.Dispatch<React.SetStateAction<Set<string>>>;
  totalCount?: number;
  page?: number;
  perPage?: number;
  perPageOptions?: readonly number[];
  searchQuery?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const globalSearch = useGlobalSearch();
  const effectiveQuery = (globalSearch?.query ?? searchQueryProp ?? "").trim();
  const [deleteState, setDeleteState] = useState<{ loading: boolean } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectionMode = selectedIds !== undefined && onSelectionChange !== undefined;
  const filtered = useMemo(() => {
    if (!effectiveQuery) return customers;
    const q = effectiveQuery.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.ntn_cnic?.toLowerCase().includes(q) ?? false)
    );
  }, [customers, effectiveQuery]);

  const ROW_HEIGHT_ESTIMATE = 60;
  const CARD_GAP = 8; // pb-2, same as between customer cards
  const SELECTION_BAR_HEIGHT = 52;
  const hasSelectionBar = selectionMode && selectedIds && selectedIds.size > 0;
  const selectionBarSpacer = SELECTION_BAR_HEIGHT + CARD_GAP;
  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT_ESTIMATE,
    overscan: 8,
  });

  const hasPagination = totalCount != null && page != null && perPage != null;
  const totalPages = perPage != null && perPage > 0 ? Math.max(1, Math.ceil((totalCount ?? 0) / perPage)) : 1;
  const startItem = (totalCount ?? 0) === 0 ? 0 : ((page ?? 1) - 1) * (perPage ?? 0) + 1;
  const endItem = (totalCount ?? 0) === 0 ? 0 : Math.min((page ?? 1) * (perPage ?? 0), totalCount ?? 0);

  const customerDetailQuery = () => {
    const p = new URLSearchParams();
    p.set("page", String(page ?? 1));
    p.set("perPage", String(perPage ?? 100));
    if (effectiveQuery) p.set("q", effectiveQuery);
    const s = p.toString();
    return s ? `?${s}` : "";
  };
  const qs = (params: { page?: number; perPage?: number; q?: string }) => {
    const p = new URLSearchParams();
    p.set("page", String(params.page ?? page ?? 1));
    p.set("perPage", String(params.perPage ?? perPage ?? 100));
    const q = params.q !== undefined ? params.q : effectiveQuery;
    if (q) p.set("q", q);
    return `/dashboard/customers?${p.toString()}`;
  };

  const isNew = pathname === "/dashboard/customers/new";
  const activeId =
    pathname.startsWith("/dashboard/customers/") &&
    pathname !== "/dashboard/customers" &&
    !isNew &&
    !pathname.startsWith("/dashboard/customers/import")
      ? pathname.replace("/dashboard/customers/", "").split("/")[0]
      : null;
  const highlightId = searchParams.get("highlight");
  const searchHasQuery = effectiveQuery !== "";
  const scrollToId = activeId ?? highlightId ?? (searchHasQuery && filtered[0]?.id) ?? null;

  useEffect(() => {
    if (!scrollToId) return;
    const idx = filtered.findIndex((c) => c.id === scrollToId);
    if (idx < 0) return;
    virtualizer.scrollToIndex(idx, { align: "auto", behavior: "auto" });
  }, [scrollToId, filtered, virtualizer]);

  useEffect(() => {
    if (!highlightId) return;
    const idx = filtered.findIndex((c) => c.id === highlightId);
    if (idx >= 0) {
      const p = new URLSearchParams(searchParams);
      p.delete("highlight");
      const qsClean = p.toString();
      router.replace(qsClean ? `/dashboard/customers?${qsClean}` : "/dashboard/customers", { scroll: false });
    }
  }, [highlightId, filtered, searchParams, router]);

  const allFilteredSelected =
    selectionMode && filtered.length > 0 && filtered.every((c) => selectedIds?.has(c.id));

  function toggleSelect(id: string) {
    if (!onSelectionChange) return;
    onSelectionChange((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (!onSelectionChange) return;
    if (allFilteredSelected) {
      const filteredIds = new Set(filtered.map((c) => c.id));
      onSelectionChange((prev) => new Set([...prev].filter((id) => !filteredIds.has(id))));
    } else {
      onSelectionChange((prev) => new Set([...prev, ...filtered.map((c) => c.id)]));
    }
  }

  async function confirmDelete() {
    if (!selectedIds?.size || !onSelectionChange) return;
    const ids = Array.from(selectedIds);
    setDeleteState({ loading: true });
    startGlobalProcessing("Deleting…");
    try {
      const result = await deleteCustomers(companyId, ids);
      setDeleteState(null);
      if (result?.error) {
        endGlobalProcessing({ error: result.error });
        return;
      }
      const msg =
        result.deletedCount === 1
          ? "Customer deleted."
          : "Customers deleted.";
      if (result.skippedCount && result.skippedCount > 0) {
        endGlobalProcessing({ success: `${msg} ${result.skippedCount} skipped (linked to estimates or invoices).` });
      } else {
        endGlobalProcessing({ success: msg });
      }
      onSelectionChange(new Set());
      router.refresh();
    } finally {
      endGlobalProcessing();
    }
  }

  return (
    <div className="flex h-full flex-col border-r border-[var(--color-outline)] bg-base">
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden pt-3">
        {selectionMode && selectedIds && selectedIds.size > 0 && (
          <div className="absolute left-3 right-3 top-0 z-10 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--color-divider)] bg-[var(--color-surface-variant)] px-3 py-2">
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
                onClick={() => setDeleteState({ loading: false })}
              />
              <IconButton
                variant="secondary"
                icon={<X className="w-4 h-4" />}
                label="Clear selection"
                onClick={() => onSelectionChange(new Set())}
              />
            </div>
          </div>
        )}
        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto px-3 pb-3"
        >
        {filtered.length === 0 ? (
          <div className="py-6 text-center text-sm text-[var(--color-on-surface-variant)]">
            {effectiveQuery ? "No matches" : "No customers yet"}
          </div>
        ) : (
          <div
            style={{
              height: `${virtualizer.getTotalSize() + (hasSelectionBar ? selectionBarSpacer : 0)}px`,
              position: "relative",
              width: "100%",
            }}
          >
            {hasSelectionBar && (
              <div aria-hidden style={{ height: selectionBarSpacer, flexShrink: 0 }} />
            )}
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const c = filtered[virtualRow.index];
              const isActive = activeId === c.id;
              const isSelected = selectionMode && selectedIds?.has(c.id);
              const cardClass = `flex items-start gap-2 rounded-xl border px-3 py-2.5 text-left transition-colors duration-200 ${
                isActive
                  ? "border-[var(--color-primary)] bg-[var(--color-primary-container)]"
                  : "border-[var(--color-outline)] bg-surface hover:bg-[var(--color-surface-variant)]"
              }`;
              const content = (
                <>
                  <div className={`truncate text-sm font-medium ${selectionMode ? "flex-1 min-w-0" : ""} text-[var(--color-card-text)]`}>
                    {isActive ? (
                      <span className="text-[var(--color-on-primary-container)]">
                        {c.name || "—"}
                      </span>
                    ) : (
                      c.name || "—"
                    )}
                  </div>
                  <div
                    className={`mt-0.5 truncate text-xs ${
                      isActive
                        ? "text-[var(--color-on-primary-container)]/90"
                        : "text-[var(--color-on-surface-variant)]"
                    }`}
                  >
                    {c.ntn_cnic ? `NTN: ${c.ntn_cnic}` : "—"}
                  </div>
                </>
              );
              return (
                <div
                  key={c.id}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${(hasSelectionBar ? selectionBarSpacer : 0) + virtualRow.start}px)`,
                  }}
                  className="pb-2"
                >
                  {selectionMode ? (
                    <Link href={`/dashboard/customers/${c.id}${customerDetailQuery()}`} scroll={false} className={`block h-full ${cardClass}`}>
                      <span
                        className="flex shrink-0 cursor-pointer items-center pt-0.5"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (e.target === e.currentTarget) toggleSelect(c.id);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleSelect(c.id);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        aria-label={isSelected ? `Deselect ${c.name}` : `Select ${c.name}`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(c.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded-md border-[var(--color-outline)]"
                          aria-hidden
                          tabIndex={-1}
                        />
                      </span>
                      <span className="min-w-0 flex-1 block">{content}</span>
                    </Link>
                  ) : (
                    <Link href={`/dashboard/customers/${c.id}${customerDetailQuery()}`} scroll={false} className={`block h-full ${cardClass}`}>
                      {content}
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
        </div>
      </div>

      {hasPagination && (
        <div className="flex flex-shrink-0 flex-col gap-2 border-t border-[var(--color-outline)] bg-[var(--color-surface-variant)]/30 px-3 py-2">
          <p className="text-xs font-medium text-[var(--color-on-surface-variant)]">
            {startItem}–{endItem} of {totalCount!.toLocaleString()}
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

      <ConfirmDialog
        open={!!deleteState}
        title="Delete customers?"
        message={
          selectedIds && selectedIds.size === 1
            ? "This customer will be removed. Customers with estimates or invoices cannot be deleted."
            : `Delete ${selectedIds?.size ?? 0} customers? Those linked to estimates or invoices will be skipped.`
        }
        confirmLabel="Delete"
        variant="danger"
        loading={deleteState?.loading ?? false}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteState(null)}
      />
    </div>
  );
}
