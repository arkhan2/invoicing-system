"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
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

  const { setQuery, scope, isSearchableRoute } = ctx;
  const searchParams = useSearchParams();
  const urlQ = searchParams.get("q") ?? "";
  const placeholder = scope ? scopePlaceholder[scope] ?? "Search…" : "Search…";
  const ariaLabel = scope ? scopeLabel[scope] ?? "Search" : "Search";

  const [isFocused, setIsFocused] = useState(false);

  // Search bar is the only source of truth. URL never updates the search bar; only search bar updates the URL (via setQuery debounced in the provider).
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  const handleClear = () => {
    if (inputRef.current) inputRef.current.value = "";
    setQuery("");
    inputRef.current?.focus();
  };

  return (
    <div className="min-w-0 max-w-[140px] flex-1 sm:max-w-[200px] md:max-w-[280px] lg:max-w-[320px]">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-on-surface-variant)]"
          aria-hidden
        />
        <input
          ref={inputRef}
          type="search"
          defaultValue={urlQ}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
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
        {isFocused && (
          <IconButton
            variant="secondary"
            icon={<X className="size-4" />}
            label="Clear search"
            onClick={handleClear}
            className="absolute right-1 top-1/2 -translate-y-1/2 shrink-0 rounded-md p-1.5 text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-variant)] hover:text-[var(--color-on-surface)]"
          />
        )}
      </div>
    </div>
  );
}
