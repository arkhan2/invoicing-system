"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { deleteInvoice } from "./actions";
import { startGlobalProcessing, endGlobalProcessing } from "@/components/GlobalProcessing";
import type { InvoiceListItem } from "./InvoiceForm";

export function InvoiceSidebar({
  invoices,
  companyId,
  filterCustomerId,
}: {
  invoices: InvoiceListItem[];
  companyId: string;
  filterCustomerId?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [deleteState, setDeleteState] = useState<{ invoiceId: string; loading: boolean } | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return invoices;
    return invoices.filter(
      (inv) =>
        inv.invoice_number.toLowerCase().includes(q) ||
        inv.customer_name.toLowerCase().includes(q) ||
        (inv.estimate_number?.toLowerCase().includes(q) ?? false) ||
        (inv.status?.toLowerCase().includes(q) ?? false)
    );
  }, [invoices, search]);

  const isNew = pathname === "/dashboard/sales/new";
  const activeId = pathname.startsWith("/dashboard/sales/") && pathname !== "/dashboard/sales" && !isNew
    ? pathname.replace("/dashboard/sales/", "").split("/")[0]
    : null;

  function openDelete(e: React.MouseEvent, invoiceId: string) {
    e.preventDefault();
    e.stopPropagation();
    setDeleteState({ invoiceId, loading: false });
  }

  async function confirmDelete() {
    if (!deleteState) return;
    setDeleteState((prev) => (prev ? { ...prev, loading: true } : null));
    startGlobalProcessing("Deleting…");
    try {
      const result = await deleteInvoice(deleteState.invoiceId);
      setDeleteState(null);
      if (result?.error) {
        endGlobalProcessing({ error: result.error });
        return;
      }
      endGlobalProcessing({ success: "Invoice deleted." });
      router.refresh();
      router.push("/dashboard/sales");
    } finally {
      endGlobalProcessing();
    }
  }

  const inputClass =
    "w-full border border-[var(--color-input-border)] rounded-xl px-3 py-2 text-sm text-[var(--color-on-surface)] bg-[var(--color-input-bg)] placeholder:text-[var(--color-on-surface-variant)] transition-colors duration-200 focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";

  return (
    <>
      <div className="flex h-full flex-col border-r border-[var(--color-outline)] bg-base">
        <div className="flex-shrink-0 p-3">
          <Link
            href="/dashboard/sales/new"
            className="btn btn-add btn-icon"
            aria-label="New invoice"
            title="New invoice"
          >
            <Plus className="w-4 h-4" />
          </Link>
        </div>
        <div className="flex flex-shrink-0 flex-col gap-2 px-3 pb-2">
          <input
            type="search"
            placeholder="Search invoices…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={inputClass}
            aria-label="Search invoices"
          />
          {filterCustomerId && (
            <div className="flex items-center gap-2 rounded-lg border border-[var(--color-outline)] bg-[var(--color-surface-variant)]/50 px-2 py-1.5 text-sm">
              <span className="truncate text-[var(--color-on-surface-variant)]">Filter: customer</span>
              <Link
                href="/dashboard/sales"
                className="shrink-0 font-medium text-[var(--color-primary)] hover:underline"
              >
                Clear
              </Link>
            </div>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pr-2">
          {filtered.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-[var(--color-on-surface-variant)]">
              {invoices.length === 0 ? "No invoices yet" : "No matches"}
            </div>
          ) : (
            <ul className="space-y-0.5 p-2" role="list">
              {filtered.map((inv) => {
                const isActive = activeId === inv.id;
                return (
                  <li key={inv.id}>
                    <Link
                      href={`/dashboard/sales/${inv.id}`}
                      className={`block rounded-xl border px-3 py-2.5 text-left transition-colors duration-200 ${
                        isActive
                          ? "border-[var(--color-primary)] bg-[var(--color-primary-container)]"
                          : "border-[var(--color-outline)] bg-surface hover:bg-[var(--color-surface-variant)]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`truncate text-sm font-medium ${isActive ? "text-[var(--color-on-primary-container)]" : "text-[var(--color-card-text)]"}`}>
                          {inv.invoice_number}
                        </span>
                        <span className={`shrink-0 text-xs ${isActive ? "text-[var(--color-on-primary-container)]" : "text-[var(--color-card-text)]"}`}>
                          {inv.total_amount != null ? Number(inv.total_amount).toFixed(0) : "—"}
                        </span>
                      </div>
                      <div className={`mt-0.5 truncate text-xs ${isActive ? "text-[var(--color-on-primary-container)]/90" : "text-[var(--color-card-text)]"}`}>
                        {inv.customer_name || "—"}
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            inv.status === "Final" || inv.status === "Sent"
                              ? "bg-[var(--color-badge-success-bg)] text-[var(--color-badge-success-text)]"
                              : "bg-[var(--color-surface-variant)] text-[var(--color-on-surface-variant)]"
                          }`}
                        >
                          {inv.status}
                        </span>
                        {inv.estimate_number && (
                          <span className="text-[10px] text-[var(--color-on-surface-variant)]" title="From estimate">
                            ← {inv.estimate_number}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(ev) => openDelete(ev, inv.id)}
                          className="text-[10px] text-[var(--color-error)] hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteState}
        title="Delete invoice?"
        message="This invoice will be removed. This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={deleteState?.loading ?? false}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteState(null)}
      />
    </>
  );
}
