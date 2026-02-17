"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { GlobalSearch } from "@/components/global-search/GlobalSearch";
import { DashboardGate } from "@/components/DashboardGate";
import { DashboardNav, SignOutButton, type NavItem } from "@/components/DashboardNav";
import { Drawer } from "@/components/Drawer";

type DashboardShellProps = {
  company: { id: string; name: string; logo_url: string | null } | null;
  user: { email?: string | null };
  navItems: NavItem[];
  hasCompany: boolean;
  children: React.ReactNode;
};

export function DashboardShell({
  company,
  user,
  navItems,
  hasCompany,
  children,
}: DashboardShellProps) {
  const pathname = usePathname();
  const [navDrawerOpen, setNavDrawerOpen] = useState(false);

  useEffect(() => {
    setNavDrawerOpen(false);
  }, [pathname]);

  const navContent = (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3">
      <DashboardNav items={navItems} />
      <SignOutButton />
    </div>
  );

  return (
    <>
      <header
        className="flex h-14 flex-shrink-0 items-center gap-4 border-b border-[var(--color-outline)] bg-base px-4 safe-area-top"
        style={{ minHeight: "var(--header-height, 56px)" }}
      >
        <button
          type="button"
          onClick={() => setNavDrawerOpen(true)}
          className="lg:hidden flex items-center justify-center rounded-lg p-2 text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-variant)] hover:text-[var(--color-on-surface)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
          aria-label="Open menu"
        >
          <Menu className="size-6" />
        </button>
        <Link
          href="/dashboard"
          className="flex min-w-0 items-center gap-2 text-lg font-semibold tracking-tight text-[var(--color-on-surface)]"
        >
          {company?.logo_url && (
            <img
              src={company.logo_url}
              alt=""
              className="h-8 w-auto max-w-[120px] object-contain"
              aria-hidden
            />
          )}
          <span className="truncate">{company?.name || "Invoicing System"}</span>
        </Link>
        <span
          className="hidden truncate text-sm text-[var(--color-on-surface-variant)] sm:inline sm:max-w-[200px]"
          title={user.email ?? ""}
        >
          {user.email}
        </span>
        <GlobalSearch />
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Desktop: fixed aside */}
        <aside className="hidden lg:flex w-56 flex-shrink-0 flex-col border-r border-[var(--color-outline)] bg-base overflow-hidden">
          {navContent}
        </aside>

        {/* Mobile/tablet: drawer */}
        <Drawer open={navDrawerOpen} onClose={() => setNavDrawerOpen(false)} width="w-56">
          {navContent}
        </Drawer>

        <DashboardGate hasCompany={hasCompany}>
          <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden bg-base p-4 lg:p-6">
            {children}
          </main>
        </DashboardGate>
      </div>
    </>
  );
}
