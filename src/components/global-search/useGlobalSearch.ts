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
  /** Debounced search term; use this for filtering lists to avoid lag on every keystroke. */
  searchQuery: string;
  setQuery: (value: string) => void;
  scope: GlobalSearchScope;
  isSearchableRoute: boolean;
};

const GlobalSearchContext = createContext<GlobalSearchContextValue | null>(null);

export function useGlobalSearch(): GlobalSearchContextValue | null {
  return useContext(GlobalSearchContext);
}

export { GlobalSearchContext };
