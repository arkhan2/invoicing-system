import { createClient, getUserSafe } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CustomerImportPage } from "../CustomerImportPage";

export default async function CustomerImportRoute() {
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

  return (
    <div className="flex min-h-0 flex-1 w-full flex-col">
      <div className="card flex min-h-0 flex-1 flex-col overflow-hidden w-full">
        <CustomerImportPage companyId={company.id} />
      </div>
    </div>
  );
}
