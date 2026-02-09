"use client";

import Link from "next/link";
import { FileSpreadsheet, LayoutGrid, LayoutList } from "lucide-react";
import { useCustomersTopBar } from "./CustomersTopBarContext";

const topBarClass =
  "flex flex-shrink-0 items-center justify-between gap-4 border-b border-[var(--color-divider)] bg-[var(--color-surface)] px-4 py-3";

export function CustomersTopBar({
  left,
  right,
  viewMode = "sidebar",
}: {
  left: React.ReactNode;
  right?: React.ReactNode;
  viewMode?: "sidebar" | "spreadsheet";
}) {
  const { barState } = useCustomersTopBar();
  const useCustomRight = barState.rightSlot != null;

  return (
    <div className={topBarClass}>
      <div className="flex min-w-0 items-center gap-3">{left}</div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {useCustomRight ? (
          barState.rightSlot
        ) : (
          <>
            <Link
              href="/dashboard/customers/import"
              className="btn btn-secondary btn-sm inline-flex items-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4 shrink-0" />
              Import from CSV
            </Link>
            {viewMode === "spreadsheet" ? (
              <Link
                href="/dashboard/customers"
                className="btn btn-secondary btn-icon shrink-0"
                aria-label="Sidebar view"
                title="Sidebar view"
              >
                <LayoutList className="w-4 h-4" />
              </Link>
            ) : (
              <Link
                href="/dashboard/customers?view=spreadsheet"
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
