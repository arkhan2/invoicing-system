"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createCustomerPayment, updateCustomerPayment, allocatePaymentToInvoice, type PaymentForEdit } from "./actions";
import {
  searchCustomers,
  getCustomerById,
  type CustomerSearchResult,
} from "@/app/(dashboard)/dashboard/customers/actions";
import { getCompanyTaxRates } from "@/app/(dashboard)/dashboard/company/actions";
import { CustomerForm, type Customer } from "@/app/(dashboard)/dashboard/customers/CustomerForm";
import { IconButton } from "@/components/IconButton";
import { Modal } from "@/components/Modal";
import { startGlobalProcessing, endGlobalProcessing } from "@/components/GlobalProcessing";
import { Search, Plus, Pencil, X, Loader2 } from "lucide-react";

const MODES = ["Cash", "Bank Transfer", "Cheque", "Online", "Card", "Other"] as const;
const SEARCH_DEBOUNCE_MS = 300;

const inputClass =
  "w-full border border-[var(--color-input-border)] rounded-lg px-2.5 py-2 text-sm text-[var(--color-on-surface)] bg-[var(--color-input-bg)] placeholder:text-[var(--color-on-surface-variant)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";
const inputClassWithIcon =
  "w-full min-h-[2.25rem] border border-[var(--color-input-border)] rounded-lg px-2.5 py-2 pl-8 text-sm text-[var(--color-on-surface)] bg-[var(--color-input-bg)] placeholder:text-[var(--color-on-surface-variant)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";
const labelClass = "mb-0.5 block text-xs font-medium text-[var(--color-on-surface-variant)]";

const PAYMENT_FORM_ID = "payment-form";

export function PaymentForm({
  companyId,
  initialCustomerId,
  lockCustomer,
  allocateToInvoice,
  initialNetAmount,
  paymentId: editPaymentId,
  initialPayment,
  onSuccess,
  onCancel,
  hideBottomActions,
}: {
  companyId: string;
  /** Pre-select customer when coming from invoice. */
  initialCustomerId?: string | null;
  /** When true, customer is fixed (from invoice) and selector is disabled. */
  lockCustomer?: boolean;
  /** When set (from invoice), allocate the new payment to this invoice after create. */
  allocateToInvoice?: string | null;
  /** When opening from invoice, pre-fill net amount with this (e.g. outstanding balance). Still editable. */
  initialNetAmount?: number | null;
  /** When set, form is in edit mode: pre-fill from initialPayment and submit updates. */
  paymentId?: string | null;
  initialPayment?: PaymentForEdit | null;
  onSuccess: (paymentId?: string) => void;
  onCancel: () => void;
  /** When true, hide Cancel/Create buttons (e.g. when actions are in page top bar). */
  hideBottomActions?: boolean;
}) {
  const isEdit = !!editPaymentId && !!initialPayment;

  const [withholdingRates, setWithholdingRates] = useState<{ id: string; name: string; rate: number }[]>([]);
  const [customerId, setCustomerId] = useState(() => initialPayment?.customer_id ?? initialCustomerId ?? "");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSearchResult | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CustomerSearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [customerModal, setCustomerModal] = useState<"add" | "edit" | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [paymentDate, setPaymentDate] = useState(() =>
    initialPayment?.payment_date ?? new Date().toISOString().slice(0, 10)
  );
  const [paymentReceivedDate, setPaymentReceivedDate] = useState(() => initialPayment?.payment_received_date ?? "");
  const [modeOfPayment, setModeOfPayment] = useState<string>(() => initialPayment?.mode_of_payment ?? "Cheque");
  const [netAmountInput, setNetAmountInput] = useState(() => {
    if (initialPayment) return String(initialPayment.net_amount);
    if (allocateToInvoice && typeof initialNetAmount === "number" && initialNetAmount > 0) return String(initialNetAmount);
    return "";
  });
  const [withholdingTaxRateId, setWithholdingTaxRateId] = useState<string>(() => initialPayment?.withholding_tax_rate_id ?? "");
  const [withholdingAmountInput, setWithholdingAmountInput] = useState(() =>
    initialPayment && initialPayment.withholding_amount > 0 ? String(initialPayment.withholding_amount) : ""
  );
  const [notes, setNotes] = useState(() => initialPayment?.notes ?? "");
  const [referencePaymentId, setReferencePaymentId] = useState(() => initialPayment?.reference_payment_id ?? "");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    getCompanyTaxRates(companyId).then((taxRes) => {
      if (!cancelled) setWithholdingRates(taxRes.withholdingTaxRates.map((r) => ({ id: r.id, name: r.name, rate: r.rate })));
    });
    return () => { cancelled = true; };
  }, [companyId]);

  const effectiveCustomerId = initialPayment?.customer_id ?? initialCustomerId;
  useEffect(() => {
    if (effectiveCustomerId) {
      setCustomerId(effectiveCustomerId);
      getCustomerById(companyId, effectiveCustomerId).then((c) => setSelectedCustomer(c ?? null));
    }
  }, [companyId, effectiveCustomerId]);

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

  // Net amount = amount received (primary input). Withholding can be from rate (derived) or user-edited.
  const netAmount = Math.max(0, parseFloat(netAmountInput) || 0);
  const selectedRate = withholdingTaxRateId ? withholdingRates.find((r) => r.id === withholdingTaxRateId) : null;
  const ratePct = selectedRate ? selectedRate.rate : 0;
  const calculatedWithholding =
    ratePct > 0 && ratePct < 100
      ? Math.round((netAmount / (1 - ratePct / 100) - netAmount) * 100) / 100
      : 0;
  const effectiveWithholding =
    withholdingAmountInput !== ""
      ? Math.max(0, parseFloat(withholdingAmountInput) || 0)
      : calculatedWithholding;
  const grossAmount = netAmount + effectiveWithholding;
  const withholdingAmount = Math.round(effectiveWithholding * 100) / 100;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customerId.trim()) return;
    if (!Number.isFinite(netAmount) || netAmount <= 0) return;
    setSubmitting(true);
    const payload = {
      customer_id: customerId.trim(),
      payment_date: paymentDate,
      payment_received_date: paymentReceivedDate.trim() || null,
      mode_of_payment: modeOfPayment,
      gross_amount: grossAmount,
      withholding_tax_rate_id: withholdingTaxRateId || null,
      withholding_amount: withholdingAmount,
      net_amount: netAmount,
      reference_payment_id: referencePaymentId.trim() || null,
      notes: notes.trim() || null,
    };

    if (isEdit && editPaymentId) {
      startGlobalProcessing("Updating payment…");
      try {
        const result = await updateCustomerPayment(companyId, editPaymentId, payload);
        if (result?.error) {
          endGlobalProcessing({ error: result.error });
          setSubmitting(false);
          return;
        }
        endGlobalProcessing({ success: "Payment updated." });
        onSuccess(editPaymentId);
      } finally {
        setSubmitting(false);
        endGlobalProcessing();
      }
      return;
    }

    startGlobalProcessing("Creating payment…");
    try {
      const result = await createCustomerPayment(companyId, payload);
      if (result?.error) {
        endGlobalProcessing({ error: result.error });
        setSubmitting(false);
        return;
      }
      if (result?.paymentId && allocateToInvoice && grossAmount > 0) {
        endGlobalProcessing();
        startGlobalProcessing("Allocating to invoice…");
        const alloc = await allocatePaymentToInvoice(companyId, result.paymentId, allocateToInvoice, grossAmount);
        if (alloc?.error) {
          endGlobalProcessing({ error: alloc.error });
          setSubmitting(false);
          return;
        }
        endGlobalProcessing({ success: "Payment created and allocated to invoice." });
      } else {
        endGlobalProcessing({ success: "Payment created." });
      }
      onSuccess(result?.paymentId);
    } finally {
      setSubmitting(false);
      endGlobalProcessing();
    }
  }

  return (
    <>
    <form id={PAYMENT_FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-2.5">
      {/* Customer section: separate block so Add/Edit circular icons are clearly for customer only */}
      <section
        className="rounded-xl border border-[var(--color-outline)] bg-[var(--color-surface-variant)]/20 p-3"
        aria-labelledby="payment-form-customer-heading"
      >
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3
            id="payment-form-customer-heading"
            className="text-sm font-semibold text-[var(--color-on-surface)]"
          >
            Customer <span className="text-[var(--color-error)]">*</span>
          </h3>
          {!lockCustomer && (
            <div className="flex items-center gap-1.5" role="group" aria-label="Customer actions">
              <IconButton
                variant="add"
                icon={<Plus className="size-4" />}
                label="Add customer"
                onClick={() => setCustomerModal("add")}
              />
              {selectedCustomer && (
                <IconButton
                  variant="edit"
                  icon={<Pencil className="size-4" />}
                  label="Edit customer"
                  onClick={() => setCustomerModal("edit")}
                />
              )}
            </div>
          )}
        </div>
        <input type="hidden" name="customer_id" value={customerId} />
        {lockCustomer ? (
          <div className="rounded-lg border border-[var(--color-outline)] bg-[var(--color-input-bg)] px-2.5 py-2 min-h-[2.25rem]">
            <span className="text-sm text-[var(--color-on-surface)]">
              {selectedCustomer?.name ?? (customerId ? "Loading…" : "—")}
            </span>
            <p className="mt-0.5 text-xs text-[var(--color-on-surface-variant)]">Customer is set from the invoice.</p>
          </div>
        ) : selectedCustomer ? (
          <div className="flex items-center gap-2 rounded-lg border border-[var(--color-outline)] bg-[var(--color-input-bg)] px-2.5 py-2 min-h-[2.25rem]">
            <span className="flex-1 min-w-0 truncate text-sm text-[var(--color-on-surface)]">{selectedCustomer.name}</span>
            <button
              type="button"
              onClick={handleClearCustomer}
              className="shrink-0 rounded-full p-1 text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-variant)] hover:text-[var(--color-on-surface)]"
              aria-label="Change customer"
              title="Change customer"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <div ref={searchRef} className="relative">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--color-on-surface-variant)]" aria-hidden />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                placeholder="Search customers…"
                className={inputClassWithIcon}
                autoComplete="off"
                aria-label="Search customer"
              />
            </div>
            {searchOpen && (
              <div className="absolute top-full left-0 right-0 z-10 mt-0.5 max-h-52 overflow-y-auto rounded-lg border border-[var(--color-outline)] bg-[var(--color-card-bg)] shadow-lg">
                {searchLoading ? (
                  <div className="flex items-center justify-center gap-2 px-2.5 py-3 text-xs text-[var(--color-on-surface-variant)]">
                    <Loader2 className="size-3.5 animate-spin" /> Searching…
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="px-2.5 py-3 text-xs text-[var(--color-on-surface-variant)]">
                    {searchQuery.trim() ? "No customers found. Add one with + above." : "Type to search."}
                  </div>
                ) : (
                  <ul className="py-0.5" role="listbox">
                    {searchResults.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          role="option"
                          className="w-full px-2.5 py-2 text-left text-sm text-[var(--color-on-surface)] hover:bg-[var(--color-surface-variant)]"
                          onClick={() => handleSelectCustomer(c)}
                        >
                          <span className="font-medium">{c.name}</span>
                          {(c.email || c.phone) && (
                            <span className="ml-1.5 text-xs text-[var(--color-on-surface-variant)]">
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
      </section>
      <div className="flex flex-wrap items-start gap-4">
        <div className="grid grid-cols-2 gap-2 min-w-0 flex-1">
          <div>
            <label className={labelClass}>Payment date</label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className={inputClass}
              required
              aria-label="Payment date"
            />
          </div>
          <div>
            <label className={labelClass}>Received date</label>
            <input
              type="date"
              value={paymentReceivedDate}
              onChange={(e) => setPaymentReceivedDate(e.target.value)}
              className={inputClass}
              aria-label="Payment received date"
            />
          </div>
          <div>
            <label className={labelClass}>Net amount *</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={netAmountInput}
              onChange={(e) => setNetAmountInput(e.target.value)}
              className={inputClass}
              required
              placeholder="Received"
              aria-label="Net amount received"
            />
          </div>
          <div>
            <label className={labelClass}>Mode</label>
            <select
              value={modeOfPayment}
              onChange={(e) => setModeOfPayment(e.target.value)}
              className={inputClass}
              aria-label="Mode of payment"
            >
              {MODES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Withholding amount</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={withholdingAmountInput !== "" ? withholdingAmountInput : (calculatedWithholding > 0 ? String(calculatedWithholding) : "")}
              onChange={(e) => setWithholdingAmountInput(e.target.value)}
              className={inputClass}
              placeholder={ratePct > 0 ? "From rate" : "0"}
              aria-label="Withholding amount"
            />
          </div>
          <div>
            <label className={labelClass}>Withholding tax</label>
            <select
              value={withholdingTaxRateId}
              onChange={(e) => setWithholdingTaxRateId(e.target.value)}
              className={inputClass}
              aria-label="Withholding tax rate"
            >
              <option value="">None</option>
              {withholdingRates.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.rate}%)
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="shrink-0">
          <label className={labelClass}>Calculation</label>
          <div className="w-44 rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-2.5 py-2">
            <dl className="flex flex-col gap-1.5 text-sm">
              <div className="flex justify-between items-baseline gap-4">
                <dt className="text-[var(--color-on-surface-variant)]">Gross</dt>
                <dd className="font-semibold tabular-nums text-[var(--color-on-surface)]">{grossAmount.toFixed(2)}</dd>
              </div>
              <div className="flex justify-between items-baseline gap-4">
                <dt className="text-[var(--color-on-surface-variant)]">WHT</dt>
                <dd className="font-semibold tabular-nums text-[var(--color-on-surface)]">{withholdingAmount.toFixed(2)}</dd>
              </div>
              <div className="flex justify-between items-baseline gap-4">
                <dt className="font-medium text-[var(--color-on-surface)]">Net</dt>
                <dd className="font-bold tabular-nums text-[var(--color-primary)]">{netAmount.toFixed(2)}</dd>
              </div>
              <div className="flex justify-between items-baseline gap-4">
                <dt className="text-[var(--color-on-surface-variant)]">Received</dt>
                <dd className="font-medium tabular-nums text-[var(--color-on-surface)]">{paymentReceivedDate || paymentDate || "—"}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelClass}>Reference</label>
          <input
            type="text"
            value={referencePaymentId}
            onChange={(e) => setReferencePaymentId(e.target.value)}
            className={inputClass}
            placeholder="e.g. bank ref"
            aria-label="Reference payment ID"
          />
        </div>
        <div>
          <label className={labelClass}>Notes</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={inputClass}
            placeholder="Notes"
            aria-label="Notes"
          />
        </div>
      </div>
      {!hideBottomActions && (
        <div className="flex gap-2 pt-0.5">
          <button type="button" onClick={onCancel} className="btn btn-secondary flex-1 py-2 text-sm">
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="btn btn-primary flex-1 py-2 text-sm">
            {submitting ? (isEdit ? "Updating…" : "Creating…") : (isEdit ? "Update payment" : "Create payment")}
          </button>
        </div>
      )}
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
        }}
        onCancel={() => setCustomerModal(null)}
      />
    </Modal>
    </>
  );
}
