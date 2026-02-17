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
  const [query, setQueryState] = useState(urlQ);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQueryState(urlQ);
  }, [pathname, urlQ]);

  const setQuery = useCallback(
    (value: string) => {
      setQueryState(value);
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      if (scope === null) return;
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        const p = new URLSearchParams(searchParams);
        p.set("page", "1");
        if (value.trim()) {
          p.set("q", value.trim());
        } else {
          p.delete("q");
        }
        const qs = p.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
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
      query,
      setQuery,
      scope,
      isSearchableRoute: scope !== null,
    }),
    [query, setQuery, scope]
  );

  return (
    <GlobalSearchContext.Provider value={value}>
      {children}
    </GlobalSearchContext.Provider>
  );
}
