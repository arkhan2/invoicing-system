"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, ChevronLeft, List, FileSpreadsheet } from "lucide-react";
import { useInvoicesTopBar } from "./InvoicesTopBarContext";
import { useInvoicesListDrawer } from "./InvoicesListDrawerContext";
import { useMediaQuery } from "@/hooks/useMediaQuery";

const topBarClass =
  "flex flex-shrink-0 items-center justify-between gap-4 border-b border-[var(--color-divider)] bg-base px-4 py-3 max-lg:sticky max-lg:top-0 max-lg:z-10";

export function InvoicesTopBar() {
  const pathname = usePathname();
  const { barState } = useInvoicesTopBar();
  const listDrawer = useInvoicesListDrawer();
  const isLg = useMediaQuery("(min-width: 1024px)");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const showListButton = mounted && !isLg && listDrawer != null;
  const isList = pathname === "/dashboard/sales";
  const isNew = pathname === "/dashboard/sales/new";
  const isImport = pathname === "/dashboard/sales/import";
  const editMatch = pathname.match(/^\/dashboard\/sales\/([^/]+)\/edit$/);
  const isEdit = !!editMatch;
  const invoiceIdFromEdit = editMatch?.[1] ?? null;
  const isView =
    pathname.match(/^\/dashboard\/sales\/[^/]+$/) && !isNew && !isImport;

  const showBack = !isList;

  const backHref = isEdit && invoiceIdFromEdit
    ? `/dashboard/sales/${invoiceIdFromEdit}`
    : "/dashboard/sales";
  const backLabel = isEdit ? "Back to invoice" : "Back to invoices";

  const defaultTitle =
    isImport ? "Import from CSV" :
    isNew ? "New invoice" :
    isEdit ? "Edit invoice" :
    isView ? "Invoice" :
    "Invoices";

  const title = barState.title != null && barState.title !== "" ? barState.title : defaultTitle;
  const useCustomRight = barState.rightSlot != null;

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
            <List className="size-4" />
          </button>
        )}
        {showBack && (
          <Link
            href={backHref}
            className="btn btn-secondary btn-icon shrink-0"
            aria-label={backLabel}
            title={backLabel}
          >
            <ChevronLeft className="size-4" />
          </Link>
        )}
        <h2 className="truncate text-lg font-semibold text-[var(--color-on-surface)]">
          {title}
        </h2>
        {barState.titleSuffix != null ? barState.titleSuffix : null}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {useCustomRight ? (
          barState.rightSlot
        ) : (
          <>
            <Link
              href="/dashboard/sales/new"
              className="btn btn-add btn-icon shrink-0"
              aria-label="New invoice"
              title="New invoice"
            >
              <Plus className="size-4" />
            </Link>
            <Link
              href="/dashboard/sales/import"
              className={`btn btn-sm inline-flex items-center gap-2 ${isImport ? "btn-primary" : "btn-secondary"}`}
              aria-label="Import from CSV"
              title="Import from CSV"
            >
              <FileSpreadsheet className="h-4 w-4 shrink-0" />
              Import from CSV
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
