import { createClient, getUserSafe } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { InvoiceDocumentView } from "../InvoiceDocumentView";

export default async function InvoiceViewPage({
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
    .select("id, name, address, city, province, phone, email, logo_url, ntn, gst_number")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!company) redirect("/dashboard/company");

  const { data: invoice } = await supabase
    .from("sales_invoices")
    .select("id, invoice_number, invoice_date, status, total_amount, total_tax, customer_id, estimate_id, invoice_ref_no, notes, project_name, subject, payment_terms, terms_type, due_date, delivery_time_amount, delivery_time_unit, discount_amount, discount_type, sales_tax_rate_id")
    .eq("id", id)
    .eq("company_id", company.id)
    .single();
  if (!invoice) notFound();

  let salesTaxLabel: string | null = null;
  const salesTaxRateId = (invoice as { sales_tax_rate_id?: string | null }).sales_tax_rate_id;
  if (salesTaxRateId) {
    const { data: rate } = await supabase
      .from("company_sales_tax_rates")
      .select("name, rate")
      .eq("id", salesTaxRateId)
      .eq("company_id", company.id)
      .maybeSingle();
    if (rate?.name != null && rate?.rate != null) {
      salesTaxLabel = `${rate.name} (${Number(rate.rate)}%)`;
    }
  }
  if (!salesTaxLabel) salesTaxLabel = "Sales tax";

  const { data: customer } = await supabase
    .from("customers")
    .select("id, name, contact_person_name, address, city, province, country, ntn_cnic, phone, email")
    .eq("id", invoice.customer_id)
    .single();

  const { data: estimate } = invoice.estimate_id
    ? await supabase
        .from("estimates")
        .select("estimate_number")
        .eq("id", invoice.estimate_id)
        .single()
    : { data: null };

  const { data: invoiceItems } = await supabase
    .from("sales_invoice_items")
    .select("item_number, product_description, quantity, unit_price, value_sales_excluding_st, total_values, uom")
    .eq("sales_invoice_id", id)
    .order("sort_order");

  const items = (invoiceItems ?? []).map((it) => ({
    item_number: it.item_number ?? undefined,
    product_description: it.product_description,
    quantity: Number(it.quantity),
    unit_price: Number(it.unit_price),
    total_values: Number(it.total_values),
    uom: it.uom ?? undefined,
  }));

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--color-card-bg)]">
        <InvoiceDocumentView
          invoiceId={id}
          invoiceNumber={invoice.invoice_number}
          invoiceDate={invoice.invoice_date ?? ""}
          status={invoice.status ?? "Draft"}
          totalAmount={Number(invoice.total_amount) ?? 0}
          totalTax={Number(invoice.total_tax) ?? 0}
          company={{
            name: company.name,
            address: company.address ?? null,
            city: company.city ?? null,
            province: company.province ?? null,
            ntn: company.ntn ?? null,
            gst_number: company.gst_number ?? null,
            phone: company.phone ?? null,
            email: company.email ?? null,
            logo_url: company.logo_url ?? null,
          }}
          customer={{
            name: customer?.name ?? "",
            contact_person_name: customer?.contact_person_name ?? null,
            address: customer?.address ?? null,
            city: customer?.city ?? null,
            province: customer?.province ?? null,
            country: customer?.country ?? null,
            ntn_cnic: customer?.ntn_cnic ?? null,
            phone: customer?.phone ?? null,
            email: customer?.email ?? null,
          }}
          items={items}
          estimateId={invoice.estimate_id ?? undefined}
          estimateNumber={estimate?.estimate_number ?? null}
          poNumber={invoice.invoice_ref_no ?? null}
          notes={invoice.notes ?? null}
          termsType={(invoice as { terms_type?: string | null }).terms_type ?? null}
          dueDate={(invoice as { due_date?: string | null }).due_date ?? null}
          discountAmount={(invoice as { discount_amount?: number | null }).discount_amount ?? null}
          discountType={(invoice as { discount_type?: "amount" | "percentage" | null }).discount_type ?? null}
          salesTaxLabel={salesTaxLabel}
        />
      </div>
    </div>
  );
}
