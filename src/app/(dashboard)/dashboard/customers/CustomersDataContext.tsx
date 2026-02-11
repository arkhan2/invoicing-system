"use client";

import { createContext, useContext } from "react";
import type { Customer } from "./CustomerForm";
import type { CustomerSidebarItem } from "./CustomerSidebar";

type CustomersData = {
  customers: Customer[];
  companyId: string;
  /** Sidebar uses a subset; derived from customers. */
  sidebarList: CustomerSidebarItem[];
  totalCount?: number;
  page?: number;
  perPage?: number;
  perPageOptions?: readonly number[];
  searchQuery?: string;
};

const CustomersDataContext = createContext<CustomersData | null>(null);

export function CustomersDataProvider({
  customers,
  companyId,
  totalCount,
  page,
  perPage,
  perPageOptions,
  searchQuery,
  children,
}: {
  customers: Customer[];
  companyId: string;
  totalCount?: number;
  page?: number;
  perPage?: number;
  perPageOptions?: readonly number[];
  searchQuery?: string;
  children: React.ReactNode;
}) {
  const sidebarList: CustomerSidebarItem[] = customers.map((c) => ({
    id: c.id,
    name: c.name,
    ntn_cnic: c.ntn_cnic ?? "",
  }));

  const value: CustomersData = {
    customers,
    companyId,
    sidebarList,
    totalCount,
    page,
    perPage,
    perPageOptions,
    searchQuery,
  };

  return (
    <CustomersDataContext.Provider value={value}>
      {children}
    </CustomersDataContext.Provider>
  );
}

export function useCustomersData(): CustomersData {
  const ctx = useContext(CustomersDataContext);
  if (!ctx) throw new Error("useCustomersData must be used within CustomersDataProvider");
  return ctx;
}

export function useCustomersDataOrNull(): CustomersData | null {
  return useContext(CustomersDataContext);
}
