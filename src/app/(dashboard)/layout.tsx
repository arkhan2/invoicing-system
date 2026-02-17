import { redirect } from "next/navigation";
import { createClient, getUserSafe } from "@/lib/supabase/server";
import { MessageBar } from "@/components/MessageBar";
import { DashboardShell } from "./DashboardShell";
import { GlobalSearchProvider } from "@/components/global-search/GlobalSearchProvider";
import type { NavItem } from "@/components/DashboardNav";
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
    { href: "/dashboard/customers", label: "Customers", icon: "customers" },
    { href: "/dashboard/estimates", label: "Estimates", icon: "estimates" },
    { href: "/dashboard/sales", label: "Sales Invoices", icon: "sales" },
    { href: "/dashboard/items", label: "Items", icon: "items" },
    { href: "/dashboard/vendors", label: "Vendors", icon: "vendors" },
    { href: "/dashboard/purchases", label: "Purchase Invoices", icon: "purchases" },
  ];
  const navItems = hasCompany ? allNavItems : [{ href: "/dashboard/company", label: "Company", icon: "company" as const }];

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-base">
      <MessageBar />
      <GlobalProcessingIndicator />
      <NavigationLoading />
      <GlobalSearchProvider>
        <DashboardShell
          company={company}
          user={user}
          navItems={navItems}
          hasCompany={hasCompany}
        >
          {children}
        </DashboardShell>
      </GlobalSearchProvider>
    </div>
  );
}
