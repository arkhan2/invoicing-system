"use client";

import { createContext, useContext, useCallback, useState } from "react";

type PaymentsContextValue = {
  companyId: string;
  refreshPayments: () => void;
  setRefreshPayments: (fn: () => void) => void;
};

const PaymentsContext = createContext<PaymentsContextValue | null>(null);

export function PaymentsProvider({
  companyId,
  children,
}: {
  companyId: string;
  children: React.ReactNode;
}) {
  const [refreshFn, setRefreshFn] = useState<() => void>(() => () => {});

  const refreshPayments = useCallback(() => refreshFn(), [refreshFn]);
  const setRefreshPayments = useCallback((fn: () => void) => setRefreshFn(() => fn), []);

  const value: PaymentsContextValue = {
    companyId,
    refreshPayments,
    setRefreshPayments,
  };

  return (
    <PaymentsContext.Provider value={value}>
      {children}
    </PaymentsContext.Provider>
  );
}

export function usePayments(): PaymentsContextValue {
  const ctx = useContext(PaymentsContext);
  if (!ctx) throw new Error("usePayments must be used within PaymentsProvider");
  return ctx;
}
