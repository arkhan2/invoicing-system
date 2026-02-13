"use client";

import { createContext, useContext } from "react";
import type { Item } from "./ItemForm";

export type ItemSidebarItem = {
  id: string;
  name: string;
  reference: string;
};

type ItemsData = {
  items: Item[];
  companyId: string;
  sidebarList: ItemSidebarItem[];
  totalCount?: number;
  page?: number;
  perPage?: number;
  perPageOptions?: readonly number[];
  searchQuery?: string;
  /** Call after add/update/delete to reload items list */
  refreshItems?: () => void;
};

const ItemsDataContext = createContext<ItemsData | null>(null);

export function ItemsDataProvider({
  items,
  companyId,
  totalCount,
  page,
  perPage,
  perPageOptions,
  searchQuery,
  refreshItems,
  children,
}: {
  items: Item[];
  companyId: string;
  totalCount?: number;
  page?: number;
  perPage?: number;
  perPageOptions?: readonly number[];
  searchQuery?: string;
  refreshItems?: () => void;
  children: React.ReactNode;
}) {
  const sidebarList: ItemSidebarItem[] = items.map((i) => ({
    id: i.id,
    name: i.name,
    reference: i.reference ?? "",
  }));

  const value: ItemsData = {
    items,
    companyId,
    sidebarList,
    totalCount,
    page,
    perPage,
    perPageOptions,
    searchQuery,
    refreshItems,
  };

  return (
    <ItemsDataContext.Provider value={value}>
      {children}
    </ItemsDataContext.Provider>
  );
}

export function useItemsData(): ItemsData {
  const ctx = useContext(ItemsDataContext);
  if (!ctx) throw new Error("useItemsData must be used within ItemsDataProvider");
  return ctx;
}

export function useItemsDataOrNull(): ItemsData | null {
  return useContext(ItemsDataContext);
}
