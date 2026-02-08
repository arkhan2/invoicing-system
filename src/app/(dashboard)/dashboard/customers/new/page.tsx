import { createClient, getUserSafe } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CustomerFormPage } from "../CustomerFormPage";

export default async function NewCustomerPage() {
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
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--color-card-bg)]">
        <CustomerFormPage
          customer={null}
          companyId={company.id}
          title="New customer"
          backHref="/dashboard/customers"
        />
      </div>
    </div>
  );
}
