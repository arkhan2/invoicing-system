import { redirect } from "next/navigation";
import { createClient, getUserSafe } from "@/lib/supabase/server";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DashboardGate } from "@/components/DashboardGate";
import { DashboardNav, SignOutButton, type NavItem } from "@/components/DashboardNav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await getUserSafe(supabase);

  if (!user) {
    redirect("/login");
  }

  const { data: company } = await supabase
    .from("companies")
    .select("id, name, logo_url")
    .eq("user_id", user.id)
    .maybeSingle();
  const hasCompany = !!company;

  const allNavItems: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
    { href: "/dashboard/company", label: "Company", icon: "company" },
    { href: "/dashboard/customers", label: "Customers", icon: "customers" },
    { href: "/dashboard/vendors", label: "Vendors", icon: "vendors" },
    { href: "/dashboard/items", label: "Items", icon: "items" },
    { href: "/dashboard/sales", label: "Sales Invoices", icon: "sales" },
    { href: "/dashboard/purchases", label: "Purchase Invoices", icon: "purchases" },
  ];
  const navItems = hasCompany ? allNavItems : [{ href: "/dashboard/company", label: "Company", icon: "company" as const }];

  return (
    <div className="min-h-screen flex flex-col bg-surface-variant">
      {/* Header: reserved area 56dp, no critical content hidden (Google design) */}
      <header
        className="flex h-14 flex-shrink-0 items-center gap-4 border-b border-[var(--color-outline)] bg-[var(--color-surface)] px-4"
        style={{ minHeight: "var(--header-height, 56px)" }}
      >
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
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-56 flex-shrink-0 flex-col border-r border-[var(--color-outline)] bg-[var(--color-surface)] p-3">
          <DashboardNav items={navItems} />
          <SignOutButton />
        </aside>

        {/* Main: one primary content area; gate redirects to company if profile incomplete */}
        <DashboardGate hasCompany={hasCompany}>
          <main className="flex-1 p-6 overflow-auto bg-surface-variant">
            <div className="max-w-4xl mx-auto">
              {children}
            </div>
          </main>
        </DashboardGate>
      </div>
    </div>
  );
}
