"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { InvoiceSidebar } from "./InvoiceSidebar";
import type { InvoiceListItem } from "./InvoiceForm";

export function InvoicesSidebarWithParams({
  invoices,
  companyId,
}: {
  invoices: InvoiceListItem[];
  companyId: string;
}) {
  const searchParams = useSearchParams();
  const customerId = searchParams.get("customerId") ?? "";

  const filteredList = useMemo(() => {
    if (!customerId.trim()) return invoices;
    return invoices.filter((inv) => inv.customer_id === customerId.trim());
  }, [invoices, customerId]);

  return (
    <InvoiceSidebar
      invoices={filteredList}
      companyId={companyId}
      filterCustomerId={customerId.trim() || undefined}
    />
  );
}
