"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { VendorSidebar } from "./VendorSidebar";
import { useVendorsData } from "./VendorsDataContext";

export function VendorsViewSwitcher({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    sidebarList,
    companyId,
    totalCount,
    page,
    perPage,
    perPageOptions,
    searchQuery,
  } = useVendorsData();
  const searchParams = useSearchParams();
  const view = searchParams.get("view");
  const isSpreadsheet = view === "spreadsheet";
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  return (
    <div className="-m-6 flex min-h-0 min-w-0 flex-1 flex-shrink-0 overflow-hidden border-r border-b border-[var(--color-outline)] bg-base">
      {!isSpreadsheet && (
        <aside className="w-80 flex-shrink-0 overflow-hidden">
          <VendorSidebar
            vendors={sidebarList}
            companyId={companyId}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            totalCount={totalCount}
            page={page}
            perPage={perPage}
            perPageOptions={perPageOptions}
            searchQuery={searchQuery}
          />
        </aside>
      )}
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}
