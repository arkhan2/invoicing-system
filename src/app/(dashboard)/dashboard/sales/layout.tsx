import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { InvoiceSidebarWithData } from "./InvoiceSidebarWithData";
import { InvoicesTopBar } from "./InvoicesTopBar";
import { InvoicesTopBarProvider } from "./InvoicesTopBarContext";
import { SalesResponsiveLayout } from "./SalesResponsiveLayout";

export default async function SalesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!company) redirect("/dashboard/company");

  const sidebarContent = (
    <Suspense fallback={<div className="flex h-full items-center justify-center text-sm text-[var(--color-on-surface-variant)]">Loading…</div>}>
      <InvoiceSidebarWithData companyId={company.id} />
    </Suspense>
  );

  return (
    <SalesResponsiveLayout sidebarContent={sidebarContent}>
      <InvoicesTopBarProvider>
        <InvoicesTopBar />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </InvoicesTopBarProvider>
    </SalesResponsiveLayout>
  );
}
