"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Papa from "papaparse";
import { Upload, Loader2, ChevronLeft } from "lucide-react";
import { importItemsFromCsv, type ImportItemsResult } from "./actions";
import { startGlobalProcessing, endGlobalProcessing } from "@/components/GlobalProcessing";
import { showMessage } from "@/components/MessageBar";

const MAX_ROWS = 2000;

const DB_FIELDS = [
  { key: "name", label: "Name (required)" },
  { key: "description", label: "Description" },
  { key: "reference", label: "Reference / SKU" },
  { key: "hs_code", label: "HS Code" },
  { key: "unit_rate", label: "Unit rate" },
  { key: "uom", label: "UOM (e.g. Nos, KG)" },
  { key: "rate_label", label: "Tax rate label (e.g. 18%)" },
  { key: "sale_type", label: "Sale type" },
] as const;

export type ColumnMapping = Record<string, string | string[]>;

function buildDefaultMapping(headers: string[]): ColumnMapping {
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
    name: pick("Name", "Item Name", "Product", "ItemName") || headers[0] || "",
    description: pick("Description", "Desc", "Product Description"),
    reference: pick("Reference", "SKU", "Code", "Item #", "ItemNumber"),
    hs_code: pick("HS Code", "HSCode", "HsCode"),
    unit_rate: pick("Unit Rate", "Price", "Unit Price", "UnitRate"),
    uom: pick("UOM", "Unit", "Usage unit"),
    rate_label: pick("Tax Rate", "Rate", "Rate Label"),
    sale_type: pick("Sale Type", "SaleType"),
  };
}

const inputClass =
  "w-full border border-[var(--color-input-border)] rounded-xl px-3 py-2.5 text-[var(--color-on-surface)] bg-[var(--color-input-bg)] placeholder:text-[var(--color-on-surface-variant)] transition-colors duration-200 focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";

function itemsListQs(searchParams: URLSearchParams) {
  const p = new URLSearchParams();
  p.set("page", searchParams.get("page") ?? "1");
  p.set("perPage", searchParams.get("perPage") ?? "100");
  const q = searchParams.get("q")?.trim();
  if (q) p.set("q", q);
  return p.toString();
}

export function ItemImportPage({ companyId }: { companyId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const listQs = itemsListQs(searchParams);
  const listHref = listQs ? `/dashboard/items?${listQs}` : "/dashboard/items";
  const [step, setStep] = useState<"upload" | "mapping" | "preview">("upload");
  const [parseError, setParseError] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [result, setResult] = useState<ImportItemsResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const BATCH_SIZE = 100;

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

  const applyMapping = (row: Record<string, string>): Record<string, string> => {
    const out: Record<string, string> = {};
    for (const { key } of DB_FIELDS) {
      const colOrCols = mapping[key];
      if (typeof colOrCols === "string" && colOrCols && row[colOrCols] != null) {
        out[key] = String(row[colOrCols]).trim();
      } else {
        out[key] = "";
      }
    }
    return out;
  };

  const mappedRows = rows.map(applyMapping);
  const validRows = mappedRows.filter((r) => r.name.length > 0);

  function countRowsWithData(columnKey: string, columnName?: string): number {
    const col = columnName ?? (mapping[columnKey] as string);
    if (!col) return 0;
    return rows.filter((row) => (row[col] ?? "").trim().length > 0).length;
  }

  const goToPreview = () => setStep("preview");

  const handleImport = async () => {
    setImporting(true);
    setResult(null);
    setImportProgress(0);
    startGlobalProcessing("Importing items…");
    const chunks: Record<string, string>[][] = [];
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      chunks.push(rows.slice(i, i + BATCH_SIZE));
    }
    let totalImported = 0;
    let totalSkipped = 0;
    try {
      for (let i = 0; i < chunks.length; i++) {
        const res = await importItemsFromCsv(companyId, chunks[i]!, mapping);
        if (res.error) {
          setResult(res);
          endGlobalProcessing({ error: res.error });
          return;
        }
        totalImported += res.imported;
        totalSkipped += res.skipped;
        setImportProgress(Math.round(((i + 1) / chunks.length) * 100));
      }
      endGlobalProcessing({ success: `Imported ${totalImported} items.` });
      if (totalSkipped > 0) {
        showMessage(`Skipped ${totalSkipped} rows (no name).`, "info");
      }
      router.push(listHref);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Import failed.";
      endGlobalProcessing({ error: msg });
      setResult({
        error: msg,
        imported: 0,
        skipped: 0,
        errors: [],
      });
    } finally {
      setImporting(false);
      setImportProgress(0);
    }
  };

  const reset = () => {
    setStep("upload");
    setParseError(null);
    setHeaders([]);
    setRows([]);
    setMapping({});
    setResult(null);
    setIsDragging(false);
    setImportProgress(0);
  };

  const stepTitle =
    step === "upload"
      ? "Import from CSV"
      : step === "mapping"
        ? "Map columns"
        : "Preview & import";

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="flex flex-shrink-0 items-center justify-between gap-4 border-b border-[var(--color-divider)] px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href={listHref}
            className="btn btn-secondary btn-icon shrink-0"
            aria-label="Back to items"
            title="Back to items"
          >
            <ChevronLeft className="size-4" />
          </Link>
          <h2 className="truncate text-lg font-semibold text-[var(--color-on-surface)]">
            {stepTitle}
          </h2>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {step === "mapping" && (
            <>
              <button type="button" onClick={reset} className="btn btn-secondary btn-sm">
                Start over
              </button>
              <button type="button" onClick={goToPreview} className="btn btn-primary btn-sm">
                Preview & import
              </button>
            </>
          )}
          {step === "preview" && (
            <>
              <button
                type="button"
                onClick={() => setStep("mapping")}
                className="btn btn-secondary btn-sm"
                disabled={importing}
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={importing || validRows.length === 0}
                className="btn btn-primary btn-sm inline-flex items-center gap-2"
              >
                {importing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Importing…
                  </>
                ) : (
                  "Import"
                )}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-auto">
        <p className="flex-shrink-0 px-4 py-2 text-sm text-[var(--color-on-surface-variant)]">
          {step === "upload" && "Upload a CSV file. You will map columns to item fields in the next step."}
          {step === "mapping" && "Map each item field to a CSV column. Rows without a name are skipped. UOM and rate_label must match existing values (e.g. Nos, 18%)."}
          {step === "preview" && `${validRows.length} item${validRows.length !== 1 ? "s" : ""} will be imported. ${rows.length - validRows.length} row(s) skipped (no name).`}
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
                        <th className="p-3 font-medium text-[var(--color-on-surface)]">
                          Item field
                        </th>
                        <th className="p-3 font-medium text-[var(--color-on-surface)]">
                          CSV column
                        </th>
                        <th className="p-3 font-medium text-[var(--color-on-surface)] text-right whitespace-nowrap">
                          Rows with data
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {DB_FIELDS.map(({ key, label }) => {
                        const mappedCol = (mapping[key] ?? "") as string;
                        const count = countRowsWithData(key, mappedCol);
                        return (
                          <tr key={key} className="border-t border-[var(--color-divider)]">
                            <td className="p-3 text-[var(--color-on-surface)]">{label}</td>
                            <td className="p-3">
                              <select
                                value={mappedCol ?? ""}
                                onChange={(e) =>
                                  setMapping((prev) => ({
                                    ...prev,
                                    [key]: e.target.value,
                                  }))
                                }
                                className={inputClass + " min-w-[140px]"}
                                aria-label={`Map ${label}`}
                              >
                                <option value="">Don't import</option>
                                {headers.map((h) => (
                                  <option key={h} value={h}>
                                    {h}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="p-3 text-right text-[var(--color-on-surface-variant)] whitespace-nowrap">
                              {mappedCol ? (
                                <span title={`${count} of ${rows.length} rows have this field`}>
                                  {count.toLocaleString()} / {rows.length.toLocaleString()}
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-sm text-[var(--color-on-surface-variant)]">
                  {rows.length} row{rows.length !== 1 ? "s" : ""}
                  {rows.length >= MAX_ROWS && " (max " + MAX_ROWS + ")"}
                </p>
              </div>
            )}

            {step === "preview" && (
              <div className="flex min-h-0 flex-1 flex-col gap-4">
                <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-[var(--color-outline)]">
                  <table className="w-full min-w-[800px] text-left text-sm table-fixed">
                    <thead className="sticky top-0 z-10 bg-[var(--color-surface-variant)] shadow-[0_1px_0_0_var(--color-divider)]">
                      <tr>
                        <th className="w-[20%] p-3 font-medium text-[var(--color-on-surface)]">Name</th>
                        <th className="w-[15%] p-3 font-medium text-[var(--color-on-surface)]">Reference</th>
                        <th className="w-[10%] p-3 font-medium text-[var(--color-on-surface)]">Unit rate</th>
                        <th className="w-[10%] p-3 font-medium text-[var(--color-on-surface)]">UOM</th>
                        <th className="w-[15%] p-3 font-medium text-[var(--color-on-surface)]">HS Code</th>
                        <th className="w-[30%] p-3 font-medium text-[var(--color-on-surface)]">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {validRows.map((r, i) => (
                        <tr key={i} className="border-t border-[var(--color-divider)]">
                          <td className="p-3 text-[var(--color-on-surface)] break-words align-top">
                            {r.name || "—"}
                          </td>
                          <td className="p-3 text-[var(--color-on-surface-variant)] break-words align-top">
                            {r.reference || "—"}
                          </td>
                          <td className="p-3 text-[var(--color-on-surface-variant)] break-words align-top tabular-nums">
                            {r.unit_rate || "—"}
                          </td>
                          <td className="p-3 text-[var(--color-on-surface-variant)] break-words align-top">
                            {r.uom || "—"}
                          </td>
                          <td className="p-3 text-[var(--color-on-surface-variant)] break-words align-top">
                            {r.hs_code || "—"}
                          </td>
                          <td className="p-3 text-[var(--color-on-surface-variant)] break-words align-top">
                            {r.description || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {result?.error && (
                  <p className="text-sm text-[var(--color-error)]">{result.error}</p>
                )}
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
                      <span>{importProgress}%</span>
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
