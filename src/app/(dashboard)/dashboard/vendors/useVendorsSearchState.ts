"use client";

import { useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";

const STORAGE_KEY = "vendors-search";

export type VendorsSearchState = {
  q?: string;
  page?: number;
  perPage?: number;
  view?: "spreadsheet";
};

function loadFromStorage(): VendorsSearchState {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as VendorsSearchState;
    return {
      q: typeof parsed.q === "string" ? parsed.q : undefined,
      page: typeof parsed.page === "number" ? parsed.page : undefined,
      perPage: typeof parsed.perPage === "number" ? parsed.perPage : undefined,
      view: parsed.view === "spreadsheet" ? "spreadsheet" : undefined,
    };
  } catch {
    return {};
  }
}

function saveToStorage(state: VendorsSearchState) {
  if (typeof window === "undefined") return;
  try {
    const toSave = {
      q: state.q?.trim() || undefined,
      page: state.page ?? 1,
      perPage: state.perPage ?? 100,
      view: state.view,
    };
    if (!toSave.q && !toSave.view) {
      sessionStorage.removeItem(STORAGE_KEY);
      return;
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {
    // ignore
  }
}

/** Build vendors list URL with search state. Uses URL params first, then sessionStorage. */
export function vendorsListHref(
  params: { view?: "spreadsheet"; page?: number; perPage?: number; q?: string | null } = {}
): string {
  const stored = loadFromStorage();
  const q = params.q !== undefined ? (params.q?.trim() || undefined) : stored.q;
  const page = params.page ?? stored.page ?? 1;
  const perPage = params.perPage ?? stored.perPage ?? 100;
  const view = params.view ?? stored.view;

  const p = new URLSearchParams();
  p.set("page", String(page));
  p.set("perPage", String(perPage));
  if (q) p.set("q", q);
  if (view === "spreadsheet") p.set("view", "spreadsheet");
  return `/dashboard/vendors?${p.toString()}`;
}

/** Build vendor detail URL with search state preserved. */
export function vendorDetailHref(
  id: string,
  params: { from?: string; q?: string; page?: number; perPage?: number } = {}
): string {
  const stored = loadFromStorage();
  const q = params.q ?? stored.q;
  const page = params.page ?? stored.page ?? 1;
  const perPage = params.perPage ?? stored.perPage ?? 100;
  const searchParams = new URLSearchParams();
  searchParams.set("page", String(page));
  searchParams.set("perPage", String(perPage));
  if (q?.trim()) searchParams.set("q", q.trim());
  if (params.from) searchParams.set("from", params.from);
  const s = searchParams.toString();
  return `/dashboard/vendors/${id}${s ? `?${s}` : ""}`;
}

/** Build vendor edit URL with search state preserved. */
export function vendorEditHref(
  id: string,
  params: { from?: string; q?: string; page?: number; perPage?: number } = {}
): string {
  const stored = loadFromStorage();
  const q = params.q ?? stored.q;
  const page = params.page ?? stored.page ?? 1;
  const perPage = params.perPage ?? stored.perPage ?? 100;
  const searchParams = new URLSearchParams();
  searchParams.set("page", String(page));
  searchParams.set("perPage", String(perPage));
  if (q?.trim()) searchParams.set("q", q.trim());
  if (params.from) searchParams.set("from", params.from);
  const s = searchParams.toString();
  return `/dashboard/vendors/${id}/edit${s ? `?${s}` : ""}`;
}

export function useVendorsSearchState() {
  const searchParams = useSearchParams();

  const q = searchParams.get("q") ?? "";
  const page = parseInt(searchParams.get("page") ?? "1", 10) || 1;
  const perPage = parseInt(searchParams.get("perPage") ?? "100", 10) || 100;
  const view = searchParams.get("view") === "spreadsheet" ? ("spreadsheet" as const) : undefined;

  const persist = useCallback(() => {
    saveToStorage({
      q: q.trim() || undefined,
      page,
      perPage,
      view,
    });
  }, [q, page, perPage, view]);

  useEffect(() => {
    persist();
  }, [persist]);

  const clearSearch = useCallback(() => {
    saveToStorage({
      page: 1,
      perPage,
      view,
    });
  }, [perPage, view]);

  return {
    q,
    page,
    perPage,
    view,
    persist,
    clearSearch,
    vendorsListHref,
    vendorDetailHref,
    vendorEditHref,
  };
}
