"use client";

import { useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { useGlobalSearch } from "./useGlobalSearch";
import { IconButton } from "@/components/IconButton";

const scopePlaceholder: Record<string, string> = {
  customers: "Search customers…",
  vendors: "Search vendors…",
  items: "Search items…",
  estimates: "Search estimates…",
  sales: "Search invoices…",
};

const scopeLabel: Record<string, string> = {
  customers: "Search customers",
  vendors: "Search vendors",
  items: "Search items",
  estimates: "Search estimates",
  sales: "Search invoices",
};

const inputClass =
  "w-full border border-[var(--color-input-border)] rounded-xl pl-9 pr-9 py-2 text-sm text-[var(--color-on-surface)] bg-[var(--color-input-bg)] placeholder:text-[var(--color-on-surface-variant)] transition-colors duration-200 focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";

export function GlobalSearch() {
  const ctx = useGlobalSearch();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (!ctx) return null;

  const { query, setQuery, scope, isSearchableRoute } = ctx;
  const placeholder = scope ? scopePlaceholder[scope] ?? "Search…" : "Search…";
  const ariaLabel = scope ? scopeLabel[scope] ?? "Search" : "Search";

  return (
    <div className="hidden min-w-0 max-w-[280px] flex-1 sm:block md:max-w-[320px]">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-on-surface-variant)]"
          aria-hidden
        />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              (e.target as HTMLInputElement).blur();
            }
          }}
          placeholder={placeholder}
          aria-label={ariaLabel}
          disabled={!isSearchableRoute}
          className={inputClass + " input-no-search-cancel disabled:opacity-60 disabled:cursor-not-allowed"}
        />
        {query.trim() !== "" && (
          <IconButton
            variant="secondary"
            icon={<X className="size-4" />}
            label="Clear search"
            onClick={() => setQuery("")}
            className="absolute right-1 top-1/2 -translate-y-1/2 shrink-0 rounded-md p-1.5 text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-variant)] hover:text-[var(--color-on-surface)]"
          />
        )}
      </div>
    </div>
  );
}
