"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import {
  GlobalSearchContext,
  type GlobalSearchContextValue,
  type GlobalSearchScope,
} from "./useGlobalSearch";

const DEBOUNCE_MS = 350;

function getScopeFromPathname(pathname: string): GlobalSearchScope {
  if (pathname.startsWith("/dashboard/customers")) return "customers";
  if (pathname.startsWith("/dashboard/vendors")) return "vendors";
  if (pathname.startsWith("/dashboard/items")) return "items";
  if (pathname.startsWith("/dashboard/estimates")) return "estimates";
  if (pathname.startsWith("/dashboard/sales")) return "sales";
  return null;
}

export function GlobalSearchProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const scope = useMemo(() => getScopeFromPathname(pathname), [pathname]);

  const urlQ = searchParams.get("q") ?? "";
  const [searchQuery, setSearchQueryState] = useState(urlQ);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSearchQueryState(urlQ);
  }, [pathname, urlQ]);

  const setQuery = useCallback(
    (value: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      if (scope === null) {
        setSearchQueryState(value);
        return;
      }
      // When clearing (empty or only whitespace), update immediately.
      if (value.trim() === "") {
        setSearchQueryState("");
        const p = new URLSearchParams(searchParams);
        p.set("page", "1");
        p.delete("q");
        const qs = p.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
        return;
      }
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        // Store raw value so the input keeps spaces and stays responsive.
        setSearchQueryState(value);
        const p = new URLSearchParams(searchParams);
        p.set("page", "1");
        p.set("q", value);
        const qs = p.toString();
        router.replace(`${pathname}?${qs}`, { scroll: false });
      }, DEBOUNCE_MS);
    },
    [scope, pathname, searchParams, router]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const value: GlobalSearchContextValue = useMemo(
    () => ({
      searchQuery,
      setQuery,
      scope,
      isSearchableRoute: scope !== null,
    }),
    [searchQuery, setQuery, scope]
  );

  return (
    <GlobalSearchContext.Provider value={value}>
      {children}
    </GlobalSearchContext.Provider>
  );
}
