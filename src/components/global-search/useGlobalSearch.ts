"use client";

import { createContext, useContext } from "react";

export type GlobalSearchScope =
  | "customers"
  | "vendors"
  | "items"
  | "estimates"
  | "sales"
  | null;

export type GlobalSearchContextValue = {
  query: string;
  setQuery: (value: string) => void;
  scope: GlobalSearchScope;
  isSearchableRoute: boolean;
};

const GlobalSearchContext = createContext<GlobalSearchContextValue | null>(null);

export function useGlobalSearch(): GlobalSearchContextValue | null {
  return useContext(GlobalSearchContext);
}

export { GlobalSearchContext };
