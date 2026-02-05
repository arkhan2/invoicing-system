import { createClient, getUserSafe } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { EstimateForm } from "../../EstimateForm";

export default async function EstimateEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: company } = await supabase
    .from("companies")
    .select("id, name, address, city, province, phone, email, logo_url")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!company) redirect("/dashboard/company");

  const { data: estimate } = await supabase
    .from("estimates")
    .select("id, estimate_number, estimate_date")
    .eq("id", id)
    .eq("company_id", company.id)
    .single();
  if (!estimate) notFound();

  const { data: customers } = await supabase
    .from("customers")
    .select("id, name, address, city, province, ntn_cnic, phone, email")
    .eq("company_id", company.id)
    .order("name");

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden w-full bg-[var(--color-card-bg)]">
        <EstimateForm
            estimateId={id}
            companyId={company.id}
            customers={customers ?? []}
            company={{ name: company.name }}
            initialEstimateNumber={estimate.estimate_number}
            initialEstimateDate={estimate.estimate_date ?? null}
          />
      </div>
    </div>
  );
}
