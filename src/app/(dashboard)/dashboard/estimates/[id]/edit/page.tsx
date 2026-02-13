import { createClient, getUserSafe } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { EstimateForm } from "../../EstimateForm";
import { getCompanyTaxRates } from "@/app/(dashboard)/dashboard/company/actions";
import { getUomList } from "@/app/(dashboard)/dashboard/items/actions";
import { getEstimateWithItems } from "../../actions";

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

  const [estimateWithItems, { salesTaxRates }, uomList] = await Promise.all([
    getEstimateWithItems(id),
    getCompanyTaxRates(company.id),
    getUomList(),
  ]);

  if (!estimateWithItems || estimateWithItems.estimate.company_id !== company.id) notFound();

  const { estimate } = estimateWithItems;
  let initialCustomer: {
    id: string;
    name: string;
    contact_person_name?: string | null;
    address?: string | null;
    city?: string | null;
    province?: string | null;
    country?: string | null;
    ntn_cnic?: string | null;
    phone?: string | null;
    email?: string | null;
    registration_type?: string | null;
  } | null = null;
  if (estimate.customer_id) {
    const { data: customer } = await supabase
      .from("customers")
      .select("id, name, contact_person_name, address, city, province, country, ntn_cnic, phone, email, registration_type")
      .eq("id", estimate.customer_id)
      .eq("company_id", company.id)
      .maybeSingle();
    if (customer) initialCustomer = customer;
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden w-full bg-surface">
        <EstimateForm
            estimateId={id}
            companyId={company.id}
            company={{ name: company.name }}
            salesTaxRates={salesTaxRates}
            uomList={uomList}
            initialEstimateNumber={estimate.estimate_number}
            initialEstimateDate={estimate.estimate_date ?? null}
            initialCustomerId={estimate.customer_id ?? undefined}
            initialSelectedCustomer={initialCustomer ?? undefined}
            initialEstimateWithItems={estimateWithItems}
          />
      </div>
    </div>
  );
}
