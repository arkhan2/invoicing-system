"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Plus, FileSpreadsheet, LayoutList, Trash2, X } from "lucide-react";
import { IconButton } from "@/components/IconButton";
import { CustomerList, type CustomerListRef } from "./CustomerList";
import type { Customer } from "./CustomerForm";

const topBarClass =
  "flex flex-shrink-0 items-center justify-between gap-4 border-b border-[var(--color-divider)] bg-[var(--color-surface)] px-4 py-3";

const inputClass =
  "w-full border border-[var(--color-input-border)] rounded-xl px-3 py-2 text-sm text-[var(--color-on-surface)] bg-[var(--color-input-bg)] placeholder:text-[var(--color-on-surface-variant)] transition-colors duration-200 focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";

export function CustomerSpreadsheetView({
  customers,
  companyId,
}: {
  customers: Customer[];
  companyId: string;
}) {
  const listRef = useRef<CustomerListRef>(null);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className={topBarClass}>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <h2 className="truncate text-lg font-semibold text-[var(--color-on-surface)] shrink-0">
            Customers
          </h2>
          <input
            type="search"
            placeholder="Search customers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={inputClass + " max-w-[240px] min-w-0"}
            aria-label="Search customers"
          />
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link
            href="/dashboard/customers/import"
            className="btn btn-secondary btn-sm inline-flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4 shrink-0" />
            Import from CSV
          </Link>
          <Link
            href="/dashboard/customers"
            className="btn btn-secondary btn-icon shrink-0"
            aria-label="Sidebar view"
            title="Sidebar view"
          >
            <LayoutList className="w-4 h-4" />
          </Link>
          {selectedIds.size > 0 && (
            <>
              <span className="text-sm text-[var(--color-on-surface-variant)] px-1">
                {selectedIds.size} selected
              </span>
              <IconButton
                variant="danger"
                icon={<Trash2 className="w-4 h-4" />}
                label="Delete selected"
                onClick={() => listRef.current?.openDeleteSelected()}
              />
              <IconButton
                variant="secondary"
                icon={<X className="w-4 h-4" />}
                label="Clear selection"
                onClick={() => listRef.current?.clearSelection()}
              />
            </>
          )}
          <IconButton
            variant="add"
            icon={<Plus className="w-4 h-4" />}
            label="Add customer"
            onClick={() => listRef.current?.openAdd()}
          />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden flex flex-col">
        <div className="card h-full min-h-0 flex flex-col overflow-hidden p-0">
          <CustomerList
            ref={listRef}
            customers={customers}
            companyId={companyId}
            hideToolbar
            search={search}
            onSearchChange={setSearch}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
          />
        </div>
      </div>
    </div>
  );
}
