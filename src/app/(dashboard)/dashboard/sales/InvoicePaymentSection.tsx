"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Wallet, Link2, Trash2, ChevronDown, Save, X } from "lucide-react";
import {
  getInvoicePaymentSummary,
  getAvailablePaymentsForCustomer,
  allocatePaymentToInvoice,
  removeAllocation,
  type InvoicePaymentSummary as PaymentSummaryType,
} from "@/app/(dashboard)/dashboard/payments/actions";
import { PaymentForm } from "@/app/(dashboard)/dashboard/payments/PaymentForm";
import { IconButton } from "@/components/IconButton";
import { Modal } from "@/components/Modal";
import { startGlobalProcessing, endGlobalProcessing } from "@/components/GlobalProcessing";

const PAYMENT_FORM_ID = "payment-form";

const inputClass =
  "w-full border border-[var(--color-input-border)] rounded-xl px-3 py-2.5 text-[var(--color-on-surface)] bg-[var(--color-input-bg)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";

function formatNum(n: number): string {
  return Number(n).toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type Props = {
  companyId: string;
  customerId: string;
  invoiceId: string;
  invoiceNumber: string;
  initialSummary: PaymentSummaryType | null;
  onRefresh: () => void;
};

export function InvoicePaymentSection({
  companyId,
  customerId,
  invoiceId,
  invoiceNumber,
  initialSummary,
  onRefresh,
}: Props) {
  const [summary, setSummary] = useState<PaymentSummaryType | null>(initialSummary);
  const [createPaymentModalOpen, setCreatePaymentModalOpen] = useState(false);
  const [allocateDialogOpen, setAllocateDialogOpen] = useState(false);

  useEffect(() => {
    setSummary(initialSummary);
  }, [initialSummary]);

  async function refreshSummary() {
    const res = await getInvoicePaymentSummary(companyId, invoiceId);
    if (!("error" in res) || !res.error) setSummary(res);
    onRefresh();
  }

  if (!summary) return null;

  const { outstanding_balance, paid_amount, allocations } = summary;

  return (
    <div className="border-t border-[var(--color-divider)] bg-[var(--color-card-bg)] px-4 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              Paid
            </span>
            <p className="invoice-payment-amount-paid text-base font-semibold tabular-nums">
              {formatNum(paid_amount)}
            </p>
          </div>
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              Outstanding
            </span>
            <p className="invoice-payment-amount-outstanding text-base font-semibold tabular-nums">
              {formatNum(outstanding_balance)}
            </p>
          </div>
        </div>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              className="btn btn-primary btn-sm inline-flex items-center gap-1.5"
              aria-label="Payment actions"
            >
              Payment
              <ChevronDown className="size-3.5" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={4}
              className="min-w-[11rem] rounded-lg border border-[var(--color-outline)] bg-elevated py-1 shadow-elevated z-50"
            >
              <DropdownMenu.Item
                onSelect={() => setCreatePaymentModalOpen(true)}
                className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-[var(--color-on-surface)] hover:bg-[var(--color-surface-variant)] focus:bg-[var(--color-surface-variant)] focus:outline-none"
              >
                <Wallet className="size-4 shrink-0" />
                Create new payment
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onSelect={() => setAllocateDialogOpen(true)}
                className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-[var(--color-on-surface)] hover:bg-[var(--color-surface-variant)] focus:bg-[var(--color-surface-variant)] focus:outline-none"
              >
                <Link2 className="size-4 shrink-0" />
                Allocate existing payment
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      {allocations.length > 0 && (
        <div className="mt-4">
          <h4 className="mb-2 text-sm font-medium text-[var(--color-on-surface-variant)]">
            Allocated payments
          </h4>
          <div className="overflow-x-auto rounded-lg border border-[var(--color-outline)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-divider)] bg-[var(--color-surface-variant)]/50">
                  <th className="px-3 py-2 text-left font-medium">Payment #</th>
                  <th className="px-3 py-2 text-left font-medium">Date</th>
                  <th className="px-3 py-2 text-right font-medium">Amount</th>
                  <th className="w-10 px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {allocations.map((a) => (
                  <tr key={a.id} className="border-b border-[var(--color-divider)] last:border-0">
                    <td className="px-3 py-2">
                      <Link
                        href="/dashboard/payments"
                        className="text-[var(--color-primary)] hover:underline"
                      >
                        {a.payment_number}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-[var(--color-on-surface)]">{a.payment_date}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-[var(--color-on-surface)]">
                      {formatNum(a.allocated_amount)}
                    </td>
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        onClick={async () => {
                          startGlobalProcessing("Removing allocation…");
                          try {
                            const res = await removeAllocation(companyId, a.id);
                            if (res?.error) endGlobalProcessing({ error: res.error });
                            else {
                              endGlobalProcessing({ success: "Allocation removed." });
                              refreshSummary();
                            }
                          } finally {
                            endGlobalProcessing();
                          }
                        }}
                        className="rounded p-1.5 text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-variant)] hover:text-[var(--color-error)]"
                        aria-label="Remove allocation"
                        title="Remove allocation"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AllocateToInvoiceDialog
        companyId={companyId}
        customerId={customerId}
        invoiceId={invoiceId}
        open={allocateDialogOpen}
        onClose={() => setAllocateDialogOpen(false)}
        onSuccess={() => {
          setAllocateDialogOpen(false);
          refreshSummary();
        }}
      />
      <Modal
        open={createPaymentModalOpen}
        onClose={() => setCreatePaymentModalOpen(false)}
        title={`New payment (${invoiceNumber})`}
        contentClassName="max-w-2xl"
        headerRight={
          <div className="flex shrink-0 items-center gap-1">
            <IconButton
              variant="primary"
              icon={<Save className="size-4" />}
              label="Save"
              onClick={() => (document.getElementById(PAYMENT_FORM_ID) as HTMLFormElement | null)?.requestSubmit()}
            />
            <IconButton
              variant="secondary"
              icon={<X className="size-4" />}
              label="Close"
              onClick={() => setCreatePaymentModalOpen(false)}
            />
          </div>
        }
      >
        <PaymentForm
          key={createPaymentModalOpen ? "open" : "closed"}
          companyId={companyId}
          initialCustomerId={customerId}
          lockCustomer
          allocateToInvoice={invoiceId}
          initialNetAmount={createPaymentModalOpen ? summary.outstanding_balance : undefined}
          hideBottomActions
          onSuccess={() => {
            setCreatePaymentModalOpen(false);
            refreshSummary();
          }}
          onCancel={() => setCreatePaymentModalOpen(false)}
        />
      </Modal>
    </div>
  );
}

function AllocateToInvoiceDialog({
  companyId,
  customerId,
  invoiceId,
  open,
  onClose,
  onSuccess,
}: {
  companyId: string;
  customerId: string;
  invoiceId: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [payments, setPayments] = useState<{ id: string; payment_number: string; payment_date: string; gross_amount: number; allocated_amount: number; remaining: number }[]>([]);
  const [selectedPaymentId, setSelectedPaymentId] = useState("");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !companyId) return;
    getAvailablePaymentsForCustomer(companyId, customerId).then(setPayments);
    setSelectedPaymentId("");
    setAmount("");
  }, [open, companyId, customerId]);

  const selected = payments.find((p) => p.id === selectedPaymentId);
  const maxAlloc = selected ? Math.min(selected.remaining, 1e9) : 0;
  const amt = parseFloat(amount) || 0;
  const valid = selected && amt > 0 && amt <= maxAlloc;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setSubmitting(true);
    startGlobalProcessing("Allocating payment…");
    try {
      const result = await allocatePaymentToInvoice(companyId, selectedPaymentId, invoiceId, amt);
      if (result?.error) endGlobalProcessing({ error: result.error });
      else {
        endGlobalProcessing({ success: "Payment allocated." });
        onSuccess();
      }
    } finally {
      setSubmitting(false);
      endGlobalProcessing();
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Allocate existing payment" contentClassName="max-w-md">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {payments.length === 0 ? (
          <p className="text-sm text-[var(--color-on-surface-variant)]">
            No unallocated or partially allocated payments for this customer.
          </p>
        ) : (
          <>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-on-surface-variant)]">Payment</label>
              <select
                value={selectedPaymentId}
                onChange={(e) => {
                  setSelectedPaymentId(e.target.value);
                  setAmount("");
                }}
                className={inputClass}
                required
              >
                <option value="">Select payment</option>
                {payments.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.payment_number} — Remaining: {formatNum(p.remaining)}
                  </option>
                ))}
              </select>
            </div>
            {selected && (
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--color-on-surface-variant)]">Amount to allocate</label>
                <input
                  type="number"
                  min="0"
                  max={maxAlloc}
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={inputClass}
                  placeholder={`Max ${formatNum(maxAlloc)}`}
                />
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={!valid || submitting} className="btn btn-primary flex-1">
                {submitting ? "Allocating…" : "Allocate"}
              </button>
            </div>
          </>
        )}
      </form>
    </Modal>
  );
}
