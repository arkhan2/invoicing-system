"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type EstimateFormState = { error?: string };

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

export async function createEstimate(
  companyId: string,
  _prev: EstimateFormState,
  formData: FormData
): Promise<EstimateFormState & { estimateId?: string }> {
  const customerId = (formData.get("customer_id") as string)?.trim();
  if (!customerId) return { error: "Customer is required." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const { data: company } = await supabase
    .from("companies")
    .select("estimate_prefix, estimate_next_number")
    .eq("id", companyId)
    .eq("user_id", user.id)
    .single();
  if (!company) return { error: "Company not found." };

  const prefix = company.estimate_prefix ?? "EST";
  const nextNum = company.estimate_next_number ?? 1;
  const estimateNumber = `${prefix}-${String(nextNum).padStart(3, "0")}`;
  const estimateDate = (formData.get("estimate_date") as string) || new Date().toISOString().slice(0, 10);
  const status = (formData.get("status") as string) || "Draft";
  const validStatus = ["Draft", "Sent", "Accepted", "Declined", "Expired", "Converted"].includes(status) ? status : "Draft";
  const validUntil = (formData.get("valid_until") as string)?.trim() || null;
  const notes = (formData.get("notes") as string)?.trim() || null;
  const projectName = (formData.get("project_name") as string)?.trim() || null;
  const subject = (formData.get("subject") as string)?.trim() || null;

  const items = parseItems(formData);
  if (items.length === 0) return { error: "Add at least one line item." };

  const totalAmount = items.reduce((sum, i) => sum + Number(i.total_values), 0);
  const totalTax = items.reduce((sum, i) => sum + (Number(i.sales_tax_applicable) || 0) + (Number(i.extra_tax) || 0) + (Number(i.further_tax) || 0) - (Number(i.sales_tax_withheld_at_source) || 0), 0);

  const { data: estimate, error: estErr } = await supabase
    .from("estimates")
    .insert({
      company_id: companyId,
      customer_id: customerId,
      estimate_number: estimateNumber,
      estimate_date: estimateDate,
      status: validStatus,
      valid_until: validUntil || null,
      notes,
      project_name: projectName,
      subject,
      total_amount: totalAmount,
      total_tax: totalTax,
    })
    .select("id")
    .single();
  if (estErr) return { error: estErr.message };

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    await supabase.from("estimate_items").insert({
      estimate_id: estimate.id,
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

  await supabase.from("companies").update({ estimate_next_number: nextNum + 1 }).eq("id", companyId);
  revalidatePath("/dashboard/estimates");
  return { estimateId: estimate.id };
}

export async function updateEstimate(
  estimateId: string,
  companyId: string,
  _prev: EstimateFormState,
  formData: FormData
): Promise<EstimateFormState> {
  const customerId = (formData.get("customer_id") as string)?.trim();
  if (!customerId) return { error: "Customer is required." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const items = parseItems(formData);
  if (items.length === 0) return { error: "Add at least one line item." };

  const totalAmount = items.reduce((sum, i) => sum + Number(i.total_values), 0);
  const totalTax = items.reduce((sum, i) => sum + (Number(i.sales_tax_applicable) || 0) + (Number(i.extra_tax) || 0) + (Number(i.further_tax) || 0) - (Number(i.sales_tax_withheld_at_source) || 0), 0);

  const estimateDate = (formData.get("estimate_date") as string) || new Date().toISOString().slice(0, 10);
  const status = (formData.get("status") as string) || "Draft";
  const validStatus = ["Draft", "Sent", "Accepted", "Declined", "Expired", "Converted"].includes(status) ? status : "Draft";
  const validUntil = (formData.get("valid_until") as string)?.trim() || null;
  const notes = (formData.get("notes") as string)?.trim() || null;
  const projectName = (formData.get("project_name") as string)?.trim() || null;
  const subject = (formData.get("subject") as string)?.trim() || null;

  const { error: upErr } = await supabase
    .from("estimates")
    .update({
      customer_id: customerId,
      estimate_date: estimateDate,
      status: validStatus,
      valid_until: validUntil || null,
      notes,
      project_name: projectName,
      subject,
      total_amount: totalAmount,
      total_tax: totalTax,
      updated_at: new Date().toISOString(),
    })
    .eq("id", estimateId)
    .eq("company_id", companyId);
  if (upErr) return { error: upErr.message };

  await supabase.from("estimate_items").delete().eq("estimate_id", estimateId);
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    await supabase.from("estimate_items").insert({
      estimate_id: estimateId,
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

  revalidatePath("/dashboard/estimates");
  return {};
}

export async function getEstimateWithItems(estimateId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: estimate } = await supabase
    .from("estimates")
    .select("id, company_id, customer_id, estimate_number, estimate_date, status, valid_until, notes, project_name, subject, total_amount, total_tax")
    .eq("id", estimateId)
    .single();
  if (!estimate) return null;
  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("id", estimate.company_id)
    .eq("user_id", user.id)
    .single();
  if (!company) return null;
  const { data: estimateItems } = await supabase
    .from("estimate_items")
    .select("*")
    .eq("estimate_id", estimateId)
    .order("sort_order");
  const items = (estimateItems ?? []).map((it) => ({
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
  return { estimate, items };
}

export async function deleteEstimate(estimateId: string): Promise<EstimateFormState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };
  const { error } = await supabase.from("estimates").delete().eq("id", estimateId);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/estimates");
  return {};
}

export async function convertEstimateToInvoice(estimateId: string): Promise<EstimateFormState & { invoiceId?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const { data: estimate, error: eErr } = await supabase
    .from("estimates")
    .select("id, company_id, customer_id, estimate_date, total_amount, total_tax, status")
    .eq("id", estimateId)
    .single();
  if (eErr || !estimate) return { error: "Estimate not found." };
  if (estimate.status === "Converted") return { error: "This estimate was already converted to an invoice." };
  if (estimate.status === "Declined" || estimate.status === "Expired") {
    return { error: "Cannot convert a declined or expired estimate." };
  }

  const { data: company } = await supabase
    .from("companies")
    .select("id, sales_invoice_prefix, sales_invoice_next_number")
    .eq("id", estimate.company_id)
    .eq("user_id", user.id)
    .single();
  if (!company) return { error: "Company not found." };

  const prefix = company.sales_invoice_prefix ?? "INV";
  const nextNum = company.sales_invoice_next_number ?? 1;
  const invoiceNumber = `${prefix}-${String(nextNum).padStart(3, "0")}`;

  const { data: inv, error: invErr } = await supabase
    .from("sales_invoices")
    .insert({
      company_id: estimate.company_id,
      customer_id: estimate.customer_id,
      estimate_id: estimate.id,
      invoice_number: invoiceNumber,
      invoice_date: new Date().toISOString().slice(0, 10),
      status: "Draft",
      total_amount: estimate.total_amount,
      total_tax: estimate.total_tax,
    })
    .select("id")
    .single();
  if (invErr) return { error: invErr.message };

  const { data: estimateItems } = await supabase
    .from("estimate_items")
    .select("*")
    .eq("estimate_id", estimateId)
    .order("sort_order");
  if (estimateItems?.length) {
    for (const it of estimateItems) {
      await supabase.from("sales_invoice_items").insert({
        sales_invoice_id: inv.id,
        item_number: (it as { item_number?: string }).item_number ?? "",
        product_description: it.product_description,
        hs_code: it.hs_code,
        rate_label: it.rate_label,
        uom: it.uom,
        quantity: it.quantity,
        unit_price: it.unit_price,
        value_sales_excluding_st: it.value_sales_excluding_st,
        sales_tax_applicable: it.sales_tax_applicable,
        sales_tax_withheld_at_source: it.sales_tax_withheld_at_source,
        extra_tax: it.extra_tax,
        further_tax: it.further_tax,
        discount: it.discount,
        total_values: it.total_values,
        sale_type: it.sale_type,
        sort_order: it.sort_order,
      });
    }
  }

  await supabase.from("estimates").update({ status: "Converted", updated_at: new Date().toISOString() }).eq("id", estimateId);
  await supabase.from("companies").update({ sales_invoice_next_number: nextNum + 1 }).eq("id", estimate.company_id);

  revalidatePath("/dashboard/estimates");
  revalidatePath("/dashboard/sales");
  return { invoiceId: inv.id };
}
