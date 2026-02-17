"use client";

import { useVendorsData } from "./VendorsDataContext";
import { VendorSpreadsheetView } from "./VendorSpreadsheetView";

export function VendorsPageContent() {
  const {
    vendors,
    companyId,
    totalCount,
    page,
    perPage,
    perPageOptions,
    searchQuery,
  } = useVendorsData();

  return (
    <VendorSpreadsheetView
      vendors={vendors}
      companyId={companyId}
      totalCount={totalCount}
      page={page}
      perPage={perPage}
      perPageOptions={perPageOptions}
      searchQuery={searchQuery}
    />
  );
}
