"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { startGlobalProcessing, endGlobalProcessing } from "./GlobalProcessing";

/** Show "Loading…" for at least this long so the new page has time to render. */
const NAV_LOADING_MS = 500;

/**
 * Shows the global processing indicator ("Loading…") when the user navigates
 * (pathname change), and hides it after the new page has had time to render.
 */
export function NavigationLoading() {
  const pathname = usePathname();
  const prevPathnameRef = useRef<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const prev = prevPathnameRef.current;
    prevPathnameRef.current = pathname;

    // Skip the initial mount (first paint of current page)
    if (prev === null) return;
    if (prev === pathname) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    startGlobalProcessing("Loading…");

    const t = setTimeout(() => {
      endGlobalProcessing();
      timeoutRef.current = null;
    }, NAV_LOADING_MS);
    timeoutRef.current = t;

    return () => {
      clearTimeout(t);
      endGlobalProcessing();
      timeoutRef.current = null;
    };
  }, [pathname]);

  return null;
}
