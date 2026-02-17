"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FileSpreadsheet, LayoutGrid, LayoutList, Download, List } from "lucide-react";
import { useItemsTopBar } from "./ItemsTopBarContext";
import { useItemsListDrawer } from "./ItemsListDrawerContext";
import { useItemsDataOrNull } from "./ItemsDataContext";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { exportItemsCsv } from "./actions";
import { startGlobalProcessing, endGlobalProcessing } from "@/components/GlobalProcessing";

function itemsListQs(searchParams: URLSearchParams) {
  const p = new URLSearchParams();
  p.set("page", searchParams.get("page") ?? "1");
  p.set("perPage", searchParams.get("perPage") ?? "100");
  const q = searchParams.get("q")?.trim();
  if (q) p.set("q", q);
  return p.toString();
}

const topBarClass =
  "flex flex-shrink-0 items-center justify-between gap-4 border-b border-[var(--color-divider)] bg-base px-4 py-3 max-lg:sticky max-lg:top-0 max-lg:z-10";

export function ItemsTopBar({
  left,
  right,
  viewMode = "sidebar",
  showViewSwitcher = true,
}: {
  left: React.ReactNode;
  right?: React.ReactNode;
  viewMode?: "sidebar" | "spreadsheet";
  /** When false, hide List drawer button and Sidebar/Spreadsheet view links (unified list). */
  showViewSwitcher?: boolean;
}) {
  const searchParams = useSearchParams();
  const listQs = itemsListQs(searchParams);
  const { barState } = useItemsTopBar();
  const listDrawer = useItemsListDrawer();
  const data = useItemsDataOrNull();
  const companyId = data?.companyId;
  const [exportLoading, setExportLoading] = useState(false);
  const useCustomRight = barState.rightSlot != null;
  const isLg = useMediaQuery("(min-width: 1024px)");
  const showListButton = showViewSwitcher && viewMode === "sidebar" && !isLg && listDrawer != null;

  async function handleExportCsv() {
    if (!companyId) return;
    setExportLoading(true);
    startGlobalProcessing("Preparing export…");
    try {
      const result = await exportItemsCsv(companyId);
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
      a.download = `items-export-${new Date().toISOString().slice(0, 10)}.csv`;
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
      <div className="flex min-w-0 items-center gap-3">
        {showListButton && (
          <button
            type="button"
            onClick={() => listDrawer.openListDrawer()}
            className="btn btn-secondary btn-icon shrink-0 lg:hidden"
            aria-label="Open list"
            title="List"
          >
            <List className="w-4 h-4" />
          </button>
        )}
        {left}
      </div>
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
                title="Export up to 10,000 items"
              >
                <Download className="w-4 h-4 shrink-0" />
                Export CSV
              </button>
            )}
            <Link
              href={listQs ? `/dashboard/items/import?${listQs}` : "/dashboard/items/import"}
              className="btn btn-secondary btn-sm inline-flex items-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4 shrink-0" />
              Import from CSV
            </Link>
            {showViewSwitcher && (viewMode === "spreadsheet" ? (
              <Link
                href={listQs ? `/dashboard/items?${listQs}` : "/dashboard/items"}
                className="btn btn-secondary btn-icon shrink-0"
                aria-label="Sidebar view"
                title="Sidebar view"
              >
                <LayoutList className="w-4 h-4" />
              </Link>
            ) : (
              <Link
                href={listQs ? `/dashboard/items?view=spreadsheet&${listQs}` : "/dashboard/items?view=spreadsheet"}
                className="btn btn-secondary btn-icon shrink-0"
                aria-label="Spreadsheet view"
                title="Spreadsheet view"
              >
                <LayoutGrid className="w-4 h-4" />
              </Link>
            ))}
            {right}
          </>
        )}
      </div>
    </div>
  );
}
