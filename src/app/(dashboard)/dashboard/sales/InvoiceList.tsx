"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Modal } from "@/components/Modal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { IconButton } from "@/components/IconButton";
import { InvoiceForm, type InvoiceListItem } from "./InvoiceForm";
import { deleteInvoice } from "./actions";
import { startGlobalProcessing, endGlobalProcessing } from "@/components/GlobalProcessing";

export function InvoiceList({
  invoices: initialInvoices,
  customers,
  companyId,
  createdId,
}: {
  invoices: InvoiceListItem[];
  customers: { id: string; name: string }[];
  companyId: string;
  createdId?: string | null;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [deleteState, setDeleteState] = useState<{
    invoiceId: string;
    loading: boolean;
  } | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return initialInvoices;
    return initialInvoices.filter(
      (inv) =>
        inv.invoice_number.toLowerCase().includes(q) ||
        inv.customer_name.toLowerCase().includes(q) ||
        (inv.estimate_number?.toLowerCase().includes(q) ?? false) ||
        (inv.status?.toLowerCase().includes(q) ?? false)
    );
  }, [initialInvoices, search]);

  function openAdd() {
    setEditingInvoiceId(null);
    setModalOpen(true);
  }

  function openEdit(invoiceId: string) {
    setEditingInvoiceId(invoiceId);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingInvoiceId(null);
    router.refresh();
  }

  function openDelete(invoiceId: string) {
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
    } finally {
      endGlobalProcessing();
    }
  }

  const inputClass =
    "w-full border border-[var(--color-input-border)] rounded-xl px-3 py-2.5 text-[var(--color-on-surface)] bg-[var(--color-input-bg)] placeholder:text-[var(--color-on-surface-variant)] transition-colors duration-200 focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";

  return (
    <>
      <div className="flex flex-col">
        <div className="flex flex-shrink-0 items-center justify-between gap-4 border-b border-[var(--color-divider)] px-5 py-4">
          <input
            type="search"
            placeholder="Search invoices…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={inputClass + " max-w-[240px] min-w-0"}
            aria-label="Search invoices"
          />
          <IconButton variant="add" icon={<Plus className="w-4 h-4" />} label="New invoice" onClick={openAdd} />
        </div>

        <div className="flex flex-col gap-4 p-5">
          {createdId && (
            <div className="rounded-xl border border-[var(--color-primary)] bg-[var(--color-primary-container)] px-4 py-2 text-sm text-[var(--color-on-primary-container)]">
              Invoice created. Edit below.
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--color-outline)] bg-[var(--color-surface-variant)]/30 px-6 py-10 text-center">
              <p className="text-sm text-[var(--color-on-surface-variant)]">
                {initialInvoices.length === 0 ? "No invoices yet." : "No matches."}
              </p>
              {initialInvoices.length === 0 && (
                <IconButton variant="add" icon={<Plus className="w-4 h-4" />} label="New invoice" onClick={openAdd} className="mt-3" />
              )}
            </div>
          ) : (
            <div className="max-h-[70vh] overflow-auto rounded-xl border border-[var(--color-outline)]">
              <table className="w-full min-w-0 text-left text-sm lg:min-w-[600px]">
                <thead className="sticky top-0 z-10 bg-[var(--color-surface-variant)] shadow-[0_1px_0_0_var(--color-divider)]">
                  <tr>
                    <th className="p-3 font-medium text-[var(--color-on-surface)]">Number</th>
                    <th className="hidden p-3 font-medium text-[var(--color-on-surface)] lg:table-cell">Date</th>
                    <th className="p-3 font-medium text-[var(--color-on-surface)]">Customer</th>
                    <th className="hidden p-3 font-medium text-[var(--color-on-surface)] lg:table-cell">From estimate</th>
                    <th className="hidden p-3 font-medium text-[var(--color-on-surface)] lg:table-cell">Status</th>
                    <th className="w-24 shrink-0 p-3 text-right font-medium text-[var(--color-on-surface)]">Total</th>
                    <th className="w-28 shrink-0 p-3 text-right" aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inv) => (
                    <tr key={inv.id} className={`border-b border-[var(--color-divider)] last:border-b-0 even:bg-[var(--color-surface-variant)]/10 hover:bg-[var(--color-primary-container)]/20 transition-colors duration-150 ${createdId === inv.id ? "bg-[var(--color-primary-container)]/30" : ""}`}>
                      <td className="max-w-[120px] truncate p-3 font-medium text-[var(--color-on-surface)]" title={inv.invoice_number}>{inv.invoice_number}</td>
                      <td className="hidden whitespace-nowrap p-3 text-[var(--color-on-surface-variant)] lg:table-cell">{inv.invoice_date}</td>
                      <td className="max-w-[180px] truncate p-3 text-[var(--color-on-surface)]" title={inv.customer_name || undefined}>{inv.customer_name || "—"}</td>
                      <td className="hidden max-w-[120px] truncate p-3 text-[var(--color-on-surface-variant)] lg:table-cell" title={inv.estimate_number || undefined}>{inv.estimate_number ?? "—"}</td>
                      <td className="hidden p-3 lg:table-cell">
                        <span className="invoice-status-badge whitespace-nowrap" data-status={inv.status?.toLowerCase() ?? "draft"}>{inv.status}</span>
                      </td>
                      <td className="w-24 shrink-0 p-3 text-right font-medium tabular-nums text-[var(--color-on-surface)]">{inv.total_amount != null ? Number(inv.total_amount).toFixed(2) : "—"}</td>
                      <td className="w-28 shrink-0 p-3 text-right">
                        <div className="flex justify-end gap-2">
                          <IconButton variant="edit" icon={<Pencil className="w-4 h-4" />} label="Edit" onClick={() => openEdit(inv.id)} />
                          <IconButton variant="danger" icon={<Trash2 className="w-4 h-4" />} label="Delete" onClick={() => openDelete(inv.id)} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingInvoiceId ? "Edit invoice" : "New invoice"}
      >
        <InvoiceForm
          invoiceId={editingInvoiceId}
          companyId={companyId}
          customers={customers}
          onSuccess={closeModal}
          onCancel={closeModal}
        />
      </Modal>

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
