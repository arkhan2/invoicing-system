"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Drawer } from "@/components/Drawer";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { InvoicesListDrawerProvider } from "./InvoicesListDrawerContext";

export function SalesResponsiveLayout({
  sidebarContent,
  children,
}: {
  sidebarContent: React.ReactNode;
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
      <div className="-m-6 flex min-h-0 min-w-0 flex-1 flex-shrink-0 overflow-hidden border-r border-b border-[var(--color-outline)] bg-base">
        {isLg && (
          <aside className="w-80 flex-shrink-0 overflow-hidden">
            {sidebarContent}
          </aside>
        )}
        {!isLg && (
          <Drawer open={listDrawerOpen} onClose={() => setListDrawerOpen(false)} width="w-80">
            {sidebarContent}
          </Drawer>
        )}
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {children}
        </main>
      </div>
    </InvoicesListDrawerProvider>
  );
}
