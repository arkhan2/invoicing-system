import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
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

  return (
    <SalesResponsiveLayout companyId={company.id}>
      <InvoicesTopBarProvider>
        <InvoicesTopBar />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </InvoicesTopBarProvider>
    </SalesResponsiveLayout>
  );
}
