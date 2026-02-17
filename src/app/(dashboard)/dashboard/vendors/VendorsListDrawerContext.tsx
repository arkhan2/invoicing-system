"use client";

import { createContext, useContext } from "react";

const VendorsListDrawerContext = createContext<{
  openListDrawer: () => void;
} | null>(null);

export function useVendorsListDrawer() {
  return useContext(VendorsListDrawerContext);
}

export function VendorsListDrawerProvider({
  openListDrawer,
  children,
}: {
  openListDrawer: () => void;
  children: React.ReactNode;
}) {
  return (
    <VendorsListDrawerContext.Provider value={{ openListDrawer }}>
      {children}
    </VendorsListDrawerContext.Provider>
  );
}
