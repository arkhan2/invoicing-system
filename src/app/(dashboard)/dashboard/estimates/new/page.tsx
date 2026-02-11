import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { EstimateForm } from "../EstimateForm";
import { getCompanyTaxRates } from "@/app/(dashboard)/dashboard/company/actions";
import { getNextEstimateNumberForDisplay } from "../actions";

export default async function NewEstimatePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: company } = await supabase
    .from("companies")
    .select("id, name, address, city, province, phone, email, logo_url")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!company) redirect("/dashboard/company");

  const [nextEstimateNumber, { salesTaxRates }] = await Promise.all([
    getNextEstimateNumberForDisplay(company.id),
    getCompanyTaxRates(company.id),
  ]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-surface">
        <div className="min-h-0 flex-1 overflow-y-auto pl-6 pr-8 pt-6 pb-6">
          <EstimateForm
            estimateId={null}
            companyId={company.id}
            company={{ name: company.name }}
            salesTaxRates={salesTaxRates}
            initialEstimateNumber={nextEstimateNumber ?? undefined}
          />
        </div>
      </div>
    </div>
  );
}
