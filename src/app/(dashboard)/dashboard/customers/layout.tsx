import { Suspense } from "react";
import { createClient, getUserSafe } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CustomersTopBarProvider } from "./CustomersTopBarContext";
import { CustomersViewSwitcher } from "./CustomersViewSwitcher";

export default async function CustomersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await getUserSafe(supabase);
  if (!user) redirect("/login");

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!company) redirect("/dashboard/company");

  const { data: customers } = await supabase
    .from("customers")
    .select("id, name, ntn_cnic")
    .eq("company_id", company.id)
    .order("name");

  const list = (customers ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    ntn_cnic: c.ntn_cnic ?? "",
  }));

  return (
    <CustomersTopBarProvider>
      <Suspense fallback={<div className="-m-6 flex min-h-0 flex-1 overflow-hidden" />}>
        <CustomersViewSwitcher sidebarList={list} companyId={company.id}>
          {children}
        </CustomersViewSwitcher>
      </Suspense>
    </CustomersTopBarProvider>
  );
}
