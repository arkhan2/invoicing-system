"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { Upload, Loader2, ChevronLeft } from "lucide-react";
import { importCustomersFromCsv, type ImportCustomersResult } from "./actions";
import { startGlobalProcessing, endGlobalProcessing } from "@/components/GlobalProcessing";
import { showMessage } from "@/components/MessageBar";

const MAX_ROWS = 2000;

const DB_FIELDS = [
  { key: "name", label: "Name (required)" },
  { key: "contact_person_name", label: "Contact person name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "address", label: "Address" },
  { key: "country", label: "Country (default Pakistan if empty)" },
  { key: "province", label: "Province / State" },
  { key: "city", label: "City" },
  { key: "ntn_cnic", label: "NTN / CNIC" },
  { key: "registration_type", label: "Registration type" },
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
  const ntnFirst = pick("NTN", "ntn_cnic", "NTN/CNIC", "Tax ID", "Tax Number");
  return {
    name: pick("Display Name", "Company Name", "Contact Name", "Name") || headers[0] || "",
    contact_person_name: pick("Contact Name", "Billing Attention", "Display Name", "Primary Contact"),
    email: pick("EmailID", "Email", "email"),
    phone: pick("Phone", "Billing Phone", "MobilePhone", "phone"),
    address: pick("Billing Address", "Address", "address"),
    country: pick("Billing Country", "Country", "country"),
    province: pick("Billing State", "Billing Province", "State", "Province", "province", "Billing County"),
    city: pick("Billing City", "City", "city"),
    ntn_cnic: ntnFirst ? [ntnFirst] : [],
    registration_type: pick("Registration Type", "registration_type"),
  };
}

const inputClass =
  "w-full border border-[var(--color-input-border)] rounded-xl px-3 py-2.5 text-[var(--color-on-surface)] bg-[var(--color-input-bg)] placeholder:text-[var(--color-on-surface-variant)] transition-colors duration-200 focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";

export function CustomerImportPage({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [step, setStep] = useState<"upload" | "mapping" | "preview">("upload");
  const [parseError, setParseError] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [extractNtn, setExtractNtn] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [result, setResult] = useState<ImportCustomersResult | null>(null);
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
      if (key === "ntn_cnic" && Array.isArray(colOrCols)) {
        const combined = colOrCols
          .map((c) => (row[c] ?? "").trim())
          .filter(Boolean)
          .join(" ");
        out[key] = combined;
      } else if (typeof colOrCols === "string" && colOrCols && row[colOrCols] != null) {
        out[key] = String(row[colOrCols]).trim();
      } else {
        out[key] = "";
      }
    }
    return out;
  };

  const mappedRows = rows.map(applyMapping);
  const validRows = mappedRows.filter((r) => r.name.length > 0);

  function countRowsWithData(columnKey: string, columnNameOrNames?: string | string[]): number {
    const cols = columnNameOrNames ?? mapping[columnKey];
    if (cols == null) return 0;
    if (Array.isArray(cols)) {
      if (cols.length === 0) return 0;
      return rows.filter((row) => cols.some((c) => (row[c] ?? "").trim().length > 0)).length;
    }
    return rows.filter((row) => (row[cols] ?? "").trim().length > 0).length;
  }

  const goToPreview = () => setStep("preview");

  const handleImport = async () => {
    setImporting(true);
    setResult(null);
    setImportProgress(0);
    startGlobalProcessing("Importing customers…");
    const chunks: Record<string, string>[][] = [];
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      chunks.push(rows.slice(i, i + BATCH_SIZE));
    }
    let totalImported = 0;
    let totalSkipped = 0;
    try {
      for (let i = 0; i < chunks.length; i++) {
        const res = await importCustomersFromCsv(companyId, chunks[i]!, mapping, { extractNtn });
        if (res.error) {
          setResult(res);
          endGlobalProcessing({ error: res.error });
          return;
        }
        totalImported += res.imported;
        totalSkipped += res.skipped;
        setImportProgress(Math.round(((i + 1) / chunks.length) * 100));
      }
      endGlobalProcessing({ success: `Imported ${totalImported} customers.` });
      if (totalSkipped > 0) {
        showMessage(`Skipped ${totalSkipped} rows (no name).`, "info");
      }
      router.push("/dashboard/customers");
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
    setExtractNtn(true);
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
      {/* Top bar: back + title + actions (same pattern as estimate edit) */}
      <div className="flex flex-shrink-0 items-center justify-between gap-4 border-b border-[var(--color-divider)] px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/dashboard/customers"
            className="btn btn-secondary btn-icon shrink-0"
            aria-label="Back to customers"
            title="Back to customers"
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
              <button
                type="button"
                onClick={reset}
                className="btn btn-secondary btn-sm"
              >
                Start over
              </button>
              <button
                type="button"
                onClick={goToPreview}
                className="btn btn-primary btn-sm"
              >
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
          {step === "upload" && "Upload a CSV file (e.g. from Zoho). You will map columns to customer fields in the next step."}
          {step === "mapping" && "Map each customer field to a CSV column. Rows without a name are skipped."}
          {step === "preview" && `${validRows.length} customer${validRows.length !== 1 ? "s" : ""} will be imported. ${rows.length - validRows.length} row(s) skipped (no name).`}
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
                        Customer field
                      </th>
                      <th className="p-3 font-medium text-[var(--color-on-surface)]">
                        CSV column
                      </th>
                      <th className="p-3 font-medium text-[var(--color-on-surface)] whitespace-nowrap">
                        Options
                      </th>
                      <th className="p-3 font-medium text-[var(--color-on-surface)] text-right whitespace-nowrap">
                        Rows with data
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {DB_FIELDS.map(({ key, label }) => {
                      const isNtnField = key === "ntn_cnic";
                      const ntnArr: string[] = Array.isArray(mapping.ntn_cnic)
                        ? mapping.ntn_cnic
                        : mapping.ntn_cnic
                          ? [mapping.ntn_cnic]
                          : [];
                      const mappedCol = isNtnField ? null : (mapping[key] ?? "") as string;
                      const count = isNtnField
                        ? countRowsWithData(key, ntnArr)
                        : countRowsWithData(key, (mapping[key] ?? "") as string);
                      return (
                        <tr
                          key={key}
                          className="border-t border-[var(--color-divider)]"
                        >
                          <td className="p-3 text-[var(--color-on-surface)]">
                            {label}
                          </td>
                          <td className="p-3">
                            {isNtnField ? (
                              <div className="flex flex-wrap items-center gap-2">
                                {(ntnArr.length ? ntnArr : [""]).map((col, idx) => (
                                  <div key={idx} className="flex items-center gap-1">
                                    <select
                                      value={col}
                                      onChange={(e) => {
                                        const v = e.target.value;
                                        setMapping((prev) => {
                                          const arr = (prev.ntn_cnic ?? [""]) as string[];
                                          const next = [...arr];
                                          next[idx] = v;
                                          return { ...prev, ntn_cnic: next.filter(Boolean).length ? next : [""] };
                                        });
                                      }}
                                      className={inputClass + " min-w-[120px]"}
                                      aria-label={`NTN column ${idx + 1}`}
                                    >
                                      <option value="">Don't import</option>
                                      {headers.map((h) => (
                                        <option key={h} value={h}>
                                          {h}
                                        </option>
                                      ))}
                                    </select>
                                    {(ntnArr.length ? ntnArr : [""]).length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setMapping((prev) => {
                                            const arr = [...((prev.ntn_cnic ?? [""]) as string[])];
                                            arr.splice(idx, 1);
                                            return { ...prev, ntn_cnic: arr.length ? arr : [""] };
                                          })
                                        }
                                        className="rounded p-1 text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-variant)]"
                                        aria-label="Remove column"
                                      >
                                        ×
                                      </button>
                                    )}
                                  </div>
                                ))}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setMapping((prev) => ({
                                      ...prev,
                                      ntn_cnic: [...((prev.ntn_cnic ?? [""]) as string[]), ""],
                                    }))
                                  }
                                  className="rounded border border-[var(--color-outline)] px-2 py-1.5 text-xs font-medium text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-variant)]"
                                >
                                  + Add column
                                </button>
                              </div>
                            ) : (
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
                            )}
                          </td>
                          <td className="p-3 text-[var(--color-on-surface-variant)]">
                            {isNtnField ? (
                              <label className="flex cursor-pointer items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={extractNtn}
                                  onChange={(e) => setExtractNtn(e.target.checked)}
                                  className="rounded border-[var(--color-outline)]"
                                  aria-label="Extract NTN from text"
                                />
                                <span>Extract NTN (format 2469357 or 2469357-0)</span>
                              </label>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="p-3 text-right text-[var(--color-on-surface-variant)] whitespace-nowrap">
                            {(isNtnField ? ntnArr.some(Boolean) : mappedCol) ? (
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
                      <th className="w-[12%] p-3 font-medium text-[var(--color-on-surface)]">Name</th>
                      <th className="w-[10%] p-3 font-medium text-[var(--color-on-surface)]">Contact person</th>
                      <th className="w-[12%] p-3 font-medium text-[var(--color-on-surface)]">Email</th>
                      <th className="w-[9%] p-3 font-medium text-[var(--color-on-surface)]">Phone</th>
                      <th className="w-[15%] p-3 font-medium text-[var(--color-on-surface)]">Address</th>
                      <th className="w-[8%] p-3 font-medium text-[var(--color-on-surface)]">Country</th>
                      <th className="w-[8%] p-3 font-medium text-[var(--color-on-surface)]">Province</th>
                      <th className="w-[8%] p-3 font-medium text-[var(--color-on-surface)]">City</th>
                      <th className="w-[8%] p-3 font-medium text-[var(--color-on-surface)]">NTN / CNIC</th>
                      <th className="w-[8%] p-3 font-medium text-[var(--color-on-surface)]">Registration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validRows.map((r, i) => (
                      <tr
                        key={i}
                        className="border-t border-[var(--color-divider)]"
                      >
                        <td className="p-3 text-[var(--color-on-surface)] break-words align-top">
                          {r.name || "—"}
                        </td>
                        <td className="p-3 text-[var(--color-on-surface-variant)] break-words align-top">
                          {r.contact_person_name || "—"}
                        </td>
                        <td className="p-3 text-[var(--color-on-surface-variant)] break-words align-top">
                          {r.email || "—"}
                        </td>
                        <td className="p-3 text-[var(--color-on-surface-variant)] break-words align-top">
                          {r.phone || "—"}
                        </td>
                        <td className="p-3 text-[var(--color-on-surface-variant)] break-words align-top">
                          {r.address || "—"}
                        </td>
                        <td className="p-3 text-[var(--color-on-surface-variant)] break-words align-top">
                          {r.country || "—"}
                        </td>
                        <td className="p-3 text-[var(--color-on-surface-variant)] break-words align-top">
                          {r.province || "—"}
                        </td>
                        <td className="p-3 text-[var(--color-on-surface-variant)] break-words align-top">
                          {r.city || "—"}
                        </td>
                        <td className="p-3 text-[var(--color-on-surface-variant)] break-words align-top">
                          {r.ntn_cnic || "—"}
                        </td>
                        <td className="p-3 text-[var(--color-on-surface-variant)] break-words align-top">
                          {r.registration_type || "—"}
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
