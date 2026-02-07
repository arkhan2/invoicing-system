"use client";

import { Plus, Trash2 } from "lucide-react";
import { IconButton } from "@/components/IconButton";

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

function computeRow(r: Partial<LineItemRow>): LineItemRow {
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

export function LineItemsEditor({
  items,
  onChange,
  disabled = false,
}: {
  items: LineItemRow[];
  onChange: (items: LineItemRow[]) => void;
  disabled?: boolean;
}) {
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

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto border border-[var(--color-outline)] rounded-xl overflow-hidden">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--color-outline)] bg-[var(--color-surface-variant)]">
              <th className="w-12 p-2.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">#</th>
              <th className="w-28 p-2.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Item #</th>
              <th className="min-w-[380px] p-2.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Description</th>
              <th className="w-20 p-2.5 text-right text-xs font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Qty</th>
              <th className="w-32 p-2.5 text-right text-xs font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Unit price</th>
              <th className="w-24 p-2.5 text-right text-xs font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Total</th>
              {!disabled && <th className="w-12 p-2.5" aria-label="Remove" />}
            </tr>
          </thead>
          <tbody>
            {items.map((row, i) => (
              <tr key={i} className="border-b border-[var(--color-divider)] last:border-b-0 hover:bg-[var(--color-surface-variant)]/20 transition-colors duration-150 align-top">
                <td className="w-12 p-2.5 align-top text-[var(--color-on-surface-variant)] tabular-nums">{i + 1}</td>
                <td className="w-28 p-2.5 align-top">
                  <input
                    type="text"
                    value={row.item_number}
                    onChange={(e) => updateRow(i, { item_number: e.target.value })}
                    disabled={disabled}
                    className={inputClass}
                    placeholder="Item #"
                  />
                </td>
                <td className="min-w-[380px] p-2.5 align-top">
                  <textarea
                    value={row.product_description}
                    onChange={(e) => {
                      updateRow(i, { product_description: e.target.value });
                      resizeDescriptionTextarea(e.currentTarget);
                    }}
                    ref={(el) => {
                      if (el) requestAnimationFrame(() => resizeDescriptionTextarea(el));
                    }}
                    disabled={disabled}
                    rows={1}
                    className={inputClass + " min-h-[2.25rem] resize-none overflow-hidden"}
                    placeholder="Product or service"
                  />
                </td>
                <td className="w-20 p-2.5 align-top text-right">
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={row.quantity || ""}
                    onChange={(e) =>
                      updateRow(i, { quantity: parseFloat(e.target.value) || 0 })
                    }
                    disabled={disabled}
                    className={inputClassRight}
                  />
                </td>
                <td className="w-32 p-2.5 align-top text-right">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={row.unit_price || ""}
                    onChange={(e) =>
                      updateRow(i, { unit_price: parseFloat(e.target.value) || 0 })
                    }
                    disabled={disabled}
                    className={inputClassRight + " input-no-spinner"}
                  />
                </td>
                <td className="w-24 p-2.5 align-top text-right tabular-nums text-[var(--color-on-surface-variant)]">
                  {row.total_values.toFixed(2)}
                </td>
                {!disabled && (
                  <td className="w-12 p-2.5 align-top">
                    <IconButton variant="danger" icon={<Trash2 className="w-4 h-4" />} label="Remove row" onClick={() => removeRow(i)} />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {!disabled && (
          <div className="border-t border-[var(--color-divider)] px-2 py-2">
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
