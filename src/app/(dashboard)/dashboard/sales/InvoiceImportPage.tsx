"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import Papa from "papaparse";
import { Upload, X } from "lucide-react";
import {
  importInvoicesFromCsv,
  type ImportInvoicesResult,
  type MappedInvoice,
  type MappedInvoiceItem,
} from "./actions";
import { useInvoicesTopBar } from "./InvoicesTopBarContext";
import { startGlobalProcessing, endGlobalProcessing } from "@/components/GlobalProcessing";

const MAX_ROWS = 10000;

type InvoiceMappingKey =
  | "invoice_identifier"
  | "invoice_date"
  | "invoice_number"
  | "status"
  | "customer_name"
  | "notes"
  | "payment_terms"
  | "total_amount"
  | "total_tax"
  | "discount_amount"
  | "discount_type"
  | "estimate_number"
  | "item_name"
  | "item_desc"
  | "quantity"
  | "unit_price"
  | "total_values"
  | "sales_tax_applicable"
  | "discount"
  | "uom";

const INVOICE_FIELDS: { key: InvoiceMappingKey; label: string; level: "Invoice" }[] = [
  { key: "invoice_identifier", label: "Invoice identifier (group by)", level: "Invoice" },
  { key: "invoice_date", label: "Invoice Date", level: "Invoice" },
  { key: "invoice_number", label: "Invoice Number", level: "Invoice" },
  { key: "status", label: "Invoice Status", level: "Invoice" },
  { key: "customer_name", label: "Customer Name (required for match)", level: "Invoice" },
  { key: "notes", label: "Notes", level: "Invoice" },
  { key: "payment_terms", label: "Terms & Conditions", level: "Invoice" },
  { key: "total_amount", label: "Total", level: "Invoice" },
  { key: "total_tax", label: "SubTotal", level: "Invoice" },
  { key: "discount_amount", label: "Entity Discount Amount / Percent", level: "Invoice" },
  { key: "discount_type", label: "Discount Type", level: "Invoice" },
  { key: "estimate_number", label: "Estimate Number (optional link)", level: "Invoice" },
];

const ITEM_FIELDS: { key: InvoiceMappingKey; label: string; level: "Line item" }[] = [
  { key: "item_name", label: "Item Name", level: "Line item" },
  { key: "item_desc", label: "Item Desc", level: "Line item" },
  { key: "quantity", label: "Quantity", level: "Line item" },
  { key: "unit_price", label: "Item Price", level: "Line item" },
  { key: "total_values", label: "Item Total", level: "Line item" },
  { key: "sales_tax_applicable", label: "Item Tax Amount", level: "Line item" },
  { key: "discount", label: "Discount Amount", level: "Line item" },
  { key: "uom", label: "Usage unit", level: "Line item" },
];

export type InvoiceColumnMapping = Record<InvoiceMappingKey, string>;

function buildDefaultMapping(headers: string[]): InvoiceColumnMapping {
  const lower = (s: string) => s.trim().toLowerCase();
  const headerSet = new Map(headers.map((h) => [lower(h), h]));
  const pick = (...names: string[]) => {
    for (const n of names) {
      const h = headerSet.get(n.toLowerCase());
      if (h) return h;
    }
    return "";
  };
  return {
    invoice_identifier: pick("Invoice Number", "Invoice ID", "InvoiceNumber") || headers[0] || "",
    invoice_date: pick("Invoice Date", "Issued Date", "Date"),
    invoice_number: pick("Invoice Number", "Invoice ID"),
    status: pick("Invoice Status", "Status"),
    customer_name: pick("Customer Name", "Customer", "CustomerName"),
    notes: pick("Notes"),
    payment_terms: pick("Terms & Conditions", "Terms and Conditions", "Payment Terms"),
    total_amount: pick("Total"),
    total_tax: pick("SubTotal", "Sub Total"),
    discount_amount: pick("Entity Discount Percent", "Entity Discount Amount", "Discount"),
    discount_type: pick("Discount Type"),
    estimate_number: pick("Estimate Number"),
    item_name: pick("Item Name", "ItemName"),
    item_desc: pick("Item Desc", "Item Desc", "Description"),
    quantity: pick("Quantity", "Qty"),
    unit_price: pick("Item Price", "Item Price", "Price", "Rate"),
    total_values: pick("Item Total", "Item Total", "Amount"),
    sales_tax_applicable: pick("Item Tax", "Item Tax Amount", "Tax Amount"),
    discount: pick("Discount Amount", "Item Discount", "Discount"),
    uom: pick("Usage unit", "UOM", "Unit"),
  };
}

const inputClass =
  "w-full border border-[var(--color-input-border)] rounded-xl px-3 py-2.5 text-[var(--color-on-surface)] bg-[var(--color-input-bg)] placeholder:text-[var(--color-on-surface-variant)] transition-colors duration-200 focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";

function parseNum(v: string): number {
  const n = Number(String(v).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

function parseDate(v: string): string {
  const s = (v || "").trim();
  if (!s) return new Date().toISOString().slice(0, 10);
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
}

export type CustomerOption = { id: string; name: string };

type ImportResultWithUnlinked = ImportInvoicesResult & { skippedUnlinkedCustomerNames?: string[] };

export function InvoiceImportPage({
  companyId,
  customers = [],
}: {
  companyId: string;
  customers?: CustomerOption[];
}) {
  const [step, setStep] = useState<"upload" | "mapping" | "map_customers" | "preview">("upload");
  const [parseError, setParseError] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<InvoiceColumnMapping>({} as InvoiceColumnMapping);
  const [customerMapping, setCustomerMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importedCount, setImportedCount] = useState(0);
  const [result, setResult] = useState<ImportResultWithUnlinked | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const cancelRequestedRef = useRef(false);
  const barHandlersRef = useRef<{
    reset: () => void;
    goToMapCustomers: () => void;
    goToPreview: () => void;
    handleImport: () => void;
    handleCancelImport: () => void;
  } | null>(null);

  const processFile = useCallback((file: File) => {
    setParseError(null);
    setResult(null);
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setParseError("Please select a CSV file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const parsed = Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: true,
      });
      if (parsed.errors.length > 0) {
        setParseError(parsed.errors[0].message ?? "Invalid CSV.");
        return;
      }
      const data = parsed.data as Record<string, string>[];
      if (!data.length) {
        setParseError("CSV has no data rows.");
        return;
      }
      const first = data[0];
      const cols = Object.keys(first);
      if (cols.length === 0 || cols.every((c) => !c.trim())) {
        setParseError("CSV has no valid headers.");
        return;
      }
      const limited = data.length > MAX_ROWS ? data.slice(0, MAX_ROWS) : data;
      setHeaders(cols);
      setRows(limited);
      setMapping(buildDefaultMapping(cols));
      setStep("mapping");
    };
    reader.readAsText(file, "UTF-8");
  }, []);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    processFile(file);
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    processFile(file);
  }, [processFile]);

  const grouped = useMemo(() => {
    const col = mapping.invoice_identifier;
    if (!col) return [];
    const groups = new Map<string, Record<string, string>[]>();
    for (const row of rows) {
      const key = (row[col] ?? "").trim() || "__blank__";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(row);
    }
    return Array.from(groups.entries()).map(([key, groupRows]) => ({
      invoiceKey: key === "__blank__" ? "" : key,
      rows: groupRows,
    }));
  }, [rows, mapping.invoice_identifier]);

  const mappedInvoices: MappedInvoice[] = useMemo(() => {
    const out: MappedInvoice[] = [];
    const g = (row: Record<string, string>, k: InvoiceMappingKey) => {
      const col = mapping[k];
      return (col && row[col] ? String(row[col]).trim() : "") as string;
    };
    for (const { invoiceKey, rows: groupRows } of grouped) {
      if (!invoiceKey || groupRows.length === 0) continue;
      const first = groupRows[0]!;
      const totalAmount = parseNum(g(first, "total_amount"));
      const subTotal = parseNum(g(first, "total_tax"));
      let totalTax = totalAmount - subTotal;
      if (totalTax < 0) totalTax = 0;
      const discountTypeRaw = (g(first, "discount_type") || "").toLowerCase();
      const discountType = discountTypeRaw === "percentage" ? "percentage" : "amount";
      const items: MappedInvoiceItem[] = groupRows
        .map((row) => {
          const qty = parseNum(g(row, "quantity"));
          if (qty <= 0) return null;
          const itemTotal = parseNum(g(row, "total_values"));
          const itemTax = parseNum(g(row, "sales_tax_applicable"));
          const valueExcl = itemTotal - itemTax;
          const name = g(row, "item_name");
          const desc = g(row, "item_desc");
          const product_description = [name, desc].filter(Boolean).join(" — ") || "—";
          return {
            product_description,
            quantity: qty,
            unit_price: parseNum(g(row, "unit_price")),
            value_sales_excluding_st: valueExcl >= 0 ? valueExcl : itemTotal,
            sales_tax_applicable: itemTax,
            discount: parseNum(g(row, "discount")),
            total_values: itemTotal,
            uom: g(row, "uom") || "Nos",
          };
        })
        .filter((x): x is MappedInvoiceItem => x !== null);
      if (items.length === 0) continue;
      out.push({
        customer_name: g(first, "customer_name"),
        invoice_number: g(first, "invoice_number") || invoiceKey,
        invoice_date: parseDate(g(first, "invoice_date")),
        status: g(first, "status") || "Draft",
        notes: g(first, "notes") || null,
        payment_terms: g(first, "payment_terms") || null,
        total_amount: totalAmount,
        total_tax: totalTax >= 0 ? totalTax : 0,
        discount_amount: parseNum(g(first, "discount_amount")),
        discount_type: discountType,
        estimate_number: g(first, "estimate_number") || null,
        items,
      });
    }
    return out;
  }, [grouped, mapping]);

  const mappedWithItems = useMemo(
    () => mappedInvoices.filter((e) => e.items.length > 0),
    [mappedInvoices]
  );

  const distinctCustomerNames = useMemo(() => {
    const set = new Set<string>();
    mappedWithItems.forEach((e) => {
      const n = e.customer_name.trim();
      if (n) set.add(n);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [mappedWithItems]);

  const toImport = useMemo(() => {
    return mappedWithItems
      .filter((e) => {
        const id = customerMapping[e.customer_name.trim()];
        return id != null && id !== "";
      })
      .map((e) => ({
        ...e,
        customer_id: customerMapping[e.customer_name.trim()]!,
      }));
  }, [mappedWithItems, customerMapping]);

  const defaultCustomerMapping = useMemo(() => {
    const out: Record<string, string> = {};
    const lowerCustomers = new Map(customers.map((c) => [c.name.trim().toLowerCase(), c.id]));
    distinctCustomerNames.forEach((name) => {
      const id = lowerCustomers.get(name.toLowerCase()) ?? "";
      out[name] = id;
    });
    return out;
  }, [distinctCustomerNames, customers]);

  const linkedCustomerCount = useMemo(() => {
    return distinctCustomerNames.filter((name) => {
      const id = customerMapping[name];
      return id != null && id !== "";
    }).length;
  }, [distinctCustomerNames, customerMapping]);

  const unlinkedCustomerNames = useMemo(() => {
    return distinctCustomerNames.filter((name) => {
      const id = customerMapping[name];
      return id == null || id === "";
    });
  }, [distinctCustomerNames, customerMapping]);

  const BATCH_SIZE = 80;

  const goToMapCustomers = () => {
    setCustomerMapping((prev) => {
      const next = { ...defaultCustomerMapping };
      distinctCustomerNames.forEach((name) => {
        if (prev[name] !== undefined) next[name] = prev[name];
      });
      return next;
    });
    setStep("map_customers");
  };

  const goToPreview = () => setStep("preview");

  const handleImport = async () => {
    setImporting(true);
    setResult(null);
    setImportProgress(0);
    setImportedCount(0);
    cancelRequestedRef.current = false;
    startGlobalProcessing("Importing invoices…");
    const chunks: (MappedInvoice & { customer_id: string })[][] = [];
    for (let i = 0; i < toImport.length; i += BATCH_SIZE) {
      chunks.push(toImport.slice(i, i + BATCH_SIZE));
    }
    const totalToImport = toImport.length;
    let totalImported = 0;
    const allSkippedNoCustomer: string[] = [];
    const allSkippedDuplicateNumber: string[] = [];
    const allErrors: string[] = [];
    try {
      for (let i = 0; i < chunks.length; i++) {
        if (cancelRequestedRef.current) {
          endGlobalProcessing({ success: "Import cancelled." });
          break;
        }
        const res = await importInvoicesFromCsv(companyId, chunks[i]!);
        if (res.error) {
          setResult(res);
          endGlobalProcessing({ error: res.error });
          return;
        }
        totalImported += res.imported;
        allSkippedNoCustomer.push(...res.skippedNoCustomer);
        allSkippedDuplicateNumber.push(...res.skippedDuplicateNumber);
        allErrors.push(...res.errors);
        setImportedCount(totalImported);
        setImportProgress(totalToImport > 0 ? Math.round((totalImported / totalToImport) * 100) : 100);
      }
      if (!cancelRequestedRef.current) {
        endGlobalProcessing({
          success: `Imported ${totalImported} invoice${totalImported !== 1 ? "s" : ""}.`,
        });
      }
      setResult({
        imported: totalImported,
        skipped: unlinkedCustomerNames.length + allSkippedNoCustomer.length + allSkippedDuplicateNumber.length,
        skippedNoCustomer: allSkippedNoCustomer,
        skippedDuplicateNumber: allSkippedDuplicateNumber,
        errors: allErrors,
        skippedUnlinkedCustomerNames: unlinkedCustomerNames,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Import failed.";
      endGlobalProcessing({ error: msg });
      setResult({
        error: msg,
        imported: 0,
        skipped: 0,
        skippedNoCustomer: [],
        skippedDuplicateNumber: [],
        errors: [],
      });
    } finally {
      setImporting(false);
      setImportProgress(0);
    }
  };

  const handleCancelImport = () => {
    cancelRequestedRef.current = true;
  };

  const reset = () => {
    setStep("upload");
    setParseError(null);
    setHeaders([]);
    setRows([]);
    setMapping({} as InvoiceColumnMapping);
    setCustomerMapping({});
    setResult(null);
    setIsDragging(false);
    setImportProgress(0);
    setImportedCount(0);
  };

  barHandlersRef.current = {
    reset,
    goToMapCustomers,
    goToPreview,
    handleImport,
    handleCancelImport,
  };

  const stepTitle =
    step === "upload"
      ? "Import from CSV"
      : step === "mapping"
        ? "Map columns"
        : step === "map_customers"
          ? "Link customers"
          : "Preview & import";

  const { setBarState } = useInvoicesTopBar();

  useEffect(() => {
    const h = barHandlersRef.current;
    setBarState({
      title: stepTitle,
      titleSuffix: null,
      rightSlot:
        step === "mapping" && h ? (
          <>
            <button type="button" onClick={h.reset} className="btn btn-secondary btn-sm">
              Start over
            </button>
            <button type="button" onClick={h.goToMapCustomers} className="btn btn-primary btn-sm">
              Next: Link customers
            </button>
          </>
        ) : step === "map_customers" && h ? (
          <>
            <button
              type="button"
              onClick={() => setStep("mapping")}
              className="btn btn-secondary btn-sm"
            >
              Back
            </button>
            <button type="button" onClick={h.goToPreview} className="btn btn-primary btn-sm">
              Preview & import
            </button>
          </>
        ) : step === "preview" && h ? (
          <>
            <button
              type="button"
              onClick={() => setStep("map_customers")}
              className="btn btn-secondary btn-sm"
              disabled={importing}
            >
              Back
            </button>
            {importing ? (
              <button
                type="button"
                onClick={h.handleCancelImport}
                className="btn btn-secondary btn-sm inline-flex items-center gap-2"
                aria-label="Cancel import"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
            ) : (
              <button
                type="button"
                onClick={h.handleImport}
                disabled={toImport.length === 0}
                className="btn btn-primary btn-sm inline-flex items-center gap-2"
              >
                Import
              </button>
            )}
          </>
        ) : undefined,
    });
    return () => setBarState({ title: null, titleSuffix: null, rightSlot: null });
  }, [step, stepTitle, importing, toImport.length, setBarState]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="flex min-h-0 flex-1 flex-col overflow-auto">
        <p className="flex-shrink-0 px-4 py-2 text-sm text-[var(--color-on-surface-variant)]">
          {step === "upload" &&
            "Upload a CSV file (e.g. Zoho Invoice export). You will map columns, then link each CSV customer to one in your database, then import."}
          {step === "mapping" &&
            "Map CSV columns to invoice and line item fields. Invoice identifier is used to group rows into one invoice per group."}
          {step === "map_customers" &&
            (distinctCustomerNames.length > 0
              ? `${linkedCustomerCount} of ${distinctCustomerNames.length} customers linked. Link each CSV name to a customer or choose "Don't import" to skip those invoices.`
              : "Link each customer name from the CSV to a customer in your database. Invoices for Don't import will be skipped.")}
          {step === "preview" &&
            `${toImport.length} invoice${toImport.length !== 1 ? "s" : ""} will be imported. ${mappedWithItems.length - toImport.length} skipped (not linked in previous step).`}
        </p>

        <section className="flex min-h-0 flex-1 flex-col w-full px-4 pb-6">
          <div className="card flex min-h-0 flex-1 flex-col p-6 w-full">
            {step === "upload" && (
              <div className="space-y-4">
                <label
                  className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-12 transition-colors ${
                    isDragging
                      ? "border-[var(--color-primary)] bg-[var(--color-primary-container)]/30"
                      : "border-[var(--color-outline)] bg-[var(--color-surface-variant)]/30 hover:border-[var(--color-primary)] hover:bg-[var(--color-surface-variant)]/50"
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <Upload className="h-10 w-10 text-[var(--color-on-surface-variant)]" />
                  <span className="text-sm font-medium text-[var(--color-on-surface)]">
                    {isDragging ? "Drop CSV file" : "Choose or drop CSV file"}
                  </span>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFile}
                    className="hidden"
                    aria-label="Select CSV file"
                  />
                </label>
                {parseError && (
                  <p className="text-sm text-[var(--color-error)]">{parseError}</p>
                )}
              </div>
            )}

            {step === "mapping" && (
              <div className="flex min-h-0 flex-1 flex-col gap-4">
                <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-[var(--color-outline)]">
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-[var(--color-surface-variant)]">
                      <tr>
                        <th className="p-3 font-medium text-[var(--color-on-surface)]">Field</th>
                        <th className="p-3 font-medium text-[var(--color-on-surface)]">Level</th>
                        <th className="p-3 font-medium text-[var(--color-on-surface)]">CSV column</th>
                      </tr>
                    </thead>
                    <tbody>
                      {INVOICE_FIELDS.map(({ key, label, level }) => (
                        <tr key={key} className="border-t border-[var(--color-divider)]">
                          <td className="p-3 text-[var(--color-on-surface)]">{label}</td>
                          <td className="p-3 text-[var(--color-on-surface-variant)]">{level}</td>
                          <td className="p-3">
                            <select
                              value={mapping[key] ?? ""}
                              onChange={(e) => setMapping((prev) => ({ ...prev, [key]: e.target.value }))}
                              className={inputClass + " min-w-[160px]"}
                              aria-label={`Map ${label}`}
                            >
                              <option value="">Don&apos;t map</option>
                              {headers.map((h) => (
                                <option key={h} value={h}>
                                  {h}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                      {ITEM_FIELDS.map(({ key, label, level }) => (
                        <tr key={key} className="border-t border-[var(--color-divider)]">
                          <td className="p-3 text-[var(--color-on-surface)]">{label}</td>
                          <td className="p-3 text-[var(--color-on-surface-variant)]">{level}</td>
                          <td className="p-3">
                            <select
                              value={mapping[key] ?? ""}
                              onChange={(e) => setMapping((prev) => ({ ...prev, [key]: e.target.value }))}
                              className={inputClass + " min-w-[160px]"}
                              aria-label={`Map ${label}`}
                            >
                              <option value="">Don&apos;t map</option>
                              {headers.map((h) => (
                                <option key={h} value={h}>
                                  {h}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-sm text-[var(--color-on-surface-variant)]">
                  {rows.length} row{rows.length !== 1 ? "s" : ""}
                  {rows.length >= MAX_ROWS && ` (max ${MAX_ROWS})`} — {grouped.length} invoice group
                  {grouped.length !== 1 ? "s" : ""} (grouped by invoice identifier).
                </p>
              </div>
            )}

            {step === "map_customers" && (
              <div className="flex min-h-0 flex-1 flex-col gap-4">
                {distinctCustomerNames.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-[var(--color-on-surface-variant)]">
                      <span>Linking progress</span>
                      <span>
                        {linkedCustomerCount} / {distinctCustomerNames.length} linked
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-surface-variant)]">
                      <div
                        className="h-full rounded-full bg-[var(--color-primary)] transition-[width] duration-300"
                        style={{
                          width: `${distinctCustomerNames.length ? (linkedCustomerCount / distinctCustomerNames.length) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
                <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-[var(--color-outline)]">
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-[var(--color-surface-variant)]">
                      <tr>
                        <th className="p-3 font-medium text-[var(--color-on-surface)]">Customer name (from CSV)</th>
                        <th className="p-3 font-medium text-[var(--color-on-surface)]">Link to customer</th>
                      </tr>
                    </thead>
                    <tbody>
                      {distinctCustomerNames.map((name) => (
                        <tr key={name} className="border-t border-[var(--color-divider)]">
                          <td className="p-3 text-[var(--color-on-surface)]">{name || "—"}</td>
                          <td className="p-3">
                            <select
                              value={customerMapping[name] ?? ""}
                              onChange={(e) =>
                                setCustomerMapping((prev) => ({
                                  ...prev,
                                  [name]: e.target.value,
                                }))
                              }
                              className={inputClass + " min-w-[200px]"}
                              aria-label={`Link ${name} to customer`}
                            >
                              <option value="">Don&apos;t import</option>
                              {customers.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {distinctCustomerNames.length === 0 ? (
                  <p className="text-sm text-[var(--color-on-surface-variant)]">
                    No customer names found. Check your column mapping for &quot;Customer Name&quot;.
                  </p>
                ) : (
                  <p className="text-sm text-[var(--color-on-surface-variant)]">
                    {distinctCustomerNames.length} customer name{distinctCustomerNames.length !== 1 ? "s" : ""} from CSV.
                    Link each to a customer in your database or choose &quot;Don&apos;t import&quot; to skip those invoices.
                  </p>
                )}
              </div>
            )}

            {step === "preview" && (
              <div className="flex min-h-0 flex-1 flex-col gap-4">
                {unlinkedCustomerNames.length > 0 && (
                  <div className="rounded-xl border border-[var(--color-outline)] bg-[var(--color-surface-variant)] p-3">
                    <p className="mb-2 text-sm font-medium text-[var(--color-on-surface)]">
                      Customers not linked (invoices will be skipped)
                    </p>
                    <ul className="list-inside list-disc text-sm text-[var(--color-on-surface-variant)]">
                      {unlinkedCustomerNames.map((name) => (
                        <li key={name}>{name || "—"}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-[var(--color-outline)]">
                  <table className="w-full min-w-[600px] text-left text-sm">
                    <thead className="sticky top-0 z-10 bg-[var(--color-surface-variant)] shadow-[0_1px_0_0_var(--color-divider)]">
                      <tr>
                        <th className="p-3 font-medium text-[var(--color-on-surface)]">Invoice number</th>
                        <th className="p-3 font-medium text-[var(--color-on-surface)]">Customer name</th>
                        <th className="p-3 font-medium text-[var(--color-on-surface)]">Line items</th>
                        <th className="p-3 font-medium text-[var(--color-on-surface)]">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {toImport.map((inv, i) => (
                        <tr key={i} className="border-t border-[var(--color-divider)]">
                          <td className="p-3 text-[var(--color-on-surface)]">{inv.invoice_number || "—"}</td>
                          <td className="p-3 text-[var(--color-on-surface-variant)]">{inv.customer_name || "—"}</td>
                          <td className="p-3 text-[var(--color-on-surface-variant)]">{inv.items.length}</td>
                          <td className="p-3 text-[var(--color-on-surface-variant)]">
                            {Number(inv.total_amount).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {result?.error && (
                  <p className="text-sm text-[var(--color-error)]">{result.error}</p>
                )}
                {result && !result.error && (
                  <div className="rounded-xl border border-[var(--color-outline)] bg-[var(--color-surface-variant)]/30 p-4 space-y-3">
                    <h3 className="text-sm font-semibold text-[var(--color-on-surface)]">Import summary</h3>
                    <div className="grid gap-2 text-sm">
                      <p className="text-[var(--color-on-surface)]">
                        <span className="font-medium">{result.imported}</span> invoice
                        {result.imported !== 1 ? "s" : ""} linked to customers and imported.
                      </p>
                      <p className="text-[var(--color-on-surface-variant)]">
                        <span className="font-medium">{result.skipped}</span> left (not imported):
                        {result.skippedUnlinkedCustomerNames?.length ? (
                          <span> {result.skippedUnlinkedCustomerNames.length} customer(s) not linked</span>
                        ) : null}
                        {(result.skippedUnlinkedCustomerNames?.length ?? 0) > 0 &&
                        (result.skippedNoCustomer.length > 0 || result.skippedDuplicateNumber.length > 0)
                          ? ", "
                          : null}
                        {result.skippedNoCustomer.length > 0 && (
                          <span> {result.skippedNoCustomer.length} no matching customer</span>
                        )}
                        {result.skippedNoCustomer.length > 0 && result.skippedDuplicateNumber.length > 0 && ", "}
                        {result.skippedDuplicateNumber.length > 0 && (
                          <span>{result.skippedDuplicateNumber.length} duplicate invoice number</span>
                        )}
                        {result.skipped === 0 && " None."}
                      </p>
                    </div>
                    <Link
                      href="/dashboard/sales"
                      className="btn btn-primary btn-sm inline-flex items-center gap-2"
                    >
                      Go to invoices
                    </Link>
                  </div>
                )}
                {result?.skippedUnlinkedCustomerNames?.length ? (
                  <p className="text-sm text-[var(--color-on-surface-variant)]">
                    Customers not linked (skipped): {result.skippedUnlinkedCustomerNames.join(", ")}
                  </p>
                ) : null}
                {result?.skippedNoCustomer?.length ? (
                  <p className="text-sm text-[var(--color-on-surface-variant)]">
                    Skipped (no matching customer): {result.skippedNoCustomer.join(", ")}
                  </p>
                ) : null}
                {result?.skippedDuplicateNumber?.length ? (
                  <p className="text-sm text-[var(--color-on-surface-variant)]">
                    Skipped (duplicate number): {result.skippedDuplicateNumber.join(", ")}
                  </p>
                ) : null}
                {result?.errors?.length ? (
                  <ul className="text-sm text-[var(--color-error)]">
                    {result.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                ) : null}
                {importing && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-[var(--color-on-surface-variant)]">
                      <span>Importing…</span>
                      <span>
                        {importedCount} / {toImport.length} invoices imported ({importProgress}%)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-surface-variant)]">
                      <div
                        className="h-full rounded-full bg-[var(--color-primary)] transition-[width] duration-300"
                        style={{ width: `${importProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
