"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EstimateForm, type EstimateListItem } from "./EstimateForm";
import {
  deleteEstimate,
  convertEstimateToInvoice,
} from "./actions";
import { showMessage } from "@/components/MessageBar";

export function EstimateList({
  estimates: initialEstimates,
  customers,
  companyId,
}: {
  estimates: EstimateListItem[];
  customers: { id: string; name: string }[];
  companyId: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEstimateId, setEditingEstimateId] = useState<string | null>(null);
  const [deleteState, setDeleteState] = useState<{
    estimateId: string;
    loading: boolean;
  } | null>(null);
  const [convertState, setConvertState] = useState<{
    estimateId: string;
    loading: boolean;
  } | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return initialEstimates;
    return initialEstimates.filter(
      (e) =>
        e.estimate_number.toLowerCase().includes(q) ||
        e.customer_name.toLowerCase().includes(q) ||
        (e.status?.toLowerCase().includes(q) ?? false)
    );
  }, [initialEstimates, search]);

  const canConvert = (status: string) =>
    status !== "Converted" && status !== "Declined" && status !== "Expired";

  function openAdd() {
    setEditingEstimateId(null);
    setModalOpen(true);
  }

  function openEdit(estimateId: string) {
    setEditingEstimateId(estimateId);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingEstimateId(null);
    router.refresh();
  }

  function openDelete(estimateId: string) {
    setDeleteState({ estimateId, loading: false });
  }

  async function confirmDelete() {
    if (!deleteState) return;
    setDeleteState((prev) => (prev ? { ...prev, loading: true } : null));
    const result = await deleteEstimate(deleteState.estimateId);
    setDeleteState(null);
    if (result?.error) {
      showMessage(result.error, "error");
      return;
    }
    router.refresh();
    showMessage("Estimate deleted.", "success");
  }

  function openConvert(estimateId: string) {
    setConvertState({ estimateId, loading: false });
  }

  async function confirmConvert() {
    if (!convertState) return;
    setConvertState((prev) => (prev ? { ...prev, loading: true } : null));
    const result = await convertEstimateToInvoice(convertState.estimateId);
    setConvertState(null);
    if (result?.error) {
      showMessage(result.error, "error");
      return;
    }
    router.refresh();
    showMessage("Invoice created from estimate.", "success");
    if (result.invoiceId) {
      router.push(`/dashboard/sales?created=${result.invoiceId}`);
    }
  }

  const inputClass =
    "w-full border border-[var(--color-outline)] rounded-lg px-3 py-2.5 text-[var(--color-on-surface)] bg-[var(--color-input-bg)] placeholder:text-[var(--color-on-surface-variant)]";

  return (
    <>
      <div className="p-4 sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            type="search"
            placeholder="Search by number, customer, or status…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={inputClass + " max-w-xs"}
            aria-label="Search estimates"
          />
          <button
            type="button"
            onClick={openAdd}
            className="btn btn-primary btn-sm shrink-0"
          >
            New estimate
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-lg border border-[var(--color-outline)] border-dashed p-8 text-center">
            <p className="text-sm text-[var(--color-on-surface-variant)]">
              {initialEstimates.length === 0
                ? "No estimates yet. Create a quotation to get started."
                : "No estimates match your search."}
            </p>
            {initialEstimates.length === 0 && (
              <button
                type="button"
                onClick={openAdd}
                className="btn btn-primary btn-sm mt-3"
              >
                New estimate
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
                    Status
                  </th>
                  <th className="p-3 font-medium text-[var(--color-on-surface)] text-right">
                    Total
                  </th>
                  <th className="w-40 p-3" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr
                    key={e.id}
                    className="border-b border-[var(--color-outline)] last:border-b-0 hover:bg-[var(--color-surface-variant)]/30"
                  >
                    <td className="p-3 font-medium text-[var(--color-on-surface)]">
                      {e.estimate_number}
                    </td>
                    <td className="p-3 text-[var(--color-on-surface-variant)]">
                      {e.estimate_date}
                    </td>
                    <td className="p-3 text-[var(--color-on-surface)]">
                      {e.customer_name || "—"}
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${
                          e.status === "Converted"
                            ? "bg-[var(--color-badge-success-bg)] text-[var(--color-badge-success-text)]"
                            : e.status === "Accepted" || e.status === "Sent"
                              ? "bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)]"
                              : "bg-[var(--color-surface-variant)] text-[var(--color-on-surface-variant)]"
                        }`}
                      >
                        {e.status}
                      </span>
                    </td>
                    <td className="p-3 text-right font-medium text-[var(--color-on-surface)]">
                      {e.total_amount != null
                        ? Number(e.total_amount).toFixed(2)
                        : "—"}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(e.id)}
                          className="btn btn-secondary btn-sm"
                        >
                          Edit
                        </button>
                        {canConvert(e.status) && (
                          <button
                            type="button"
                            onClick={() => openConvert(e.id)}
                            className="btn btn-primary btn-sm"
                          >
                            Convert
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openDelete(e.id)}
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
        title={editingEstimateId ? "Edit estimate" : "New estimate"}
      >
        <EstimateForm
          estimateId={editingEstimateId}
          companyId={companyId}
          customers={customers}
          onSuccess={closeModal}
          onCancel={closeModal}
        />
      </Modal>

      <ConfirmDialog
        open={!!deleteState}
        title="Delete estimate?"
        message="This estimate will be removed. This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={deleteState?.loading ?? false}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteState(null)}
      />

      <ConfirmDialog
        open={!!convertState}
        title="Convert to invoice?"
        message="A new draft sales invoice will be created from this estimate. You can edit it before sending."
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
