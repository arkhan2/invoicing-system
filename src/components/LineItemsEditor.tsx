"use client";

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
  "w-full border border-[var(--color-outline)] rounded-lg px-2 py-1.5 text-sm text-[var(--color-on-surface)] bg-[var(--color-input-bg)] focus:border-[var(--color-primary)]";

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
    <div className="space-y-3">
      <span className="text-sm font-medium text-[var(--color-on-surface)]">Line items</span>
      <div className="overflow-x-auto border border-[var(--color-outline)]">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--color-outline)] bg-[var(--color-surface-variant)]/50">
              <th className="w-12 p-2 font-medium text-[var(--color-on-surface)]">#</th>
              <th className="w-28 p-2 font-medium text-[var(--color-on-surface)]">Item Number</th>
              <th className="p-2 font-medium text-[var(--color-on-surface)]">Description</th>
              <th className="w-20 p-2 font-medium text-[var(--color-on-surface)]">Qty</th>
              <th className="w-28 p-2 font-medium text-[var(--color-on-surface)]">Unit price</th>
              <th className="w-24 p-2 font-medium text-[var(--color-on-surface)]">Total</th>
              {!disabled && <th className="w-12 p-2" aria-label="Remove" />}
            </tr>
          </thead>
          <tbody>
            {items.map((row, i) => (
              <tr key={i} className="border-b border-[var(--color-outline)] last:border-b-0">
                <td className="p-2 text-[var(--color-on-surface-variant)]">{i + 1}</td>
                <td className="p-2">
                  <input
                    type="text"
                    value={row.item_number}
                    onChange={(e) => updateRow(i, { item_number: e.target.value })}
                    disabled={disabled}
                    className={inputClass}
                    placeholder="Item #"
                  />
                </td>
                <td className="p-2">
                  <input
                    type="text"
                    value={row.product_description}
                    onChange={(e) => updateRow(i, { product_description: e.target.value })}
                    disabled={disabled}
                    className={inputClass}
                    placeholder="Product or service"
                  />
                </td>
                <td className="p-2">
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={row.quantity || ""}
                    onChange={(e) =>
                      updateRow(i, { quantity: parseFloat(e.target.value) || 0 })
                    }
                    disabled={disabled}
                    className={inputClass}
                  />
                </td>
                <td className="p-2">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={row.unit_price || ""}
                    onChange={(e) =>
                      updateRow(i, { unit_price: parseFloat(e.target.value) || 0 })
                    }
                    disabled={disabled}
                    className={inputClass}
                  />
                </td>
                <td className="p-2 text-[var(--color-on-surface-variant)]">
                  {row.total_values.toFixed(2)}
                </td>
                {!disabled && (
                  <td className="p-2">
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      className="p-1.5 text-[var(--color-error)] hover:bg-[var(--color-error-bg)] rounded-lg transition-colors"
                      aria-label="Remove row"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {!disabled && (
          <div className="border-t border-[var(--color-outline)] px-2 py-2">
            <button type="button" onClick={addRow} className="btn btn-secondary btn-sm">
              Add row
            </button>
          </div>
        )}
      </div>
      {items.length === 0 && (
        <p className="text-sm text-[var(--color-on-surface-variant)]">No line items. Add at least one.</p>
      )}
    </div>
  );
}
