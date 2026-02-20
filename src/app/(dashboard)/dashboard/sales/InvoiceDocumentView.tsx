"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Pencil, Plus, Trash2, X, FileSpreadsheet, FileDown, Loader2, Send } from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { IconButton } from "@/components/IconButton";
import { startGlobalProcessing, endGlobalProcessing } from "@/components/GlobalProcessing";
import { useInvoicesTopBar } from "./InvoicesTopBarContext";
import { deleteInvoice, setInvoiceStatus } from "./actions";

/** Fallback if measurement fails */
const ROWS_FIRST_PAGE_FALLBACK = 14;
const ROWS_PER_PAGE_FALLBACK = 20;
/** Reserve for Bill To + detail cards on first page (px) */
const BILL_TO_RESERVE = 200;
const GAP = 8;
const A4_WIDTH_PX = 794;

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
  estimateId,
  estimateNumber,
  poNumber,
  notes,
  termsType,
  dueDate,
  discountAmount,
  discountType,
  salesTaxLabel,
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
  estimateId?: string | null;
  estimateNumber?: string | null;
  poNumber?: string | null;
  notes?: string | null;
  termsType?: string | null;
  dueDate?: string | null;
  discountAmount?: number | null;
  discountType?: "amount" | "percentage" | null;
  salesTaxLabel?: string | null;
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
  const [pdfLoading, setPdfLoading] = useState(false);
  const [sentLoading, setSentLoading] = useState(false);
  const [rowsFirstPage, setRowsFirstPage] = useState(ROWS_FIRST_PAGE_FALLBACK);
  const [rowsPerPage, setRowsPerPage] = useState(ROWS_PER_PAGE_FALLBACK);
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const billToBlockRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const documentRef = useRef<HTMLDivElement>(null);
  const subtotal = items.reduce((s, i) => s + i.total_values, 0);
  const discountValue =
    discountAmount != null && discountType && subtotal > 0
      ? discountType === "percentage"
        ? (subtotal * Number(discountAmount)) / 100
        : Number(discountAmount)
      : 0;
  const totalAfterDiscount = Math.max(0, subtotal - discountValue);
  const discountFactor = subtotal > 0 ? totalAfterDiscount / subtotal : 1;

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

  async function handleExportPdf() {
    const wrapper = documentRef.current;
    if (!wrapper) return;
    setPdfLoading(true);
    startGlobalProcessing("Exporting PDF…");
    const prevScale = scale;
    setScale(1);
    await new Promise((r) => setTimeout(r, 100));
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");
      const probeRoot = measureRef.current;
      const allPages = wrapper.querySelectorAll<HTMLElement>(".document-page");
      const pages = probeRoot
        ? Array.from(allPages).filter((el) => !probeRoot.contains(el))
        : Array.from(allPages);
      if (pages.length === 0) return;
      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      for (let i = 0; i < pages.length; i++) {
        const pageEl = pages[i];
        const canvas = await html2canvas(pageEl, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          width: pageEl.offsetWidth,
          height: pageEl.offsetHeight,
          onclone: (_clonedDoc, clonedEl) => {
            clonedEl.style.boxShadow = "none";
            clonedEl.style.background = "#ffffff";
            clonedEl.querySelectorAll(".doc-cell, .doc-notes-bg").forEach((el) => {
              (el as HTMLElement).style.background = "#ffffff";
            });
          },
        });
        const imgData = canvas.toDataURL("image/jpeg", 0.98);
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, 0, 210, 297, undefined, "FAST");
      }
      pdf.save(`invoice-${invoiceNumber}.pdf`);
      endGlobalProcessing({ success: "PDF exported." });
    } catch (err) {
      endGlobalProcessing({ error: "Failed to export PDF." });
    } finally {
      setScale(prevScale);
      setPdfLoading(false);
      endGlobalProcessing();
    }
  }

  const totalQty = items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);
  const addressLine = [company.address, company.city, company.province].filter(Boolean).join(", ");
  const customerAddress = [customer.address, customer.city, customer.province, customer.country].filter(Boolean).join(", ");

  async function handleMarkAsSent() {
    setSentLoading(true);
    startGlobalProcessing("Marking as sent…");
    try {
      const result = await setInvoiceStatus(invoiceId, "Sent");
      if (result?.error) {
        endGlobalProcessing({ error: result.error });
      } else {
        endGlobalProcessing({ success: "Invoice marked as sent." });
        router.refresh();
      }
    } finally {
      setSentLoading(false);
    }
  }

  useEffect(() => {
    setBarState({
      title: `Invoice ${invoiceNumber}`,
      titleSuffix: (
        <span className="invoice-status-badge ml-2 shrink-0" data-status={status.toLowerCase()}>
          {status}
        </span>
      ),
      rightSlot: (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {status === "Draft" && (
            <button
              type="button"
              onClick={handleMarkAsSent}
              disabled={sentLoading}
              className="btn btn-primary btn-sm inline-flex items-center gap-2 shrink-0"
              aria-label="Mark as sent"
              title="Mark as sent"
            >
              {sentLoading ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : <Send className="w-4 h-4 shrink-0" />}
              Sent
            </button>
          )}
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={pdfLoading}
            className="btn btn-secondary btn-icon shrink-0"
            aria-label="Export PDF"
            title="Export PDF"
          >
            {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
          </button>
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
  }, [invoiceId, invoiceNumber, status, pdfLoading, sentLoading, setBarState]);

  const pageChunks = useMemo(() => {
    if (items.length === 0) return [[]];
    const chunks: Item[][] = [];
    let i = 0;
    while (i < items.length) {
      const limit = chunks.length === 0 ? rowsFirstPage : rowsPerPage;
      chunks.push(items.slice(i, i + limit));
      i += limit;
    }
    return chunks;
  }, [items, rowsFirstPage, rowsPerPage]);

  useLayoutEffect(() => {
    const run = () => {
      const probe = measureRef.current;
      if (!probe) return;
      const contentEl = probe.querySelector<HTMLElement>(".document-page-content");
      const tableEl = probe.querySelector<HTMLTableElement>("table");
      const theadRow = tableEl?.querySelector("thead tr");
      const firstBodyRow = tableEl?.querySelector("tbody tr");
      if (!contentEl || !firstBodyRow || !theadRow) return;
      const contentHeight = contentEl.clientHeight;
      const rowHeight = (firstBodyRow as HTMLElement).offsetHeight;
      const headerHeight = (theadRow as HTMLElement).offsetHeight;
      const availableForRows = contentHeight - headerHeight;
      setRowsPerPage(Math.max(1, Math.floor(availableForRows / rowHeight)));
      const availableFirstPage = contentHeight - headerHeight - GAP - BILL_TO_RESERVE;
      setRowsFirstPage(Math.max(1, Math.floor(availableFirstPage / rowHeight)));
    };
    requestAnimationFrame(() => requestAnimationFrame(run));
  }, []);

  useLayoutEffect(() => {
    const probe = measureRef.current;
    const contentEl = probe?.querySelector<HTMLElement>(".document-page-content");
    const tableEl = probe?.querySelector<HTMLTableElement>("table");
    const theadRow = tableEl?.querySelector("thead tr");
    const firstBodyRow = tableEl?.querySelector("tbody tr");
    const billToEl = billToBlockRef.current;
    if (!contentEl || !firstBodyRow || !theadRow) return;
    const contentHeight = contentEl.clientHeight;
    const rowHeight = (firstBodyRow as HTMLElement).offsetHeight;
    const headerHeight = (theadRow as HTMLElement).offsetHeight;
    const billToHeight = billToEl?.offsetHeight ?? BILL_TO_RESERVE;
    const availableFirstPage = contentHeight - headerHeight - GAP - billToHeight;
    setRowsFirstPage(Math.max(1, Math.floor(availableFirstPage / rowHeight)));
  }, [pageChunks.length]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateScale = () => {
      const w = el.offsetWidth;
      if (w > 0) setScale(Math.min(1, (w - 32) / A4_WIDTH_PX));
    };
    updateScale();
    const ro = new ResizeObserver(updateScale);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  type TableFooter = {
    totalQty: number;
    subtotal: number;
    salesTaxLabel?: string;
    totalTax?: number;
    totalAmount?: number;
  };

  const renderTable = (
    chunk: Item[],
    startIndex: number,
    footer?: TableFooter,
    discountFactor = 1
  ) => (
    <div className="overflow-hidden rounded-xl border doc-border">
      <table className="w-full text-left text-sm tabular-nums">
        <thead>
          <tr className="border-b doc-border doc-head">
            <th className="w-12 border-r doc-border p-2 font-medium">#</th>
            <th className="w-20 border-r doc-border p-2 font-medium">Item #</th>
            <th className="border-r doc-border p-2 font-medium">Item & Description</th>
            <th className="w-14 border-r doc-border p-2 font-medium text-right">Qty</th>
            <th className="w-24 border-r doc-border p-2 font-medium text-right">Unit rate</th>
            <th className="w-24 p-2 font-medium text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {chunk.map((row, i) => {
            const qty = Number(row.quantity) || 0;
            const unitPrice = Number(row.unit_price) || 0;
            const lineTotal = Number(row.total_values) || 0;
            const discountedUnitRate = unitPrice * discountFactor;
            const discountedLineTotal = lineTotal * discountFactor;
            return (
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
                <td className="w-14 border-r doc-border p-2 text-right">{qty.toLocaleString()}</td>
                <td className="w-24 border-r doc-border p-2 text-right">
                  {discountedUnitRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="w-24 p-2 text-right font-medium">{discountedLineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            );
          })}
        </tbody>
        {footer != null && (
          <tfoot>
            <tr className="border-t doc-border doc-head">
              <td className="p-2" colSpan={3}>
                <span className="font-medium">Total</span>
              </td>
              <td className="w-14 p-2 text-right font-medium">{footer.totalQty.toLocaleString()}</td>
              <td className="w-24 p-2"></td>
              <td className="w-24 p-2 text-right font-medium">{footer.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
            {footer.totalTax != null && (
              <tr className="border-t doc-border doc-cell">
                <td className="p-2 doc-muted" colSpan={3}>{footer.salesTaxLabel ?? "Sales tax"}</td>
                <td className="w-14 p-2"></td>
                <td className="w-24 p-2"></td>
                <td className="w-24 p-2 text-right font-medium">{Number(footer.totalTax).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            )}
            {footer.totalAmount != null && (
              <tr className="border-t doc-border doc-head">
                <td className="p-2 font-semibold" colSpan={3}>G.Total</td>
                <td className="w-14 p-2"></td>
                <td className="w-24 p-2"></td>
                <td className="w-24 p-2 text-right text-base font-semibold">{Number(footer.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            )}
          </tfoot>
        )}
      </table>
    </div>
  );

  return (
    <>
    <div className="flex h-full min-h-0 w-full flex-col">
      {/* Document body: grey area + badge (scrolls with content) + A4 pages, same layout/scale as estimate */}
      <div
        ref={containerRef}
        className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-[var(--color-outline)]/20 pt-8 pb-20 lg:pb-8"
        style={{
          paddingLeft: "max(1rem, env(safe-area-inset-left))",
          paddingRight: "max(1rem, env(safe-area-inset-right))",
        }}
      >
        <div className="flex flex-col items-center w-full">
          {estimateNumber && (
            <div className="flex justify-end w-[210mm] max-w-full shrink-0">
              {estimateId ? (
                <Link
                  href={`/dashboard/estimates/${estimateId}`}
                  className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)] hover:opacity-90"
                  role="status"
                >
                  From estimate #{estimateNumber}
                </Link>
              ) : (
                <span
                  className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)]"
                  role="status"
                >
                  From estimate #{estimateNumber}
                </span>
              )}
            </div>
          )}
          <div
            style={{ transform: `scale(${scale})`, transformOrigin: "top center" }}
            className="shrink-0 flex justify-center w-full"
          >
          <div ref={documentRef} className="relative space-y-8">
            {/* Hidden probe for row measurement — same structure as estimate */}
            <div
              ref={measureRef}
              className="fixed left-0 top-0 z-[-1] w-[210mm] pointer-events-none"
              style={{ visibility: "hidden" }}
              aria-hidden
            >
              <div className="document-page document-page-spaced flex flex-col p-8 pl-10">
                <div className="document-page-header flex flex-col gap-5 border-b doc-border pb-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-container)]">AB</div>
                  <div className="text-left sm:text-right">
                    <p className="text-3xl font-bold tracking-tight">INVOICE</p>
                    <p className="mt-1 text-lg font-semibold"># 00000</p>
                  </div>
                </div>
                <div className="document-page-content mt-5 flex flex-col flex-1 min-h-0">
                  <div className="mt-5 overflow-hidden rounded-xl border doc-border">
                    <table className="w-full text-left text-sm tabular-nums">
                      <thead>
                        <tr className="border-b doc-border doc-head">
                          <th className="w-12 border-r doc-border p-2 font-medium">#</th>
                          <th className="w-20 border-r doc-border p-2 font-medium">Item #</th>
                          <th className="border-r doc-border p-2 font-medium">Item & Description</th>
                          <th className="w-14 border-r doc-border p-2 font-medium text-right">Qty</th>
                          <th className="w-24 border-r doc-border p-2 font-medium text-right">Unit rate</th>
                          <th className="w-24 p-2 font-medium text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="doc-cell">
                          <td className="border-r doc-border p-2 doc-muted">1</td>
                          <td className="w-20 border-r doc-border p-2">—</td>
                          <td className="border-r doc-border p-2">Sample</td>
                          <td className="w-14 border-r doc-border p-2 text-right">1</td>
                          <td className="w-24 border-r doc-border p-2 text-right">0</td>
                          <td className="w-24 p-2 text-right font-medium">0</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="document-page-footer pt-6 text-right text-sm doc-muted">1/1</div>
              </div>
            </div>
            {pageChunks.map((chunk, pageIndex) => {
              const startIndex = pageChunks.slice(0, pageIndex).reduce((s, c) => s + c.length, 0);
              const isLastPage = pageIndex === pageChunks.length - 1;
              return (
                <div key={pageIndex} className="document-page document-page-spaced mx-auto flex flex-col p-8 pl-10">
                  {/* Header on every page — same structure as estimate */}
                  <div className="document-page-header flex flex-col gap-5 border-b doc-border pb-5 sm:flex-row sm:items-start sm:justify-between">
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
                  </div>
                </div>

                <div className="document-page-content mt-3 flex flex-col flex-1 min-h-0">
                  {pageIndex === 0 && (
                    /* Bill To + Invoice detail section — same two-card layout as estimate */
                    <div ref={billToBlockRef} className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:justify-between">
                    <div className="min-w-0 flex-[1.2] rounded-xl border doc-border doc-notes-bg p-3">
                      <h2 className="text-xs font-semibold uppercase tracking-wider doc-muted mb-2">Bill To</h2>
                      <p className="font-semibold m-0">{customer.name}</p>
                      {customer.contact_person_name && customer.contact_person_name.trim() !== customer.name.trim() && (
                        <p className="mt-0.5 text-sm doc-muted m-0">Attn: {customer.contact_person_name}</p>
                      )}
                      {customerAddress && (
                        <p className="mt-0.5 text-sm doc-muted m-0">{customerAddress}</p>
                      )}
                      {customer.ntn_cnic && (
                        <p className="mt-0.5 text-sm doc-muted m-0">NTN: {customer.ntn_cnic}</p>
                      )}
                      {(customer.phone || customer.email) && (
                        <p className="mt-0.5 text-sm doc-muted m-0">
                          {[customer.phone, customer.email].filter(Boolean).join(" · ")}
                        </p>
                      )}
                      {poNumber && poNumber.trim() && (
                        <p className="mt-0.5 text-sm doc-muted m-0"><span className="font-semibold">P.O. #</span> {poNumber.trim()}</p>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 rounded-xl border doc-border doc-notes-bg sm:max-w-[17rem] p-3">
                      <table className="w-full border-collapse text-sm" style={{ border: "none", width: "100%" }}>
                        <tbody>
                          {termsLabel && (
                            <tr>
                              <td className="align-top font-semibold doc-muted pr-2 py-0.5" style={{ border: "none", verticalAlign: "top" }}>Terms:</td>
                              <td className="align-top doc-muted text-left py-0.5" style={{ border: "none", verticalAlign: "top" }}>{termsLabel}</td>
                            </tr>
                          )}
                          {dueDate && (
                            <tr>
                              <td className="align-top font-semibold doc-muted pr-2 py-0.5" style={{ border: "none", verticalAlign: "top" }}>Due date:</td>
                              <td className="align-top doc-muted text-left py-0.5" style={{ border: "none", verticalAlign: "top" }}>{dueDate}</td>
                            </tr>
                          )}
                          {!termsLabel && !dueDate && (
                            <tr>
                              <td className="doc-muted py-0.5" style={{ border: "none" }}>—</td>
                              <td className="py-0.5" style={{ border: "none" }} />
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  )}

                  <div className={pageIndex === 0 ? "mt-5" : ""}>
                    {renderTable(
                    chunk,
                    startIndex,
                    isLastPage
                      ? {
                          totalQty,
                          subtotal: totalAfterDiscount,
                          salesTaxLabel: salesTaxLabel ?? undefined,
                          totalTax: Number(totalTax),
                          totalAmount: Number(totalAmount),
                        }
                      : undefined,
                    discountFactor
                    )}
                  </div>

                  {isLastPage && notes && notes.trim() && (
                    <div className="mt-4 rounded-xl border doc-border doc-notes-bg p-3">
                      <p className="text-xs font-semibold uppercase tracking-wider doc-muted mb-1">Notes</p>
                      <p className="text-sm text-[var(--color-on-surface)] whitespace-pre-wrap m-0">{notes.trim()}</p>
                    </div>
                  )}
                </div>

                <p className="document-page-footer pt-6 text-right text-sm doc-muted" aria-label={`Page ${pageIndex + 1} of ${pageChunks.length}`}>
                  {pageIndex + 1}/{pageChunks.length}
                </p>
              </div>
            );
          })}
          </div>
        </div>
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
