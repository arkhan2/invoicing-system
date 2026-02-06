"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  createEstimate,
  updateEstimate,
  getEstimateWithItems,
  type EstimateFormState,
} from "./actions";
import { Save, Loader2, Plus, Pencil, Search, X } from "lucide-react";
import { LineItemsEditor, type LineItemRow } from "@/components/LineItemsEditor";
import { IconButton } from "@/components/IconButton";
import { Modal } from "@/components/Modal";
import { showMessage } from "@/components/MessageBar";
import { CustomerForm, type Customer } from "@/app/(dashboard)/dashboard/customers/CustomerForm";
import {
  searchCustomers,
  getCustomerById,
  type CustomerSearchResult,
} from "@/app/(dashboard)/dashboard/customers/actions";
import { formatEstimateDate } from "@/lib/formatDate";

const inputClass =
  "w-full min-h-[2.5rem] border border-[var(--color-outline)] rounded-xl px-3 py-2.5 text-[var(--color-on-surface)] bg-[var(--color-input-bg)] placeholder:text-[var(--color-on-surface-variant)] transition-colors duration-200 focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";
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

const SEARCH_DEBOUNCE_MS = 300;

export function EstimateForm({
  estimateId,
  companyId,
  company,
  initialEstimateNumber,
  initialEstimateDate,
  initialCustomerId,
  initialSelectedCustomer,
  onSuccess,
  onCancel,
}: {
  estimateId: string | null;
  companyId: string;
  company?: { name: string } | null;
  initialEstimateNumber?: string | null;
  initialEstimateDate?: string | null;
  initialCustomerId?: string | null;
  initialSelectedCustomer?: CustomerSearchResult | null;
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
      setProjectName((data.estimate as { project_name?: string | null }).project_name ?? "");
      setSubject((data.estimate as { subject?: string | null }).subject ?? "");
      setNotes(data.estimate.notes ?? "");
      setItems(data.items.length > 0 ? data.items : defaultItems());
      setLoadState("done");
    })();
    return () => {
      cancelled = true;
    };
  }, [estimateId]);

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
    formData.set("status", sendNow ? "Sent" : status);
    formData.set("project_name", projectName);
    formData.set("subject", subject);
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

  return (
    <>
    <form
      id="estimate-form"
      onSubmit={(e) => doSubmit(e, false)}
      className="flex h-full flex-col"
    >
      {/* Header: title + actions */}
      <div className="flex flex-shrink-0 items-center justify-between gap-4 border-b border-[var(--color-divider)] px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          {isEdit ? (
            <Link
              href={`/dashboard/estimates/${estimateId}`}
              className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] transition-colors"
              aria-label="Back to estimate"
            >
              <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
          ) : onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="flex shrink-0 rounded-xl p-2 text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-variant)] hover:text-[var(--color-on-surface)] transition-colors"
              aria-label="Close"
            >
              <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : null}
          <h2 className="truncate text-lg font-semibold text-[var(--color-on-surface)]">
            {isEdit ? (initialEstimateNumber ? `Estimate ${initialEstimateNumber}` : "Edit estimate") : "New estimate"}
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
            className="btn btn-secondary btn-sm"
          >
            Save and Send
          </button>
          <Link
            href={estimateId ? `/dashboard/estimates/${estimateId}` : "/dashboard/estimates"}
            className="btn btn-secondary btn-sm"
          >
            Cancel
          </Link>
        </div>
      </div>

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
          <section className="rounded-xl border border-[var(--color-outline)] bg-[var(--color-card-bg)] p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              Quote details
            </h3>
            <div className="grid grid-cols-2 gap-4">
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
                <div className="flex h-[2.5rem] items-center rounded-xl border border-[var(--color-outline)] bg-[var(--color-input-bg)] px-3 py-2.5 text-sm font-medium text-[var(--color-on-surface)]">
                  {isEdit ? (initialEstimateNumber ?? "—") : "Auto-generated"}
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
              <div>
                <label htmlFor="estimate-status" className={labelClass}>
                  Status
                </label>
                <select
                  id="estimate-status"
                  name="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className={inputClass + " h-[2.5rem] min-h-0 cursor-pointer"}
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
          </div>

          {/* Line items card */}
          <section className="rounded-xl border border-[var(--color-outline)] bg-[var(--color-card-bg)] p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              Line items
            </h3>
            <LineItemsEditor items={items} onChange={setItems} />
            <div className="mt-4 flex justify-end border-t border-[var(--color-divider)] pt-3">
              <table className="w-full max-w-xs text-right text-sm tabular-nums">
                <tbody>
                  <tr>
                    <td className="py-1 pr-4 text-[var(--color-on-surface-variant)]">Subtotal</td>
                    <td className="py-1 font-medium text-[var(--color-on-surface)]">{subtotal.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="py-1 pr-4 text-[var(--color-on-surface-variant)]">Tax</td>
                    <td className="py-1 font-medium text-[var(--color-on-surface)]">{totalTax.toFixed(2)}</td>
                  </tr>
                  <tr className="border-t border-[var(--color-divider)]">
                    <td className="py-2 pr-4 font-medium text-[var(--color-on-surface)]">Total</td>
                    <td className="py-2 text-lg font-semibold text-[var(--color-on-surface)]">{total.toFixed(2)}</td>
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
