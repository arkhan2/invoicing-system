"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  createEstimate,
  updateEstimate,
  getEstimateWithItems,
  type EstimateFormState,
} from "./actions";
import { LineItemsEditor, type LineItemRow } from "@/components/LineItemsEditor";
import { showMessage } from "@/components/MessageBar";

const inputClass =
  "w-full border border-[var(--color-outline)] rounded-lg px-3 py-2.5 text-[var(--color-on-surface)] bg-[var(--color-input-bg)] placeholder:text-[var(--color-on-surface-variant)] transition-colors focus:border-[var(--color-primary)]";
const labelClass = "block text-sm font-medium text-[var(--color-on-surface)] mb-1.5";

const STATUS_OPTIONS = ["Draft", "Sent", "Accepted", "Declined", "Expired", "Converted"];

function defaultItems(): LineItemRow[] {
  return [
    {
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
    },
  ];
}

export type CustomerOption = {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  ntn_cnic?: string | null;
  phone?: string | null;
  email?: string | null;
};

export type EstimateListItem = {
  id: string;
  estimate_number: string;
  estimate_date: string;
  status: string;
  total_amount: number | null;
  total_tax: number | null;
  customer_name: string;
  customer_id: string;
};

export function EstimateForm({
  estimateId,
  companyId,
  customers,
  company,
  initialEstimateNumber,
  initialEstimateDate,
  onSuccess,
  onCancel,
}: {
  estimateId: string | null;
  companyId: string;
  customers: (CustomerOption | { id: string; name: string })[];
  company?: { name: string } | null;
  initialEstimateNumber?: string | null;
  initialEstimateDate?: string | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const isEdit = !!estimateId;
  const [loading, setLoading] = useState(false);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "done" | "error">(
    isEdit ? "loading" : "idle"
  );
  const [state, setState] = useState<EstimateFormState>({});
  const [customerId, setCustomerId] = useState("");
  const [estimateDate, setEstimateDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [validUntil, setValidUntil] = useState("");
  const [status, setStatus] = useState("Draft");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItemRow[]>(defaultItems());

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === customerId) as CustomerOption | undefined,
    [customers, customerId]
  );

  useEffect(() => {
    if (!estimateId) return;
    let cancelled = false;
    (async () => {
      const data = await getEstimateWithItems(estimateId);
      if (cancelled) return;
      if (!data) {
        setLoadState("error");
        return;
      }
      setCustomerId(data.estimate.customer_id);
      setEstimateDate(data.estimate.estimate_date ?? new Date().toISOString().slice(0, 10));
      setValidUntil(data.estimate.valid_until ?? "");
      setStatus(data.estimate.status ?? "Draft");
      setNotes(data.estimate.notes ?? "");
      setItems(data.items.length > 0 ? data.items : defaultItems());
      setLoadState("done");
    })();
    return () => {
      cancelled = true;
    };
  }, [estimateId]);

  async function handleSubmit(formData: FormData, sendNow = false) {
    setLoading(true);
    setState({});
    formData.set("customer_id", customerId);
    formData.set("estimate_date", estimateDate);
    formData.set("valid_until", validUntil);
    formData.set("status", sendNow ? "Sent" : status);
    formData.set("notes", notes);
    formData.set("items", JSON.stringify(items));
    try {
      if (isEdit) {
        const result = await updateEstimate(estimateId, companyId, state, formData);
        if (result?.error) {
          setState(result);
          return;
        }
        showMessage(sendNow ? "Estimate saved and sent." : "Estimate updated.", "success");
        router.push(`/dashboard/estimates/${estimateId}`);
        return;
      } else {
        const result = await createEstimate(companyId, state, formData);
        if (result?.error) {
          setState(result);
          return;
        }
        showMessage(sendNow ? "Estimate saved and sent." : "Estimate created.", "success");
        if (result?.estimateId) {
          router.push(`/dashboard/estimates/${result.estimateId}`);
          return;
        }
      }
      onSuccess?.();
    } finally {
      setLoading(false);
    }
  }

  if (isEdit && (loadState === "loading" || loadState === "error")) {
    return (
      <div className="py-4 text-center text-sm text-[var(--color-on-surface-variant)]">
        {loadState === "loading" ? "Loading…" : "Estimate not found."}
      </div>
    );
  }

  const subtotal = items.reduce((s, i) => s + i.value_sales_excluding_st, 0);
  const totalTax = items.reduce(
    (s, i) =>
      s + i.sales_tax_applicable - i.sales_tax_withheld_at_source + i.extra_tax + i.further_tax,
    0
  );
  const total = items.reduce((s, i) => s + i.total_values, 0);
  const billingLines = selectedCustomer
    ? [selectedCustomer.address, selectedCustomer.ntn_cnic ? `NTN: ${selectedCustomer.ntn_cnic}` : null, [selectedCustomer.city, selectedCustomer.province].filter(Boolean).join(", ")].filter(Boolean)
    : [];

  function doSubmit(e: React.FormEvent<HTMLFormElement>, sendNow: boolean) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("items", JSON.stringify(items));
    handleSubmit(fd, sendNow);
  }

  return (
    <form
      id="estimate-form"
      onSubmit={(e) => doSubmit(e, false)}
      className="flex h-full flex-col"
    >
      {/* Title bar: Edit Quote / New Quote + Close */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-[var(--color-outline)] pb-4">
        <h2 className="text-xl font-semibold text-[var(--color-on-surface)]">
          {isEdit ? "Edit Quote" : "New Quote"}
        </h2>
        <Link
          href={estimateId ? `/dashboard/estimates/${estimateId}` : "/dashboard/estimates"}
          className="p-2 text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-variant)] hover:text-[var(--color-error)]"
          aria-label="Close"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </Link>
      </div>

      {state?.error && (
        <div
          className="mt-4 rounded-lg border border-[var(--color-error)] bg-[var(--color-error-bg)] px-4 py-3 text-sm text-[var(--color-error)]"
          role="alert"
        >
          {state.error}
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pt-4 pr-6">
        {/* Customer section */}
        <section>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <label htmlFor="estimate-customer" className={labelClass}>
              Customer Name <span className="text-[var(--color-error)]">*</span>
            </label>
            {selectedCustomer && (
              <Link
                href={`/dashboard/customers`}
                className="text-sm text-[var(--color-primary)] hover:underline"
              >
                {selectedCustomer.name.length > 24 ? selectedCustomer.name.slice(0, 24) + "…" : selectedCustomer.name} →
              </Link>
            )}
          </div>
          <select
            id="estimate-customer"
            name="customer_id"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            required
            className={inputClass + " min-h-[42px] cursor-pointer"}
          >
            <option value="">— Select customer —</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {selectedCustomer && billingLines.length > 0 && (
            <div className="mt-3 rounded-lg border border-[var(--color-outline)] bg-[var(--color-surface-variant)]/30 px-4 py-3">
              <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                Billing Address
              </h4>
              <p className="text-sm text-[var(--color-on-surface)] whitespace-pre-line">
                {billingLines.join("\n")}
              </p>
            </div>
          )}
        </section>

        {/* Quote details */}
        <section>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
            Quote Details
          </h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className={labelClass}>
                Quote# <span className="text-[var(--color-error)]">*</span>
              </label>
              <div className="flex min-h-[42px] items-center rounded-lg border border-[var(--color-outline)] bg-[var(--color-input-bg)] px-3 py-2.5 text-sm text-[var(--color-on-surface)]">
                {isEdit ? (initialEstimateNumber ?? "—") : "Auto-generated"}
              </div>
            </div>
            <div>
              <label htmlFor="estimate-date" className={labelClass}>
                Quote Date <span className="text-[var(--color-error)]">*</span>
              </label>
              <input
                id="estimate-date"
                name="estimate_date"
                type="date"
                value={estimateDate}
                onChange={(e) => setEstimateDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="estimate-expiry" className={labelClass}>
                Expiry Date
              </label>
              <input
                id="estimate-expiry"
                name="valid_until"
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className={inputClass}
                placeholder="dd MMM yyyy"
              />
            </div>
            <div>
              <label htmlFor="estimate-status" className={labelClass}>
                Status
              </label>
              <select
                id="estimate-status"
                name="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={inputClass + " min-h-[42px] cursor-pointer"}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Line items */}
        <section>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
            Line Items
          </h4>
          <LineItemsEditor items={items} onChange={setItems} />

          <div className="mt-4 flex justify-end">
            <table className="w-full max-w-xs text-right text-sm">
              <tbody>
                <tr>
                  <td className="py-1 pr-4 text-[var(--color-on-surface-variant)]">Subtotal</td>
                  <td className="py-1 font-medium text-[var(--color-on-surface)]">
                    {subtotal.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className="py-1 pr-4 text-[var(--color-on-surface-variant)]">Tax</td>
                  <td className="py-1 font-medium text-[var(--color-on-surface)]">
                    {totalTax.toFixed(2)}
                  </td>
                </tr>
                <tr className="border-t border-[var(--color-outline)]">
                  <td className="py-2 pr-4 font-medium text-[var(--color-on-surface)]">Total</td>
                  <td className="py-2 text-lg font-semibold text-[var(--color-on-surface)]">
                    {total.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Notes */}
        <section>
          <label htmlFor="estimate-notes" className={labelClass}>
            Notes
          </label>
          <textarea
            id="estimate-notes"
            name="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className={inputClass + " resize-y"}
            placeholder="Optional notes"
          />
        </section>
      </div>

      {/* Action bar: Save, Save and Send, Cancel + PDF template */}
      <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-4 border-t border-[var(--color-outline)] pt-6 mt-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-sm min-w-[100px]"
          >
            {loading ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              const form = document.getElementById("estimate-form") as HTMLFormElement;
              if (form) {
                const fd = new FormData(form);
                fd.set("items", JSON.stringify(items));
                fd.set("status", "Sent");
                handleSubmit(fd, true);
              }
            }}
            className="btn btn-secondary btn-sm border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary-container)]"
          >
            Save and Send
          </button>
          <Link href={estimateId ? `/dashboard/estimates/${estimateId}` : "/dashboard/estimates"} className="btn btn-secondary btn-sm">
            Cancel
          </Link>
        </div>
        <p className="text-xs text-[var(--color-on-surface-variant)]">
          PDF Template: <span className="font-medium text-[var(--color-on-surface)]">Estimate</span>{" "}
          <button type="button" className="text-[var(--color-primary)] hover:underline">
            Change
          </button>
        </p>
      </div>
    </form>
  );
}
