"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type InvoiceFormState = { error?: string };

type LineItemInput = {
  item_number?: string;
  product_description: string;
  hs_code?: string;
  rate_label?: string;
  uom?: string;
  quantity: number;
  unit_price: number;
  value_sales_excluding_st: number;
  sales_tax_applicable?: number;
  sales_tax_withheld_at_source?: number;
  extra_tax?: number;
  further_tax?: number;
  discount?: number;
  total_values: number;
  sale_type?: string;
};

function parseItems(formData: FormData): LineItemInput[] {
  const raw = formData.get("items") as string | null;
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as unknown[];
    return (arr || []).filter(
      (r): r is LineItemInput =>
        typeof r === "object" &&
        r !== null &&
        typeof (r as LineItemInput).product_description === "string" &&
        Number((r as LineItemInput).quantity) > 0 &&
        Number((r as LineItemInput).unit_price) >= 0
    );
  } catch {
    return [];
  }
}

export async function createInvoice(
  companyId: string,
  _prev: InvoiceFormState,
  formData: FormData
): Promise<InvoiceFormState & { invoiceId?: string }> {
  const customerId = (formData.get("customer_id") as string)?.trim();
  if (!customerId) return { error: "Customer is required." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const { data: company } = await supabase
    .from("companies")
    .select("sales_invoice_prefix, sales_invoice_next_number")
    .eq("id", companyId)
    .eq("user_id", user.id)
    .single();
  if (!company) return { error: "Company not found." };

  const prefix = company.sales_invoice_prefix ?? "INV";
  const nextNum = company.sales_invoice_next_number ?? 1;
  const invoiceNumber = `${prefix}-${String(nextNum).padStart(3, "0")}`;
  const invoiceDate = (formData.get("invoice_date") as string) || new Date().toISOString().slice(0, 10);

  const items = parseItems(formData);
  if (items.length === 0) return { error: "Add at least one line item." };

  const totalAmount = items.reduce((sum, i) => sum + Number(i.total_values), 0);
  const totalTax = items.reduce((sum, i) => sum + (Number(i.sales_tax_applicable) || 0) + (Number(i.extra_tax) || 0) + (Number(i.further_tax) || 0) - (Number(i.sales_tax_withheld_at_source) || 0), 0);

  const { data: inv, error: invErr } = await supabase
    .from("sales_invoices")
    .insert({
      company_id: companyId,
      customer_id: customerId,
      estimate_id: null,
      invoice_number: invoiceNumber,
      invoice_date: invoiceDate,
      status: "Draft",
      total_amount: totalAmount,
      total_tax: totalTax,
    })
    .select("id")
    .single();
  if (invErr) return { error: invErr.message };

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    await supabase.from("sales_invoice_items").insert({
      sales_invoice_id: inv.id,
      item_number: (it as LineItemInput).item_number ?? "",
      product_description: it.product_description,
      hs_code: it.hs_code ?? "",
      rate_label: it.rate_label ?? "",
      uom: it.uom ?? "Nos",
      quantity: it.quantity,
      unit_price: it.unit_price,
      value_sales_excluding_st: it.value_sales_excluding_st,
      sales_tax_applicable: it.sales_tax_applicable ?? 0,
      sales_tax_withheld_at_source: it.sales_tax_withheld_at_source ?? 0,
      extra_tax: it.extra_tax ?? 0,
      further_tax: it.further_tax ?? 0,
      discount: it.discount ?? 0,
      total_values: it.total_values,
      sale_type: it.sale_type ?? "Goods at standard rate (default)",
      sort_order: i,
    });
  }

  await supabase.from("companies").update({ sales_invoice_next_number: nextNum + 1 }).eq("id", companyId);
  revalidatePath("/dashboard/sales");
  return { invoiceId: inv.id };
}

export async function getInvoiceWithItems(invoiceId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: invoice } = await supabase
    .from("sales_invoices")
    .select("id, company_id, customer_id, invoice_number, invoice_date, status, total_amount, total_tax, estimate_id")
    .eq("id", invoiceId)
    .single();
  if (!invoice) return null;
  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("id", invoice.company_id)
    .eq("user_id", user.id)
    .single();
  if (!company) return null;
  const { data: invoiceItems } = await supabase
    .from("sales_invoice_items")
    .select("*")
    .eq("sales_invoice_id", invoiceId)
    .order("sort_order");
  const items = (invoiceItems ?? []).map((it) => ({
    item_number: (it as { item_number?: string }).item_number ?? "",
    product_description: it.product_description,
    hs_code: it.hs_code ?? "",
    rate_label: it.rate_label ?? "",
    uom: it.uom ?? "Nos",
    quantity: Number(it.quantity),
    unit_price: Number(it.unit_price),
    value_sales_excluding_st: Number(it.value_sales_excluding_st),
    sales_tax_applicable: Number(it.sales_tax_applicable) ?? 0,
    sales_tax_withheld_at_source: Number(it.sales_tax_withheld_at_source) ?? 0,
    extra_tax: Number(it.extra_tax) ?? 0,
    further_tax: Number(it.further_tax) ?? 0,
    discount: Number(it.discount) ?? 0,
    total_values: Number(it.total_values),
    sale_type: it.sale_type ?? "Goods at standard rate (default)",
  }));
  return { invoice, items };
}

export async function updateInvoice(
  invoiceId: string,
  companyId: string,
  _prev: InvoiceFormState,
  formData: FormData
): Promise<InvoiceFormState> {
  const customerId = (formData.get("customer_id") as string)?.trim();
  if (!customerId) return { error: "Customer is required." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const items = parseItems(formData);
  if (items.length === 0) return { error: "Add at least one line item." };

  const totalAmount = items.reduce((sum, i) => sum + Number(i.total_values), 0);
  const totalTax = items.reduce((sum, i) => sum + (Number(i.sales_tax_applicable) || 0) + (Number(i.extra_tax) || 0) + (Number(i.further_tax) || 0) - (Number(i.sales_tax_withheld_at_source) || 0), 0);

  const invoiceDate = (formData.get("invoice_date") as string) || new Date().toISOString().slice(0, 10);
  const status = (formData.get("status") as string) || "Draft";
  const validStatus = ["Draft", "Final", "Sent"].includes(status) ? status : "Draft";

  const { error: upErr } = await supabase
    .from("sales_invoices")
    .update({
      customer_id: customerId,
      invoice_date: invoiceDate,
      status: validStatus,
      total_amount: totalAmount,
      total_tax: totalTax,
      updated_at: new Date().toISOString(),
    })
    .eq("id", invoiceId)
    .eq("company_id", companyId);
  if (upErr) return { error: upErr.message };

  await supabase.from("sales_invoice_items").delete().eq("sales_invoice_id", invoiceId);
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    await supabase.from("sales_invoice_items").insert({
      sales_invoice_id: invoiceId,
      item_number: (it as LineItemInput).item_number ?? "",
      product_description: it.product_description,
      hs_code: it.hs_code ?? "",
      rate_label: it.rate_label ?? "",
      uom: it.uom ?? "Nos",
      quantity: it.quantity,
      unit_price: it.unit_price,
      value_sales_excluding_st: it.value_sales_excluding_st,
      sales_tax_applicable: it.sales_tax_applicable ?? 0,
      sales_tax_withheld_at_source: it.sales_tax_withheld_at_source ?? 0,
      extra_tax: it.extra_tax ?? 0,
      further_tax: it.further_tax ?? 0,
      discount: it.discount ?? 0,
      total_values: it.total_values,
      sale_type: it.sale_type ?? "Goods at standard rate (default)",
      sort_order: i,
    });
  }

  revalidatePath("/dashboard/sales");
  return {};
}

export async function deleteInvoice(invoiceId: string): Promise<InvoiceFormState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };
  const { error } = await supabase.from("sales_invoices").delete().eq("id", invoiceId);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/sales");
  return {};
}
