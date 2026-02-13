"use client";

import { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  createEstimate,
  updateEstimate,
  getEstimateWithItems,
  deleteEstimate,
  setEstimateStatus,
  convertEstimateToInvoice,
  type EstimateFormState,
} from "./actions";
import { Save, Loader2, Plus, Pencil, PlusCircle, Search, X, Trash2, Send, FileOutput, FileSpreadsheet } from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { LineItemsEditor, type LineItemRow } from "@/components/LineItemsEditor";
import { IconButton } from "@/components/IconButton";
import { Modal } from "@/components/Modal";
import { startGlobalProcessing, endGlobalProcessing } from "@/components/GlobalProcessing";
import { EstimateLoadingFallback } from "./EstimateLoadingFallback";
import { CustomerForm, type Customer } from "@/app/(dashboard)/dashboard/customers/CustomerForm";
import {
  searchCustomers,
  getCustomerById,
  type CustomerSearchResult,
} from "@/app/(dashboard)/dashboard/customers/actions";
import { getUomList } from "@/app/(dashboard)/dashboard/items/actions";
import { AddItemsFromCatalogModal } from "./AddItemsFromCatalogModal";
import { formatEstimateDate } from "@/lib/formatDate";
import { EstimateStatusBadge } from "./EstimateStatusBadge";
import { useEstimatesTopBar } from "./EstimatesTopBarContext";

const inputClass =
  "w-full min-h-[2.5rem] border border-[var(--color-input-border)] rounded-xl px-3 py-2.5 text-[var(--color-on-surface)] bg-[var(--color-input-bg)] placeholder:text-[var(--color-on-surface-variant)] transition-colors duration-200 focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";
const labelClass = "block text-sm font-medium text-[var(--color-on-surface)] mb-1.5";

const DELIVERY_TIME_UNITS = ["days", "weeks", "months"] as const;

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

const SEARCH_DEBOUNCE_MS = 300;

export type SalesTaxRateOption = { id: string; name: string; rate: number };

export type UomOption = { id: string; code: string; description: string };

export function EstimateForm({
  estimateId,
  companyId,
  company,
  salesTaxRates = [],
  uomList: initialUomList,
  initialEstimateNumber,
  initialEstimateDate,
  initialCustomerId,
  initialSelectedCustomer,
  initialEstimateWithItems,
  onSuccess,
  onCancel,
}: {
  estimateId: string | null;
  companyId: string;
  company?: { name: string } | null;
  salesTaxRates?: SalesTaxRateOption[];
  uomList?: UomOption[];
  initialEstimateNumber?: string | null;
  initialEstimateDate?: string | null;
  initialCustomerId?: string | null;
  initialSelectedCustomer?: CustomerSearchResult | null;
  /** When provided (edit mode), form skips client-side getEstimateWithItems and uses this data. */
  initialEstimateWithItems?: Awaited<ReturnType<typeof getEstimateWithItems>> | null;
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
  const [customerId, setCustomerId] = useState(initialCustomerId ?? "");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSearchResult | null>(
    initialSelectedCustomer ?? null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CustomerSearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const paymentTermsRef = useRef<HTMLTextAreaElement>(null);
  const [estimateDate, setEstimateDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [validUntil, setValidUntil] = useState("");
  const [status, setStatus] = useState("Draft");
  const [projectName, setProjectName] = useState("");
  const [subject, setSubject] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItemRow[]>(defaultItems());
  const [customerModal, setCustomerModal] = useState<"add" | "edit" | null>(null);
  const [addItemsModalOpen, setAddItemsModalOpen] = useState(false);
  const [deleteState, setDeleteState] = useState<{ loading: boolean } | null>(null);
  const [convertState, setConvertState] = useState<{ loading: boolean } | null>(null);
  const [sendLoading, setSendLoading] = useState(false);
  const [discountAmount, setDiscountAmount] = useState("");
  const [discountType, setDiscountType] = useState<"amount" | "percentage">("amount");
  const [salesTaxRateId, setSalesTaxRateId] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [deliveryTimeAmount, setDeliveryTimeAmount] = useState("");
  const [deliveryTimeUnit, setDeliveryTimeUnit] = useState<"days" | "weeks" | "months">("days");
  const [uomList, setUomList] = useState<UomOption[]>(initialUomList ?? []);

  useEffect(() => {
    if (initialUomList?.length) return;
    getUomList().then(setUomList);
  }, [initialUomList]);

  const runSearch = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setSearchResults([]);
        return;
      }
      setSearchLoading(true);
      const list = await searchCustomers(companyId, q);
      setSearchResults(list);
      setSearchLoading(false);
    },
    [companyId]
  );

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    searchDebounceRef.current = setTimeout(() => runSearch(searchQuery), SEARCH_DEBOUNCE_MS);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery, runSearch]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useLayoutEffect(() => {
    const el = paymentTermsRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, 60)}px`;
  }, [paymentTerms]);

  const handleSelectCustomer = useCallback((c: CustomerSearchResult) => {
    setCustomerId(c.id);
    setSelectedCustomer(c);
    setSearchQuery("");
    setSearchResults([]);
    setSearchOpen(false);
  }, []);

  const handleClearCustomer = useCallback(() => {
    setCustomerId("");
    setSelectedCustomer(null);
    setSearchQuery("");
    setSearchResults([]);
    setSearchOpen(false);
  }, []);

  function applyEstimateWithItems(data: NonNullable<Awaited<ReturnType<typeof getEstimateWithItems>>>) {
    setCustomerId(data.estimate.customer_id ?? "");
    setEstimateDate(data.estimate.estimate_date ?? new Date().toISOString().slice(0, 10));
    setValidUntil(data.estimate.valid_until ?? "");
    setStatus(data.estimate.status ?? "Draft");
    setProjectName((data.estimate as { project_name?: string | null }).project_name ?? "");
    setSubject((data.estimate as { subject?: string | null }).subject ?? "");
    setNotes(data.estimate.notes ?? "");
    setItems(data.items.length > 0 ? data.items : defaultItems());
    const est = data.estimate as { discount_amount?: number | null; discount_type?: string | null; sales_tax_rate_id?: string | null };
    setDiscountAmount(est.discount_amount != null ? String(est.discount_amount) : "");
    setDiscountType(est.discount_type === "percentage" ? "percentage" : "amount");
    setSalesTaxRateId(est.sales_tax_rate_id ?? "");
    setPaymentTerms((data.estimate as { payment_terms?: string | null }).payment_terms ?? "");
    const dta = (data.estimate as { delivery_time_amount?: number | null }).delivery_time_amount;
    const dtu = (data.estimate as { delivery_time_unit?: string | null }).delivery_time_unit;
    setDeliveryTimeAmount(dta != null ? String(dta) : "");
    setDeliveryTimeUnit(dtu === "weeks" || dtu === "months" ? dtu : "days");
    setLoadState("done");
  }

  useEffect(() => {
    if (!estimateId) return;
    if (initialEstimateWithItems) {
      applyEstimateWithItems(initialEstimateWithItems);
      return;
    }
    let cancelled = false;
    (async () => {
      const data = await getEstimateWithItems(estimateId);
      if (cancelled) return;
      if (!data) {
        setLoadState("error");
        return;
      }
      applyEstimateWithItems(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [estimateId, initialEstimateWithItems]);

  const { setBarState } = useEstimatesTopBar();
  const formBarRef = useRef<{
    handleSend: () => void;
    setConvertState: (s: { loading: boolean } | null) => void;
    setDeleteState: (s: { loading: boolean } | null) => void;
    requestSave: () => void;
  } | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const displayStatus = status === "Sent" && validUntil && validUntil < today ? "Expired" : status;
  const canSend = isEdit && displayStatus === "Draft";
  const canConvert = isEdit && displayStatus !== "Converted" && displayStatus !== "Expired";

  async function handleSend() {
    if (!estimateId) return;
    setSendLoading(true);
    startGlobalProcessing("Marking as sent…");
    try {
      const result = await setEstimateStatus(estimateId, "Sent");
      if (result?.error) {
        endGlobalProcessing({ error: result.error });
        return;
      }
      setStatus("Sent");
      endGlobalProcessing({ success: "Estimate marked as sent." });
      router.refresh();
    } finally {
      setSendLoading(false);
      endGlobalProcessing();
    }
  }

  async function handleConvert() {
    if (!estimateId) return;
    setConvertState({ loading: true });
    startGlobalProcessing("Converting to invoice…");
    try {
      const result = await convertEstimateToInvoice(estimateId);
      setConvertState(null);
      if (result?.error) {
        endGlobalProcessing({ error: result.error });
        return;
      }
      endGlobalProcessing({ success: "Invoice created." });
      if (result?.invoiceId) router.push(`/dashboard/sales/${result.invoiceId}`);
      else router.refresh();
    } finally {
      endGlobalProcessing();
    }
  }

  formBarRef.current = {
    handleSend,
    setConvertState: (s) => setConvertState(s),
    setDeleteState: (s) => setDeleteState(s),
    requestSave: () => (document.getElementById("estimate-form") as HTMLFormElement | null)?.requestSubmit(),
  };

  useEffect(() => {
    const title = isEdit
      ? (initialEstimateNumber ? `Estimate ${initialEstimateNumber}` : "Edit estimate")
      : "New estimate";
    const h = formBarRef.current;
    setBarState({
      title,
      titleSuffix: h && !onCancel ? <EstimateStatusBadge status={displayStatus} className="shrink-0" /> : null,
      rightSlot:
        h && !onCancel ? (
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
              href={estimateId ? `/dashboard/estimates/${estimateId}` : "/dashboard/estimates"}
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
  }, [
    isEdit,
    initialEstimateNumber,
    estimateId,
    displayStatus,
    loading,
    onCancel,
    setBarState,
  ]);

  async function handleSubmit(formData: FormData, sendNow = false) {
    if (!customerId) {
      setState({ error: "Please select or add a customer." });
      return;
    }
    setLoading(true);
    setState({});
    formData.set("customer_id", customerId);
    formData.set("estimate_date", estimateDate);
    formData.set("valid_until", validUntil);
    formData.set("payment_terms", paymentTerms);
    formData.set("delivery_time_amount", deliveryTimeAmount);
    formData.set("delivery_time_unit", deliveryTimeUnit);
    formData.set("status", sendNow ? "Sent" : status);
    formData.set("project_name", projectName);
    formData.set("subject", subject);
    formData.set("notes", notes);
    formData.set("discount_amount", discountAmount);
    formData.set("discount_type", discountType);
    formData.set("sales_tax_rate_id", salesTaxRateId);
    formData.set("items", JSON.stringify(items));
    startGlobalProcessing(isEdit ? (sendNow ? "Saving and sending…" : "Saving…") : "Creating estimate…");
    try {
      if (isEdit) {
        const result = await updateEstimate(estimateId, companyId, state, formData);
        if (result?.error) {
          setState(result);
          endGlobalProcessing({ error: result.error });
          return;
        }
        const msg = sendNow ? "Estimate saved and sent." : "Estimate updated.";
        endGlobalProcessing({ success: msg });
        router.push(`/dashboard/estimates/${estimateId}`);
        setLoading(false);
        return;
      } else {
        const result = await createEstimate(companyId, state, formData);
        if (result?.error) {
          setState(result);
          endGlobalProcessing({ error: result.error });
          return;
        }
        const msg = sendNow ? "Estimate saved and sent." : "Estimate created.";
        endGlobalProcessing({ success: msg });
        if (result?.estimateId) router.push(`/dashboard/estimates/${result.estimateId}`);
        setLoading(false);
        return;
      }
      onSuccess?.();
    } finally {
      endGlobalProcessing();
      setLoading(false);
    }
  }

  if (isEdit && loadState === "loading") {
    return <EstimateLoadingFallback />;
  }
  if (isEdit && loadState === "error") {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center py-4 text-center text-sm text-[var(--color-on-surface-variant)]">
        Estimate not found.
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

  function doSubmit(e: React.FormEvent<HTMLFormElement>, sendNow: boolean) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("items", JSON.stringify(items));
    handleSubmit(fd, sendNow);
  }

  async function handleDelete() {
    if (!estimateId) return;
    setDeleteState({ loading: true });
    startGlobalProcessing("Deleting…");
    try {
      const result = await deleteEstimate(estimateId);
      setDeleteState(null);
      if (result?.error) {
        endGlobalProcessing({ error: result.error });
        return;
      }
      endGlobalProcessing({ success: "Estimate deleted." });
      router.push("/dashboard/estimates");
      router.refresh();
    } finally {
      endGlobalProcessing();
    }
  }

  return (
    <>
    <form
      id="estimate-form"
      onSubmit={(e) => doSubmit(e, false)}
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
              {isEdit ? (initialEstimateNumber ? `Estimate ${initialEstimateNumber}` : "Edit estimate") : "New estimate"}
            </h2>
            <EstimateStatusBadge status={displayStatus} className="shrink-0" />
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {canSend && (
              <button
                type="button"
                disabled={sendLoading}
                onClick={handleSend}
                className="btn btn-primary btn-sm inline-flex items-center gap-2"
              >
                <Send className="w-4 h-4 shrink-0" />
                Send
              </button>
            )}
            {canConvert && (
              <button
                type="button"
                className="btn btn-primary btn-sm inline-flex items-center gap-2"
                onClick={() => setConvertState({ loading: false })}
              >
                <FileOutput className="w-4 h-4 shrink-0" />
                Convert
              </button>
            )}
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
              href={estimateId ? `/dashboard/estimates/${estimateId}` : "/dashboard/estimates"}
              className="btn btn-secondary btn-icon shrink-0"
              aria-label="Cancel"
              title="Cancel"
            >
              <X className="w-4 h-4" />
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
          {/* Customer + Quote details side by side on md+ */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {/* Customer card */}
          <section className="rounded-xl border border-[var(--color-outline)] bg-[var(--color-card-bg)] p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              Customer
            </h3>
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label htmlFor="estimate-customer" className={labelClass}>
                  Customer name <span className="text-[var(--color-error)]">*</span>
                </label>
                <div className="flex items-center gap-1">
                  <IconButton
                    variant="add"
                    icon={<Plus className="w-4 h-4" />}
                    label="Add customer"
                    onClick={() => setCustomerModal("add")}
                  />
                  {selectedCustomer && (
                    <IconButton
                      variant="edit"
                      icon={<Pencil className="w-4 h-4" />}
                      label="Edit customer"
                      onClick={() => setCustomerModal("edit")}
                    />
                  )}
                </div>
              </div>
              <input type="hidden" name="customer_id" value={customerId} />
              {selectedCustomer ? (
                <div className="flex items-center gap-2 rounded-xl border border-[var(--color-outline)] bg-[var(--color-input-bg)] px-3 py-2.5 min-h-[2.5rem]">
                  <span className="flex-1 text-sm text-[var(--color-on-surface)]">{selectedCustomer.name}</span>
                  <button
                    type="button"
                    onClick={handleClearCustomer}
                    className="shrink-0 rounded p-1 text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-variant)] hover:text-[var(--color-on-surface)]"
                    aria-label="Change customer"
                    title="Change customer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div ref={searchRef} className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-[var(--color-on-surface-variant)]" aria-hidden />
                    <input
                      id="estimate-customer"
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setSearchOpen(true);
                      }}
                      onFocus={() => setSearchOpen(true)}
                      placeholder="Search customers by name, email, or phone…"
                      className={inputClass + " h-[2.5rem] min-h-0 pl-9"}
                      autoComplete="off"
                    />
                  </div>
                  {searchOpen && (
                    <div className="absolute top-full left-0 right-0 z-10 mt-1 max-h-60 overflow-y-auto rounded-xl border border-[var(--color-outline)] bg-[var(--color-card-bg)] shadow-lg">
                      {searchLoading ? (
                        <div className="flex items-center justify-center gap-2 px-3 py-4 text-sm text-[var(--color-on-surface-variant)]">
                          <Loader2 className="w-4 h-4 animate-spin" /> Searching…
                        </div>
                      ) : searchResults.length === 0 ? (
                        <div className="px-3 py-4 text-sm text-[var(--color-on-surface-variant)]">
                          {searchQuery.trim() ? "No customers found. Add one with + above." : "Type to search customers."}
                        </div>
                      ) : (
                        <ul className="py-1" role="listbox">
                          {searchResults.map((c) => (
                            <li key={c.id}>
                              <button
                                type="button"
                                role="option"
                                className="w-full px-3 py-2.5 text-left text-sm text-[var(--color-on-surface)] hover:bg-[var(--color-surface-variant)]"
                                onClick={() => handleSelectCustomer(c)}
                              >
                                <span className="font-medium">{c.name}</span>
                                {(c.email || c.phone) && (
                                  <span className="ml-2 text-[var(--color-on-surface-variant)]">
                                    {[c.email, c.phone].filter(Boolean).join(" · ")}
                                  </span>
                                )}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              )}
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
                <label htmlFor="estimate-project-name" className={labelClass}>
                  Project name
                </label>
                <input
                  id="estimate-project-name"
                  name="project_name"
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className={inputClass + " h-[2.5rem] min-h-0"}
                  placeholder="e.g. Office renovation"
                />
              </div>
              <div>
                <label htmlFor="estimate-subject" className={labelClass}>
                  Subject
                </label>
                <input
                  id="estimate-subject"
                  name="subject"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className={inputClass + " h-[2.5rem] min-h-0"}
                  placeholder="e.g. Quote for steel fabrication"
                />
              </div>
            </div>
          </section>

          {/* Quote details card */}
          <section className="min-w-0 rounded-xl border border-[var(--color-outline)] bg-[var(--color-card-bg)] p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              Quote details
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="estimate-date" className={labelClass}>
                  Quote date <span className="text-[var(--color-error)]">*</span>
                </label>
                <input
                  id="estimate-date"
                  name="estimate_date"
                  type="date"
                  value={estimateDate}
                  onChange={(e) => setEstimateDate(e.target.value)}
                  className={inputClass + " h-[2.5rem] min-h-0"}
                  required
                />
                {estimateDate && (
                  <p className="mt-0.5 text-xs text-[var(--color-on-surface-variant)]">
                    {formatEstimateDate(estimateDate)}
                  </p>
                )}
              </div>
              <div>
                <label className={labelClass}>
                  Quote # <span className="text-[var(--color-error)]">*</span>
                </label>
                <div className="flex h-[2.5rem] items-center rounded-xl border border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-3 py-2.5 text-sm font-medium text-[var(--color-on-surface)]">
                  {isEdit ? (initialEstimateNumber ?? "—") : (initialEstimateNumber ?? "Auto-generated")}
                </div>
              </div>
              <div>
                <label htmlFor="estimate-expiry" className={labelClass}>
                  Expiry date
                </label>
                <input
                  id="estimate-expiry"
                  name="valid_until"
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className={inputClass + " h-[2.5rem] min-h-0"}
                />
                {validUntil && (
                  <p className="mt-0.5 text-xs text-[var(--color-on-surface-variant)]">
                    {formatEstimateDate(validUntil)}
                  </p>
                )}
              </div>
              <div className="min-w-0">
                <label htmlFor="estimate-delivery-time" className={labelClass}>
                  Delivery time
                </label>
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <input
                    id="estimate-delivery-time"
                    name="delivery_time_amount"
                    type="number"
                    min={0}
                    value={deliveryTimeAmount}
                    onChange={(e) => setDeliveryTimeAmount(e.target.value)}
                    placeholder="0"
                    className={inputClass + " input-no-spinner h-[2.5rem] min-h-0 w-20 shrink-0"}
                  />
                  <select
                    name="delivery_time_unit"
                    value={deliveryTimeUnit}
                    onChange={(e) => setDeliveryTimeUnit(e.target.value as "days" | "weeks" | "months")}
                    className={inputClass + " h-[2.5rem] min-h-0 shrink-0 cursor-pointer sm:min-w-0 sm:w-28"}
                  >
                    {DELIVERY_TIME_UNITS.map((u) => {
                      return (
                        <option key={u} value={u}>
                          {u.charAt(0).toUpperCase() + u.slice(1)}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            </div>
          </section>
          </div>

          {/* Line items card */}
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
            <LineItemsEditor items={items} onChange={setItems} uomList={uomList} />
            <AddItemsFromCatalogModal
              open={addItemsModalOpen}
              onClose={() => setAddItemsModalOpen(false)}
              companyId={companyId}
              onImport={(newRows) => {
                setItems((prev) => [...prev, ...newRows]);
                setAddItemsModalOpen(false);
              }}
            />

            {/* Discount & tax calculations — table styled like line items */}
            <div className="mt-6 overflow-hidden rounded-xl border border-[var(--color-outline)]">
              <table className="w-full min-w-[320px] text-left text-sm tabular-nums">
                <thead>
                  <tr className="border-b border-[var(--color-outline)] bg-[var(--color-surface-variant)]">
                    <th className="p-2.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                      Calculation
                    </th>
                    <th className="w-28 p-2.5 text-right text-xs font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[var(--color-divider)] hover:bg-[var(--color-surface-variant)]/20 transition-colors duration-150">
                    <td className="p-2.5 text-[var(--color-on-surface-variant)]">Total</td>
                    <td className="p-2.5 text-right font-medium text-[var(--color-on-surface)]">
                      {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr className="border-b border-[var(--color-divider)] hover:bg-[var(--color-surface-variant)]/20 transition-colors duration-150 align-middle">
                    <td className="p-2.5">
                      <div className="flex min-w-0 flex-nowrap items-center gap-2">
                        <span className="shrink-0 text-[var(--color-on-surface-variant)]">Discount</span>
                        <input
                          id="estimate-discount"
                          type="number"
                          min={0}
                          step={discountType === "percentage" ? 0.01 : 1}
                          value={discountAmount}
                          onChange={(e) => setDiscountAmount(e.target.value)}
                          className={inputClass + " input-no-spinner h-[2.25rem] min-h-0 w-[9rem] max-w-[9rem] shrink-0"}
                          placeholder={discountType === "percentage" ? "0" : "0"}
                          aria-label="Discount value"
                        />
                        <select
                          name="discount_type"
                          value={discountType}
                          onChange={(e) => setDiscountType(e.target.value as "amount" | "percentage")}
                          className={inputClass + " h-[2.25rem] min-h-0 w-[10rem] max-w-[10rem] shrink-0 cursor-pointer"}
                          aria-label="Discount type"
                        >
                          <option value="amount">Amount</option>
                          <option value="percentage">%</option>
                        </select>
                      </div>
                    </td>
                    <td className="p-2.5 text-right font-medium text-[var(--color-on-surface)]">
                      -{discountValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr className="border-b border-[var(--color-divider)] hover:bg-[var(--color-surface-variant)]/20 transition-colors duration-150">
                    <td className="p-2.5 text-[var(--color-on-surface-variant)]">Total after discount</td>
                    <td className="p-2.5 text-right font-medium text-[var(--color-on-surface)]">
                      {totalAfterDiscount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr className="border-b border-[var(--color-divider)] hover:bg-[var(--color-surface-variant)]/20 transition-colors duration-150 align-middle">
                    <td className="p-2.5">
                      <div className="flex min-w-0 flex-nowrap items-center gap-2">
                        <span className="shrink-0 text-[var(--color-on-surface-variant)]">Sales tax</span>
                        <select
                          id="estimate-sales-tax"
                          name="sales_tax_rate_id"
                          value={salesTaxRateId}
                          onChange={(e) => setSalesTaxRateId(e.target.value)}
                          className={inputClass + " h-[2.25rem] min-h-0 w-[10rem] max-w-[10rem] shrink-0 cursor-pointer"}
                          aria-label="Sales tax rate"
                        >
                          <option value="">— None —</option>
                          {salesTaxRates.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name} ({r.rate}%)
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="p-2.5 text-right font-medium text-[var(--color-on-surface)]">
                      {salesTaxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr className="border-t-2 border-[var(--color-outline)] bg-[var(--color-surface-variant)]/30">
                    <td className="p-2.5 font-semibold text-[var(--color-on-surface)]">G.Total</td>
                    <td className="p-2.5 text-right text-base font-semibold text-[var(--color-on-surface)]">
                      {finalTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Notes card */}
          <section className="rounded-xl border border-[var(--color-outline)] bg-[var(--color-card-bg)] p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              Notes
            </h3>
            <label htmlFor="estimate-notes" className="sr-only">
              Notes
            </label>
            <textarea
              id="estimate-notes"
              name="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className={inputClass + " resize-y min-h-[60px]"}
              placeholder="Optional notes for the customer"
            />
          </section>

          {/* Terms and conditions card — below Notes */}
          <section className="rounded-xl border border-[var(--color-outline)] bg-[var(--color-card-bg)] p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              Terms and conditions
            </h3>
            <label htmlFor="estimate-payment-terms" className="sr-only">
              Terms and conditions
            </label>
            <textarea
              ref={paymentTermsRef}
              id="estimate-payment-terms"
              name="payment_terms"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              rows={1}
              placeholder="e.g. 50% advance, 50% on delivery"
              className={inputClass + " min-h-[60px] overflow-hidden resize-none"}
            />
          </section>
        </div>
      </div>

      {/* Footer: secondary info only; primary actions are in header */}
      <div className="flex flex-shrink-0 items-center border-t border-[var(--color-divider)] px-4 py-2">
        <p className="text-xs text-[var(--color-on-surface-variant)]">
          PDF template: <span className="font-medium text-[var(--color-on-surface)]">Estimate</span>
          {" · "}
          <button type="button" className="text-[var(--color-primary)] hover:underline">
            Change
          </button>
        </p>
      </div>
    </form>

    {isEdit && (
      <ConfirmDialog
        open={!!deleteState}
        title="Delete estimate?"
        message="This estimate will be removed. This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loadingLabel="Deleting…"
        loading={deleteState?.loading ?? false}
        onConfirm={handleDelete}
        onCancel={() => setDeleteState(null)}
      />
    )}

    {isEdit && (
      <ConfirmDialog
        open={!!convertState}
        title="Convert to invoice?"
        message="A new draft sales invoice will be created from this estimate."
        confirmLabel="Convert"
        variant="primary"
        loadingLabel="Converting…"
        loading={convertState?.loading ?? false}
        onConfirm={handleConvert}
        onCancel={() => setConvertState(null)}
      />
    )}

    <Modal
      open={customerModal !== null}
      onClose={() => setCustomerModal(null)}
      title={customerModal === "add" ? "Add customer" : "Edit customer"}
    >
      <CustomerForm
          customer={customerModal === "edit" && selectedCustomer ? (selectedCustomer as Customer) : null}
          companyId={companyId}
          onSuccess={async (newId) => {
            setCustomerModal(null);
            if (newId) {
              setCustomerId(newId);
              const customer = await getCustomerById(companyId, newId);
              if (customer) setSelectedCustomer(customer);
            }
            router.refresh();
          }}
          onCancel={() => setCustomerModal(null)}
        />
    </Modal>
  </>
  );
}
