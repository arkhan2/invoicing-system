import { createClient, getUserSafe } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { EstimateForm } from "../../EstimateForm";
import { getCompanyTaxRates } from "@/app/(dashboard)/dashboard/company/actions";

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
    .select("id, estimate_number, estimate_date, customer_id")
    .eq("id", id)
    .eq("company_id", company.id)
    .single();
  if (!estimate) notFound();

  let initialCustomer: {
    id: string;
    name: string;
    address?: string | null;
    city?: string | null;
    province?: string | null;
    ntn_cnic?: string | null;
    phone?: string | null;
    email?: string | null;
    registration_type?: string | null;
  } | null = null;
  if (estimate.customer_id) {
    const { data: customer } = await supabase
      .from("customers")
      .select("id, name, address, city, province, ntn_cnic, phone, email, registration_type")
      .eq("id", estimate.customer_id)
      .eq("company_id", company.id)
      .maybeSingle();
    if (customer) initialCustomer = customer;
  }

  const { salesTaxRates } = await getCompanyTaxRates(company.id);

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden w-full bg-[var(--color-card-bg)]">
        <EstimateForm
            estimateId={id}
            companyId={company.id}
            company={{ name: company.name }}
            salesTaxRates={salesTaxRates}
            initialEstimateNumber={estimate.estimate_number}
            initialEstimateDate={estimate.estimate_date ?? null}
            initialCustomerId={estimate.customer_id ?? undefined}
            initialSelectedCustomer={initialCustomer ?? undefined}
          />
      </div>
    </div>
  );
}
