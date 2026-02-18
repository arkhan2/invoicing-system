"use client";

import { useState, useMemo, useImperativeHandle, forwardRef, useRef, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, FileSpreadsheet } from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { IconButton } from "@/components/IconButton";
import { type Item } from "./ItemForm";
import { deleteItem, deleteItems } from "./actions";
import { startGlobalProcessing, endGlobalProcessing } from "@/components/GlobalProcessing";

export type ItemListRef = {
  openAdd: () => void;
  openDeleteSelected: () => void;
  clearSelection: () => void;
};

type ItemListProps = {
  items: Item[];
  companyId: string;
  hideToolbar?: boolean;
  search?: string;
  onSearchChange?: (value: string) => void;
  selectedIds?: Set<string>;
  onSelectionChange?: React.Dispatch<React.SetStateAction<Set<string>>>;
  scrollToItemId?: string | null;
};

export const ItemList = forwardRef<ItemListRef, ItemListProps>(function ItemList(
  {
    items: initialItems,
    companyId,
    hideToolbar = false,
    search: controlledSearch,
    onSearchChange,
    selectedIds: controlledSelectedIds,
    onSelectionChange,
    scrollToItemId,
  },
  ref
) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [internalSearch, setInternalSearch] = useState("");
  const [internalSelectedIds, setInternalSelectedIds] = useState<Set<string>>(new Set());
  const search = controlledSearch !== undefined ? controlledSearch : internalSearch;
  const setSearch = onSearchChange ?? setInternalSearch;
  const selectedIds = controlledSelectedIds !== undefined ? controlledSelectedIds : internalSelectedIds;
  const setSelectedIds = onSelectionChange ?? setInternalSelectedIds;
  const [deleteState, setDeleteState] = useState<{ ids: string[]; loading: boolean } | null>(null);

  const scrollToRowRef = useRef<HTMLTableRowElement | null>(null);

  const itemDetailUrl = (id: string) => {
    if (!hideToolbar) return `/dashboard/items/${id}`;
    const p = new URLSearchParams();
    p.set("from", "spreadsheet");
    p.set("page", searchParams.get("page") ?? "1");
    p.set("perPage", searchParams.get("perPage") ?? "100");
    const q = searchParams.get("q") ?? "";
    if (q.trim()) p.set("q", q.trim());
    const qs = p.toString();
    return qs ? `/dashboard/items/${id}?${qs}` : `/dashboard/items/${id}`;
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return initialItems;
    return initialItems.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.description?.toLowerCase().includes(q) ?? false) ||
        (c.reference?.toLowerCase().includes(q) ?? false)
    );
  }, [initialItems, search]);

  useEffect(() => {
    if (!scrollToItemId || !scrollToRowRef.current) return;
    scrollToRowRef.current.scrollIntoView({ block: "nearest", behavior: "auto" });
  }, [scrollToItemId, filtered]);

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
    const p = new URLSearchParams();
    p.set("page", searchParams.get("page") ?? "1");
    p.set("perPage", searchParams.get("perPage") ?? "100");
    const q = searchParams.get("q") ?? "";
    if (q.trim()) p.set("q", q.trim());
    router.push(`/dashboard/items/new?${p.toString()}`);
  }

  function openEdit(c: Item) {
    const p = new URLSearchParams(searchParams);
    router.push(`/dashboard/items/${c.id}/edit?${p.toString()}`);
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
    const ids = deleteState.ids;
    setDeleteState((prev) => (prev ? { ...prev, loading: true } : null));
    startGlobalProcessing("Deleting…");
    try {
      if (ids.length === 1) {
        const result = await deleteItem(ids[0], companyId);
        if (result?.error) {
          endGlobalProcessing({ error: result.error });
          setDeleteState({ ids, loading: false });
          return;
        }
        setDeleteState(null);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          ids.forEach((id) => next.delete(id));
          return next;
        });
        router.refresh();
        endGlobalProcessing({ success: "Item deleted." });
        return;
      }
      const result = await deleteItems(companyId, ids);
      if (result?.error) {
        endGlobalProcessing({ error: result.error });
        setDeleteState({ ids, loading: false });
        return;
      }
      setDeleteState(null);
      const deletedIds = result.deletedIds ?? [];
      setSelectedIds((prev) => {
        const next = new Set(prev);
        deletedIds.forEach((id) => next.delete(id));
        return next;
      });
      router.refresh();
      const deleted = result.deletedCount ?? 0;
      const msg =
        deleted === 1 ? "Item deleted." : "Items deleted.";
      endGlobalProcessing({ success: msg });
    } finally {
      endGlobalProcessing();
    }
  }

  useImperativeHandle(ref, () => ({
    openAdd,
    openDeleteSelected,
    clearSelection: () => setSelectedIds(new Set()),
  }));

  const inputClass =
    "w-full border border-[var(--color-input-border)] rounded-xl px-3 py-2.5 text-[var(--color-on-surface)] bg-[var(--color-input-bg)] placeholder:text-[var(--color-on-surface-variant)] transition-colors duration-200 focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";

  return (
    <>
      <div className={hideToolbar ? "flex min-h-0 flex-1 flex-col overflow-hidden" : "flex flex-col"}>
        {!hideToolbar && (
          <>
            <div className="flex flex-shrink-0 items-center justify-between gap-4 border-b border-[var(--color-divider)] px-5 py-4">
              <input
                type="search"
                placeholder="Search items…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={inputClass + " max-w-[240px] min-w-0"}
                aria-label="Search items"
              />
              <div className="flex items-center gap-2">
                <Link
                  href="/dashboard/items/import"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--color-outline)] bg-[var(--color-btn-secondary-bg)] px-4 py-2.5 text-sm font-medium text-[var(--color-on-surface)] transition-colors hover:bg-[var(--color-btn-secondary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Import from CSV
                </Link>
                <IconButton variant="add" icon={<Plus className="w-4 h-4" />} label="Add item" onClick={openAdd} />
              </div>
            </div>
            <div className="flex flex-col gap-4 p-5">
              {selectedIds.size > 0 && (
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--color-divider)] bg-[var(--color-surface-variant)] px-4 py-2">
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
            </div>
          </>
        )}

        <div className={hideToolbar ? "flex min-h-0 flex-1 flex-col overflow-hidden p-5" : "flex flex-col gap-4 p-5"}>
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--color-outline)] bg-[var(--color-surface-variant)]/30 px-6 py-10 text-center">
              <p className="text-sm text-[var(--color-on-surface-variant)]">
                {initialItems.length === 0 ? "No items yet." : "No matches."}
              </p>
              {initialItems.length === 0 && (
                <IconButton variant="add" icon={<Plus className="w-4 h-4" />} label="Add item" onClick={openAdd} className="mt-3" />
              )}
            </div>
          ) : (
            <div className={`overflow-auto rounded-xl border border-[var(--color-outline)] ${hideToolbar ? "min-h-0 flex-1" : "max-h-[70vh]"}`}>
              <table className="w-full min-w-0 text-left text-sm lg:min-w-[600px]">
                <thead className="sticky top-0 z-10 bg-[var(--color-surface-variant)] shadow-[0_1px_0_0_var(--color-divider)]">
                  <tr>
                    <th className="w-10 p-3">
                      {selectedIds.size > 0 && (
                        <label className="flex cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            checked={allFilteredSelected}
                            onChange={toggleSelectAll}
                            className="rounded-md border-[var(--color-outline)]"
                            aria-label="Select all"
                          />
                        </label>
                      )}
                    </th>
                    <th className="p-3 font-medium text-[var(--color-on-surface)]">Item #</th>
                    <th className="p-3 font-medium text-[var(--color-on-surface)]">Description</th>
                    <th className="hidden p-3 font-medium text-[var(--color-on-surface)] lg:table-cell">UOM</th>
                    <th className="hidden p-3 font-medium text-[var(--color-on-surface)] lg:table-cell">Unit price</th>
                    <th className="w-28 shrink-0 p-3 text-right" aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr
                      key={c.id}
                      ref={c.id === scrollToItemId ? scrollToRowRef : undefined}
                      className={`border-b border-[var(--color-divider)] last:border-b-0 even:bg-[var(--color-surface-variant)]/10 transition-colors duration-150 ${
                        hideToolbar
                          ? "cursor-pointer hover:bg-[var(--color-surface-variant)]"
                          : "hover:bg-[var(--color-primary-container)]/20"
                      }`}
                      onClick={
                        hideToolbar
                          ? () => router.push(itemDetailUrl(c.id))
                          : undefined
                      }
                      role={hideToolbar ? "button" : undefined}
                      tabIndex={hideToolbar ? 0 : undefined}
                      onKeyDown={
                        hideToolbar
                          ? (e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                router.push(itemDetailUrl(c.id));
                              }
                            }
                          : undefined
                      }
                    >
                      <td className="p-3" onClick={(e) => hideToolbar && e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(c.id)}
                          onChange={() => toggleSelect(c.id)}
                          className="rounded-md border-[var(--color-outline)]"
                          aria-label={`Select ${c.name}`}
                        />
                      </td>
                      <td className="max-w-[120px] truncate p-3 text-[var(--color-on-surface)]" title={c.reference ?? undefined}>
                        {c.reference ?? "—"}
                      </td>
                      <td className="max-w-[200px] truncate p-3 font-medium text-[var(--color-on-surface)]" title={c.name}>
                        {c.name}
                      </td>
                      <td className="hidden w-16 p-3 text-[var(--color-on-surface-variant)] lg:table-cell">
                        {c.uom_code ?? "—"}
                      </td>
                      <td className="hidden p-3 tabular-nums text-[var(--color-on-surface)] lg:table-cell">
                        {c.unit_rate != null ? Number(c.unit_rate).toFixed(2) : "—"}
                      </td>
                      <td className="w-28 shrink-0 p-3 text-right" onClick={(e) => hideToolbar && e.stopPropagation()}>
                        <div className="flex justify-end gap-2">
                          <IconButton
                            variant="edit"
                            icon={<Pencil className="w-4 h-4" />}
                            label="Edit"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (hideToolbar) router.push(`/dashboard/items/${c.id}/edit?${searchParams.toString()}`);
                              else openEdit(c);
                            }}
                          />
                          <IconButton variant="danger" icon={<Trash2 className="w-4 h-4" />} label="Delete" onClick={(e) => { e.stopPropagation(); openDeleteOne(c.id); }} />
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

      <ConfirmDialog
        open={!!deleteState}
        title="Delete item?"
        message={
          deleteState?.ids.length === 1
            ? "This item will be removed. This cannot be undone."
            : `Delete ${deleteState?.ids.length ?? 0} items? This cannot be undone.`
        }
        confirmLabel="Delete"
        variant="danger"
        loading={deleteState?.loading ?? false}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteState(null)}
      />
    </>
  );
});
