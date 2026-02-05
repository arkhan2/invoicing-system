import { redirect } from "next/navigation";
import { createClient, getUserSafe } from "@/lib/supabase/server";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DashboardGate } from "@/components/DashboardGate";
import { DashboardNav, SignOutButton, type NavItem } from "@/components/DashboardNav";
import { MessageBar } from "@/components/MessageBar";

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
    { href: "/dashboard/estimates", label: "Estimates", icon: "estimates" },
    { href: "/dashboard/sales", label: "Sales Invoices", icon: "sales" },
    { href: "/dashboard/purchases", label: "Purchase Invoices", icon: "purchases" },
  ];
  const navItems = hasCompany ? allNavItems : [{ href: "/dashboard/company", label: "Company", icon: "company" as const }];

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--color-surface-variant)]">
      <MessageBar />
      {/* Fixed top bar */}
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

      {/* Fixed nav + scrollable main */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="flex w-56 flex-shrink-0 flex-col border-r border-[var(--color-outline)] bg-[var(--color-surface)] p-3 overflow-y-auto">
          <DashboardNav items={navItems} />
          <SignOutButton />
        </aside>

        <DashboardGate hasCompany={hasCompany}>
          <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-6 bg-[var(--color-surface-variant)]">
            {children}
          </main>
        </DashboardGate>
      </div>
    </div>
  );
}
