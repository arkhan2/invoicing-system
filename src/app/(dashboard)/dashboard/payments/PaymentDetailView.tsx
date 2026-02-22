"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Link2, List, Pencil, Trash2, X } from "lucide-react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { IconButton } from "@/components/IconButton";
import { usePaymentsListDrawer } from "./PaymentsListDrawerContext";
import { deletePayment, type PaymentDetailData } from "./actions";
import { startGlobalProcessing, endGlobalProcessing } from "@/components/GlobalProcessing";

const topBarClass =
  "dashboard-top-bar flex flex-shrink-0 items-center justify-between gap-4 border-b border-[var(--color-divider)] bg-base px-4 py-3 max-lg:sticky max-lg:top-0 max-lg:z-10";

const STATUS_COLORS: Record<string, string> = {
  Unallocated: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  "Partially Allocated": "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  Allocated: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
};

function formatNum(n: number): string {
  return Number(n).toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(d: string | null): string {
  if (!d) return "—";
  try {
    return new Date(d + "Z").toLocaleDateString("en-PK", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return d;
  }
}

export function PaymentDetailView({
  payment,
  companyId,
  backHref,
  editHref,
}: {
  payment: PaymentDetailData;
  companyId: string;
  backHref: string;
  editHref: string;
}) {
  const router = useRouter();
  const listDrawer = usePaymentsListDrawer();
  const isLg = useMediaQuery("(min-width: 1024px)");
  const showListButton = !isLg && listDrawer != null;
  const [deleteState, setDeleteState] = useState<{ loading: boolean } | null>(null);

  async function handleDelete() {
    setDeleteState({ loading: true });
    startGlobalProcessing("Deleting…");
    try {
      const result = await deletePayment(companyId, payment.id);
      setDeleteState(null);
      if (result?.error) {
        endGlobalProcessing({ error: result.error });
        return;
      }
      endGlobalProcessing({ success: "Payment deleted." });
      router.push(backHref);
      router.refresh();
    } finally {
      endGlobalProcessing();
    }
  }

  const unallocated = payment.gross_amount - payment.allocated_amount > 0;

  return (
    <>
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
              Payment {payment.payment_number}
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Link
              href={editHref}
              className="btn btn-edit btn-icon shrink-0"
              aria-label="Edit payment"
              title="Edit payment"
            >
              <Pencil className="size-4" />
            </Link>
            <IconButton
              variant="danger"
              icon={<Trash2 className="size-4" />}
              label="Delete payment"
              onClick={() => setDeleteState({ loading: false })}
            />
            <Link
              href={backHref}
              className="btn btn-secondary btn-icon shrink-0"
              aria-label="Back to list"
              title="Back to list"
            >
              <X className="size-4" />
            </Link>
          </div>
        </div>

        <div className={`min-h-0 flex-1 overflow-y-auto bg-base p-4 lg:p-6 ${!isLg ? "pb-24" : ""}`}>
          <div className="card max-w-2xl mx-auto p-6 space-y-6">
            {/* Customer section (read-only) */}
            <section className="rounded-xl border border-[var(--color-outline)] bg-[var(--color-surface-variant)]/20 p-3">
              <h3 className="mb-2 text-sm font-semibold text-[var(--color-on-surface-variant)]">Customer</h3>
              <p className="text-sm text-[var(--color-on-surface)]">{payment.customer_name || "—"}</p>
            </section>

            {/* Allocate link when there is unallocated amount */}
            {unallocated && (
              <div className="flex flex-wrap items-center gap-3 border-b border-[var(--color-outline)] pb-4">
                <Link
                  href={`/dashboard/payments/${payment.id}/allocate${editHref.includes("?") ? editHref.slice(editHref.indexOf("?")) : ""}`}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-primary)] hover:underline"
                >
                  <Link2 className="size-4" />
                  Allocate to invoices
                </Link>
              </div>
            )}

            <dl className="grid gap-4 sm:grid-cols-[auto_1fr]">
              <DetailRow label="Payment date" value={formatDate(payment.payment_date)} />
              <DetailRow label="Received date" value={formatDate(payment.payment_received_date ?? payment.payment_date)} />
              <DetailRow label="Mode of payment" value={payment.mode_of_payment} />
              <DetailRow label="Gross amount" value={formatNum(payment.gross_amount)} className="tabular-nums" />
              <DetailRow label="Withholding amount" value={formatNum(payment.withholding_amount)} className="tabular-nums" />
              <DetailRow label="Net amount" value={formatNum(payment.net_amount)} className="tabular-nums font-semibold" />
              <DetailRow label="Allocated amount" value={formatNum(payment.allocated_amount)} className="tabular-nums" />
              <dt className="text-sm font-medium text-[var(--color-on-surface-variant)]">Status</dt>
              <dd>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    STATUS_COLORS[payment.status] ?? "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                  }`}
                >
                  {payment.status}
                </span>
              </dd>
              <DetailRow label="Reference" value={payment.reference_payment_id} />
              <DetailRow label="Notes" value={payment.notes} />
            </dl>
          </div>
        </div>

        {/* Sticky bottom action bar on mobile */}
        {!isLg && (
          <div
            className="sticky bottom-0 z-10 flex flex-shrink-0 items-center justify-end gap-2 border-t border-[var(--color-outline)] bg-base px-4 py-3 lg:hidden"
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
          >
            <Link href={backHref} className="btn btn-secondary btn-sm">
              Back
            </Link>
            <Link href={editHref} className="btn btn-edit btn-sm">
              Edit
            </Link>
            <button
              type="button"
              onClick={() => setDeleteState({ loading: false })}
              className="btn btn-danger btn-sm"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteState}
        title="Delete payment?"
        message="This payment will be removed. All allocations to invoices will also be removed. This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={deleteState?.loading ?? false}
        onConfirm={handleDelete}
        onCancel={() => setDeleteState(null)}
      />
    </>
  );
}

function DetailRow({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string | null;
  className?: string;
}) {
  const display = value != null && value !== "" ? value : "—";
  return (
    <>
      <dt className={`text-sm font-medium text-[var(--color-on-surface-variant)] ${className}`}>{label}</dt>
      <dd className={`text-sm text-[var(--color-on-surface)] ${className}`}>{display}</dd>
    </>
  );
}
