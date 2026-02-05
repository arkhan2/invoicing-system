"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { CustomerForm, type Customer } from "./CustomerForm";
import { deleteCustomer, deleteCustomers } from "./actions";
import { showMessage } from "@/components/MessageBar";

export function CustomerList({
  customers: initialCustomers,
  companyId,
}: {
  customers: Customer[];
  companyId: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deleteState, setDeleteState] = useState<
    { ids: string[]; loading: boolean } | null
  >(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return initialCustomers;
    return initialCustomers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.email?.toLowerCase().includes(q) ?? false) ||
        (c.phone?.toLowerCase().includes(q) ?? false)
    );
  }, [initialCustomers, search]);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((c) => selectedIds.has(c.id));

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

  function openAdd() {
    setEditingCustomer(null);
    setModalOpen(true);
  }

  function openEdit(c: Customer) {
    setEditingCustomer(c);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingCustomer(null);
    router.refresh();
  }

  function openDeleteOne(id: string) {
    setDeleteState({ ids: [id], loading: false });
  }

  function openDeleteSelected() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setDeleteState({ ids, loading: false });
  }

  async function confirmDelete() {
    if (!deleteState) return;
    setDeleteState((prev) => (prev ? { ...prev, loading: true } : null));
    if (deleteState.ids.length === 1) {
      await deleteCustomer(deleteState.ids[0]);
    } else {
      await deleteCustomers(deleteState.ids);
    }
    setDeleteState(null);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      deleteState.ids.forEach((id) => next.delete(id));
      return next;
    });
    router.refresh();
    showMessage(
      deleteState.ids.length === 1 ? "Customer deleted." : "Customers deleted.",
      "success"
    );
  }

  const inputClass =
    "w-full border border-[var(--color-outline)] rounded-lg px-3 py-2.5 text-[var(--color-on-surface)] bg-[var(--color-input-bg)] placeholder:text-[var(--color-on-surface-variant)] transition-colors focus:border-[var(--color-primary)]";

  return (
    <>
      <div className="p-4 sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            type="search"
            placeholder="Search by name, email, or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={inputClass + " max-w-xs"}
            aria-label="Search customers"
          />
          <button
            type="button"
            onClick={openAdd}
            className="btn btn-primary btn-sm shrink-0"
          >
            Add customer
          </button>
        </div>

        {selectedIds.size > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-[var(--color-outline)] bg-[var(--color-surface-variant)]/50 px-4 py-2">
            <span className="text-sm text-[var(--color-on-surface-variant)]">
              {selectedIds.size} selected
            </span>
            <button
              type="button"
              onClick={openDeleteSelected}
              className="btn btn-danger btn-sm"
            >
              Delete selected
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="btn btn-secondary btn-sm"
            >
              Clear selection
            </button>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="rounded-lg border border-[var(--color-outline)] border-dashed p-8 text-center">
            <p className="text-sm text-[var(--color-on-surface-variant)]">
              {initialCustomers.length === 0
                ? "No customers yet. Add your first customer."
                : "No customers match your search."}
            </p>
            {initialCustomers.length === 0 && (
              <button
                type="button"
                onClick={openAdd}
                className="btn btn-primary btn-sm mt-3"
              >
                Add customer
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[var(--color-outline)]">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-outline)] bg-[var(--color-surface-variant)]/50">
                  <th className="w-10 p-3">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={allFilteredSelected}
                        onChange={toggleSelectAll}
                        className="rounded border-[var(--color-outline)]"
                        aria-label="Select all"
                      />
                    </label>
                  </th>
                  <th className="p-3 font-medium text-[var(--color-on-surface)]">
                    Name
                  </th>
                  <th className="p-3 font-medium text-[var(--color-on-surface)]">
                    Contact
                  </th>
                  <th className="p-3 font-medium text-[var(--color-on-surface)]">
                    Address / Province
                  </th>
                  <th className="p-3 font-medium text-[var(--color-on-surface)]">
                    Registration
                  </th>
                  <th className="w-24 p-3" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-[var(--color-outline)] last:border-b-0 hover:bg-[var(--color-surface-variant)]/30"
                  >
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(c.id)}
                        onChange={() => toggleSelect(c.id)}
                        className="rounded border-[var(--color-outline)]"
                        aria-label={`Select ${c.name}`}
                      />
                    </td>
                    <td className="p-3 font-medium text-[var(--color-on-surface)]">
                      {c.name}
                    </td>
                    <td className="p-3 text-[var(--color-on-surface-variant)]">
                      {[c.email, c.phone].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td className="p-3 text-[var(--color-on-surface-variant)]">
                      {[c.address, c.city, c.province].filter(Boolean).join(", ") || "—"}
                    </td>
                    <td className="p-3 text-[var(--color-on-surface-variant)]">
                      {c.registration_type ?? "—"}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(c)}
                          className="text-[var(--color-primary)] hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => openDeleteOne(c.id)}
                          className="text-[var(--color-error)] hover:underline"
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
        title={editingCustomer ? "Edit customer" : "Add customer"}
      >
        <CustomerForm
          customer={editingCustomer}
          companyId={companyId}
          onSuccess={closeModal}
          onCancel={closeModal}
        />
      </Modal>

      <ConfirmDialog
        open={!!deleteState}
        title="Delete customer?"
        message={
          deleteState?.ids.length === 1
            ? "This customer will be removed. This cannot be undone."
            : `Delete ${deleteState?.ids.length ?? 0} customers? This cannot be undone.`
        }
        confirmLabel="Delete"
        variant="danger"
        loading={deleteState?.loading ?? false}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteState(null)}
      />
    </>
  );
}
