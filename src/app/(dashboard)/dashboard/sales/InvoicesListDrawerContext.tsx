"use client";

import { createContext, useContext } from "react";

const InvoicesListDrawerContext = createContext<{
  openListDrawer: () => void;
} | null>(null);

export function useInvoicesListDrawer() {
  return useContext(InvoicesListDrawerContext);
}

export function InvoicesListDrawerProvider({
  openListDrawer,
  children,
}: {
  openListDrawer: () => void;
  children: React.ReactNode;
}) {
  return (
    <InvoicesListDrawerContext.Provider value={{ openListDrawer }}>
      {children}
    </InvoicesListDrawerContext.Provider>
  );
}
