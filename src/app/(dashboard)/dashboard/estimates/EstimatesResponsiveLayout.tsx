"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Drawer } from "@/components/Drawer";
import { EstimatesListDrawerProvider } from "./EstimatesListDrawerContext";

export function EstimatesResponsiveLayout({
  sidebarContent,
  children,
}: {
  sidebarContent: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [listDrawerOpen, setListDrawerOpen] = useState(false);

  useEffect(() => {
    setListDrawerOpen(false);
  }, [pathname]);

  return (
    <EstimatesListDrawerProvider openListDrawer={() => setListDrawerOpen(true)}>
      <div className="-m-6 flex min-h-0 min-w-0 flex-1 flex-shrink-0 overflow-hidden border-r border-b border-[var(--color-outline)] bg-base">
        {/* Same DOM on server and client to avoid hydration mismatch; visibility via CSS only */}
        <aside className="hidden w-80 flex-shrink-0 overflow-hidden lg:block">
          {sidebarContent}
        </aside>
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {children}
        </main>
      </div>
      <Drawer open={listDrawerOpen} onClose={() => setListDrawerOpen(false)} width="w-80">
        {sidebarContent}
      </Drawer>
    </EstimatesListDrawerProvider>
  );
}
