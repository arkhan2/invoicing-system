"use client";

import { useItemsData } from "./ItemsDataContext";
import { ItemSpreadsheetView } from "./ItemSpreadsheetView";

export function ItemsPageContent() {
  const {
    items,
    companyId,
    totalCount,
    page,
    perPage,
    perPageOptions,
    searchQuery,
  } = useItemsData();

  return (
    <ItemSpreadsheetView
      items={items}
      companyId={companyId}
      totalCount={totalCount}
      page={page}
      perPage={perPage}
      perPageOptions={perPageOptions}
      searchQuery={searchQuery}
    />
  );
}
