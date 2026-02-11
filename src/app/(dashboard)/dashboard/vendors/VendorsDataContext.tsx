"use client";

import { createContext, useContext } from "react";
import type { Vendor } from "./VendorForm";
import type { VendorSidebarItem } from "./VendorSidebar";

type VendorsData = {
  vendors: Vendor[];
  companyId: string;
  sidebarList: VendorSidebarItem[];
  totalCount?: number;
  page?: number;
  perPage?: number;
  perPageOptions?: readonly number[];
  searchQuery?: string;
};

const VendorsDataContext = createContext<VendorsData | null>(null);

export function VendorsDataProvider({
  vendors,
  companyId,
  totalCount,
  page,
  perPage,
  perPageOptions,
  searchQuery,
  children,
}: {
  vendors: Vendor[];
  companyId: string;
  totalCount?: number;
  page?: number;
  perPage?: number;
  perPageOptions?: readonly number[];
  searchQuery?: string;
  children: React.ReactNode;
}) {
  const sidebarList: VendorSidebarItem[] = vendors.map((c) => ({
    id: c.id,
    name: c.name,
    ntn_cnic: c.ntn_cnic ?? "",
  }));

  const value: VendorsData = {
    vendors,
    companyId,
    sidebarList,
    totalCount,
    page,
    perPage,
    perPageOptions,
    searchQuery,
  };

  return (
    <VendorsDataContext.Provider value={value}>
      {children}
    </VendorsDataContext.Provider>
  );
}

export function useVendorsData(): VendorsData {
  const ctx = useContext(VendorsDataContext);
  if (!ctx) throw new Error("useVendorsData must be used within VendorsDataProvider");
  return ctx;
}

export function useVendorsDataOrNull(): VendorsData | null {
  return useContext(VendorsDataContext);
}
