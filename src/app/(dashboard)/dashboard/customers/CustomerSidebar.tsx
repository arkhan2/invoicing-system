"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Trash2, X } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { IconButton } from "@/components/IconButton";
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
}: {
  customers: CustomerSidebarItem[];
  companyId: string;
  selectedIds?: Set<string>;
  onSelectionChange?: React.Dispatch<React.SetStateAction<Set<string>>>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [deleteState, setDeleteState] = useState<{ loading: boolean } | null>(null);
  const selectionMode = selectedIds !== undefined && onSelectionChange !== undefined;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.ntn_cnic?.toLowerCase().includes(q) ?? false)
    );
  }, [customers, search]);

  const isNew = pathname === "/dashboard/customers/new";
  const activeId =
    pathname.startsWith("/dashboard/customers/") &&
    pathname !== "/dashboard/customers" &&
    !isNew &&
    !pathname.startsWith("/dashboard/customers/import")
      ? pathname.replace("/dashboard/customers/", "").split("/")[0]
      : null;

  const activeItemRef = useRef<HTMLLIElement>(null);
  useEffect(() => {
    const fromSpreadsheet = searchParams.get("from") === "spreadsheet";
    if (!activeId || !fromSpreadsheet) return;
    const el = activeItemRef.current;
    if (!el) return;
    const id = requestAnimationFrame(() => {
      el.scrollIntoView({ block: "start", behavior: "auto" });
    });
    router.replace(pathname, { scroll: false });
    return () => cancelAnimationFrame(id);
  }, [activeId, pathname, router, searchParams]);

  const inputClass =
    "w-full border border-[var(--color-input-border)] rounded-xl px-3 py-2 text-sm text-[var(--color-on-surface)] bg-[var(--color-input-bg)] placeholder:text-[var(--color-on-surface-variant)] transition-colors duration-200 focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";

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
    <div className="flex h-full flex-col border-r border-[var(--color-outline)] bg-[var(--color-surface)]">
      <div className="flex flex-shrink-0 flex-col gap-2 px-3 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/customers/new"
            className={`btn btn-icon ${isNew ? "btn-primary" : "btn-add"}`}
            aria-label="New customer"
            title="New customer"
          >
            <Plus className="w-4 h-4" />
          </Link>
          <input
            type="search"
            placeholder="Search customers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={inputClass + " min-h-[2rem]"}
            aria-label="Search customers"
          />
        </div>
        {selectionMode && (
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
                {selectedIds?.size ?? 0} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <IconButton
                variant="danger"
                icon={<Trash2 className="w-4 h-4" />}
                label="Delete selected"
                onClick={() => setDeleteState({ loading: false })}
                disabled={!selectedIds?.size}
              />
              <IconButton
                variant="secondary"
                icon={<X className="w-4 h-4" />}
                label="Clear selection"
                onClick={() => onSelectionChange(new Set())}
                disabled={!selectedIds?.size}
              />
            </div>
          </div>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        {filtered.length === 0 ? (
          <div className="py-6 text-center text-sm text-[var(--color-on-surface-variant)]">
            {customers.length === 0 ? "No customers yet" : "No matches"}
          </div>
        ) : (
          <ul className="space-y-2" role="list">
            {filtered.map((c) => {
              const isActive = activeId === c.id;
              const isSelected = selectionMode && selectedIds?.has(c.id);
              const cardClass = `flex items-start gap-2 rounded-xl border px-3 py-2.5 text-left transition-colors duration-200 ${
                isActive
                  ? "border-[var(--color-primary)] bg-[var(--color-primary-container)]"
                  : "border-[var(--color-outline)] bg-[var(--color-card-bg)] hover:bg-[var(--color-surface-variant)]"
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
                <li key={c.id} ref={isActive ? activeItemRef : undefined}>
                  {selectionMode ? (
                    <Link href={`/dashboard/customers/${c.id}`} className={cardClass}>
                      <label
                        className="flex shrink-0 cursor-pointer items-center pt-0.5"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(c.id)}
                          className="rounded-md border-[var(--color-outline)]"
                          aria-label={`Select ${c.name}`}
                        />
                      </label>
                      <span className="min-w-0 flex-1 block">{content}</span>
                    </Link>
                  ) : (
                    <Link href={`/dashboard/customers/${c.id}`} className={cardClass}>
                      {content}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

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
