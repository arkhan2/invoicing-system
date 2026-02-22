"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Save, X, List } from "lucide-react";
import { IconButton } from "@/components/IconButton";
import { usePaymentsListDrawer } from "../../PaymentsListDrawerContext";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import {
  allocatePaymentToInvoice,
  type PaymentListItem,
  type UnpaidInvoiceRow,
} from "@/app/(dashboard)/dashboard/payments/actions";
import { startGlobalProcessing, endGlobalProcessing } from "@/components/GlobalProcessing";

const topBarClass =
  "dashboard-top-bar flex flex-shrink-0 items-center justify-between gap-4 border-b border-[var(--color-divider)] bg-base px-4 py-3 max-lg:sticky max-lg:top-0 max-lg:z-10";

const ALLOCATE_FORM_ID = "allocate-form";

const inputClass =
  "w-full border border-[var(--color-input-border)] rounded-xl px-3 py-2 text-right text-[var(--color-on-surface)] bg-[var(--color-input-bg)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";

const searchInputClass =
  "w-full border border-[var(--color-input-border)] rounded-lg pl-9 pr-3 py-2 text-sm text-[var(--color-on-surface)] bg-[var(--color-input-bg)] placeholder:text-[var(--color-on-surface-variant)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";

function formatNum(n: number): string {
  return Number(n).toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function AllocatePageClient({
  payment,
  invoices: initialInvoices,
  companyId,
}: {
  payment: PaymentListItem;
  invoices: UnpaidInvoiceRow[];
  companyId: string;
}) {
  const [allocations, setAllocations] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredInvoices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return initialInvoices;
    return initialInvoices.filter(
      (inv) =>
        inv.invoice_number.toLowerCase().includes(q) ||
        inv.invoice_date.toLowerCase().includes(q)
    );
  }, [initialInvoices, searchQuery]);

  const paymentRemaining = Math.max(0, payment.gross_amount - payment.allocated_amount);
  const totalAllocating = initialInvoices.reduce((sum, inv) => {
    const v = parseFloat(allocations[inv.id] ?? "0") || 0;
    return sum + v;
  }, 0);
  const overPayment = totalAllocating > paymentRemaining;
  const errors: string[] = [];
  initialInvoices.forEach((inv) => {
    const v = parseFloat(allocations[inv.id] ?? "0") || 0;
    if (v > inv.outstanding_balance) errors.push(`${inv.invoice_number}: amount exceeds outstanding`);
  });
  if (overPayment) errors.push("Total allocation exceeds payment remaining.");

  const canAllocate = paymentRemaining > 0;

  const router = useRouter();
  const listDrawer = usePaymentsListDrawer();
  const isLg = useMediaQuery("(min-width: 1024px)");
  const showListButton = !isLg && listDrawer != null;

  function handleBarSave() {
    if (!canAllocate) return;
    const form = document.getElementById(ALLOCATE_FORM_ID) as HTMLFormElement | null;
    form?.requestSubmit();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (errors.length > 0) return;
    const toApply = initialInvoices
      .map((inv) => ({ invoiceId: inv.id, amount: parseFloat(allocations[inv.id] ?? "0") || 0 }))
      .filter((a) => a.amount > 0);
    if (toApply.length === 0) return;
    setSubmitting(true);
    startGlobalProcessing("Saving allocations…");
    try {
      for (const { invoiceId, amount } of toApply) {
        const result = await allocatePaymentToInvoice(companyId, payment.id, invoiceId, amount);
        if (result?.error) {
          endGlobalProcessing({ error: result.error });
          setSubmitting(false);
          return;
        }
      }
      endGlobalProcessing({ success: "Allocations saved." });
      router.push("/dashboard/payments");
    } finally {
      setSubmitting(false);
      endGlobalProcessing();
    }
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className={topBarClass}>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {showListButton && (
            <button
              type="button"
              onClick={() => listDrawer?.openListDrawer()}
              className="btn btn-secondary btn-icon shrink-0 lg:hidden"
              aria-label="Open list"
              title="List"
            >
              <List className="size-4" />
            </button>
          )}
          <h2 className="truncate text-lg font-semibold text-[var(--color-on-surface)]">
            Allocate: {payment.payment_number}
          </h2>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {canAllocate && (
            <IconButton
              variant="primary"
              icon={<Save className="size-4" />}
              label="Save"
              onClick={handleBarSave}
            />
          )}
          <IconButton
            variant="secondary"
            icon={<X className="size-4" />}
            label="Close"
            onClick={() => router.push("/dashboard/payments")}
          />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto bg-base p-4">
        <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      <div className="rounded-xl border border-[var(--color-outline)] bg-[var(--color-surface-variant)]/30 p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <span className="text-[var(--color-on-surface-variant)]">Customer</span>
            <p className="font-medium text-[var(--color-on-surface)]">{payment.customer_name}</p>
          </div>
          <div>
            <span className="text-[var(--color-on-surface-variant)]">Gross amount</span>
            <p className="font-medium tabular-nums text-[var(--color-on-surface)]">{formatNum(payment.gross_amount)}</p>
          </div>
          <div>
            <span className="text-[var(--color-on-surface-variant)]">Already allocated (to invoices)</span>
            <p className="font-medium tabular-nums text-[var(--color-on-surface)]">{formatNum(payment.allocated_amount)}</p>
          </div>
          <div>
            <span className="text-[var(--color-on-surface-variant)]">Remaining</span>
            <p className="font-semibold tabular-nums text-[var(--color-on-surface)]">{formatNum(paymentRemaining)}</p>
          </div>
        </div>
      </div>

      {!canAllocate && (
        <div className="rounded-xl border border-[var(--color-outline)] bg-[var(--color-surface-variant)]/50 px-4 py-3 text-sm text-[var(--color-on-surface-variant)]">
          This payment is fully allocated. No further allocation is possible.
        </div>
      )}

      {canAllocate && (
      <>
      <div>
        <p className="mb-1 text-sm font-medium text-[var(--color-on-surface-variant)]">
          Unpaid invoices for {payment.customer_name}
        </p>
        <label className="mb-2 block text-sm font-medium text-[var(--color-on-surface-variant)]">
          Search invoices
        </label>
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-on-surface-variant)]" aria-hidden />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={searchInputClass}
            placeholder="Invoice number or date…"
            aria-label="Search invoices"
          />
        </div>
      </div>

      {initialInvoices.length === 0 ? (
        <p className="text-sm text-[var(--color-on-surface-variant)]">
          No unpaid invoices for this customer.
        </p>
      ) : (
        <>
          {errors.length > 0 && (
            <div className="rounded-lg border border-amber-500/50 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
              {errors.map((e, i) => (
                <p key={i}>{e}</p>
              ))}
            </div>
          )}
          <form id={ALLOCATE_FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="overflow-x-auto rounded-xl border border-[var(--color-outline)]">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-outline)] bg-[var(--color-surface-variant)]">
                    <th className="px-3 py-2.5 text-left font-medium text-[var(--color-on-surface)]">Invoice</th>
                    <th className="px-3 py-2.5 text-left font-medium text-[var(--color-on-surface)]">Date</th>
                    <th className="px-3 py-2.5 text-right font-medium text-[var(--color-on-surface)]">Total</th>
                    <th className="px-3 py-2.5 text-right font-medium text-[var(--color-on-surface)]">Outstanding</th>
                    <th className="px-3 py-2.5 text-right font-medium text-[var(--color-on-surface)] w-36">Allocate</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-[var(--color-on-surface-variant)]">
                        {searchQuery.trim() ? "No invoices match your search." : "No unpaid invoices."}
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => (
                      <tr key={inv.id} className="border-b border-[var(--color-divider)] last:border-b-0 hover:bg-[var(--color-surface-variant)]/50">
                        <td className="px-3 py-2.5 font-medium text-[var(--color-on-surface)]">{inv.invoice_number}</td>
                        <td className="px-3 py-2.5 text-[var(--color-on-surface)]">{inv.invoice_date}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-[var(--color-on-surface)]">{formatNum(inv.total_amount)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-[var(--color-on-surface)]">{formatNum(inv.outstanding_balance)}</td>
                        <td className="px-3 py-2.5">
                          <input
                            type="number"
                            min="0"
                            max={Math.min(inv.outstanding_balance, paymentRemaining)}
                            step="0.01"
                            value={allocations[inv.id] ?? ""}
                            onChange={(e) =>
                              setAllocations((prev) => ({ ...prev, [inv.id]: e.target.value }))
                            }
                            className={inputClass}
                            placeholder="0"
                            aria-label={`Allocate to ${inv.invoice_number}`}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </form>
        </>
      )}
      </>
      )}
        </div>
      </div>
    </div>
  );
}
