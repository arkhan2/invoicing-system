"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Link2, Pencil, Trash2 } from "lucide-react";
import { usePayments } from "./PaymentsContext";
import { usePaymentsData } from "./PaymentsDataContext";
import { IconButton } from "@/components/IconButton";
import { deletePayment, type PaymentListItem } from "./actions";

const STATUS_COLORS: Record<string, string> = {
  Unallocated: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  "Partially Allocated": "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  Allocated: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
};

function formatNum(n: number): string {
  return Number(n).toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(d: string): string {
  if (!d) return "—";
  try {
    return new Date(d + "Z").toLocaleDateString("en-PK", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return d;
  }
}

function paymentDetailQuery(page: number, perPage: number, customerId: string, status: string): string {
  const p = new URLSearchParams();
  p.set("page", String(page));
  p.set("perPage", String(perPage));
  if (customerId) p.set("customerId", customerId);
  if (status) p.set("status", status);
  const s = p.toString();
  return s ? `?${s}` : "";
}

export function PaymentsTable({ payments, companyId }: { payments: PaymentListItem[]; companyId: string }) {
  const router = useRouter();
  const { refreshPayments } = usePayments();
  const { page, perPage, customerId, status } = usePaymentsData();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(p: PaymentListItem) {
    if (!confirm(`Delete payment ${p.payment_number}? This will also remove all allocations to invoices.`)) return;
    setDeletingId(p.id);
    const res = await deletePayment(companyId, p.id);
    setDeletingId(null);
    if (res?.error) {
      alert(res.error);
      return;
    }
    refreshPayments();
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto">
      <table className="w-full min-w-0 border-collapse text-left text-sm lg:min-w-[800px]">
        <thead className="sticky top-0 z-10 bg-[var(--color-surface-variant)] shadow-[0_1px_0_0_var(--color-divider)]">
          <tr>
            <th className="p-3 font-medium text-[var(--color-on-surface)]">Payment #</th>
            <th className="p-3 font-medium text-[var(--color-on-surface)]">Customer</th>
            <th className="p-3 font-medium text-[var(--color-on-surface)]">Payment date</th>
            <th className="p-3 font-medium text-[var(--color-on-surface)]">Received date</th>
            <th className="p-3 text-right font-medium text-[var(--color-on-surface)]">Gross</th>
            <th className="p-3 text-right font-medium text-[var(--color-on-surface)]">Withholding</th>
            <th className="p-3 text-right font-medium text-[var(--color-on-surface)]">Net</th>
            <th className="p-3 text-right font-medium text-[var(--color-on-surface)]">Allocated</th>
            <th className="p-3 font-medium text-[var(--color-on-surface)]">Status</th>
            <th className="w-28 shrink-0 p-3 text-right font-medium text-[var(--color-on-surface)]" aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {payments.map((p) => {
            const detailQs = paymentDetailQuery(page, perPage, customerId, status);
            const viewHref = `/dashboard/payments/${p.id}${detailQs}`;
            const editHref = `/dashboard/payments/${p.id}/edit${detailQs}`;
            const allocateHref = `/dashboard/payments/${p.id}/allocate${detailQs}`;
            return (
              <tr
                key={p.id}
                role="button"
                tabIndex={0}
                className="cursor-pointer border-b border-[var(--color-divider)] last:border-b-0 even:bg-[var(--color-surface-variant)]/10 transition-colors duration-150 hover:bg-[var(--color-surface-variant)]"
                onClick={() => router.push(viewHref)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    router.push(viewHref);
                  }
                }}
              >
                <td className="p-3 font-medium text-[var(--color-on-surface)]">{p.payment_number}</td>
                <td className="p-3 text-[var(--color-on-surface)]">{p.customer_name}</td>
                <td className="p-3 text-[var(--color-on-surface)]">{formatDate(p.payment_date)}</td>
                <td className="p-3 text-[var(--color-on-surface)]">{formatDate(p.payment_received_date ?? p.payment_date)}</td>
                <td className="p-3 text-right tabular-nums text-[var(--color-on-surface)]">{formatNum(p.gross_amount)}</td>
                <td className="p-3 text-right tabular-nums text-[var(--color-on-surface)]">{formatNum(p.withholding_amount)}</td>
                <td className="p-3 text-right tabular-nums text-[var(--color-on-surface)]">{formatNum(p.net_amount)}</td>
                <td className="p-3 text-right tabular-nums text-[var(--color-on-surface)]">{formatNum(p.allocated_amount)}</td>
                <td className="p-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      STATUS_COLORS[p.status] ?? "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                    }`}
                  >
                    {p.status}
                  </span>
                </td>
                <td className="p-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    {p.gross_amount - p.allocated_amount > 0 ? (
                      <Link
                        href={allocateHref}
                        className="btn btn-secondary btn-icon"
                        aria-label="Allocate to invoices"
                        title="Allocate to invoices"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Link2 className="size-4" />
                      </Link>
                    ) : (
                      <span className="text-xs text-[var(--color-on-surface-variant)]" title="Fully allocated">
                        —
                      </span>
                    )}
                    <Link
                      href={editHref}
                      className="btn btn-edit btn-icon"
                      aria-label="Edit payment"
                      title="Edit payment (opens edit mode)"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Pencil className="size-4" />
                    </Link>
                    <IconButton
                      variant="danger"
                      icon={<Trash2 className="size-4" />}
                      label="Delete payment"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(p);
                      }}
                      disabled={deletingId === p.id}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
