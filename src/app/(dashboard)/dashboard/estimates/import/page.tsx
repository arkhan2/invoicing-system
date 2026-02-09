import { createClient, getUserSafe } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { EstimateImportPage } from "../EstimateImportPage";

export default async function EstimateImportRoute() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await getUserSafe(supabase);
  if (!user) redirect("/login");

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!company) {
    redirect("/dashboard/company");
  }

  const { data: customers } = await supabase
    .from("customers")
    .select("id, name")
    .eq("company_id", company.id)
    .order("name");

  const customerList = (customers ?? []).map((c) => ({ id: c.id, name: c.name }));

  return (
    <div className="flex min-h-0 flex-1 w-full flex-col">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden w-full">
        <EstimateImportPage companyId={company.id} customers={customerList} />
      </div>
    </div>
  );
}
