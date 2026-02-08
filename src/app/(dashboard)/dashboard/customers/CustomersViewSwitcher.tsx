"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { CustomerSidebar, type CustomerSidebarItem } from "./CustomerSidebar";

export function CustomersViewSwitcher({
  sidebarList,
  companyId,
  children,
}: {
  sidebarList: CustomerSidebarItem[];
  companyId: string;
  children: React.ReactNode;
}) {
  const searchParams = useSearchParams();
  const view = searchParams.get("view");
  const isSpreadsheet = view === "spreadsheet";
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  return (
    <div className="-m-6 flex min-h-0 min-w-0 flex-1 flex-shrink-0 overflow-hidden border-r border-b border-[var(--color-outline)] bg-[var(--color-card-bg)]">
      {!isSpreadsheet && (
        <aside className="w-80 flex-shrink-0 overflow-hidden">
          <CustomerSidebar
            customers={sidebarList}
            companyId={companyId}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
          />
        </aside>
      )}
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}
