"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { CustomerSidebar } from "./CustomerSidebar";
import { useCustomersData } from "./CustomersDataContext";
import { CustomersListDrawerProvider } from "./CustomersListDrawerContext";
import { Drawer } from "@/components/Drawer";
import { useMediaQuery } from "@/hooks/useMediaQuery";

export function CustomersViewSwitcher({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isIndex = pathname === "/dashboard/customers";
  const {
    sidebarList,
    companyId,
    totalCount,
    page,
    perPage,
    perPageOptions,
    searchQuery,
  } = useCustomersData();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [listDrawerOpen, setListDrawerOpen] = useState(false);
  const isLg = useMediaQuery("(min-width: 1024px)");

  useEffect(() => {
    setListDrawerOpen(false);
  }, [pathname]);

  const sidebar = !isIndex ? (
    <CustomerSidebar
      customers={sidebarList}
      companyId={companyId}
      selectedIds={selectedIds}
      onSelectionChange={setSelectedIds}
      totalCount={totalCount}
      page={page}
      perPage={perPage}
      perPageOptions={perPageOptions}
      searchQuery={searchQuery}
    />
  ) : null;

  return (
    <CustomersListDrawerProvider openListDrawer={() => setListDrawerOpen(true)}>
      <div className="-m-6 flex min-h-0 min-w-0 flex-1 flex-shrink-0 overflow-hidden border-r border-b border-[var(--color-outline)] bg-base">
        {!isIndex && isLg && (
          <aside className="w-80 flex-shrink-0 overflow-hidden">{sidebar}</aside>
        )}
        {!isIndex && !isLg && (
          <Drawer open={listDrawerOpen} onClose={() => setListDrawerOpen(false)} width="w-80">
            {sidebar}
          </Drawer>
        )}
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {children}
        </main>
      </div>
    </CustomersListDrawerProvider>
  );
}
