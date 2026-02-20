"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Plus, Trash2, Copy, GripVertical } from "lucide-react";
import { IconButton } from "@/components/IconButton";
import type { ItemSearchResult } from "@/app/(dashboard)/dashboard/items/actions";

const MIN_DESC_HEIGHT_PX = 38;

function resizeDescriptionTextarea(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${Math.max(MIN_DESC_HEIGHT_PX, el.scrollHeight)}px`;
}

export type LineItemRow = {
  item_number: string;
  product_description: string;
  hs_code: string;
  rate_label: string;
  uom: string;
  quantity: number;
  unit_price: number;
  value_sales_excluding_st: number;
  sales_tax_applicable: number;
  sales_tax_withheld_at_source: number;
  extra_tax: number;
  further_tax: number;
  discount: number;
  total_values: number;
  sale_type: string;
};

const defaultRow = (): LineItemRow => ({
  item_number: "",
  product_description: "",
  hs_code: "",
  rate_label: "",
  uom: "Nos",
  quantity: 1,
  unit_price: 0,
  value_sales_excluding_st: 0,
  sales_tax_applicable: 0,
  sales_tax_withheld_at_source: 0,
  extra_tax: 0,
  further_tax: 0,
  discount: 0,
  total_values: 0,
  sale_type: "Goods at standard rate (default)",
});

export function computeRow(r: Partial<LineItemRow>): LineItemRow {
  const qty = Number(r.quantity) || 0;
  const price = Number(r.unit_price) || 0;
  const valueSales = qty * price;
  const tax = Number(r.sales_tax_applicable) || 0;
  const withheld = Number(r.sales_tax_withheld_at_source) || 0;
  const extra = Number(r.extra_tax) || 0;
  const further = Number(r.further_tax) || 0;
  const discount = Number(r.discount) || 0;
  const total = valueSales + tax - withheld + extra + further - discount;
  return {
    item_number: r.item_number ?? "",
    product_description: r.product_description ?? "",
    hs_code: r.hs_code ?? "",
    rate_label: r.rate_label ?? "",
    uom: r.uom ?? "Nos",
    quantity: qty,
    unit_price: price,
    value_sales_excluding_st: valueSales,
    sales_tax_applicable: tax,
    sales_tax_withheld_at_source: withheld,
    extra_tax: extra,
    further_tax: further,
    discount,
    total_values: Math.round(total * 100) / 100,
    sale_type: r.sale_type ?? "Goods at standard rate (default)",
  };
}

const inputClass =
  "w-full min-h-[2.25rem] border border-[var(--color-input-border)] rounded-xl px-2 py-1.5 text-sm text-[var(--color-on-surface)] bg-[var(--color-input-bg)] transition-colors duration-200 focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] box-border";
const inputClassRight =
  inputClass + " text-right tabular-nums";

export type UomOption = { id: string; code: string; description: string };

type LineItemsEditorProps = {
  items: LineItemRow[];
  onChange: (items: LineItemRow[]) => void;
  disabled?: boolean;
  /** When provided, enables "Pick from catalog" to fill row with item data (including unit_rate → unit_price) */
  companyId?: string;
  /** Async search for items; used when companyId is provided */
  searchItems?: (companyId: string, query: string) => Promise<ItemSearchResult[]>;
  /** When provided, shows UOM select per row with options (default: Nos) */
  uomList?: UomOption[];
};

export function LineItemsEditor({
  items,
  onChange,
  disabled = false,
  companyId,
  searchItems: searchItemsProp,
  uomList = [],
}: LineItemsEditorProps) {
  const uomCodes = [
    ...(uomList.some((u) => u.code === "Nos") ? [] : ["Nos"]),
    ...uomList.map((u) => u.code).filter(Boolean),
  ];
  const showUomColumn = uomCodes.length > 0;
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [itemPickerRow, setItemPickerRow] = useState<number | null>(null);
  const [itemSearchQuery, setItemSearchQuery] = useState("");
  const [itemSearchResults, setItemSearchResults] = useState<ItemSearchResult[]>([]);
  const [itemSearchLoading, setItemSearchLoading] = useState(false);
  const itemSearchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const itemPickerRef = useRef<HTMLDivElement>(null);
  /** Visual row index (0-based from top) where cursor is; drives live reorder and highlight. */
  const [dropVisualIndex, setDropVisualIndex] = useState<number | null>(null);
  const tbodyRef = useRef<HTMLTableSectionElement>(null);

  const canPickItems = Boolean(companyId && searchItemsProp && !disabled);

  const runItemSearch = useCallback(
    async (q: string) => {
      if (!companyId || !searchItemsProp) return;
      if (!q.trim()) {
        setItemSearchResults([]);
        return;
      }
      setItemSearchLoading(true);
      const list = await searchItemsProp(companyId, q);
      setItemSearchResults(list);
      setItemSearchLoading(false);
    },
    [companyId, searchItemsProp]
  );

  useEffect(() => {
    if (!canPickItems) return;
    if (itemSearchDebounceRef.current) clearTimeout(itemSearchDebounceRef.current);
    if (!itemSearchQuery.trim()) {
      setItemSearchResults([]);
      return;
    }
    itemSearchDebounceRef.current = setTimeout(() => runItemSearch(itemSearchQuery), 300);
    return () => {
      if (itemSearchDebounceRef.current) clearTimeout(itemSearchDebounceRef.current);
    };
  }, [itemSearchQuery, runItemSearch, canPickItems]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (itemPickerRef.current && !itemPickerRef.current.contains(e.target as Node)) {
        setItemPickerRow(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function applyItemToRow(index: number, item: ItemSearchResult) {
    const desc = [item.name, item.description].filter(Boolean).join(item.description ? ": " : "");
    updateRow(index, {
      item_number: item.reference ?? "",
      product_description: desc || item.name,
      hs_code: item.hs_code ?? "",
      rate_label: item.rate_label ?? "",
      uom: item.uom ?? "Nos",
      unit_price: item.unit_rate ?? 0,
      sale_type: item.sale_type ?? "Goods at standard rate (default)",
    });
    setItemPickerRow(null);
    setItemSearchQuery("");
    setItemSearchResults([]);
  }

  /** Display order: while dragging, show list with dragged row at dropVisualIndex so user sees movement. */
  const displayIndices =
    dragIndex !== null && dropVisualIndex !== null
      ? (() => {
          const without = items.map((_, j) => j).filter((j) => j !== dragIndex);
          const insertAt = Math.max(0, Math.min(dropVisualIndex, without.length));
          return [...without.slice(0, insertAt), dragIndex, ...without.slice(insertAt)];
        })()
      : null;

  const indices = displayIndices ?? items.map((_, i) => i);

  function updateRow(index: number, patch: Partial<LineItemRow>) {
    const next = [...items];
    next[index] = computeRow({ ...next[index], ...patch });
    onChange(next);
  }

  function addRow() {
    onChange([...items, defaultRow()]);
  }

  function removeRow(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  function cloneRow(index: number) {
    const row = items[index];
    const copy = { ...row };
    const next = [...items];
    next.splice(index + 1, 0, copy);
    onChange(next);
  }

  const handleDragStart = useCallback(
    (e: React.DragEvent, index: number) => {
      if (disabled) return;
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(index));
      e.dataTransfer.setDragImage(e.currentTarget, 0, 0);
      setDragIndex(index);
      setDropVisualIndex(index); // start with "no move" so list doesn't jump
    },
    [disabled]
  );

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
    setDropVisualIndex(null);
  }, []);

  const handleDragOverTbody = useCallback(
    (e: React.DragEvent) => {
      if (disabled || dragIndex === null || items.length === 0) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      const tbody = tbodyRef.current;
      if (!tbody) return;
      const rect = tbody.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const rowHeight = rect.height / items.length;
      const visual = Math.floor(y / rowHeight);
      const clamped = Math.max(0, Math.min(visual, items.length - 1));
      setDropVisualIndex(clamped);
    },
    [disabled, dragIndex, items.length]
  );

  const handleDropTbody = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (disabled || dragIndex === null || dropVisualIndex === null) return;
      const without = items.filter((_, j) => j !== dragIndex);
      const insertAt = Math.max(0, Math.min(dropVisualIndex, without.length));
      const next = [...without.slice(0, insertAt), items[dragIndex], ...without.slice(insertAt)];
      onChange(next);
      setDragIndex(null);
      setDropVisualIndex(null);
    },
    [disabled, dragIndex, dropVisualIndex, items, onChange]
  );

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto border border-[var(--color-outline)] rounded-xl overflow-hidden">
        <table className="line-items-table w-full min-w-[600px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--color-outline)] bg-[var(--color-surface-variant)]">
              {!disabled && <th className="w-9 py-1.5 px-1 text-left text-[var(--color-on-surface-variant)]" aria-label="Drag to reorder" />}
              <th className="w-12 py-1.5 px-1 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">#</th>
              <th className="w-28 py-1.5 px-1 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Item #</th>
              <th className="min-w-[280px] py-1.5 px-1 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Description</th>
              <th className="w-20 py-1.5 px-1 text-right text-xs font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Qty</th>
              {showUomColumn && (
                <th className="w-20 py-1.5 px-1 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">UOM</th>
              )}
              <th className="w-32 py-1.5 px-1 text-right text-xs font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Unit price</th>
              <th className="w-24 py-1.5 px-1 text-right text-xs font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Total</th>
              {!disabled && <th className="w-20 py-1.5 px-1" aria-label="Actions" />}
            </tr>
          </thead>
          <tbody
            ref={tbodyRef}
            onDragOver={handleDragOverTbody}
            onDrop={handleDropTbody}
          >
            {indices.map((dataIndex, displayPos) => {
              const row = items[dataIndex];
              const isDragging = dragIndex === dataIndex;
              const isDropTarget = dropVisualIndex === displayPos;
              const cellBg =
                isDragging
                  ? "bg-[var(--color-primary-container)]"
                  : isDropTarget
                    ? "bg-[var(--color-secondary-container)]/60"
                    : "";
              return (
              <tr
                key={dataIndex}
                className={`line-items-row border-b border-[var(--color-divider)] last:border-b-0 transition-[background-color,box-shadow] duration-150 align-top ${isDragging ? "line-items-row-dragging line-items-row-dragging-lift" : ""} ${isDropTarget ? "line-items-row-drop" : ""}`}
              >
                {!disabled && (
                  <td className={`w-9 py-1.5 px-1 align-top ${cellBg}`}>
                    <span
                      draggable
                      onDragStart={(e) => handleDragStart(e, dataIndex)}
                      onDragEnd={handleDragEnd}
                      className="inline-flex cursor-grab active:cursor-grabbing text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] touch-none"
                      aria-label="Drag to reorder row"
                    >
                      <GripVertical className="w-4 h-4" />
                    </span>
                  </td>
                )}
                <td className={`w-12 py-1.5 px-1 align-top text-[var(--color-on-surface-variant)] tabular-nums ${cellBg}`}>{displayPos + 1}</td>
                <td className={`w-28 py-1.5 px-1 align-top ${cellBg}`}>
                  <input
                    type="text"
                    value={row.item_number}
                    onChange={(e) => updateRow(dataIndex, { item_number: e.target.value })}
                    disabled={disabled}
                    className={inputClass}
                    placeholder="Item #"
                  />
                </td>
                <td className={`min-w-[280px] py-1.5 px-1 align-top ${cellBg}`}>
                  <div className="flex gap-1">
                    <textarea
                      value={row.product_description}
                      onChange={(e) => {
                        updateRow(dataIndex, { product_description: e.target.value });
                        resizeDescriptionTextarea(e.currentTarget);
                      }}
                      ref={(el) => {
                        if (el) requestAnimationFrame(() => resizeDescriptionTextarea(el));
                      }}
                      disabled={disabled}
                      rows={1}
                      className={inputClass + " min-h-[2.25rem] flex-1 resize-none overflow-hidden"}
                      placeholder="Product or service"
                    />
                  </div>
                </td>
                <td className={`w-20 py-1.5 px-1 align-top text-right ${cellBg}`}>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={row.quantity || ""}
                    onChange={(e) =>
                      updateRow(dataIndex, { quantity: parseFloat(e.target.value) || 0 })
                    }
                    disabled={disabled}
                    className={inputClassRight + " input-no-spinner"}
                  />
                </td>
                {showUomColumn && (
                  <td className={`w-20 py-1.5 px-1 align-top ${cellBg}`}>
                    <select
                      value={row.uom || "Nos"}
                      onChange={(e) => updateRow(dataIndex, { uom: e.target.value })}
                      disabled={disabled}
                      className={inputClass + " min-w-0 cursor-pointer"}
                      aria-label="Unit of measure"
                    >
                      {uomCodes.map((code) => (
                        <option key={code} value={code}>
                          {code}
                        </option>
                      ))}
                    </select>
                  </td>
                )}
                <td className={`w-32 py-1.5 px-1 align-top text-right ${cellBg}`}>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={row.unit_price || ""}
                    onChange={(e) =>
                      updateRow(dataIndex, { unit_price: parseFloat(e.target.value) || 0 })
                    }
                    disabled={disabled}
                    className={inputClassRight + " input-no-spinner"}
                  />
                </td>
                <td className={`w-24 py-1.5 px-1 align-top text-right tabular-nums text-[var(--color-on-surface-variant)] ${cellBg}`}>
                  {row.total_values.toFixed(2)}
                </td>
                {!disabled && (
                  <td className={`w-20 py-1.5 px-1 align-top ${cellBg}`}>
                    <span className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => cloneRow(dataIndex)}
                        className="shrink-0 rounded p-0.5 text-[var(--color-on-surface-variant)] transition-colors hover:bg-[var(--color-secondary-bg)] hover:text-[var(--color-secondary)]"
                        aria-label="Clone row"
                        title="Clone to next row"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeRow(dataIndex)}
                        className="shrink-0 rounded p-0.5 text-[var(--color-error)] transition-colors hover:bg-[var(--color-error-bg)]"
                        aria-label="Remove row"
                        title="Remove row"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  </td>
                )}
              </tr>
            );
            })}
          </tbody>
        </table>
        {!disabled && (
          <div className="border-t border-[var(--color-divider)] px-1 py-1.5">
            <IconButton variant="add" icon={<Plus className="w-4 h-4" />} label="Add row" onClick={addRow} />
          </div>
        )}
      </div>
      {items.length === 0 && (
        <p className="text-sm text-[var(--color-on-surface-variant)]">No line items. Add at least one.</p>
      )}
    </div>
  );
}
