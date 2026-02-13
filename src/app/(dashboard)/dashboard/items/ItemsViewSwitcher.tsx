"use client";

import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { ItemSidebar } from "./ItemSidebar";
import { useItemsData } from "./ItemsDataContext";

export function ItemsViewSwitcher({
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
  } = useItemsData();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const view = searchParams.get("view");
  const isSpreadsheetView = pathname === "/dashboard/items" && view === "spreadsheet";
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  return (
    <div className="-m-6 flex min-h-0 min-w-0 flex-1 flex-shrink-0 overflow-hidden border-r border-b border-[var(--color-outline)] bg-base">
      {!isSpreadsheetView && (
        <aside className="w-80 flex-shrink-0 overflow-hidden">
          <ItemSidebar
            items={sidebarList}
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
