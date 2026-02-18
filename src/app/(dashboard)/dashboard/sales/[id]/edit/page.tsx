import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { InvoiceForm, type TermsType } from "../../InvoiceForm";
import { getCompanyTaxRates } from "@/app/(dashboard)/dashboard/company/actions";
import { getUomList } from "@/app/(dashboard)/dashboard/items/actions";
import { getCustomersList } from "@/app/(dashboard)/dashboard/customers/actions";
import { getInvoiceWithItems } from "../../actions";

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

  const [invoiceWithItems, { salesTaxRates }, uomList, { list: customers }] = await Promise.all([
    getInvoiceWithItems(id),
    getCompanyTaxRates(company.id),
    getUomList(),
    getCustomersList(company.id, 1, 500),
  ]);

  if (!invoiceWithItems || invoiceWithItems.invoice.company_id !== company.id) notFound();

  const { invoice } = invoiceWithItems;
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
  if (invoice.customer_id) {
    const cust = customers.find((c) => c.id === invoice.customer_id);
    if (cust) {
      initialCustomer = {
        id: cust.id,
        name: cust.name,
        contact_person_name: cust.contact_person_name ?? null,
        address: cust.address ?? null,
        city: cust.city ?? null,
        province: cust.province ?? null,
        country: cust.country ?? null,
        ntn_cnic: cust.ntn_cnic ?? null,
        phone: cust.phone ?? null,
        email: cust.email ?? null,
        registration_type: cust.registration_type ?? null,
      };
    }
  }
  if (!initialCustomer && invoice.customer_id) {
    const { data: customer } = await supabase
      .from("customers")
      .select("id, name, contact_person_name, address, city, province, country, ntn_cnic, phone, email, registration_type")
      .eq("id", invoice.customer_id)
      .eq("company_id", company.id)
      .maybeSingle();
    if (customer) initialCustomer = customer;
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden w-full bg-surface">
        <InvoiceForm
          invoiceId={id}
          companyId={company.id}
          company={{ name: company.name }}
          customers={customers}
          salesTaxRates={salesTaxRates}
          uomList={uomList}
          initialInvoiceNumber={invoice.invoice_number}
          initialInvoiceDate={invoice.invoice_date ?? undefined}
          initialCustomerId={invoice.customer_id ?? undefined}
          initialSelectedCustomer={initialCustomer ?? undefined}
          initialPoNumber={invoice.invoice_ref_no ?? undefined}
          initialNotes={invoice.notes ?? undefined}
          initialProjectName={invoice.project_name ?? undefined}
          initialSubject={invoice.subject ?? undefined}
          initialPaymentTerms={invoice.payment_terms ?? undefined}
          initialTermsType={((invoice as { terms_type?: string | null }).terms_type ?? undefined) as TermsType | undefined}
          initialDueDate={(invoice as { due_date?: string | null }).due_date ?? undefined}
          initialDeliveryTimeAmount={invoice.delivery_time_amount != null ? Number(invoice.delivery_time_amount) : undefined}
          initialDeliveryTimeUnit={invoice.delivery_time_unit ?? undefined}
          initialDiscountAmount={invoice.discount_amount != null ? String(invoice.discount_amount) : undefined}
          initialDiscountType={(invoice as { discount_type?: string }).discount_type === "percentage" ? "percentage" : "amount"}
          initialSalesTaxRateId={invoice.sales_tax_rate_id ?? undefined}
          initialStatus={invoice.status ?? undefined}
          initialItems={invoiceWithItems.items}
        />
      </div>
    </div>
  );
}
