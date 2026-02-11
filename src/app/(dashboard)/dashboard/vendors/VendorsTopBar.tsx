"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FileSpreadsheet, LayoutGrid, LayoutList, Download } from "lucide-react";
import { useVendorsTopBar } from "./VendorsTopBarContext";
import { useVendorsDataOrNull } from "./VendorsDataContext";
import { exportVendorsCsv } from "./actions";
import { startGlobalProcessing, endGlobalProcessing } from "@/components/GlobalProcessing";

function vendorsListQs(searchParams: URLSearchParams) {
  const p = new URLSearchParams();
  p.set("page", searchParams.get("page") ?? "1");
  p.set("perPage", searchParams.get("perPage") ?? "100");
  const q = searchParams.get("q")?.trim();
  if (q) p.set("q", q);
  return p.toString();
}

const topBarClass =
  "flex flex-shrink-0 items-center justify-between gap-4 border-b border-[var(--color-divider)] bg-base px-4 py-3";

export function VendorsTopBar({
  left,
  right,
  viewMode = "sidebar",
}: {
  left: React.ReactNode;
  right?: React.ReactNode;
  viewMode?: "sidebar" | "spreadsheet";
}) {
  const searchParams = useSearchParams();
  const listQs = vendorsListQs(searchParams);
  const { barState } = useVendorsTopBar();
  const data = useVendorsDataOrNull();
  const companyId = data?.companyId;
  const [exportLoading, setExportLoading] = useState(false);
  const useCustomRight = barState.rightSlot != null;

  async function handleExportCsv() {
    if (!companyId) return;
    setExportLoading(true);
    startGlobalProcessing("Preparing export…");
    try {
      const result = await exportVendorsCsv(companyId);
      if (result?.error) {
        endGlobalProcessing({ error: result.error });
        return;
      }
      if (!result.csv) {
        endGlobalProcessing({ error: "No data to export." });
        return;
      }
      const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vendors-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      endGlobalProcessing({ success: "Export downloaded." });
    } finally {
      setExportLoading(false);
      endGlobalProcessing();
    }
  }

  return (
    <div className={topBarClass}>
      <div className="flex min-w-0 items-center gap-3">{left}</div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {useCustomRight ? (
          barState.rightSlot
        ) : (
          <>
            {companyId != null && (
              <button
                type="button"
                onClick={handleExportCsv}
                disabled={exportLoading}
                className="btn btn-secondary btn-sm inline-flex items-center gap-2"
                title="Export up to 10,000 vendors"
              >
                <Download className="w-4 h-4 shrink-0" />
                Export CSV
              </button>
            )}
            <Link
              href={listQs ? `/dashboard/vendors/import?${listQs}` : "/dashboard/vendors/import"}
              className="btn btn-secondary btn-sm inline-flex items-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4 shrink-0" />
              Import from CSV
            </Link>
            {viewMode === "spreadsheet" ? (
              <Link
                href={listQs ? `/dashboard/vendors?${listQs}` : "/dashboard/vendors"}
                className="btn btn-secondary btn-icon shrink-0"
                aria-label="Sidebar view"
                title="Sidebar view"
              >
                <LayoutList className="w-4 h-4" />
              </Link>
            ) : (
              <Link
                href={listQs ? `/dashboard/vendors?view=spreadsheet&${listQs}` : "/dashboard/vendors?view=spreadsheet"}
                className="btn btn-secondary btn-icon shrink-0"
                aria-label="Spreadsheet view"
                title="Spreadsheet view"
              >
                <LayoutGrid className="w-4 h-4" />
              </Link>
            )}
            {right}
          </>
        )}
      </div>
    </div>
  );
}
