"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { PaymentSidebar } from "./PaymentSidebar";
import { usePaymentsData } from "./PaymentsDataContext";
import { PaymentsListDrawerProvider } from "./PaymentsListDrawerContext";
import { Drawer } from "@/components/Drawer";
import { useMediaQuery } from "@/hooks/useMediaQuery";

export function PaymentsViewSwitcher({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isIndex = pathname === "/dashboard/payments" || pathname === "/dashboard/payments/";
  const {
    sidebarList,
    companyId,
    totalCount,
    page,
    perPage,
    perPageOptions,
    customerId,
    status,
  } = usePaymentsData();
  const [listDrawerOpen, setListDrawerOpen] = useState(false);
  const isLg = useMediaQuery("(min-width: 1024px)");

  useEffect(() => {
    setListDrawerOpen(false);
  }, [pathname]);

  const sidebar = !isIndex ? (
    <PaymentSidebar
      payments={sidebarList}
      companyId={companyId}
      totalCount={totalCount}
      page={page}
      perPage={perPage}
      perPageOptions={perPageOptions}
      customerId={customerId || undefined}
      status={status || undefined}
    />
  ) : null;

  return (
    <PaymentsListDrawerProvider openListDrawer={() => setListDrawerOpen(true)}>
      <div className="-m-4 flex min-h-0 min-w-0 flex-1 flex-shrink-0 overflow-hidden border-r border-b border-[var(--color-outline)] bg-base lg:-m-6">
        {!isIndex && isLg && (
          <aside className="w-80 flex-shrink-0 overflow-hidden">{sidebar}</aside>
        )}
        {!isIndex && !isLg && (
          <Drawer open={listDrawerOpen} onClose={() => setListDrawerOpen(false)} width="w-80" keepMounted>
            {sidebar}
          </Drawer>
        )}
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {children}
        </main>
      </div>
    </PaymentsListDrawerProvider>
  );
}
