"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, FileOutput } from "lucide-react";
import { Modal } from "@/components/Modal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { IconButton } from "@/components/IconButton";
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
    "w-full border border-[var(--color-outline)] rounded-xl px-3 py-2.5 text-[var(--color-on-surface)] bg-[var(--color-input-bg)] placeholder:text-[var(--color-on-surface-variant)] transition-colors duration-200 focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";

  return (
    <>
      <div className="flex flex-col">
        <div className="flex flex-shrink-0 items-center justify-between gap-4 border-b border-[var(--color-divider)] px-5 py-4">
          <input
            type="search"
            placeholder="Search estimates…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={inputClass + " max-w-[240px] min-w-0"}
            aria-label="Search estimates"
          />
          <IconButton variant="add" icon={<Plus className="w-4 h-4" />} label="New estimate" onClick={openAdd} />
        </div>

        <div className="flex flex-col gap-4 p-5">
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--color-outline)] bg-[var(--color-surface-variant)]/30 px-6 py-10 text-center">
              <p className="text-sm text-[var(--color-on-surface-variant)]">
                {initialEstimates.length === 0 ? "No estimates yet." : "No matches."}
              </p>
              {initialEstimates.length === 0 && (
                <IconButton variant="add" icon={<Plus className="w-4 h-4" />} label="New estimate" onClick={openAdd} className="mt-3" />
              )}
            </div>
          ) : (
            <div className="max-h-[70vh] overflow-auto space-y-3">
              {filtered.map((e) => (
                <div
                  key={e.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--color-outline)] bg-[var(--color-card-bg)] p-4 transition-colors hover:bg-[var(--color-surface-variant)]"
                >
                  <div className="min-w-0 flex-1 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-1 items-center">
                    <div>
                      <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-on-surface-variant)]">Number</span>
                      <p className="truncate font-medium text-[var(--color-on-surface)]" title={e.estimate_number}>{e.estimate_number}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-on-surface-variant)]">Date</span>
                      <p className="text-[var(--color-on-surface)]">{e.estimate_date}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-on-surface-variant)]">Customer</span>
                      <p className="truncate text-[var(--color-on-surface)]" title={e.customer_name || undefined}>{e.customer_name || "—"}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-on-surface-variant)]">Status</span>
                      <p>
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${e.status === "Converted" ? "bg-[var(--color-badge-success-bg)] text-[var(--color-badge-success-text)]" : e.status === "Accepted" || e.status === "Sent" ? "bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)]" : "bg-[var(--color-surface-variant)] text-[var(--color-on-surface-variant)]"}`}>{e.status}</span>
                      </p>
                    </div>
                    <div>
                      <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-on-surface-variant)]">Total</span>
                      <p className="font-medium tabular-nums text-[var(--color-on-surface)]">{e.total_amount != null ? Number(e.total_amount).toFixed(2) : "—"}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 justify-end gap-2">
                    <IconButton variant="edit" icon={<Pencil className="w-4 h-4" />} label="Edit" onClick={() => openEdit(e.id)} />
                    {canConvert(e.status) && <IconButton variant="primary" icon={<FileOutput className="w-4 h-4" />} label="Convert to invoice" onClick={() => openConvert(e.id)} />}
                    <IconButton variant="danger" icon={<Trash2 className="w-4 h-4" />} label="Delete" onClick={() => openDelete(e.id)} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
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
