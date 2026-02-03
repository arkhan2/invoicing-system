import { redirect } from "next/navigation";
import { createClient, getUserSafe } from "@/lib/supabase/server";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DashboardGate } from "@/components/DashboardGate";

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
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  const hasCompany = !!company;

  const allNavLinks = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/dashboard/company", label: "Company" },
    { href: "/dashboard/customers", label: "Customers" },
    { href: "/dashboard/vendors", label: "Vendors" },
    { href: "/dashboard/items", label: "Items" },
    { href: "/dashboard/sales", label: "Sales Invoices" },
    { href: "/dashboard/purchases", label: "Purchase Invoices" },
  ];
  const navLinks = hasCompany
    ? allNavLinks
    : [{ href: "/dashboard/company", label: "Company" }];

  return (
    <div className="min-h-screen flex flex-col bg-surface-variant">
      {/* Header: reserved area, no critical content hidden (Google guideline) */}
      <header
        className="h-14 flex-shrink-0 flex items-center px-4 bg-surface border-b border-[var(--color-outline)]"
        style={{ minHeight: "var(--header-height, 56px)" }}
      >
        <Link href="/dashboard" className="text-lg font-medium text-[var(--color-on-surface)]">
          Invoicing System
        </Link>
        <span className="ml-4 text-sm text-[var(--color-on-surface-variant)] truncate max-w-[200px]" title={user.email ?? ""}>
          {user.email}
        </span>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <aside className="w-56 flex-shrink-0 flex flex-col border-r border-[var(--color-outline)] bg-surface p-3">
          <nav className="flex flex-col gap-0.5" aria-label="Main">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="px-3 py-2 rounded-lg text-sm font-medium text-[var(--color-on-surface)] hover:bg-surface-variant"
              >
                {label}
              </Link>
            ))}
          </nav>
          <form action="/api/auth/signout" method="post" className="mt-auto pt-3">
            <button
              type="submit"
              className="w-full text-left px-3 py-2 rounded-lg text-sm text-[var(--color-on-surface-variant)] hover:bg-surface-variant"
            >
              Sign out
            </button>
          </form>
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
