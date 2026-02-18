"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  createInvoice,
  updateInvoice,
  deleteInvoice,
  getInvoiceWithItems,
  type InvoiceFormState,
} from "./actions";
import { searchItems } from "@/app/(dashboard)/dashboard/items/actions";
import { Save, Loader2, X, PlusCircle, Trash2 } from "lucide-react";
import { LineItemsEditor, type LineItemRow } from "@/components/LineItemsEditor";
import { IconButton } from "@/components/IconButton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { startGlobalProcessing, endGlobalProcessing } from "@/components/GlobalProcessing";
import { AddItemsFromCatalogModal } from "@/app/(dashboard)/dashboard/estimates/AddItemsFromCatalogModal";
import { useInvoicesTopBar } from "./InvoicesTopBarContext";

const inputClass =
  "w-full min-h-[2.5rem] border border-[var(--color-input-border)] rounded-xl px-3 py-2.5 text-[var(--color-on-surface)] bg-[var(--color-input-bg)] placeholder:text-[var(--color-on-surface-variant)] transition-colors duration-200 focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";
const labelClass = "block text-sm font-medium text-[var(--color-on-surface)] mb-1.5";

const STATUS_OPTIONS = ["Draft", "Final", "Sent"] as const;
const DELIVERY_TIME_UNITS = ["days", "weeks", "months"] as const;

export type TermsType = "" | "due_on_receipt" | "net_15" | "net_30" | "eom" | "custom";
const TERMS_OPTIONS: { value: TermsType; label: string }[] = [
  { value: "", label: "— Select terms —" },
  { value: "due_on_receipt", label: "Due on receipt" },
  { value: "net_15", label: "Net 15" },
  { value: "net_30", label: "Net 30" },
  { value: "eom", label: "End of month" },
  { value: "custom", label: "Custom" },
];

function computeDueDateFromTerms(invoiceDateStr: string, termsType: TermsType): string {
  if (!termsType || termsType === "custom") return invoiceDateStr;
  if (termsType === "due_on_receipt") return invoiceDateStr;
  const d = new Date(invoiceDateStr);
  if (Number.isNaN(d.getTime())) return invoiceDateStr;
  if (termsType === "net_15") {
    d.setDate(d.getDate() + 15);
    return d.toISOString().slice(0, 10);
  }
  if (termsType === "net_30") {
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  }
  if (termsType === "eom") {
    d.setMonth(d.getMonth() + 1);
    d.setDate(0);
    return d.toISOString().slice(0, 10);
  }
  return invoiceDateStr;
}

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
  contact_person_name?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  country?: string | null;
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

export type SalesTaxRateOption = { id: string; name: string; rate: number };
export type UomOption = { id: string; code: string; description: string };

export function InvoiceForm({
  invoiceId,
  companyId,
  customers,
  company,
  salesTaxRates = [],
  uomList = [],
  initialInvoiceNumber,
  initialInvoiceDate,
  initialCustomerId,
  initialSelectedCustomer,
  initialPoNumber,
  initialNotes,
  initialProjectName,
  initialSubject,
  initialPaymentTerms,
  initialTermsType,
  initialDueDate,
  initialDeliveryTimeAmount,
  initialDeliveryTimeUnit,
  initialDiscountAmount,
  initialDiscountType,
  initialSalesTaxRateId,
  initialStatus,
  initialItems,
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
  salesTaxRates?: SalesTaxRateOption[];
  uomList?: UomOption[];
  initialInvoiceNumber?: string | null;
  initialInvoiceDate?: string | null;
  initialCustomerId?: string;
  initialSelectedCustomer?: CustomerOption | null;
  initialPoNumber?: string | null;
  initialNotes?: string | null;
  initialProjectName?: string | null;
  initialSubject?: string | null;
  initialPaymentTerms?: string | null;
  initialTermsType?: TermsType | null;
  initialDueDate?: string | null;
  initialDeliveryTimeAmount?: number | null;
  initialDeliveryTimeUnit?: string | null;
  initialDiscountAmount?: string | null;
  initialDiscountType?: "amount" | "percentage";
  initialSalesTaxRateId?: string | null;
  initialStatus?: string | null;
  initialItems?: LineItemRow[];
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const isEdit = !!invoiceId;
  const hasInitialData = initialItems != null || initialCustomerId != null;
  const { setBarState } = useInvoicesTopBar();
  const [deleteState, setDeleteState] = useState<{ loading: boolean } | null>(null);

  const [loading, setLoading] = useState(false);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "done" | "error">(
    isEdit && !hasInitialData ? "loading" : "idle"
  );
  const [state, setState] = useState<InvoiceFormState>({});
  const [customerId, setCustomerId] = useState(initialCustomerId ?? "");
  const [invoiceDate, setInvoiceDate] = useState(() =>
    initialInvoiceDate ?? new Date().toISOString().slice(0, 10)
  );
  const [status, setStatus] = useState<"Draft" | "Final" | "Sent">(
    (initialStatus && ["Draft", "Final", "Sent"].includes(initialStatus) ? initialStatus : "Draft") as "Draft" | "Final" | "Sent"
  );
  const [poNumber, setPoNumber] = useState(initialPoNumber ?? "");
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [projectName, setProjectName] = useState(initialProjectName ?? "");
  const [subject, setSubject] = useState(initialSubject ?? "");
  const [paymentTerms, setPaymentTerms] = useState(initialPaymentTerms ?? "");
  const [termsType, setTermsType] = useState<TermsType>(
    (initialTermsType && ["due_on_receipt", "net_15", "net_30", "eom", "custom"].includes(initialTermsType) ? initialTermsType : "") as TermsType
  );
  const [dueDate, setDueDate] = useState(
    initialDueDate ?? ""
  );
  const [deliveryTimeAmount, setDeliveryTimeAmount] = useState(
    initialDeliveryTimeAmount != null ? String(initialDeliveryTimeAmount) : ""
  );
  const [deliveryTimeUnit, setDeliveryTimeUnit] = useState<"days" | "weeks" | "months" | "">(
    (initialDeliveryTimeUnit && ["days", "weeks", "months"].includes(initialDeliveryTimeUnit) ? initialDeliveryTimeUnit : "") as "days" | "weeks" | "months" | ""
  );
  const [discountAmount, setDiscountAmount] = useState(initialDiscountAmount ?? "");
  const [discountType, setDiscountType] = useState<"amount" | "percentage">(
    initialDiscountType === "percentage" ? "percentage" : "amount"
  );
  const [salesTaxRateId, setSalesTaxRateId] = useState(initialSalesTaxRateId ?? "");
  const [items, setItems] = useState<LineItemRow[]>(
    initialItems && initialItems.length > 0 ? initialItems : defaultItems()
  );
  const [addItemsModalOpen, setAddItemsModalOpen] = useState(false);

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === customerId) as CustomerOption | undefined,
    [customers, customerId]
  );

  // When terms type or invoice date changes, update due date (unless custom)
  useEffect(() => {
    if (!termsType || termsType === "custom") return;
    const invDate = invoiceDate || new Date().toISOString().slice(0, 10);
    setDueDate(computeDueDateFromTerms(invDate, termsType));
  }, [termsType, invoiceDate]);

  useEffect(() => {
    if (hasInitialData && isEdit) {
      if (initialCustomerId) setCustomerId(initialCustomerId);
      if (initialInvoiceDate) setInvoiceDate(initialInvoiceDate);
      if (initialStatus && ["Draft", "Final", "Sent"].includes(initialStatus)) setStatus(initialStatus as "Draft" | "Final" | "Sent");
      if (initialItems && initialItems.length > 0) setItems(initialItems);
      if (initialTermsType) setTermsType(initialTermsType as TermsType);
      if (initialDueDate) setDueDate(initialDueDate);
      setLoadState("done");
      return;
    }
    if (!invoiceId) return;
    let cancelled = false;
    (async () => {
      const data = await getInvoiceWithItems(invoiceId);
      if (cancelled) return;
      if (!data) {
        setLoadState("error");
        return;
      }
      const inv = data.invoice as { terms_type?: string | null; due_date?: string | null; invoice_date?: string | null };
      setCustomerId(data.invoice.customer_id);
      const invDate = data.invoice.invoice_date ?? new Date().toISOString().slice(0, 10);
      setInvoiceDate(invDate);
      setStatus(
        ["Draft", "Final", "Sent"].includes(data.invoice.status ?? "")
          ? (data.invoice.status as "Draft" | "Final" | "Sent")
          : "Draft"
      );
      setPoNumber(data.invoice.invoice_ref_no ?? "");
      setNotes(data.invoice.notes ?? "");
      setProjectName(data.invoice.project_name ?? "");
      setSubject(data.invoice.subject ?? "");
      setPaymentTerms(data.invoice.payment_terms ?? "");
      const savedDue = inv.due_date ?? null;
      const savedTerms = (inv.terms_type ?? "") as TermsType;
      if (savedDue && savedTerms && savedTerms !== "custom") {
        const computed = computeDueDateFromTerms(invDate, savedTerms);
        if (computed === savedDue) {
          setTermsType(savedTerms);
          setDueDate(savedDue);
        } else {
          setTermsType("custom");
          setDueDate(savedDue);
        }
      } else if (savedDue) {
        setTermsType("custom");
        setDueDate(savedDue);
      } else if (savedTerms) {
        setTermsType(savedTerms);
        setDueDate(computeDueDateFromTerms(invDate, savedTerms));
      } else {
        setTermsType("");
        setDueDate("");
      }
      setDeliveryTimeAmount(data.invoice.delivery_time_amount != null ? String(data.invoice.delivery_time_amount) : "");
      setDeliveryTimeUnit(
        (data.invoice.delivery_time_unit === "days" || data.invoice.delivery_time_unit === "weeks" || data.invoice.delivery_time_unit === "months")
          ? data.invoice.delivery_time_unit
          : ""
      );
      setDiscountAmount(data.invoice.discount_amount != null ? String(data.invoice.discount_amount) : "");
      setDiscountType((data.invoice as { discount_type?: string }).discount_type === "percentage" ? "percentage" : "amount");
      setSalesTaxRateId(data.invoice.sales_tax_rate_id ?? "");
      setItems(data.items.length > 0 ? data.items : defaultItems());
      setLoadState("done");
    })();
    return () => {
      cancelled = true;
    };
  }, [invoiceId, hasInitialData, initialCustomerId, initialInvoiceDate, initialStatus, initialItems]);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setState({});
    formData.set("customer_id", customerId);
    formData.set("invoice_date", invoiceDate);
    formData.set("status", status);
    formData.set("invoice_ref_no", poNumber.trim());
    formData.set("notes", notes.trim());
    formData.set("project_name", projectName.trim());
    formData.set("subject", subject.trim());
    formData.set("payment_terms", paymentTerms.trim());
    formData.set("terms_type", termsType);
    formData.set("due_date", dueDate.trim());
    formData.set("delivery_time_amount", deliveryTimeAmount);
    formData.set("delivery_time_unit", deliveryTimeUnit);
    formData.set("discount_amount", discountAmount);
    formData.set("discount_type", discountType);
    formData.set("sales_tax_rate_id", salesTaxRateId.trim());
    formData.set("items", JSON.stringify(items));
    startGlobalProcessing(isEdit ? "Saving…" : "Creating invoice…");
    try {
      if (isEdit) {
        const result = await updateInvoice(invoiceId, companyId, state, formData);
        if (result?.error) {
          setState(result);
          endGlobalProcessing({ error: result.error });
          return;
        }
        endGlobalProcessing({ success: "Invoice updated." });
        router.push(`/dashboard/sales/${invoiceId}`);
        setLoading(false);
        return;
      } else {
        const result = await createInvoice(companyId, state, formData);
        if (result?.error) {
          setState(result);
          endGlobalProcessing({ error: result.error });
          return;
        }
        endGlobalProcessing({ success: "Invoice created." });
        if (result?.invoiceId) {
          router.push(`/dashboard/sales/${result.invoiceId}`);
        }
        setLoading(false);
        return;
      }
      onSuccess?.();
    } finally {
      endGlobalProcessing();
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!invoiceId) return;
    setDeleteState((prev) => (prev ? { ...prev, loading: true } : null));
    startGlobalProcessing("Deleting…");
    try {
      const result = await deleteInvoice(invoiceId);
      setDeleteState(null);
      if (result?.error) {
        endGlobalProcessing({ error: result.error });
        return;
      }
      endGlobalProcessing({ success: "Invoice deleted." });
      router.push("/dashboard/sales");
      router.refresh();
    } finally {
      endGlobalProcessing();
    }
  }

  const formBarRef = useRef<{
    requestSave: () => void;
    setDeleteState: (s: { loading: boolean } | null) => void;
  } | null>(null);
  formBarRef.current = {
    requestSave: () => (document.getElementById("invoice-form") as HTMLFormElement | null)?.requestSubmit(),
    setDeleteState: (s) => setDeleteState(s),
  };

  useEffect(() => {
    if (onCancel) return;
    const title = isEdit
      ? (initialInvoiceNumber ? `Invoice ${initialInvoiceNumber}` : "Edit invoice")
      : "New invoice";
    const titleSuffix =
      isEdit ? (
        <span className="ml-2 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium bg-[var(--color-surface-variant)] text-[var(--color-on-surface-variant)]">
          {status}
        </span>
      ) : null;
    const h = formBarRef.current;
    setBarState({
      title,
      titleSuffix,
      rightSlot: h ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <IconButton
            type="button"
            variant="primary"
            icon={loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            label={loading ? "Saving…" : "Save"}
            disabled={loading}
            onClick={h.requestSave}
          />
          {isEdit && (
            <IconButton
              type="button"
              variant="danger"
              icon={<Trash2 className="w-4 h-4" />}
              label="Delete"
              onClick={() => h.setDeleteState({ loading: false })}
            />
          )}
          <Link
            href={invoiceId ? `/dashboard/sales/${invoiceId}` : "/dashboard/sales"}
            className="btn btn-secondary btn-icon shrink-0"
            aria-label="Cancel"
            title="Cancel"
          >
            <X className="w-4 h-4" />
          </Link>
        </div>
      ) : undefined,
    });
    return () => setBarState({ title: null, titleSuffix: null, rightSlot: null });
  }, [isEdit, initialInvoiceNumber, invoiceId, status, loading, onCancel, setBarState]);

  if (isEdit && (loadState === "loading" || loadState === "error")) {
    return (
      <div className="py-4 text-center text-sm text-[var(--color-on-surface-variant)]">
        {loadState === "loading" ? "Loading…" : "Invoice not found."}
      </div>
    );
  }

  const subtotal = items.reduce((s, i) => s + i.total_values, 0);
  const discountNum = Number(discountAmount) || 0;
  const discountValue = discountType === "percentage" ? (subtotal * discountNum) / 100 : discountNum;
  const totalAfterDiscount = Math.max(0, subtotal - discountValue);
  const selectedSalesRate = salesTaxRates.find((r) => r.id === salesTaxRateId);
  const salesTaxRatePct = selectedSalesRate ? selectedSalesRate.rate : 0;
  const salesTaxAmount = (totalAfterDiscount * salesTaxRatePct) / 100;
  const finalTotal = totalAfterDiscount + salesTaxAmount;

  const billingLines = selectedCustomer
    ? [
        selectedCustomer.address,
        selectedCustomer.ntn_cnic ? `NTN: ${selectedCustomer.ntn_cnic}` : null,
        [selectedCustomer.city, selectedCustomer.province].filter(Boolean).join(", "),
      ].filter(Boolean)
    : [];

  return (
    <>
    <form
      id="invoice-form"
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit(new FormData(e.currentTarget));
      }}
      className="flex h-full flex-col"
    >
      {/* When used with onCancel (e.g. modal), show own header; otherwise layout top bar is used */}
      {onCancel && (
        <div className="flex flex-shrink-0 items-center justify-between gap-4 border-b border-[var(--color-divider)] px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <IconButton
              type="button"
              variant="secondary"
              icon={<X className="size-4" />}
              label="Close"
              onClick={onCancel}
            />
            <h2 className="truncate text-lg font-semibold text-[var(--color-on-surface)]">
              {isEdit ? (initialInvoiceNumber ? `Invoice ${initialInvoiceNumber}` : "Edit invoice") : "New invoice"}
            </h2>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <IconButton
              type="submit"
              variant="primary"
              icon={loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              label={loading ? "Saving…" : "Save"}
              disabled={loading}
            />
            {isEdit && (
              <IconButton
                type="button"
                variant="danger"
                icon={<Trash2 className="w-4 h-4" />}
                label="Delete"
                onClick={() => setDeleteState({ loading: false })}
              />
            )}
            <Link
              href={invoiceId ? `/dashboard/sales/${invoiceId}` : "/dashboard/sales"}
              className="btn btn-secondary btn-icon"
              aria-label="Cancel"
              title="Cancel"
            >
              <X className="size-4" />
            </Link>
          </div>
        </div>
      )}

      {state?.error && (
        <div
          className="mx-4 mt-3 rounded-xl border border-[var(--color-error)] bg-[var(--color-error-bg)] px-3 py-2.5 text-sm text-[var(--color-error)]"
          role="alert"
        >
          {state.error}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--color-surface-variant)] p-4">
        <div className="mx-auto max-w-4xl space-y-5">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <section className="rounded-xl border border-[var(--color-outline)] bg-[var(--color-card-bg)] p-4">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                Customer
              </h3>
              <div className="space-y-3">
                <label htmlFor="invoice-customer" className={labelClass}>
                  Customer name <span className="text-[var(--color-error)]">*</span>
                </label>
                <select
                  id="invoice-customer"
                  name="customer_id"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  required
                  className={inputClass + " !min-h-[2.5rem] cursor-pointer"}
                >
                  <option value="">— Select customer —</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {selectedCustomer && billingLines.length > 0 && (
                  <div className="rounded-xl border border-[var(--color-divider)] bg-[var(--color-surface-variant)]/20 p-3">
                    <p className="text-xs font-medium uppercase tracking-wider text-[var(--color-on-surface-variant)] mb-1">
                      Billing address
                    </p>
                    <p className="text-sm text-[var(--color-on-surface)] whitespace-pre-line">
                      {billingLines.join("\n")}
                    </p>
                  </div>
                )}
                <div>
                  <label htmlFor="invoice-project-name" className={labelClass}>Project name</label>
                  <input
                    id="invoice-project-name"
                    name="project_name"
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className={inputClass + " h-[2.5rem] min-h-0"}
                    placeholder="e.g. Office renovation"
                  />
                </div>
                <div>
                  <label htmlFor="invoice-subject" className={labelClass}>Subject</label>
                  <input
                    id="invoice-subject"
                    name="subject"
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className={inputClass + " h-[2.5rem] min-h-0"}
                    placeholder="e.g. Invoice for steel fabrication"
                  />
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-[var(--color-outline)] bg-[var(--color-card-bg)] p-4">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                Invoice details
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Invoice # <span className="text-[var(--color-error)]">*</span></label>
                  <div className="flex min-h-[2.5rem] items-center rounded-xl border border-[var(--color-outline)] bg-[var(--color-input-bg)] px-3 py-2.5 text-sm font-medium text-[var(--color-on-surface)]">
                    {isEdit ? (initialInvoiceNumber ?? "—") : "Auto-generated"}
                  </div>
                </div>
                <div>
                  <label htmlFor="invoice-date" className={labelClass}>Invoice date <span className="text-[var(--color-error)]">*</span></label>
                  <input
                    id="invoice-date"
                    name="invoice_date"
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className={inputClass + " h-[2.5rem] min-h-0"}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="invoice-po" className={labelClass}>P.O. number</label>
                  <input
                    id="invoice-po"
                    name="invoice_ref_no"
                    type="text"
                    value={poNumber}
                    onChange={(e) => setPoNumber(e.target.value)}
                    className={inputClass + " h-[2.5rem] min-h-0"}
                    placeholder="Customer P.O. or reference"
                  />
                </div>
                <div>
                  <label htmlFor="invoice-status" className={labelClass}>Status</label>
                  <select
                    id="invoice-status"
                    name="status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as "Draft" | "Final" | "Sent")}
                    className={inputClass + " h-[2.5rem] min-h-0 cursor-pointer"}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="invoice-terms" className={labelClass}>Terms</label>
                  <select
                    id="invoice-terms"
                    name="terms_type"
                    value={termsType}
                    onChange={(e) => setTermsType(e.target.value as TermsType)}
                    className={inputClass + " h-[2.5rem] min-h-0 cursor-pointer"}
                  >
                    {TERMS_OPTIONS.map((o) => (
                      <option key={o.value || "none"} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="invoice-due-date" className={labelClass}>Due date</label>
                  <input
                    id="invoice-due-date"
                    name="due_date"
                    type="date"
                    value={dueDate}
                    onChange={(e) => {
                      setDueDate(e.target.value);
                      setTermsType("custom");
                    }}
                    className={inputClass + " h-[2.5rem] min-h-0"}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="invoice-payment-terms" className={labelClass}>Payment terms (optional text)</label>
                  <input
                    id="invoice-payment-terms"
                    name="payment_terms"
                    type="text"
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className={inputClass + " h-[2.5rem] min-h-0"}
                    placeholder="e.g. Due on receipt"
                  />
                </div>
                <div>
                  <label htmlFor="invoice-delivery-amount" className={labelClass}>Delivery time</label>
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <input
                      id="invoice-delivery-amount"
                      name="delivery_time_amount"
                      type="number"
                      min={0}
                      value={deliveryTimeAmount}
                      onChange={(e) => setDeliveryTimeAmount(e.target.value)}
                      className={inputClass + " h-[2.5rem] min-h-0 w-24"}
                      placeholder="0"
                    />
                    <select
                      name="delivery_time_unit"
                      value={deliveryTimeUnit}
                      onChange={(e) => setDeliveryTimeUnit(e.target.value as "days" | "weeks" | "months" | "")}
                      className={inputClass + " h-[2.5rem] min-h-0 w-28 cursor-pointer"}
                    >
                      <option value="">—</option>
                      {DELIVERY_TIME_UNITS.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <section className="rounded-xl border border-[var(--color-outline)] bg-[var(--color-card-bg)] p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                Line items
              </h3>
              <button
                type="button"
                onClick={() => setAddItemsModalOpen(true)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)]/10"
                aria-label="Add items from catalog"
              >
                <PlusCircle className="h-5 w-5" />
              </button>
            </div>
            <LineItemsEditor items={items} onChange={setItems} companyId={companyId} searchItems={searchItems} uomList={uomList} />
            <AddItemsFromCatalogModal
              open={addItemsModalOpen}
              onClose={() => setAddItemsModalOpen(false)}
              companyId={companyId}
              onImport={(newRows) => {
                setItems((prev) => [...prev, ...newRows]);
                setAddItemsModalOpen(false);
              }}
            />
            <div className="mt-6 overflow-hidden rounded-xl border border-[var(--color-outline)]">
              <table className="w-full min-w-[320px] text-left text-sm tabular-nums">
                <thead>
                  <tr className="border-b border-[var(--color-outline)] bg-[var(--color-surface-variant)]">
                    <th className="p-2.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Calculation</th>
                    <th className="w-28 p-2.5 text-right text-xs font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[var(--color-divider)]">
                    <td className="p-2.5 text-[var(--color-on-surface-variant)]">Total</td>
                    <td className="p-2.5 text-right font-medium text-[var(--color-on-surface)]">{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                  <tr className="border-b border-[var(--color-divider)] align-middle">
                    <td className="p-2.5">
                      <div className="flex min-w-0 flex-nowrap items-center gap-2">
                        <span className="shrink-0 text-[var(--color-on-surface-variant)]">Discount</span>
                        <input
                          type="number"
                          min={0}
                          step={discountType === "percentage" ? 0.01 : 1}
                          value={discountAmount}
                          onChange={(e) => setDiscountAmount(e.target.value)}
                          className={inputClass + " input-no-spinner h-[2.25rem] min-h-0 w-[9rem] max-w-[9rem] shrink-0"}
                          placeholder={discountType === "percentage" ? "0" : "0"}
                        />
                        <select
                          name="discount_type"
                          value={discountType}
                          onChange={(e) => setDiscountType(e.target.value as "amount" | "percentage")}
                          className={inputClass + " h-[2.25rem] min-h-0 w-[10rem] max-w-[10rem] shrink-0 cursor-pointer"}
                        >
                          <option value="amount">Amount</option>
                          <option value="percentage">%</option>
                        </select>
                      </div>
                    </td>
                    <td className="p-2.5 text-right font-medium text-[var(--color-on-surface)]">-{discountValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                  <tr className="border-b border-[var(--color-divider)]">
                    <td className="p-2.5 text-[var(--color-on-surface-variant)]">Total after discount</td>
                    <td className="p-2.5 text-right font-medium text-[var(--color-on-surface)]">{totalAfterDiscount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                  <tr className="border-b border-[var(--color-divider)] align-middle">
                    <td className="p-2.5">
                      <div className="flex min-w-0 flex-nowrap items-center gap-2">
                        <span className="shrink-0 text-[var(--color-on-surface-variant)]">Sales tax</span>
                        <select
                          name="sales_tax_rate_id"
                          value={salesTaxRateId}
                          onChange={(e) => setSalesTaxRateId(e.target.value)}
                          className={inputClass + " h-[2.25rem] min-h-0 w-[10rem] max-w-[10rem] shrink-0 cursor-pointer"}
                        >
                          <option value="">— None —</option>
                          {salesTaxRates.map((r) => (
                            <option key={r.id} value={r.id}>{r.name} ({r.rate}%)</option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="p-2.5 text-right font-medium text-[var(--color-on-surface)]">{salesTaxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                  <tr className="border-t-2 border-[var(--color-outline)] bg-[var(--color-surface-variant)]/30">
                    <td className="p-2.5 font-semibold text-[var(--color-on-surface)]">G.Total</td>
                    <td className="p-2.5 text-right text-base font-semibold text-[var(--color-on-surface)]">{finalTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-xl border border-[var(--color-outline)] bg-[var(--color-card-bg)] p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Notes</h3>
            <textarea
              name="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className={inputClass + " resize-y min-h-[60px]"}
              placeholder="Optional notes for the customer"
            />
          </section>
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center border-t border-[var(--color-divider)] px-4 py-2">
        <p className="text-xs text-[var(--color-on-surface-variant)]">
          PDF: <span className="font-medium text-[var(--color-on-surface)]">Invoice</span>
        </p>
      </div>
    </form>
    <ConfirmDialog
      open={!!deleteState}
      title="Delete invoice?"
      message="This cannot be undone."
      confirmLabel="Delete"
      variant="danger"
      loading={deleteState?.loading ?? false}
      onConfirm={handleDelete}
      onCancel={() => setDeleteState(null)}
    />
    </>
  );
}
