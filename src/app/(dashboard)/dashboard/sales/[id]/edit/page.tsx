import { createClient, getUserSafe } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { InvoiceForm } from "../../InvoiceForm";

export default async function InvoiceEditPage({
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

  const { data: invoice } = await supabase
    .from("sales_invoices")
    .select("id, invoice_number, invoice_date")
    .eq("id", id)
    .eq("company_id", company.id)
    .single();
  if (!invoice) notFound();

  const { data: customers } = await supabase
    .from("customers")
    .select("id, name, address, city, province, ntn_cnic, phone, email")
    .eq("company_id", company.id)
    .order("name");

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden w-full bg-[var(--color-card-bg)]">
        <InvoiceForm
            invoiceId={id}
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
            initialInvoiceNumber={invoice.invoice_number}
            initialInvoiceDate={invoice.invoice_date ?? null}
          />
      </div>
    </div>
  );
}
