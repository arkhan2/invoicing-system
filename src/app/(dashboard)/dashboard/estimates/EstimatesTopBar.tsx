"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, FileSpreadsheet, ChevronLeft, List } from "lucide-react";
import { useEstimatesTopBar } from "./EstimatesTopBarContext";
import { useEstimatesListDrawer } from "./EstimatesListDrawerContext";
import { useMediaQuery } from "@/hooks/useMediaQuery";

const topBarClass =
  "dashboard-top-bar flex flex-shrink-0 items-center justify-between gap-4 border-b border-[var(--color-divider)] bg-base px-4 py-3 max-lg:sticky max-lg:top-0 max-lg:z-10";

export function EstimatesTopBar() {
  const pathname = usePathname();
  const { barState } = useEstimatesTopBar();
  const listDrawer = useEstimatesListDrawer();
  const isLg = useMediaQuery("(min-width: 1024px)");
  const showListButton = !isLg && listDrawer != null;
  const isList = pathname === "/dashboard/estimates";
  const isNew = pathname === "/dashboard/estimates/new";
  const isImport = pathname === "/dashboard/estimates/import";
  const editMatch = pathname.match(/^\/dashboard\/estimates\/([^/]+)\/edit$/);
  const isEdit = !!editMatch;
  const estimateIdFromEdit = editMatch?.[1] ?? null;
  const isView =
    pathname.match(/^\/dashboard\/estimates\/[^/]+$/) && !isNew && !isImport;
  const showBack = !isList;

  const backHref = isEdit && estimateIdFromEdit
    ? `/dashboard/estimates/${estimateIdFromEdit}`
    : "/dashboard/estimates";
  const backLabel = isEdit ? "Back to estimate" : "Back to estimates";

  const defaultTitle =
    isImport ? "Import from CSV" :
    isNew ? "New estimate" :
    isEdit ? "Edit estimate" :
    isView ? "Estimate" :
    "Estimates";

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
      <div className="flex shrink-0 flex-wrap items-center content-center gap-2">
        {useCustomRight ? (
          barState.rightSlot
        ) : (
          <>
            <Link
              href="/dashboard/estimates/new"
              className="btn btn-add btn-icon shrink-0"
              aria-label="New estimate"
              title="New estimate"
            >
              <Plus className="size-4" />
            </Link>
            <Link
              href="/dashboard/estimates/import"
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
