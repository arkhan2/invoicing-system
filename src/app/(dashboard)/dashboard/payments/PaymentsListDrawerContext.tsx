"use client";

import { createContext, useContext } from "react";

const PaymentsListDrawerContext = createContext<{
  openListDrawer: () => void;
} | null>(null);

export function usePaymentsListDrawer() {
  return useContext(PaymentsListDrawerContext);
}

export function PaymentsListDrawerProvider({
  openListDrawer,
  children,
}: {
  openListDrawer: () => void;
  children: React.ReactNode;
}) {
  return (
    <PaymentsListDrawerContext.Provider value={{ openListDrawer }}>
      {children}
    </PaymentsListDrawerContext.Provider>
  );
}
