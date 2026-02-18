"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useEffect, useState } from "react";
import { Pencil, Plus, Trash2, X, FileSpreadsheet } from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { IconButton } from "@/components/IconButton";
import { startGlobalProcessing, endGlobalProcessing } from "@/components/GlobalProcessing";
import { useInvoicesTopBar } from "./InvoicesTopBarContext";
import { deleteInvoice } from "./actions";

const ROWS_PER_PAGE = 14;

type Company = {
  name: string;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  ntn?: string | null;
  gst_number?: string | null;
  phone?: string | null;
  email?: string | null;
  logo_url?: string | null;
};

type Customer = {
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

type Item = {
  item_number?: string;
  product_description: string;
  quantity: number;
  unit_price: number;
  total_values: number;
  uom?: string;
};

export function InvoiceDocumentView({
  invoiceId,
  invoiceNumber,
  invoiceDate,
  status,
  totalAmount,
  totalTax,
  company,
  customer,
  items,
  estimateNumber,
  poNumber,
  notes,
  termsType,
  dueDate,
}: {
  invoiceId: string;
  invoiceNumber: string;
  invoiceDate: string;
  status: string;
  totalAmount: number;
  totalTax: number;
  company: Company;
  customer: Customer;
  items: Item[];
  estimateNumber?: string | null;
  poNumber?: string | null;
  notes?: string | null;
  termsType?: string | null;
  dueDate?: string | null;
}) {
  const termsLabel =
    termsType === "due_on_receipt"
      ? "Due on receipt"
      : termsType === "net_15"
        ? "Net 15"
        : termsType === "net_30"
          ? "Net 30"
          : termsType === "eom"
            ? "End of month"
            : termsType === "custom"
              ? "Custom"
              : null;
  const router = useRouter();
  const { setBarState } = useInvoicesTopBar();
  const [deleteState, setDeleteState] = useState<{ loading: boolean } | null>(null);
  const subtotal = items.reduce((s, i) => s + (i.quantity * i.unit_price), 0);

  async function handleDelete() {
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
  const totalQty = items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);
  const addressLine = [company.address, company.city, company.province].filter(Boolean).join(", ");
  const customerAddress = [customer.address, customer.city, customer.province, customer.country].filter(Boolean).join(", ");

  useEffect(() => {
    setBarState({
      title: `Invoice ${invoiceNumber}`,
      titleSuffix: (
        <span className="ml-2 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium bg-[var(--color-surface-variant)] text-[var(--color-on-surface-variant)]">
          {status}
        </span>
      ),
      rightSlot: (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link
            href="/dashboard/sales/import"
            className="btn btn-secondary btn-sm inline-flex items-center gap-2"
            aria-label="Import from CSV"
            title="Import from CSV"
          >
            <FileSpreadsheet className="h-4 w-4 shrink-0" />
            Import from CSV
          </Link>
          <Link
            href={`/dashboard/sales/${invoiceId}/edit`}
            className="btn btn-edit btn-icon shrink-0"
            aria-label="Edit invoice"
            title="Edit"
          >
            <Pencil className="w-4 h-4" />
          </Link>
          <Link
            href="/dashboard/sales/new"
            className="btn btn-add btn-icon shrink-0"
            aria-label="New invoice"
            title="New invoice"
          >
            <Plus className="w-4 h-4" />
          </Link>
          <IconButton
            variant="danger"
            icon={<Trash2 className="w-4 h-4" />}
            label="Delete"
            onClick={() => setDeleteState({ loading: false })}
          />
          <Link
            href="/dashboard/sales"
            className="btn btn-secondary btn-icon shrink-0"
            aria-label="Back to list"
            title="Back to list"
          >
            <X className="w-4 h-4" />
          </Link>
        </div>
      ),
    });
    return () => setBarState({ title: null, titleSuffix: null, rightSlot: null });
  }, [invoiceId, invoiceNumber, status, setBarState]);

  const pageChunks = useMemo(() => {
    if (items.length === 0) return [[]];
    const chunks: Item[][] = [];
    for (let i = 0; i < items.length; i += ROWS_PER_PAGE) {
      chunks.push(items.slice(i, i + ROWS_PER_PAGE));
    }
    return chunks;
  }, [items]);

  const renderTable = (
    chunk: Item[],
    startIndex: number,
    footer?: { totalQty: number; subtotal: number }
  ) => (
    <div className="mt-8 overflow-hidden rounded-xl border doc-border">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b doc-border doc-head">
            <th className="w-12 border-r doc-border p-3 font-medium">#</th>
            <th className="w-20 border-r doc-border p-3 font-medium">Item #</th>
            <th className="border-r doc-border p-3 font-medium">Item & Description</th>
            <th className="w-14 border-r doc-border p-3 font-medium text-right">Qty</th>
            <th className="w-24 border-r doc-border p-3 font-medium text-right">Rate</th>
            <th className="w-24 p-3 font-medium text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {chunk.map((row, i) => (
            <tr
              key={startIndex + i}
              className={i === 0 ? "doc-cell" : "border-t doc-border doc-cell"}
            >
              <td className="border-r doc-border p-3 doc-muted">{startIndex + i + 1}</td>
              <td className="w-20 border-r doc-border p-3">{row.item_number ?? ""}</td>
              <td className="border-r doc-border p-3">
                {row.product_description}
                {row.uom && row.uom !== "Nos" && (
                  <span className="ml-1 doc-muted">({row.uom})</span>
                )}
              </td>
              <td className="w-14 border-r doc-border p-3 text-right">{Number(row.quantity).toLocaleString()}</td>
              <td className="w-24 border-r doc-border p-3 text-right">{Number(row.unit_price).toLocaleString()}</td>
              <td className="w-24 p-3 text-right font-medium">{Number(row.total_values).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
        {footer != null && (
          <tfoot>
            <tr className="border-t-2 doc-border doc-head">
              <td className="border-r doc-border p-3" colSpan={3}>
                <span className="font-medium">Total</span>
              </td>
              <td className="w-14 border-r doc-border p-3 text-right font-medium">{footer.totalQty.toLocaleString()}</td>
              <td className="w-24 border-r doc-border p-3"></td>
              <td className="w-24 p-3 text-right font-medium">{footer.subtotal.toLocaleString()}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );

  return (
    <>
    <div className="flex h-full min-h-0 w-full flex-col">
      {/* Document body: grey area + badge (scrolls with content) + A4 pages */}
      <div
        className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-[var(--color-outline)]/20 pt-8 pb-20 lg:pb-8"
        style={{
          paddingLeft: "max(1rem, env(safe-area-inset-left))",
          paddingRight: "max(1rem, env(safe-area-inset-right))",
        }}
      >
        {estimateNumber && (
          <div className="flex justify-center pb-4">
            <span
              className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)]"
              role="status"
            >
              From estimate {estimateNumber}
            </span>
          </div>
        )}
        <div className="space-y-8">
          {pageChunks.map((chunk, pageIndex) => {
            const startIndex = pageIndex * ROWS_PER_PAGE;
            const isLastPage = pageIndex === pageChunks.length - 1;
            return (
              <div key={pageIndex} className="document-page document-page-spaced mx-auto flex flex-col p-8">
                {/* Header on every page */}
                <div className="flex flex-col gap-8 border-b doc-border pb-8 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-4">
                    {company.logo_url ? (
                      <img
                        src={company.logo_url}
                        alt=""
                        className="max-h-20 w-auto shrink-0 object-contain"
                        aria-hidden
                      />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-container)] text-lg font-semibold text-[var(--color-on-primary-container)]">
                        {company.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h1 className="text-lg font-semibold">{company.name}</h1>
                      {(company.ntn || company.gst_number) && (
                        <p className="mt-0.5 text-sm doc-muted">
                          {[company.ntn && `NTN: ${company.ntn}`, company.gst_number && `GST: ${company.gst_number}`].filter(Boolean).join(" · ")}
                        </p>
                      )}
                      {addressLine && (
                        <p className="mt-0.5 text-sm doc-muted">{addressLine}</p>
                      )}
                      {(company.phone || company.email) && (
                        <p className="mt-0.5 text-sm doc-muted">
                          {[company.phone, company.email].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-3xl font-bold tracking-tight">INVOICE</p>
                    <p className="mt-1 text-lg font-semibold"># {invoiceNumber}</p>
                    <p className="mt-1 text-sm doc-muted">Invoice Date: {invoiceDate}</p>
                    {termsLabel && (
                      <p className="mt-0.5 text-sm doc-muted">Terms: {termsLabel}</p>
                    )}
                    {dueDate && (
                      <p className="mt-0.5 text-sm doc-muted">Due date: {dueDate}</p>
                    )}
                    {poNumber && poNumber.trim() && (
                      <p className="mt-0.5 text-sm doc-muted">P.O. number: {poNumber.trim()}</p>
                    )}
                  </div>
                </div>

                {pageIndex === 0 && (
                  /* Bill To - first page only */
                  <div className="mt-8">
                    <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider doc-muted">
                      Bill To
                    </h2>
                    <p className="font-semibold">{customer.name}</p>
                    {customer.contact_person_name && (
                      <p className="mt-0.5 text-sm doc-muted">Attn: {customer.contact_person_name}</p>
                    )}
                    {customerAddress && (
                      <p className="mt-0.5 text-sm doc-muted">{customerAddress}</p>
                    )}
                    {customer.ntn_cnic && (
                      <p className="mt-0.5 text-sm doc-muted">NTN: {customer.ntn_cnic}</p>
                    )}
                    {(customer.phone || customer.email) && (
                      <p className="mt-0.5 text-sm doc-muted">
                        {[customer.phone, customer.email].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                )}

                {pageIndex === 0 && notes && notes.trim() && (
                  <div className="mt-6 rounded-xl border doc-border doc-notes-bg p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider doc-muted mb-1">Notes</p>
                    <p className="text-sm text-[var(--color-on-surface)] whitespace-pre-wrap">{notes.trim()}</p>
                  </div>
                )}

                {renderTable(chunk, startIndex, isLastPage ? { totalQty, subtotal } : undefined)}

                {isLastPage && (
                  <div className="mt-6 flex justify-end">
                    <table className="w-full max-w-xs text-sm">
                      <tbody>
                        <tr>
                          <td className="py-1 pr-4 doc-muted">Tax</td>
                          <td className="py-1 text-right font-medium">{Number(totalTax).toLocaleString()}</td>
                        </tr>
                        <tr className="border-t-2 doc-border">
                          <td className="py-2 pr-4 font-semibold">Total</td>
                          <td className="py-2 text-right text-lg font-semibold">{Number(totalAmount).toLocaleString()}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Page number - bottom right */}
                <p className="mt-auto pt-6 text-right text-sm doc-muted" aria-label={`Page ${pageIndex + 1} of ${pageChunks.length}`}>
                  {pageIndex + 1}/{pageChunks.length}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile action footer: Back + Edit with safe-area */}
      <div
        className="sticky bottom-0 z-10 flex flex-shrink-0 items-center justify-end gap-2 border-t border-[var(--color-outline)] bg-base px-4 py-3 lg:hidden"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <Link href="/dashboard/sales" className="btn btn-secondary btn-sm">
          Back
        </Link>
        <Link href={`/dashboard/sales/${invoiceId}/edit`} className="btn btn-edit btn-sm">
          Edit
        </Link>
      </div>
    </div>
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
