"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "invoicing-theme";

type Theme = "light" | "dark";

export function ThemeToggle() {
  const [theme, setThemeState] = useState<Theme | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initial: Theme = stored ?? (systemDark ? "dark" : "light");
    setThemeState(initial);
    document.documentElement.setAttribute("data-theme", initial);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setThemeState(next);
    localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.setAttribute("data-theme", next);
  }

  if (theme === null) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      className="px-3 py-1.5 rounded-lg text-sm font-medium text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-variant)] border border-[var(--color-outline)]"
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
    >
      {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
    </button>
  );
}
