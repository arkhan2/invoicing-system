import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { InvoiceForm } from "../InvoiceForm";
import { getCompanyTaxRates } from "@/app/(dashboard)/dashboard/company/actions";
import { getUomList } from "@/app/(dashboard)/dashboard/items/actions";
import { getCustomersList } from "@/app/(dashboard)/dashboard/customers/actions";
import { getNextInvoiceNumberForDisplay } from "../actions";

export default async function NewInvoicePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: company } = await supabase
    .from("companies")
    .select("id, name, address, city, province, phone, email, logo_url")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!company) redirect("/dashboard/company");

  const [nextInvoiceNumber, { salesTaxRates }, uomList, { list: customers }] = await Promise.all([
    getNextInvoiceNumberForDisplay(company.id),
    getCompanyTaxRates(company.id),
    getUomList(),
    getCustomersList(company.id, 1, 500),
  ]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden w-full bg-surface">
        <div className="min-h-0 flex-1 overflow-y-auto pl-6 pr-8 pt-6 pb-6">
          <InvoiceForm
            invoiceId={null}
            companyId={company.id}
            company={{ name: company.name }}
            customers={customers}
            salesTaxRates={salesTaxRates}
            uomList={uomList}
            initialInvoiceNumber={nextInvoiceNumber ?? undefined}
          />
        </div>
      </div>
    </div>
  );
}
