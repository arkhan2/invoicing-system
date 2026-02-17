"use client";

import { createContext, useContext } from "react";

const EstimatesListDrawerContext = createContext<{
  openListDrawer: () => void;
} | null>(null);

export function useEstimatesListDrawer() {
  return useContext(EstimatesListDrawerContext);
}

export function EstimatesListDrawerProvider({
  openListDrawer,
  children,
}: {
  openListDrawer: () => void;
  children: React.ReactNode;
}) {
  return (
    <EstimatesListDrawerContext.Provider value={{ openListDrawer }}>
      {children}
    </EstimatesListDrawerContext.Provider>
  );
}
