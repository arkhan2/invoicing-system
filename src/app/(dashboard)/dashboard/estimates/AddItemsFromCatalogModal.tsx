"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Loader2, X, ChevronDown, ChevronUp } from "lucide-react";
import { Modal } from "@/components/Modal";
import { getItemsForPicker } from "@/app/(dashboard)/dashboard/items/actions";
import type { ItemSearchResult } from "@/app/(dashboard)/dashboard/items/actions";
import { computeRow, type LineItemRow } from "@/components/LineItemsEditor";

const inputClass =
  "w-full border border-[var(--color-input-border)] rounded-xl px-3 py-2 text-sm text-[var(--color-on-surface)] bg-[var(--color-input-bg)] placeholder:text-[var(--color-on-surface-variant)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";

type SelectedItem = { item: ItemSearchResult; quantity: number };

function itemToLineRow(item: ItemSearchResult, qty: number): LineItemRow {
  const desc = [item.name, item.description].filter(Boolean).join(item.description ? ": " : "") || item.name;
  return computeRow({
    item_number: item.reference ?? "",
    product_description: desc,
    hs_code: item.hs_code ?? "",
    rate_label: item.rate_label ?? "",
    uom: item.uom ?? "Nos",
    quantity: qty,
    unit_price: item.unit_rate ?? 0,
    sale_type: item.sale_type ?? "Goods at standard rate (default)",
  });
}

export function AddItemsFromCatalogModal({
  open,
  onClose,
  companyId,
  onImport,
}: {
  open: boolean;
  onClose: () => void;
  companyId: string;
  onImport: (lineItems: LineItemRow[]) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [catalogItems, setCatalogItems] = useState<ItemSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<SelectedItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [glowingIndex, setGlowingIndex] = useState<number | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function toggleExpanded(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  const fetchCatalog = useCallback(
    async (query?: string) => {
      setLoading(true);
      try {
        const items = await getItemsForPicker(companyId, query, 50);
        setCatalogItems(items);
      } finally {
        setLoading(false);
      }
    },
    [companyId]
  );

  useEffect(() => {
    if (glowingIndex === null) return;
    const t = setTimeout(() => setGlowingIndex(null), 800);
    return () => clearTimeout(t);
  }, [glowingIndex]);

  useEffect(() => {
    if (!open) {
      setExpandedId(null);
      setGlowingIndex(null);
      return;
    }
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    const runFetch = () => fetchCatalog(searchQuery.trim() || undefined);
    const delay = searchQuery.trim() ? 300 : 0;
    searchDebounceRef.current = setTimeout(runFetch, delay);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [open, searchQuery, fetchCatalog]);

  function addToSelected(item: ItemSearchResult) {
    const idx = selected.findIndex((s) => s.item.id === item.id);
    if (idx >= 0) {
      setSelected((prev) =>
        prev.map((s, i) => (i === idx ? { ...s, quantity: s.quantity + 1 } : s))
      );
      setGlowingIndex(idx);
    } else {
      setSelected((prev) => [...prev, { item, quantity: 1 }]);
      setGlowingIndex(selected.length);
    }
  }

  function removeFromSelected(index: number) {
    setSelected((prev) => prev.filter((_, i) => i !== index));
  }

  function updateQuantity(index: number, quantity: number) {
    const qty = Math.max(1, Math.round(quantity));
    setGlowingIndex(index);
    setSelected((prev) => prev.map((s, i) => (i === index ? { ...s, quantity: qty } : s)));
  }

  function handleImport() {
    const lineItems = selected.map((s) => itemToLineRow(s.item, s.quantity));
    onImport(lineItems);
    setSelected([]);
    setSearchQuery("");
    onClose();
  }

  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add from items"
      contentClassName="max-w-4xl w-full max-h-[85vh]"
    >
      <div className="flex flex-col sm:flex-row gap-4 min-h-0" style={{ minHeight: "400px" }}>
        {/* Left panel: Catalog */}
        <div className="flex flex-col min-w-0 w-64 sm:w-72 shrink-0 border border-[var(--color-outline)] rounded-xl overflow-hidden">
          <div className="flex-shrink-0 p-2 border-b border-[var(--color-divider)]">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search items…"
              className={inputClass}
              aria-label="Search items"
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-[var(--color-on-surface-variant)]">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : catalogItems.length === 0 ? (
              <div className="py-8 text-center text-sm text-[var(--color-on-surface-variant)]">
                {searchQuery.trim() ? (
                  "No items found."
                ) : (
                  <>
                    No items in catalog.{" "}
                    <Link href={`/dashboard/items/new`} className="text-[var(--color-primary)] hover:underline">
                      Create items first
                    </Link>
                  </>
                )}
              </div>
            ) : (
              <ul className="space-y-1" role="listbox">
                {catalogItems.map((item) => {
                  const isExpanded = expandedId === item.id;
                  return (
                    <li key={item.id}>
                      <div className="rounded-lg border border-[var(--color-outline)] bg-surface overflow-hidden">
                        <div className="flex items-stretch min-w-0">
                          <button
                            type="button"
                            onClick={() => addToSelected(item)}
                            className="flex-1 min-w-0 text-left px-3 py-2 hover:bg-[var(--color-surface-variant)] transition-colors text-sm"
                            role="option"
                          >
                            <div className="font-medium text-[var(--color-on-surface)] truncate">
                              {item.reference ? `${item.reference} — ` : ""}
                              {item.name}
                            </div>
                            <div className="text-xs text-[var(--color-on-surface-variant)] mt-0.5">
                              {item.uom} · {item.unit_rate != null ? Number(item.unit_rate).toFixed(2) : "—"}
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpanded(item.id);
                            }}
                            className="shrink-0 flex items-center justify-center w-8 border-l border-[var(--color-divider)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-variant)] transition-colors"
                            aria-expanded={isExpanded}
                            aria-label={isExpanded ? "Collapse" : "Expand"}
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                        {isExpanded && (
                          <div className="border-t border-[var(--color-divider)] px-3 py-2.5 bg-[var(--color-surface-variant)]/30 text-xs space-y-1.5">
                            {item.description && (
                              <div>
                                <span className="text-[var(--color-on-surface-variant)]">Description: </span>
                                <span className="text-[var(--color-on-surface)]">{item.description}</span>
                              </div>
                            )}
                            {item.hs_code && (
                              <div>
                                <span className="text-[var(--color-on-surface-variant)]">HS Code: </span>
                                <span className="text-[var(--color-on-surface)]">{item.hs_code}</span>
                              </div>
                            )}
                            {item.rate_label && (
                              <div>
                                <span className="text-[var(--color-on-surface-variant)]">Tax rate: </span>
                                <span className="text-[var(--color-on-surface)]">{item.rate_label}</span>
                              </div>
                            )}
                            {item.sale_type && (
                              <div>
                                <span className="text-[var(--color-on-surface-variant)]">Sale type: </span>
                                <span className="text-[var(--color-on-surface)]">{item.sale_type}</span>
                              </div>
                            )}
                            {!item.description && !item.hs_code && !item.rate_label && !item.sale_type && (
                              <div className="text-[var(--color-on-surface-variant)]">No additional details</div>
                            )}
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Right panel: Selected */}
        <div className="flex flex-col min-w-0 flex-1 rounded-xl border border-[var(--color-outline)] overflow-hidden bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="flex-shrink-0 flex items-center justify-between gap-3 border-b border-[var(--color-divider)] bg-[var(--color-surface-variant)]/40 px-4 py-3">
            <h4 className="text-sm font-semibold text-[var(--color-on-surface)]">
              Items to add
            </h4>
            {selected.length > 0 && (
              <span className="rounded-full bg-[var(--color-primary-container)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-on-primary-container)] tabular-nums">
                {selected.length} selected
              </span>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {selected.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-[var(--color-outline)] bg-[var(--color-surface-variant)]/20 px-6 py-12 mx-3 my-4">
                <p className="text-sm text-[var(--color-on-surface-variant)] text-center">
                  Select items from the catalog to add them here
                </p>
                <p className="text-xs text-[var(--color-on-surface-variant)]/80 text-center max-w-[200px]">
                  Click an item on the left to add it
                </p>
              </div>
            ) : (
              <table className="w-full min-w-[280px] text-left text-sm">
                <thead className="sticky top-0 z-10 bg-[var(--color-surface-variant)] shadow-[0_1px_0_0_var(--color-divider)]">
                  <tr>
                    <th className="p-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)] text-left">
                      Item
                    </th>
                    <th className="p-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)] text-left w-20">
                      UOM
                    </th>
                    <th className="p-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)] text-right w-20">
                      Price
                    </th>
                    <th className="p-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)] text-right w-28">
                      Qty
                    </th>
                    <th className="w-10 p-2.5" aria-label="Remove" />
                  </tr>
                </thead>
                <tbody>
                  {selected.map((s, index) => {
                    const unitRate = s.item.unit_rate != null ? Number(s.item.unit_rate) : 0;
                    return (
                      <tr
                        key={s.item.id}
                        className="border-b border-[var(--color-divider)] last:border-b-0 hover:bg-[var(--color-primary-container)]/20 transition-colors duration-300"
                        style={
                          glowingIndex === index
                            ? { backgroundColor: "color-mix(in srgb, var(--color-primary-container) 45%, transparent)" }
                            : undefined
                        }
                      >
                        <td className="p-2.5 min-w-0">
                          <div className="font-medium text-[var(--color-on-surface)] truncate" title={`${s.item.reference || ""} ${s.item.name}`}>
                            {s.item.reference && (
                              <span className="text-[var(--color-on-surface-variant)]">{s.item.reference} — </span>
                            )}
                            {s.item.name}
                          </div>
                        </td>
                        <td className="p-2.5 text-[var(--color-on-surface-variant)] text-left tabular-nums">
                          {s.item.uom}
                        </td>
                        <td className="p-2.5 text-right tabular-nums text-[var(--color-on-surface)]">
                          {unitRate.toFixed(2)}
                        </td>
                        <td className="p-2.5">
                          <input
                            type="number"
                            min={1}
                            value={s.quantity}
                            onChange={(e) => updateQuantity(index, parseFloat(e.target.value) || 1)}
                            className={inputClass + " w-20 min-w-[5rem] text-right input-no-spinner tabular-nums py-1.5"}
                            aria-label={`Quantity for ${s.item.name}`}
                          />
                        </td>
                        <td className="p-2.5">
                          <button
                            type="button"
                            onClick={() => removeFromSelected(index)}
                            className="rounded p-1.5 text-[var(--color-on-surface-variant)] transition-colors hover:bg-[var(--color-error)]/10 hover:text-[var(--color-error)]"
                            aria-label={`Remove ${s.item.name}`}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          <div className="flex-shrink-0 border-t border-[var(--color-divider)] bg-surface px-4 py-3">
            <button
              type="button"
              onClick={handleImport}
              disabled={selected.length === 0}
              className="btn btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed py-2.5"
            >
              Add {selected.length} item{selected.length !== 1 ? "s" : ""} to estimate
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
