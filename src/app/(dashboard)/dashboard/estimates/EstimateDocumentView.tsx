"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pencil, Trash2, FileOutput, X, Send, Plus, FileSpreadsheet } from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { IconButton } from "@/components/IconButton";
import { convertEstimateToInvoice, deleteEstimate, setEstimateStatus } from "./actions";
import { startGlobalProcessing, endGlobalProcessing } from "@/components/GlobalProcessing";
import { formatEstimateDate } from "@/lib/formatDate";
import { EstimateStatusBadge } from "./EstimateStatusBadge";
import { useEstimatesTopBar } from "./EstimatesTopBarContext";

function effectiveStatus(status: string, validUntil: string | null): string {
  const today = new Date().toISOString().slice(0, 10);
  if (status === "Sent" && validUntil && validUntil < today) return "Expired";
  return status;
}

const ROWS_PER_PAGE = 22;

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

export function EstimateDocumentView({
  estimateId,
  estimateNumber,
  estimateDate,
  status,
  validUntil = null,
  notes,
  projectName,
  subject,
  paymentTerms = null,
  deliveryTimeAmount = null,
  deliveryTimeUnit = null,
  totalAmount,
  totalTax,
  discountAmount,
  discountType,
  salesTaxLabel,
  company,
  customer,
  items,
}: {
  estimateId: string;
  estimateNumber: string;
  estimateDate: string;
  status: string;
  validUntil?: string | null;
  notes: string | null;
  projectName: string | null;
  subject: string | null;
  paymentTerms?: string | null;
  deliveryTimeAmount?: number | null;
  deliveryTimeUnit?: string | null;
  totalAmount: number;
  totalTax: number;
  discountAmount?: number | null;
  discountType?: "amount" | "percentage" | null;
  salesTaxLabel?: string | null;
  company: Company;
  customer: Customer;
  items: Item[];
}) {
  const router = useRouter();
  const [convertState, setConvertState] = useState<{ loading: boolean } | null>(null);
  const [deleteState, setDeleteState] = useState<{ loading: boolean } | null>(null);
  const [sendLoading, setSendLoading] = useState(false);
  const { setBarState } = useEstimatesTopBar();
  const docViewHandlersRef = useRef<{
    handleSend: () => void;
    setConvertState: (s: { loading: boolean } | null) => void;
    setDeleteState: (s: { loading: boolean } | null) => void;
  } | null>(null);

  const displayStatus = effectiveStatus(status, validUntil ?? null);
  const canConvert = displayStatus !== "Converted" && displayStatus !== "Expired";
  const canSend = displayStatus === "Draft";
  const subtotal = items.reduce((s, i) => s + (i.quantity * i.unit_price), 0);
  const totalQty = items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);

  const discountValue =
    discountAmount != null && discountType
      ? discountType === "percentage"
        ? (subtotal * discountAmount) / 100
        : discountAmount
      : 0;
  const totalAfterDiscount = Math.max(0, subtotal - discountValue);
  const showDiscount = discountValue > 0;

  async function handleConvert() {
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

  async function handleDelete() {
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

  async function handleSend() {
    setSendLoading(true);
    startGlobalProcessing("Marking as sent…");
    try {
      const result = await setEstimateStatus(estimateId, "Sent");
      if (result?.error) {
        endGlobalProcessing({ error: result.error });
        return;
      }
      endGlobalProcessing({ success: "Estimate marked as sent." });
      router.refresh();
    } finally {
      setSendLoading(false);
      endGlobalProcessing();
    }
  }

  docViewHandlersRef.current = {
    handleSend,
    setConvertState,
    setDeleteState,
  };

  const addressLine = [company.address, company.city, company.province].filter(Boolean).join(", ");
  const customerAddress = [customer.address, customer.city, customer.province, customer.country].filter(Boolean).join(", ");

  const pageChunks = useMemo(() => {
    if (items.length === 0) return [[]];
    const chunks: Item[][] = [];
    for (let i = 0; i < items.length; i += ROWS_PER_PAGE) {
      chunks.push(items.slice(i, i + ROWS_PER_PAGE));
    }
    return chunks;
  }, [items]);

  type TableFooter = {
    totalQty: number;
    subtotal: number;
    showDiscount?: boolean;
    discountLabel?: string;
    discountValue?: number;
    totalAfterDiscount?: number;
    salesTaxLabel?: string;
    totalTax?: number;
    totalAmount?: number;
  };

  const renderTable = (
    chunk: Item[],
    startIndex: number,
    footer?: TableFooter
  ) => (
    <div className="mt-5 overflow-hidden rounded-xl border doc-border">
      <table className="w-full text-left text-sm tabular-nums">
        <thead>
          <tr className="border-b doc-border doc-head">
            <th className="w-12 border-r doc-border p-2 font-medium">#</th>
            <th className="w-20 border-r doc-border p-2 font-medium">Item #</th>
            <th className="border-r doc-border p-2 font-medium">Item & Description</th>
            <th className="w-14 border-r doc-border p-2 font-medium text-right">Qty</th>
            <th className="w-24 border-r doc-border p-2 font-medium text-right">Rate</th>
            <th className="w-24 p-2 font-medium text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {chunk.map((row, i) => (
            <tr
              key={startIndex + i}
              className={i === 0 ? "doc-cell" : "border-t doc-border doc-cell"}
            >
              <td className="border-r doc-border p-2 doc-muted">{startIndex + i + 1}</td>
              <td className="w-20 border-r doc-border p-2">{row.item_number ?? ""}</td>
              <td className="border-r doc-border p-2">
                {row.product_description}
                {row.uom && row.uom !== "Nos" && (
                  <span className="ml-1 doc-muted">({row.uom})</span>
                )}
              </td>
              <td className="w-14 border-r doc-border p-2 text-right">{Number(row.quantity).toLocaleString()}</td>
              <td className="w-24 border-r doc-border p-2 text-right">{Number(row.unit_price).toLocaleString()}</td>
              <td className="w-24 p-2 text-right font-medium">{Number(row.total_values).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
        {footer != null && (
          <tfoot>
            <tr className="border-t doc-border doc-head">
              <td className="p-2" colSpan={3}>
                <span className="font-medium">Total</span>
              </td>
              <td className="w-14 p-2 text-right font-medium">{footer.totalQty.toLocaleString()}</td>
              <td className="w-24 p-2"></td>
              <td className="w-24 p-2 text-right font-medium">{footer.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
            </tr>
            {footer.showDiscount && footer.discountValue != null && (
              <tr className="border-t doc-border doc-cell">
                <td className="p-2 doc-muted" colSpan={3}>{footer.discountLabel ?? "Discount"}</td>
                <td className="w-14 p-2"></td>
                <td className="w-24 p-2"></td>
                <td className="w-24 p-2 text-right font-medium">-{footer.discountValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
            )}
            {footer.showDiscount && footer.totalAfterDiscount != null && (
              <tr className="border-t doc-border doc-cell">
                <td className="p-2 doc-muted" colSpan={3}>Total after discount</td>
                <td className="w-14 p-2"></td>
                <td className="w-24 p-2"></td>
                <td className="w-24 p-2 text-right font-medium">{footer.totalAfterDiscount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
            )}
            {footer.totalTax != null && (
              <tr className="border-t doc-border doc-cell">
                <td className="p-2 doc-muted" colSpan={3}>{footer.salesTaxLabel ?? "Sales tax"}</td>
                <td className="w-14 p-2"></td>
                <td className="w-24 p-2"></td>
                <td className="w-24 p-2 text-right font-medium">{Number(footer.totalTax).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
            )}
            {footer.totalAmount != null && (
              <tr className="border-t doc-border doc-head">
                <td className="p-2 font-semibold" colSpan={3}>G.Total</td>
                <td className="w-14 p-2"></td>
                <td className="w-24 p-2"></td>
                <td className="w-24 p-2 text-right text-base font-semibold">{Number(footer.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
            )}
          </tfoot>
        )}
      </table>
    </div>
  );

  useEffect(() => {
    const title = `Estimate ${estimateNumber}`;
    const h = docViewHandlersRef.current;
    setBarState({
      title,
      titleSuffix: h ? <EstimateStatusBadge status={displayStatus} className="shrink-0" /> : null,
      rightSlot: h ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link
            href="/dashboard/estimates/import"
            className="btn btn-secondary btn-sm inline-flex items-center gap-2"
            aria-label="Import from CSV"
            title="Import from CSV"
          >
            <FileSpreadsheet className="h-4 w-4 shrink-0" />
            Import from CSV
          </Link>
          {canSend && (
            <button
              type="button"
              disabled={sendLoading}
              className="btn btn-primary btn-sm inline-flex items-center gap-2"
              onClick={h.handleSend}
            >
              <Send className="w-4 h-4 shrink-0" />
              Send
            </button>
          )}
          {canConvert && (
            <button
              type="button"
              className="btn btn-primary btn-sm inline-flex items-center gap-2"
              onClick={() => h.setConvertState({ loading: false })}
            >
              <FileOutput className="w-4 h-4 shrink-0" />
              Convert
            </button>
          )}
          <Link
            href="/dashboard/estimates/new"
            className="btn btn-add btn-icon shrink-0"
            aria-label="New estimate"
            title="New estimate"
          >
            <Plus className="size-4" />
          </Link>
          <Link
            href={`/dashboard/estimates/${estimateId}/edit`}
            className="btn btn-edit btn-icon shrink-0"
            aria-label="Edit"
            title="Edit"
          >
            <Pencil className="w-4 h-4" />
          </Link>
          <IconButton
            variant="danger"
            icon={<Trash2 className="w-4 h-4" />}
            label="Delete"
            onClick={() => h.setDeleteState({ loading: false })}
          />
          <Link
            href="/dashboard/estimates"
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
  }, [estimateId, estimateNumber, displayStatus, canSend, canConvert, sendLoading, setBarState]);

  return (
    <>
      <div className="flex h-full min-h-0 w-full flex-col">
        {/* Document body: grey area + one or more A4 pages with shadow */}
        <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--color-outline)]/20 py-8 px-4">
          <div className="space-y-8">
            {pageChunks.map((chunk, pageIndex) => {
              const startIndex = pageIndex * ROWS_PER_PAGE;
              const isLastPage = pageIndex === pageChunks.length - 1;
              return (
                <div key={pageIndex} className="document-page document-page-spaced mx-auto flex flex-col p-8 pl-10">
                  {/* Header on every page */}
                  <div className="flex flex-col gap-5 border-b doc-border pb-5 sm:flex-row sm:items-start sm:justify-between">
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
                      <p className="text-3xl font-bold tracking-tight">ESTIMATE</p>
                      <p className="mt-1 text-lg font-semibold"># {estimateNumber}</p>
                      <p className="mt-1 text-sm doc-muted">Estimate Date: {formatEstimateDate(estimateDate)}</p>
                    </div>
                  </div>

                  {pageIndex === 0 && (
                    <>
                      {/* Left card: Bill To + Project + Subject | Right card: Expiry, Payment terms, Delivery time */}
                      <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-stretch sm:justify-between">
                        {/* Left card — slightly wider */}
                        <div className="min-w-0 flex-[1.2] rounded-xl border doc-border doc-notes-bg p-3">
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
                          {(projectName || subject) && (
                            <div className="mt-3 space-y-1 border-t doc-border pt-2 text-sm">
                              {projectName && (
                                <p className="doc-muted">
                                  <span className="font-semibold">Project:</span> {projectName}
                                </p>
                              )}
                              {subject && (
                                <p className="doc-muted">
                                  <span className="font-semibold">Subject:</span> {subject}
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Right card — labels left, values right (Expiry, Delivery time; Terms moved below Notes) */}
                        <div className="min-w-0 flex-1 rounded-xl border doc-border doc-notes-bg p-3 sm:max-w-[17rem]">
                          <table className="w-full border-collapse text-sm" style={{ border: "none" }}>
                            <tbody>
                              {validUntil && (
                                <tr>
                                  <td className="align-top pr-3 font-semibold doc-muted" style={{ border: "none", verticalAlign: "top" }}>Expiry date:</td>
                                  <td className="align-top doc-muted text-left" style={{ border: "none", verticalAlign: "top" }}>{formatEstimateDate(validUntil)}</td>
                                </tr>
                              )}
                              {deliveryTimeAmount != null && deliveryTimeAmount > 0 && deliveryTimeUnit && (
                                <tr>
                                  <td className="align-top pr-3 font-semibold doc-muted" style={{ border: "none", verticalAlign: "top" }}>Delivery time:</td>
                                  <td className="align-top doc-muted text-left" style={{ border: "none", verticalAlign: "top" }}>{deliveryTimeAmount} {deliveryTimeUnit}</td>
                                </tr>
                              )}
                              {!validUntil && (!deliveryTimeAmount || deliveryTimeAmount <= 0 || !deliveryTimeUnit) && (
                                <tr>
                                  <td className="doc-muted" style={{ border: "none" }}>—</td>
                                  <td style={{ border: "none" }} />
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  )}

                  {renderTable(
                    chunk,
                    startIndex,
                    isLastPage
                      ? {
                          totalQty,
                          subtotal,
                          showDiscount,
                          discountLabel:
                            showDiscount && discountType && discountAmount != null
                              ? discountType === "percentage"
                                ? `Discount (${Number(discountAmount)}%)`
                                : `Discount (${discountValue.toLocaleString(undefined, { minimumFractionDigits: 2 })})`
                              : undefined,
                          discountValue,
                          totalAfterDiscount,
                          salesTaxLabel: salesTaxLabel ?? undefined,
                          totalTax,
                          totalAmount,
                        }
                      : undefined
                  )}

                  {isLastPage && notes && (
                    <div className="mt-5 rounded-xl border doc-notes-bg p-3">
                      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider doc-muted">
                        Notes
                      </h3>
                      <p className="text-sm whitespace-pre-wrap">{notes}</p>
                    </div>
                  )}

                  {isLastPage && paymentTerms && (
                    <div className="mt-5 rounded-xl border doc-notes-bg p-3">
                      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider doc-muted">
                        Terms and conditions
                      </h3>
                      <p className="text-sm whitespace-pre-line">{paymentTerms}</p>
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
      </div>

      <ConfirmDialog
        open={!!convertState && !convertState.loading}
        title="Convert to invoice?"
        message="A new draft sales invoice will be created from this estimate."
        confirmLabel="Convert"
        variant="primary"
        loadingLabel="Converting…"
        loading={convertState?.loading ?? false}
        onConfirm={handleConvert}
        onCancel={() => setConvertState(null)}
      />
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
    </>
  );
}
