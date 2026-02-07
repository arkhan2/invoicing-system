"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Modal } from "@/components/Modal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { IconButton } from "@/components/IconButton";
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
    "w-full border border-[var(--color-input-border)] rounded-xl px-3 py-2.5 text-[var(--color-on-surface)] bg-[var(--color-input-bg)] placeholder:text-[var(--color-on-surface-variant)] transition-colors duration-200 focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";

  return (
    <>
      <div className="flex flex-col">
        {/* Card header: filter left, primary action right */}
        <div className="flex flex-shrink-0 items-center justify-between gap-4 border-b border-[var(--color-divider)] px-5 py-4">
          <input
            type="search"
            placeholder="Search customers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={inputClass + " max-w-[240px] min-w-0"}
            aria-label="Search customers"
          />
          <IconButton variant="add" icon={<Plus className="w-4 h-4" />} label="Add customer" onClick={openAdd} />
        </div>

        {/* Card body */}
        <div className="flex flex-col gap-4 p-5">
          {selectedIds.size > 0 && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--color-divider)] bg-[var(--color-surface-variant)]/50 px-4 py-2">
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
                Clear
              </button>
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--color-outline)] bg-[var(--color-surface-variant)]/30 px-6 py-10 text-center">
              <p className="text-sm text-[var(--color-on-surface-variant)]">
                {initialCustomers.length === 0 ? "No customers yet." : "No matches."}
              </p>
              {initialCustomers.length === 0 && (
                <IconButton variant="add" icon={<Plus className="w-4 h-4" />} label="Add customer" onClick={openAdd} className="mt-3" />
              )}
            </div>
          ) : (
            <div className="max-h-[70vh] overflow-auto rounded-xl border border-[var(--color-outline)]">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead className="sticky top-0 z-10 bg-[var(--color-surface-variant)] shadow-[0_1px_0_0_var(--color-divider)]">
                  <tr>
                    <th className="w-10 p-3">
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={allFilteredSelected}
                          onChange={toggleSelectAll}
                          className="rounded-md border-[var(--color-outline)]"
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
                    <th className="w-28 shrink-0 p-3 text-right" aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-[var(--color-divider)] last:border-b-0 even:bg-[var(--color-surface-variant)]/10 hover:bg-[var(--color-primary-container)]/20 transition-colors duration-150"
                    >
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(c.id)}
                          onChange={() => toggleSelect(c.id)}
                          className="rounded-md border-[var(--color-outline)]"
                          aria-label={`Select ${c.name}`}
                        />
                      </td>
                      <td className="max-w-[200px] truncate p-3 font-medium text-[var(--color-on-surface)]" title={c.name}>
                        {c.name}
                      </td>
                      <td className="max-w-[180px] truncate p-3 text-[var(--color-on-surface-variant)]" title={[c.email, c.phone].filter(Boolean).join(" · ") || undefined}>
                        {[c.email, c.phone].filter(Boolean).join(" · ") || "—"}
                      </td>
                      <td className="max-w-[220px] truncate p-3 text-[var(--color-on-surface-variant)]" title={[c.address, c.city, c.province].filter(Boolean).join(", ") || undefined}>
                        {[c.address, c.city, c.province].filter(Boolean).join(", ") || "—"}
                      </td>
                      <td className="p-3 text-[var(--color-on-surface-variant)]">
                        {c.registration_type ?? "—"}
                      </td>
                      <td className="w-28 shrink-0 p-3 text-right">
                        <div className="flex justify-end gap-2">
                          <IconButton variant="edit" icon={<Pencil className="w-4 h-4" />} label="Edit" onClick={() => openEdit(c)} />
                          <IconButton variant="danger" icon={<Trash2 className="w-4 h-4" />} label="Delete" onClick={() => openDeleteOne(c.id)} />
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
