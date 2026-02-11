import { redirect } from "next/navigation";
import { createClient, getUserSafe } from "@/lib/supabase/server";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DashboardGate } from "@/components/DashboardGate";
import { DashboardNav, SignOutButton, type NavItem } from "@/components/DashboardNav";
import { MessageBar } from "@/components/MessageBar";
import { GlobalProcessingIndicator } from "@/components/GlobalProcessing";
import { NavigationLoading } from "@/components/NavigationLoading";
import { ConnectionUnavailable } from "@/components/ConnectionUnavailable";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const result = await getUserSafe(supabase);
  const { data: { user }, connectionError } = result;

  if (connectionError) {
    return <ConnectionUnavailable />;
  }

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
    { href: "/dashboard/customers?view=spreadsheet", label: "Customers", icon: "customers" },
    { href: "/dashboard/estimates", label: "Estimates", icon: "estimates" },
    { href: "/dashboard/sales", label: "Sales Invoices", icon: "sales" },
    { href: "/dashboard/items", label: "Items", icon: "items" },
    { href: "/dashboard/vendors?view=spreadsheet", label: "Vendors", icon: "vendors" },
    { href: "/dashboard/purchases", label: "Purchase Invoices", icon: "purchases" },
  ];
  const navItems = hasCompany ? allNavItems : [{ href: "/dashboard/company", label: "Company", icon: "company" as const }];

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-base">
      <MessageBar />
      <GlobalProcessingIndicator />
      <NavigationLoading />
      {/* Fixed top bar */}
      <header
        className="flex h-14 flex-shrink-0 items-center gap-4 border-b border-[var(--color-outline)] bg-base px-4"
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

      {/* Fixed nav + single scroll container (main) */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="flex w-56 flex-shrink-0 flex-col border-r border-[var(--color-outline)] bg-base overflow-hidden">
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3">
            <DashboardNav items={navItems} />
            <SignOutButton />
          </div>
        </aside>

        <DashboardGate hasCompany={hasCompany}>
          <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden bg-base p-6">
            {children}
          </main>
        </DashboardGate>
      </div>
    </div>
  );
}
