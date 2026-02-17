"use client";

import { createContext, useContext } from "react";

const CustomersListDrawerContext = createContext<{
  openListDrawer: () => void;
} | null>(null);

export function useCustomersListDrawer() {
  return useContext(CustomersListDrawerContext);
}

export function CustomersListDrawerProvider({
  openListDrawer,
  children,
}: {
  openListDrawer: () => void;
  children: React.ReactNode;
}) {
  return (
    <CustomersListDrawerContext.Provider value={{ openListDrawer }}>
      {children}
    </CustomersListDrawerContext.Provider>
  );
}
