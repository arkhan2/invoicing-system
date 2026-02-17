"use client";

import { createContext, useContext } from "react";

const ItemsListDrawerContext = createContext<{
  openListDrawer: () => void;
} | null>(null);

export function useItemsListDrawer() {
  return useContext(ItemsListDrawerContext);
}

export function ItemsListDrawerProvider({
  openListDrawer,
  children,
}: {
  openListDrawer: () => void;
  children: React.ReactNode;
}) {
  return (
    <ItemsListDrawerContext.Provider value={{ openListDrawer }}>
      {children}
    </ItemsListDrawerContext.Provider>
  );
}
