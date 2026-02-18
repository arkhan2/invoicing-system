"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Pencil, Trash2, FileOutput, X, Send, Plus, FileSpreadsheet, FileDown, Loader2 } from "lucide-react";
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

/** Fallback if measurement fails */
const ROWS_FIRST_PAGE_FALLBACK = 14;
const ROWS_PER_PAGE_FALLBACK = 20;
const TFOOT_ESTIMATED_ROWS = 6;
/** Reserve at bottom of content area (0 = fill to footer) */
const FOOTER_SAFETY = 0;
const BILL_TO_ESTIMATE = 180;
/** Probe uses mt-5 (20px), real last page uses mt-3 (12px); add this so terms get full space */
const CONTENT_TOP_MARGIN_DIFF_PX = 8;
/** A4 width at 96dpi: 210mm */
const A4_WIDTH_PX = 794;
/** Chars per content area (header to footer) — use full page for notes/terms */
const CHARS_PER_CONTENT_PAGE = 1400;

function splitTextIntoChunks(text: string, maxChars: number): string[] {
  if (!text?.trim()) return [];
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) return [trimmed];
  const chunks: string[] = [];
  let remaining = trimmed;
  while (remaining.length > 0) {
    if (remaining.length <= maxChars) {
      chunks.push(remaining);
      break;
    }
    const candidate = remaining.slice(0, maxChars);
    const lastPara = candidate.lastIndexOf("\n\n");
    const lastLine = candidate.lastIndexOf("\n");
    const breakAt = lastPara >= maxChars * 0.5 ? lastPara + 2 : lastLine >= maxChars * 0.5 ? lastLine + 1 : maxChars;
    chunks.push(remaining.slice(0, breakAt).trimEnd());
    remaining = remaining.slice(breakAt).trimStart();
  }
  return chunks;
}

/** Find a good break point before index (prefer paragraph, then line, then space) */
function findBreakPoint(str: string, maxIdx: number): number {
  if (maxIdx >= str.length) return str.length;
  const slice = str.slice(0, maxIdx + 1);
  const lastPara = slice.lastIndexOf("\n\n");
  const lastLine = slice.lastIndexOf("\n");
  const lastSpace = slice.lastIndexOf(" ");
  if (lastPara >= maxIdx * 0.3) return lastPara + 2;
  if (lastLine >= maxIdx * 0.3) return lastLine + 1;
  if (lastSpace >= maxIdx * 0.3) return lastSpace + 1;
  return maxIdx;
}

const SAFETY_FACTOR = 1;

/**
 * Split text into chunks that fit within maxHeightPx.
 * Uses measure element and binary search with safety factor.
 */
function splitTextByContentArea(
  text: string,
  maxHeightPx: number,
  measureEl: HTMLElement | null,
  whitespace: "pre-wrap" | "pre-line"
): string[] {
  return splitTextByContentAreaMulti(text, [maxHeightPx], measureEl, whitespace);
}

/**
 * Split text: first chunk fits maxHeights[0], second fits maxHeights[1], etc.
 * When maxHeights is exhausted, uses last value for remaining chunks.
 * Fully uses each available space before moving to next.
 */
function splitTextByContentAreaMulti(
  text: string,
  maxHeightsPx: number[],
  measureEl: HTMLElement | null,
  whitespace: "pre-wrap" | "pre-line"
): string[] {
  if (!text?.trim() || maxHeightsPx.length === 0) return [];
  const trimmed = text.trim();
  if (!measureEl || maxHeightsPx.every((h) => h <= 0))
    return splitTextIntoChunks(trimmed, CHARS_PER_CONTENT_PAGE);
  const origWhiteSpace = measureEl.style.whiteSpace;
  measureEl.style.whiteSpace = whitespace;
  measureEl.style.height = "auto";
  measureEl.style.overflow = "visible";
  const chunks: string[] = [];
  let remaining = trimmed;
  let idx = 0;
  while (remaining.length > 0) {
    const maxH = maxHeightsPx[Math.min(idx, maxHeightsPx.length - 1)];
    const effectiveMax = Math.floor(maxH * SAFETY_FACTOR);
    if (effectiveMax <= 0) break;
    measureEl.textContent = remaining;
    if (measureEl.scrollHeight <= effectiveMax) {
      chunks.push(remaining);
      break;
    }
    let lo = 0;
    let hi = remaining.length;
    while (hi - lo > 1) {
      const mid = Math.floor((lo + hi) / 2);
      measureEl.textContent = remaining.slice(0, mid);
      if (measureEl.scrollHeight <= effectiveMax) lo = mid;
      else hi = mid;
    }
    const breakAt = findBreakPoint(remaining, Math.max(1, lo));
    chunks.push(remaining.slice(0, breakAt).trimEnd());
    remaining = remaining.slice(breakAt).trimStart();
    idx++;
  }
  measureEl.style.whiteSpace = origWhiteSpace;
  measureEl.textContent = "";
  return chunks;
}

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
  const [pdfLoading, setPdfLoading] = useState(false);
  const [scale, setScale] = useState(1);
  const [rowsFirstPage, setRowsFirstPage] = useState(ROWS_FIRST_PAGE_FALLBACK);
  const [rowsPerPage, setRowsPerPage] = useState(ROWS_PER_PAGE_FALLBACK);
  const { setBarState } = useEstimatesTopBar();
  const containerRef = useRef<HTMLDivElement>(null);
  const documentRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const billToBlockRef = useRef<HTMLDivElement>(null);
  const termsMeasureRef = useRef<HTMLParagraphElement>(null);
  const measureValuesRef = useRef<{
    contentHeight: number;
    rowHeight: number;
    headerHeight: number;
    cardShellHeight: number;
    maxHeightFullPage: number;
    tfootRows: number;
  } | null>(null);
  const [termsOnLastTablePage, setTermsOnLastTablePage] = useState(false);
  const [termsOnLastNotesPage, setTermsOnLastNotesPage] = useState(false);
  const [notesOnLastTablePage, setNotesOnLastTablePage] = useState(false);
  const [notesChunks, setNotesChunks] = useState<string[]>(() =>
    notes?.trim() ? splitTextIntoChunks(notes.trim(), CHARS_PER_CONTENT_PAGE) : []
  );
  const [termsChunks, setTermsChunks] = useState<string[]>(() =>
    paymentTerms?.trim() ? splitTextIntoChunks(paymentTerms.trim(), CHARS_PER_CONTENT_PAGE) : []
  );
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
      pdf.save(`estimate-${estimateNumber}.pdf`);
      endGlobalProcessing({ success: "PDF exported." });
    } catch (err) {
      endGlobalProcessing({ error: "Failed to export PDF." });
    } finally {
      setScale(prevScale);
      setPdfLoading(false);
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
    let i = 0;
    while (i < items.length) {
      const limit = chunks.length === 0 ? rowsFirstPage : rowsPerPage;
      chunks.push(items.slice(i, i + limit));
      i += limit;
    }
    return chunks;
  }, [items, rowsFirstPage, rowsPerPage]);

  const continuationBlocks = useMemo(() => {
    const blocks: { kind: "notes" | "terms"; text: string; isContinued: boolean; termsOnSamePage?: string }[] = [];
    const notesContinuation = notesChunks.slice(1);
    notesContinuation.forEach((text, i) => {
      const isLastNotesBlock = i === notesContinuation.length - 1;
      blocks.push({
        kind: "notes",
        text,
        isContinued: true,
        termsOnSamePage: isLastNotesBlock && termsOnLastNotesPage ? termsChunks[0] : undefined,
      });
    });
    termsChunks.forEach((chunk, i) => {
      if (i === 0 && (termsOnLastTablePage || termsOnLastNotesPage)) return;
      blocks.push({ kind: "terms", text: chunk, isContinued: i > 0 || termsOnLastTablePage || termsOnLastNotesPage });
    });
    return blocks;
  }, [notesChunks, termsChunks, termsOnLastTablePage, termsOnLastNotesPage]);

  const totalPageCount =
    pageChunks.length + continuationBlocks.length;

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
    <div className="overflow-hidden rounded-xl border doc-border">
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

  useLayoutEffect(() => {
    const run = () => {
      const probe = measureRef.current;
      if (!probe) return;
      const contentEl = probe.querySelector<HTMLElement>(".document-page-content");
      const tableEl = probe.querySelector<HTMLTableElement>("table");
      const theadRow = tableEl?.querySelector("thead tr");
      const firstBodyRow = tableEl?.querySelector("tbody tr");
      const termsContentEl = probe.querySelector<HTMLElement>(".measure-terms-content");
      if (!contentEl || !firstBodyRow || !theadRow) return;
      const contentHeight = contentEl.clientHeight;
      const rowHeight = (firstBodyRow as HTMLElement).offsetHeight;
      const headerHeight = (theadRow as HTMLElement).offsetHeight;
      const GAP = 8;
      const availableForRows = contentHeight - headerHeight;
      const maxRows = Math.max(1, Math.floor(availableForRows / rowHeight));
      setRowsPerPage(maxRows);
      const availableFirstPage = contentHeight - headerHeight - GAP - BILL_TO_ESTIMATE;
      setRowsFirstPage(Math.max(1, Math.floor(availableFirstPage / rowHeight)));

      const termsContentHeight = termsContentEl?.clientHeight ?? 0;
      const cardShellEl = probe.querySelector<HTMLElement>(".measure-terms-card");
      if (termsMeasureRef.current) termsMeasureRef.current.textContent = "";
      const cardShellHeight = cardShellEl?.offsetHeight ?? 52;
      const maxHeightFullPage =
        termsContentHeight > 150
          ? Math.max(80, termsContentHeight - cardShellHeight)
          : 0;
      measureValuesRef.current =
        maxHeightFullPage > 0
          ? {
              contentHeight,
              rowHeight,
              headerHeight,
              cardShellHeight,
              maxHeightFullPage,
              tfootRows: TFOOT_ESTIMATED_ROWS,
            }
          : null;
    };
    requestAnimationFrame(() => requestAnimationFrame(run));
  }, []);

  useLayoutEffect(() => {
    const mv = measureValuesRef.current;
    const measureEl = termsMeasureRef.current;
    if (!mv || !measureEl) {
      if (notes?.trim())
        setNotesChunks(splitTextIntoChunks(notes.trim(), CHARS_PER_CONTENT_PAGE));
      if (paymentTerms?.trim())
        setTermsChunks(splitTextIntoChunks(paymentTerms.trim(), CHARS_PER_CONTENT_PAGE));
      return;
    }
    const GAP = 8;
    const lastChunkRowCount =
      pageChunks.length > 0 ? pageChunks[pageChunks.length - 1].length : 0;
    const isFirstPageAlsoLast = pageChunks.length === 1;
    const billToHeight = billToBlockRef.current?.offsetHeight ?? BILL_TO_ESTIMATE;
    const billToReserve = isFirstPageAlsoLast ? billToHeight : 0;

    if (pageChunks.length >= 1) {
      const availableFirstPage = mv.contentHeight - mv.headerHeight - GAP - billToHeight;
      const newRowsFirstPage = Math.max(1, Math.floor(availableFirstPage / mv.rowHeight));
      setRowsFirstPage(newRowsFirstPage);
    }
    const tfootRows =
      2 + (showDiscount ? 2 : 0) + (totalTax != null ? 1 : 0);
    const tableTotalHeight =
      mv.headerHeight + (lastChunkRowCount + tfootRows) * mv.rowHeight;
    const contentHeight =
      mv.contentHeight - FOOTER_SAFETY + CONTENT_TOP_MARGIN_DIFF_PX;
    const hasNotes = !!notes?.trim();
    const hasTerms = !!paymentTerms?.trim();

    // Notes first (last table page + continuation). On the page where notes end, use remaining space for terms if any, then split terms to next page(s).
    const gapAfterBillTo = billToReserve > 0 ? GAP : 0;
    const itemsHeight = billToReserve + gapAfterBillTo + tableTotalHeight;
    const spacingAfterItems = GAP;
    const gapBeforeFooter = GAP;

    let notesResult: string[] = [];
    let maxNotesOnLast = 0;
    let maxTermsOnLast = 0;

    // 1) Notes: use all remaining space on last table page; overflow to continuation pages
    if (hasNotes) {
      const spaceForNotesOnLast = contentHeight - itemsHeight - spacingAfterItems - gapBeforeFooter;
      maxNotesOnLast = Math.max(80, Math.max(0, spaceForNotesOnLast) - mv.cardShellHeight);
      const notesHeights = maxNotesOnLast > 0 ? [maxNotesOnLast, mv.maxHeightFullPage] : [mv.maxHeightFullPage];
      notesResult = splitTextByContentAreaMulti(notes!.trim(), notesHeights, measureEl, "pre-wrap");
      setNotesChunks(notesResult);
    } else {
      setNotesChunks([]);
    }

    // 2) Terms: on the page where notes end, check if there is space left and start terms there; split rest to next page(s)
    const notesEndOnLastTablePage = hasNotes && notesResult.length === 1;
    const notesEndOnContinuationPage = hasNotes && notesResult.length > 1;
    const notesCardHeight = (() => {
      if (!hasNotes || !notesResult[0]) return 0;
      measureEl.style.whiteSpace = "pre-wrap";
      measureEl.textContent = notesResult[0];
      const h = measureEl.scrollHeight;
      measureEl.textContent = "";
      return mv.cardShellHeight + h;
    })();
    const gapBeforeTerms = hasNotes ? GAP : 0;
    let maxTermsOnLastNotesPage = 0;

    if (hasTerms) {
      if (notesEndOnLastTablePage || !hasNotes) {
        const spaceForTermsCard = Math.max(
          0,
          contentHeight - itemsHeight - spacingAfterItems - notesCardHeight - gapBeforeTerms - gapBeforeFooter
        );
        maxTermsOnLast = Math.max(80, spaceForTermsCard - mv.cardShellHeight);
        const th = maxTermsOnLast > 0 ? [maxTermsOnLast, mv.maxHeightFullPage] : [mv.maxHeightFullPage];
        setTermsChunks(
          splitTextByContentAreaMulti(paymentTerms!.trim(), th, measureEl, "pre-line")
        );
        setTermsOnLastNotesPage(false);
      } else if (notesEndOnContinuationPage) {
        const lastNotesChunk = notesResult[notesResult.length - 1];
        measureEl.style.whiteSpace = "pre-wrap";
        measureEl.textContent = lastNotesChunk ?? "";
        const lastNotesTextHeight = measureEl.scrollHeight;
        measureEl.textContent = "";
        const lastNotesCardHeight = mv.cardShellHeight + lastNotesTextHeight;
        const continuationContentHeight = mv.maxHeightFullPage + mv.cardShellHeight;
        const spaceForTermsCard = Math.max(
          0,
          continuationContentHeight - lastNotesCardHeight - GAP - gapBeforeFooter
        );
        maxTermsOnLastNotesPage = Math.max(80, spaceForTermsCard - mv.cardShellHeight);
        const th = maxTermsOnLastNotesPage > 0 ? [maxTermsOnLastNotesPage, mv.maxHeightFullPage] : [mv.maxHeightFullPage];
        setTermsChunks(
          splitTextByContentAreaMulti(paymentTerms!.trim(), th, measureEl, "pre-line")
        );
        setTermsOnLastNotesPage(maxTermsOnLastNotesPage > 0);
      } else {
        setTermsChunks(
          splitTextByContentAreaMulti(
            paymentTerms!.trim(),
            [mv.maxHeightFullPage],
            measureEl,
            "pre-line"
          )
        );
        setTermsOnLastNotesPage(false);
      }
    } else {
      setTermsChunks([]);
      setTermsOnLastNotesPage(false);
    }

    setNotesOnLastTablePage(!!(hasNotes && notesResult.length > 0 && maxNotesOnLast > 0));
    setTermsOnLastTablePage(!!(hasTerms && maxTermsOnLast > 0));
  }, [notes, paymentTerms, pageChunks, showDiscount, totalTax]);

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

  useEffect(() => {
    const title = `Estimate ${estimateNumber}`;
    const h = docViewHandlersRef.current;
    setBarState({
      title,
      titleSuffix: h ? <EstimateStatusBadge status={displayStatus} className="shrink-0" /> : null,
      rightSlot: h ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
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
  }, [estimateId, estimateNumber, displayStatus, canSend, canConvert, sendLoading, pdfLoading, setBarState]);

  return (
    <>
      <div className="flex h-full min-h-0 w-full flex-col">
        {/* Document body: grey area + one or more A4 pages, scaled to fit */}
        <div
          ref={containerRef}
          className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-[var(--color-outline)]/20 pt-8 pb-20 flex justify-center lg:pb-8"
          style={{
            paddingLeft: "max(1rem, env(safe-area-inset-left))",
            paddingRight: "max(1rem, env(safe-area-inset-right))",
          }}
        >
          <div
            style={{ transform: `scale(${scale})`, transformOrigin: "top center" }}
            className="shrink-0"
          >
            <div ref={documentRef} className="relative space-y-8">
            {/* Hidden probe: fixed + visibility:hidden ensures correct layout measurement */}
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
                    <p className="text-3xl font-bold tracking-tight">ESTIMATE</p>
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
                          <th className="w-24 border-r doc-border p-2 font-medium text-right">Rate</th>
                          <th className="w-24 p-2 font-medium text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="doc-cell">
                          <td className="border-r doc-border p-2 doc-muted">1</td>
                          <td className="w-20 border-r doc-border p-2">—</td>
                          <td className="border-r doc-border p-2">Sample item</td>
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
              {/* Terms-only page probe — matches continuation page layout exactly */}
              <div className="document-page document-page-spaced flex flex-col p-8 pl-10">
                <div className="document-page-header flex flex-col gap-5 border-b doc-border pb-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-container)]">AB</div>
                  <div className="text-left sm:text-right">
                    <p className="text-3xl font-bold tracking-tight">ESTIMATE</p>
                    <p className="mt-1 text-lg font-semibold"># 00000</p>
                  </div>
                </div>
                <div className="document-page-content measure-terms-content mt-3">
                  <div className="measure-terms-card rounded-xl border doc-border doc-notes-bg p-2">
                    <h3 className="mb-0.5 text-xs font-semibold uppercase tracking-wider doc-muted">Terms and conditions</h3>
                    <p ref={termsMeasureRef} className="text-sm whitespace-pre-line" />
                  </div>
                </div>
                <div className="document-page-footer pt-6 text-right text-sm doc-muted">1/1</div>
              </div>
            </div>
            {(() => {
              const renderHeader = () => (
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
                    <p className="text-3xl font-bold tracking-tight">ESTIMATE</p>
                    <p className="mt-1 text-lg font-semibold"># {estimateNumber}</p>
                    <p className="mt-1 text-sm doc-muted">Estimate Date: {formatEstimateDate(estimateDate)}</p>
                  </div>
                </div>
              );

              const renderFooter = (pageNum: number) => (
                <p className="document-page-footer pt-6 text-right text-sm doc-muted" aria-label={`Page ${pageNum} of ${totalPageCount}`}>
                  {pageNum}/{totalPageCount}
                </p>
              );

              const pages: React.ReactNode[] = [];

              pageChunks.forEach((chunk, pageIndex) => {
                const startIndex = pageChunks.slice(0, pageIndex).reduce((s, c) => s + c.length, 0);
                const isLastTablePage = pageIndex === pageChunks.length - 1;
                const pageNum = pageIndex + 1;

                const content = (
                  <div className="flex flex-col gap-2">
                    {pageIndex === 0 && (
                      <div ref={billToBlockRef} className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:justify-between">
                        <div className="min-w-0 flex-[1.2] rounded-xl border doc-border doc-notes-bg" style={{ padding: "12px", boxSizing: "border-box" }}>
                          <h2 className="text-xs font-semibold uppercase tracking-wider doc-muted" style={{ marginBottom: "8px" }}>Bill To</h2>
                          <p className="font-semibold" style={{ margin: 0 }}>{customer.name}</p>
                          {customer.contact_person_name && <p className="text-sm doc-muted" style={{ margin: "2px 0 0" }}>Attn: {customer.contact_person_name}</p>}
                          {customerAddress && <p className="text-sm doc-muted" style={{ margin: "2px 0 0" }}>{customerAddress}</p>}
                          {customer.ntn_cnic && <p className="text-sm doc-muted" style={{ margin: "2px 0 0" }}>NTN: {customer.ntn_cnic}</p>}
                          {(customer.phone || customer.email) && (
                            <p className="text-sm doc-muted" style={{ margin: "2px 0 0" }}>{[customer.phone, customer.email].filter(Boolean).join(" · ")}</p>
                          )}
                          {(projectName || subject) && (
                            <div className="border-t doc-border text-sm" style={{ marginTop: "12px", paddingTop: "8px" }}>
                              {projectName && <p className="doc-muted" style={{ margin: "0 0 4px" }}><span className="font-semibold">Project:</span> {projectName}</p>}
                              {subject && <p className="doc-muted" style={{ margin: 0 }}><span className="font-semibold">Subject:</span> {subject}</p>}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1 rounded-xl border doc-border doc-notes-bg sm:max-w-[17rem]" style={{ padding: "12px", boxSizing: "border-box" }}>
                          <table className="w-full border-collapse text-sm" style={{ border: "none", width: "100%" }}>
                            <tbody>
                              {validUntil && (
                                <tr>
                                  <td className="align-top font-semibold doc-muted" style={{ border: "none", verticalAlign: "top", paddingRight: "12px" }}>Expiry date:</td>
                                  <td className="align-top doc-muted text-left" style={{ border: "none", verticalAlign: "top" }}>{formatEstimateDate(validUntil)}</td>
                                </tr>
                              )}
                              {deliveryTimeAmount != null && deliveryTimeAmount > 0 && deliveryTimeUnit && (
                                <tr>
                                  <td className="align-top font-semibold doc-muted" style={{ border: "none", verticalAlign: "top", paddingRight: "12px" }}>Delivery time:</td>
                                  <td className="align-top doc-muted text-left" style={{ border: "none", verticalAlign: "top" }}>{deliveryTimeAmount} {deliveryTimeUnit}</td>
                                </tr>
                              )}
                              {!validUntil && (!deliveryTimeAmount || deliveryTimeAmount <= 0 || !deliveryTimeUnit) && (
                                <tr><td className="doc-muted" style={{ border: "none" }}>—</td><td style={{ border: "none" }} /></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col gap-2">
                      {renderTable(
                        chunk,
                        startIndex,
                        isLastTablePage ? {
                          totalQty,
                          subtotal,
                          showDiscount,
                          discountLabel: showDiscount && discountType && discountAmount != null
                            ? discountType === "percentage"
                              ? `Discount (${Number(discountAmount)}%)`
                              : `Discount (${discountValue.toLocaleString(undefined, { minimumFractionDigits: 2 })})`
                            : undefined,
                          discountValue,
                          totalAfterDiscount,
                          salesTaxLabel: salesTaxLabel ?? undefined,
                          totalTax,
                          totalAmount,
                        } : undefined
                      )}
                      {isLastTablePage && notesOnLastTablePage && notesChunks[0] && (
                        <div className="rounded-xl border doc-notes-bg p-2">
                          <h3 className="mb-0.5 text-xs font-semibold uppercase tracking-wider doc-muted">Notes</h3>
                          <p className="text-sm whitespace-pre-wrap">{notesChunks[0]}</p>
                        </div>
                      )}
                    </div>

                    {isLastTablePage && termsOnLastTablePage && termsChunks[0] && (
                      <div className="rounded-xl border doc-notes-bg p-2">
                        <h3 className="mb-0.5 text-xs font-semibold uppercase tracking-wider doc-muted">Terms and conditions</h3>
                        <p className="text-sm whitespace-pre-line">{termsChunks[0]}</p>
                      </div>
                    )}
                  </div>
                );

                pages.push(
                  <div key={pageIndex} className="document-page document-page-spaced mx-auto flex flex-col p-8 pl-10">
                    {renderHeader()}
                    <div className="document-page-content mt-3">{content}</div>
                    {renderFooter(pageNum)}
                  </div>
                );
              });

              continuationBlocks.forEach((block, i) => {
                const pageNum = pageChunks.length + i + 1;
                const isNotesWithTermsBelow = block.kind === "notes" && block.termsOnSamePage;
                const label = block.kind === "notes"
                  ? (block.isContinued ? "Notes (continued)" : "Notes")
                  : (block.isContinued ? "Terms and conditions (continued)" : "Terms and conditions");
                const whitespaceClass = block.kind === "notes" ? "whitespace-pre-wrap" : "whitespace-pre-line";
                pages.push(
                  <div key={`cont-${i}`} className="document-page document-page-spaced document-page-break-before mx-auto flex flex-col p-8 pl-10">
                    {renderHeader()}
                    <div className="document-page-content mt-3">
                      <div className="flex flex-col gap-2">
                        <div className="rounded-xl border doc-border doc-notes-bg p-2">
                          <h3 className="mb-0.5 text-xs font-semibold uppercase tracking-wider doc-muted">{label}</h3>
                          <p className={`text-sm ${whitespaceClass}`}>{block.text}</p>
                        </div>
                        {isNotesWithTermsBelow && block.termsOnSamePage && (
                          <div className="rounded-xl border doc-border doc-notes-bg p-2">
                            <h3 className="mb-0.5 text-xs font-semibold uppercase tracking-wider doc-muted">Terms and conditions</h3>
                            <p className="text-sm whitespace-pre-line">{block.termsOnSamePage}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    {renderFooter(pageNum)}
                  </div>
                );
              });

              return pages;
            })()}
            </div>
          </div>
        </div>

        {/* Mobile action footer: Back + Edit with safe-area */}
        <div
          className="sticky bottom-0 z-10 flex flex-shrink-0 items-center justify-end gap-2 border-t border-[var(--color-outline)] bg-base px-4 py-3 lg:hidden"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <Link href="/dashboard/estimates" className="btn btn-secondary btn-sm">
            Back
          </Link>
          <Link href={`/dashboard/estimates/${estimateId}/edit`} className="btn btn-edit btn-sm">
            Edit
          </Link>
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
