"use client";

import { createContext, useContext } from "react";
import type { PaymentListItem } from "./actions";

export type PaymentSidebarItem = {
  id: string;
  payment_number: string;
  customer_name: string;
  net_amount: number;
};

type PaymentsData = {
  payments: PaymentListItem[];
  companyId: string;
  sidebarList: PaymentSidebarItem[];
  totalCount: number;
  page: number;
  perPage: number;
  perPageOptions: readonly number[];
  customerId: string;
  status: string;
};

const PaymentsDataContext = createContext<PaymentsData | null>(null);

export function PaymentsDataProvider({
  payments,
  companyId,
  totalCount,
  page,
  perPage,
  perPageOptions,
  customerId,
  status,
  children,
}: {
  payments: PaymentListItem[];
  companyId: string;
  totalCount: number;
  page: number;
  perPage: number;
  perPageOptions: readonly number[];
  customerId: string;
  status: string;
  children: React.ReactNode;
}) {
  const sidebarList: PaymentSidebarItem[] = payments.map((p) => ({
    id: p.id,
    payment_number: p.payment_number,
    customer_name: p.customer_name,
    net_amount: p.net_amount,
  }));

  const value: PaymentsData = {
    payments,
    companyId,
    sidebarList,
    totalCount,
    page,
    perPage,
    perPageOptions,
    customerId,
    status,
  };

  return (
    <PaymentsDataContext.Provider value={value}>
      {children}
    </PaymentsDataContext.Provider>
  );
}

export function usePaymentsData(): PaymentsData {
  const ctx = useContext(PaymentsDataContext);
  if (!ctx) throw new Error("usePaymentsData must be used within PaymentsDataProvider");
  return ctx;
}

export function usePaymentsDataOrNull(): PaymentsData | null {
  return useContext(PaymentsDataContext);
}
