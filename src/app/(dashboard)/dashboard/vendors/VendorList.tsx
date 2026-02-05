"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { VendorForm, type Vendor } from "./VendorForm";
import { deleteVendor, deleteVendors } from "./actions";
import { showMessage } from "@/components/MessageBar";

export function VendorList({
  vendors: initialVendors,
  companyId,
}: {
  vendors: Vendor[];
  companyId: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [deleteState, setDeleteState] = useState<
    { ids: string[]; loading: boolean } | null
  >(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return initialVendors;
    return initialVendors.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        (v.email?.toLowerCase().includes(q) ?? false) ||
        (v.phone?.toLowerCase().includes(q) ?? false)
    );
  }, [initialVendors, search]);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((v) => selectedIds.has(v.id));

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
        filtered.forEach((v) => next.delete(v.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((v) => next.add(v.id));
        return next;
      });
    }
  }

  function openAdd() {
    setEditingVendor(null);
    setModalOpen(true);
  }

  function openEdit(v: Vendor) {
    setEditingVendor(v);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingVendor(null);
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
      await deleteVendor(deleteState.ids[0]);
    } else {
      await deleteVendors(deleteState.ids);
    }
    setDeleteState(null);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      deleteState.ids.forEach((id) => next.delete(id));
      return next;
    });
    router.refresh();
    showMessage(
      deleteState.ids.length === 1 ? "Vendor deleted." : "Vendors deleted.",
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
            aria-label="Search vendors"
          />
          <button
            type="button"
            onClick={openAdd}
            className="btn btn-primary btn-sm shrink-0"
          >
            Add vendor
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
              {initialVendors.length === 0
                ? "No vendors yet. Add your first vendor."
                : "No vendors match your search."}
            </p>
            {initialVendors.length === 0 && (
              <button
                type="button"
                onClick={openAdd}
                className="btn btn-primary btn-sm mt-3"
              >
                Add vendor
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[var(--color-outline)]">
            <table className="w-full min-w-[500px] text-left text-sm">
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
                  <th className="w-24 p-3" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((v) => (
                  <tr
                    key={v.id}
                    className="border-b border-[var(--color-outline)] last:border-b-0 hover:bg-[var(--color-surface-variant)]/30"
                  >
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(v.id)}
                        onChange={() => toggleSelect(v.id)}
                        className="rounded border-[var(--color-outline)]"
                        aria-label={`Select ${v.name}`}
                      />
                    </td>
                    <td className="p-3 font-medium text-[var(--color-on-surface)]">
                      {v.name}
                    </td>
                    <td className="p-3 text-[var(--color-on-surface-variant)]">
                      {[v.email, v.phone].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td className="p-3 text-[var(--color-on-surface-variant)]">
                      {[v.address, v.city, v.province].filter(Boolean).join(", ") || "—"}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(v)}
                          className="text-[var(--color-primary)] hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => openDeleteOne(v.id)}
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
        title={editingVendor ? "Edit vendor" : "Add vendor"}
      >
        <VendorForm
          vendor={editingVendor}
          companyId={companyId}
          onSuccess={closeModal}
          onCancel={closeModal}
        />
      </Modal>

      <ConfirmDialog
        open={!!deleteState}
        title="Delete vendor?"
        message={
          deleteState?.ids.length === 1
            ? "This vendor will be removed. This cannot be undone."
            : `Delete ${deleteState?.ids.length ?? 0} vendors? This cannot be undone.`
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
