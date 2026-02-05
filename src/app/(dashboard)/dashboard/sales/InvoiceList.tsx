"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { InvoiceForm, type InvoiceListItem } from "./InvoiceForm";
import { deleteInvoice } from "./actions";
import { showMessage } from "@/components/MessageBar";

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
    const result = await deleteInvoice(deleteState.invoiceId);
    setDeleteState(null);
    if (result?.error) {
      showMessage(result.error, "error");
      return;
    }
    router.refresh();
    showMessage("Invoice deleted.", "success");
  }

  const inputClass =
    "w-full border border-[var(--color-outline)] rounded-lg px-3 py-2.5 text-[var(--color-on-surface)] bg-[var(--color-input-bg)] placeholder:text-[var(--color-on-surface-variant)]";

  return (
    <>
      <div className="p-4 sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            type="search"
            placeholder="Search by number, customer, or estimate…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={inputClass + " max-w-xs"}
            aria-label="Search invoices"
          />
          <button
            type="button"
            onClick={openAdd}
            className="btn btn-primary btn-sm shrink-0"
          >
            New invoice
          </button>
        </div>

        {createdId && (
          <div className="mb-4 rounded-lg border border-[var(--color-primary)] bg-[var(--color-primary-container)] px-4 py-2 text-sm text-[var(--color-on-primary-container)]">
            Invoice created. You can edit it below.
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="rounded-lg border border-[var(--color-outline)] border-dashed p-8 text-center">
            <p className="text-sm text-[var(--color-on-surface-variant)]">
              {initialInvoices.length === 0
                ? "No sales invoices yet. Create one from scratch or convert an estimate."
                : "No invoices match your search."}
            </p>
            {initialInvoices.length === 0 && (
              <button
                type="button"
                onClick={openAdd}
                className="btn btn-primary btn-sm mt-3"
              >
                New invoice
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[var(--color-outline)]">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-outline)] bg-[var(--color-surface-variant)]/50">
                  <th className="p-3 font-medium text-[var(--color-on-surface)]">
                    Number
                  </th>
                  <th className="p-3 font-medium text-[var(--color-on-surface)]">
                    Date
                  </th>
                  <th className="p-3 font-medium text-[var(--color-on-surface)]">
                    Customer
                  </th>
                  <th className="p-3 font-medium text-[var(--color-on-surface)]">
                    From estimate
                  </th>
                  <th className="p-3 font-medium text-[var(--color-on-surface)]">
                    Status
                  </th>
                  <th className="p-3 font-medium text-[var(--color-on-surface)] text-right">
                    Total
                  </th>
                  <th className="w-28 p-3" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => (
                  <tr
                    key={inv.id}
                    className={`border-b border-[var(--color-outline)] last:border-b-0 hover:bg-[var(--color-surface-variant)]/30 ${createdId === inv.id ? "bg-[var(--color-primary-container)]/40" : ""}`}
                  >
                    <td className="p-3 font-medium text-[var(--color-on-surface)]">
                      {inv.invoice_number}
                    </td>
                    <td className="p-3 text-[var(--color-on-surface-variant)]">
                      {inv.invoice_date}
                    </td>
                    <td className="p-3 text-[var(--color-on-surface)]">
                      {inv.customer_name || "—"}
                    </td>
                    <td className="p-3 text-[var(--color-on-surface-variant)]">
                      {inv.estimate_number ? (
                        <span title="Created from estimate">{inv.estimate_number}</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${
                          inv.status === "Final" || inv.status === "Sent"
                            ? "bg-[var(--color-badge-success-bg)] text-[var(--color-badge-success-text)]"
                            : "bg-[var(--color-surface-variant)] text-[var(--color-on-surface-variant)]"
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="p-3 text-right font-medium text-[var(--color-on-surface)]">
                      {inv.total_amount != null
                        ? Number(inv.total_amount).toFixed(2)
                        : "—"}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(inv.id)}
                          className="btn btn-secondary btn-sm"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => openDelete(inv.id)}
                          className="btn btn-danger btn-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
