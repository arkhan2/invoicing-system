import { createClient, getUserSafe } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ItemImportPage } from "../ItemImportPage";

export default async function ItemImportRoute() {
  const supabase = await createClient();
  const { data: { user } } = await getUserSafe(supabase);
  if (!user) redirect("/login");

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!company) redirect("/dashboard/company");

  return (
    <div className="flex min-h-0 flex-1 w-full flex-col">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden w-full">
        <ItemImportPage companyId={company.id} />
      </div>
    </div>
  );
}
