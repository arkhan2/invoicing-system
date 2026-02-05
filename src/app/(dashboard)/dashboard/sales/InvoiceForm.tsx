"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  createInvoice,
  updateInvoice,
  getInvoiceWithItems,
  type InvoiceFormState,
} from "./actions";
import { LineItemsEditor, type LineItemRow } from "@/components/LineItemsEditor";
import { showMessage } from "@/components/MessageBar";

const inputClass =
  "w-full border border-[var(--color-outline)] rounded-lg px-3 py-2.5 text-[var(--color-on-surface)] bg-[var(--color-input-bg)] placeholder:text-[var(--color-on-surface-variant)] transition-colors focus:border-[var(--color-primary)]";
const labelClass = "block text-sm font-medium text-[var(--color-on-surface)] mb-1.5";

const STATUS_OPTIONS = ["Draft", "Final", "Sent"] as const;

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

export type InvoiceListItem = {
  id: string;
  invoice_number: string;
  invoice_date: string;
  status: string;
  total_amount: number | null;
  total_tax: number | null;
  customer_name: string;
  customer_id: string;
  estimate_number: string | null;
};

export function InvoiceForm({
  invoiceId,
  companyId,
  customers,
  company,
  initialInvoiceNumber,
  initialInvoiceDate,
  onSuccess,
  onCancel,
}: {
  invoiceId: string | null;
  companyId: string;
  customers: (CustomerOption | { id: string; name: string })[];
  company?: {
    name: string;
    address?: string | null;
    city?: string | null;
    province?: string | null;
    phone?: string | null;
    email?: string | null;
    logo_url?: string | null;
  } | null;
  initialInvoiceNumber?: string | null;
  initialInvoiceDate?: string | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const isEdit = !!invoiceId;
  const [loading, setLoading] = useState(false);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "done" | "error">(
    isEdit ? "loading" : "idle"
  );
  const [state, setState] = useState<InvoiceFormState>({});
  const [customerId, setCustomerId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [status, setStatus] = useState<"Draft" | "Final" | "Sent">("Draft");
  const [items, setItems] = useState<LineItemRow[]>(defaultItems());

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === customerId) as CustomerOption | undefined,
    [customers, customerId]
  );

  useEffect(() => {
    if (!invoiceId) return;
    let cancelled = false;
    (async () => {
      const data = await getInvoiceWithItems(invoiceId);
      if (cancelled) return;
      if (!data) {
        setLoadState("error");
        return;
      }
      setCustomerId(data.invoice.customer_id);
      setInvoiceDate(data.invoice.invoice_date ?? new Date().toISOString().slice(0, 10));
      setStatus(
        ["Draft", "Final", "Sent"].includes(data.invoice.status ?? "")
          ? (data.invoice.status as "Draft" | "Final" | "Sent")
          : "Draft"
      );
      setItems(data.items.length > 0 ? data.items : defaultItems());
      setLoadState("done");
    })();
    return () => {
      cancelled = true;
    };
  }, [invoiceId]);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setState({});
    formData.set("customer_id", customerId);
    formData.set("invoice_date", invoiceDate);
    formData.set("status", status);
    formData.set("items", JSON.stringify(items));
    try {
      if (isEdit) {
        const result = await updateInvoice(invoiceId, companyId, state, formData);
        if (result?.error) {
          setState(result);
          return;
        }
        showMessage("Invoice updated.", "success");
        router.push(`/dashboard/sales/${invoiceId}`);
        return;
      } else {
        const result = await createInvoice(companyId, state, formData);
        if (result?.error) {
          setState(result);
          return;
        }
        showMessage("Invoice created.", "success");
        if (result?.invoiceId) {
          router.push(`/dashboard/sales/${result.invoiceId}`);
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
        {loadState === "loading" ? "Loading…" : "Invoice not found."}
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
    ? [
        selectedCustomer.address,
        selectedCustomer.ntn_cnic ? `NTN: ${selectedCustomer.ntn_cnic}` : null,
        [selectedCustomer.city, selectedCustomer.province].filter(Boolean).join(", "),
      ].filter(Boolean)
    : [];

  return (
    <form
      id="invoice-form"
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit(new FormData(e.currentTarget));
      }}
      className="flex h-full flex-col"
    >
      {/* Title bar: Edit Invoice / New Invoice + Close */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-[var(--color-outline)] pb-4">
        <h2 className="text-xl font-semibold text-[var(--color-on-surface)]">
          {isEdit ? "Edit Invoice" : "New Invoice"}
        </h2>
        <Link
          href={invoiceId ? `/dashboard/sales/${invoiceId}` : "/dashboard/sales"}
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
            <label htmlFor="invoice-customer" className={labelClass}>
              Customer Name <span className="text-[var(--color-error)]">*</span>
            </label>
            {selectedCustomer && (
              <Link
                href="/dashboard/customers"
                className="text-sm text-[var(--color-primary)] hover:underline"
              >
                {selectedCustomer.name.length > 24 ? selectedCustomer.name.slice(0, 24) + "…" : selectedCustomer.name} →
              </Link>
            )}
          </div>
          <select
            id="invoice-customer"
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

        {/* Invoice details */}
        <section>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
            Invoice Details
          </h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className={labelClass}>
                Invoice# <span className="text-[var(--color-error)]">*</span>
              </label>
              <div className="flex min-h-[42px] items-center rounded-lg border border-[var(--color-outline)] bg-[var(--color-input-bg)] px-3 py-2.5 text-sm text-[var(--color-on-surface)]">
                {isEdit ? (initialInvoiceNumber ?? "—") : "Auto-generated"}
              </div>
            </div>
            <div>
              <label htmlFor="invoice-date" className={labelClass}>
                Invoice Date <span className="text-[var(--color-error)]">*</span>
              </label>
              <input
                id="invoice-date"
                name="invoice_date"
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="invoice-status" className={labelClass}>
                Status
              </label>
              <select
                id="invoice-status"
                name="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as "Draft" | "Final" | "Sent")}
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
      </div>

      {/* Action bar: Save, Cancel + PDF template */}
      <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-4 border-t border-[var(--color-outline)] pt-6 mt-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-sm min-w-[100px]"
          >
            {loading ? "Saving…" : "Save"}
          </button>
          <Link
            href={invoiceId ? `/dashboard/sales/${invoiceId}` : "/dashboard/sales"}
            className="btn btn-secondary btn-sm"
          >
            Cancel
          </Link>
        </div>
        <p className="text-xs text-[var(--color-on-surface-variant)]">
          PDF Template: <span className="font-medium text-[var(--color-on-surface)]">Invoice</span>{" "}
          <button type="button" className="text-[var(--color-primary)] hover:underline">
            Change
          </button>
        </p>
      </div>
    </form>
  );
}
