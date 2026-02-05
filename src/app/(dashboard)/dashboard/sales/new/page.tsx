import { createClient, getUserSafe } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { InvoiceForm } from "../InvoiceForm";

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

  const { data: customers } = await supabase
    .from("customers")
    .select("id, name, address, city, province, ntn_cnic, phone, email")
    .eq("company_id", company.id)
    .order("name");

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--color-card-bg)]">
        <div className="min-h-0 flex-1 overflow-y-auto pl-6 pr-8 pt-6 pb-6">
          <InvoiceForm
            invoiceId={null}
            companyId={company.id}
            customers={customers ?? []}
            company={{
              name: company.name,
              address: company.address ?? null,
              city: company.city ?? null,
              province: company.province ?? null,
              phone: company.phone ?? null,
              email: company.email ?? null,
              logo_url: company.logo_url ?? null,
            }}
          />
        </div>
      </div>
    </div>
  );
}
