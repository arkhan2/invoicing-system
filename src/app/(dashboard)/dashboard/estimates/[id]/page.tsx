import { createClient, getUserSafe } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { EstimateDocumentView } from "../EstimateDocumentView";

export default async function EstimateViewPage({
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

  const { data: estimate } = await supabase
    .from("estimates")
    .select("id, estimate_number, estimate_date, status, valid_until, notes, project_name, subject, payment_terms, delivery_time_amount, delivery_time_unit, total_amount, total_tax, discount_amount, discount_type, sales_tax_rate_id, customer_id")
    .eq("id", id)
    .eq("company_id", company.id)
    .single();
  if (!estimate) notFound();

  let salesTaxLabel: string | null = null;
  if (estimate.sales_tax_rate_id) {
    const { data: rate } = await supabase
      .from("company_sales_tax_rates")
      .select("name, rate")
      .eq("id", estimate.sales_tax_rate_id)
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
    .eq("id", estimate.customer_id)
    .single();

  const [estimateItemsRes, convertedInvoiceRes] = await Promise.all([
    supabase
      .from("estimate_items")
      .select("item_number, product_description, quantity, unit_price, value_sales_excluding_st, total_values, uom")
      .eq("estimate_id", id)
      .order("sort_order"),
    supabase
      .from("sales_invoices")
      .select("id, invoice_number")
      .eq("estimate_id", id)
      .eq("company_id", company.id)
      .maybeSingle(),
  ]);

  const estimateItems = estimateItemsRes.data ?? [];
  const convertedInvoice = convertedInvoiceRes.data ?? null;

  const items = estimateItems.map((it) => ({
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
        <EstimateDocumentView
          estimateId={id}
          estimateNumber={estimate.estimate_number}
          estimateDate={estimate.estimate_date ?? ""}
          status={estimate.status ?? "Draft"}
          invoiceId={convertedInvoice?.id ?? undefined}
          invoiceNumber={convertedInvoice?.invoice_number ?? undefined}
          validUntil={estimate.valid_until ?? null}
          notes={estimate.notes ?? null}
          projectName={estimate.project_name ?? null}
          subject={estimate.subject ?? null}
          paymentTerms={estimate.payment_terms ?? null}
          deliveryTimeAmount={estimate.delivery_time_amount ?? null}
          deliveryTimeUnit={estimate.delivery_time_unit ?? null}
          totalAmount={Number(estimate.total_amount) ?? 0}
          totalTax={Number(estimate.total_tax) ?? 0}
          discountAmount={estimate.discount_amount != null ? Number(estimate.discount_amount) : null}
          discountType={estimate.discount_type === "percentage" ? "percentage" : estimate.discount_type === "amount" ? "amount" : null}
          salesTaxLabel={salesTaxLabel}
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
            address: customer?.address ?? null,
            city: customer?.city ?? null,
            province: customer?.province ?? null,
            ntn_cnic: customer?.ntn_cnic ?? null,
            phone: customer?.phone ?? null,
            email: customer?.email ?? null,
          }}
          items={items}
        />
      </div>
    </div>
  );
}
