"use client";

import { Suspense, useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Drawer } from "@/components/Drawer";
import { InvoicesListDrawerProvider } from "./InvoicesListDrawerContext";
import { InvoiceSidebarWithData } from "./InvoiceSidebarWithData";
import { useMediaQuery } from "@/hooks/useMediaQuery";

const sidebarFallback = (
  <div className="flex h-full items-center justify-center text-sm text-[var(--color-on-surface-variant)]">
    Loading…
  </div>
);

/** Stable slot so Drawer/aside receive the same component type and the sidebar does not remount on re-render. */
function SalesSidebarSlot({ companyId }: { companyId: string }) {
  return (
    <Suspense fallback={sidebarFallback}>
      <InvoiceSidebarWithData companyId={companyId} />
    </Suspense>
  );
}

export function SalesResponsiveLayout({
  companyId,
  children,
}: {
  companyId: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [listDrawerOpen, setListDrawerOpen] = useState(false);
  const isLg = useMediaQuery("(min-width: 1024px)");

  useEffect(() => {
    setListDrawerOpen(false);
  }, [pathname]);

  return (
    <InvoicesListDrawerProvider openListDrawer={() => setListDrawerOpen(true)}>
      <div className="-m-4 flex min-h-0 min-w-0 flex-1 flex-shrink-0 overflow-hidden border-r border-b border-[var(--color-outline)] bg-base lg:-m-6">
        {isLg ? (
          <aside className="w-80 flex-shrink-0 overflow-hidden">
            <SalesSidebarSlot companyId={companyId} />
          </aside>
        ) : null}
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {children}
        </main>
      </div>
      {!isLg && (
        <Drawer open={listDrawerOpen} onClose={() => setListDrawerOpen(false)} width="w-80" keepMounted>
          <SalesSidebarSlot companyId={companyId} />
        </Drawer>
      )}
    </InvoicesListDrawerProvider>
  );
}
