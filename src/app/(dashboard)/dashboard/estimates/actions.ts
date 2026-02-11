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

const ESTIMATE_NUMBER_DIGITS = 6;

async function getNextEstimateNumber(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  prefix: string
): Promise<number> {
  const re = new RegExp(`^${escapeRegExp(prefix)}-(\\d+)$`, "i");
  let maxNum = 0;
  const pageSize = 1000;
  let offset = 0;
  let hasMore = true;
  while (hasMore) {
    const { data: rows } = await supabase
      .from("estimates")
      .select("estimate_number")
      .eq("company_id", companyId)
      .range(offset, offset + pageSize - 1);
    const list = rows ?? [];
    hasMore = list.length === pageSize;
    offset += pageSize;
    for (const r of list) {
      const raw = (r.estimate_number ?? "").trim();
      const m = raw.match(re);
      if (m) {
        const n = parseInt(m[1], 10);
        if (Number.isInteger(n) && n > maxNum) maxNum = n;
      }
    }
  }
  return maxNum + 1;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Returns the next estimate number (e.g. EST-001410) for display when creating a new estimate. */
export async function getNextEstimateNumberForDisplay(companyId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: company } = await supabase
    .from("companies")
    .select("estimate_prefix")
    .eq("id", companyId)
    .eq("user_id", user.id)
    .single();
  if (!company) return null;
  const prefix = company.estimate_prefix ?? "EST";
  const nextNum = await getNextEstimateNumber(supabase, companyId, prefix);
  return `${prefix}-${String(nextNum).padStart(ESTIMATE_NUMBER_DIGITS, "0")}`;
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
    .select("estimate_prefix")
    .eq("id", companyId)
    .eq("user_id", user.id)
    .single();
  if (!company) return { error: "Company not found." };

  const prefix = company.estimate_prefix ?? "EST";
  const nextNum = await getNextEstimateNumber(supabase, companyId, prefix);
  const estimateNumber = `${prefix}-${String(nextNum).padStart(ESTIMATE_NUMBER_DIGITS, "0")}`;
  const estimateDate = (formData.get("estimate_date") as string) || new Date().toISOString().slice(0, 10);
  const status = (formData.get("status") as string) || "Draft";
  const validStatus = ["Draft", "Sent", "Expired", "Converted"].includes(status) ? status : "Draft";
  const validUntil = (formData.get("valid_until") as string)?.trim() || null;
  const notes = (formData.get("notes") as string)?.trim() || null;
  const projectName = (formData.get("project_name") as string)?.trim() || null;
  const subject = (formData.get("subject") as string)?.trim() || null;
  const paymentTerms = (formData.get("payment_terms") as string)?.trim() || null;
  const deliveryTimeAmountRaw = formData.get("delivery_time_amount") as string;
  const deliveryTimeAmount = deliveryTimeAmountRaw != null && deliveryTimeAmountRaw !== "" ? parseInt(String(deliveryTimeAmountRaw), 10) : null;
  const deliveryTimeUnit = (formData.get("delivery_time_unit") as string)?.trim() || null;
  const validUnit = deliveryTimeUnit === "days" || deliveryTimeUnit === "weeks" || deliveryTimeUnit === "months" ? deliveryTimeUnit : null;

  const items = parseItems(formData);
  if (items.length === 0) return { error: "Add at least one line item." };

  const subtotal = items.reduce((sum, i) => sum + Number(i.total_values), 0);
  const discountAmountRaw = Number((formData.get("discount_amount") as string) ?? 0) || 0;
  const discountType = (formData.get("discount_type") as string) === "percentage" ? "percentage" : "amount";
  const salesTaxRateId = (formData.get("sales_tax_rate_id") as string)?.trim() || null;
  const discountValue = discountType === "percentage" ? (subtotal * discountAmountRaw) / 100 : discountAmountRaw;
  const totalAfterDiscount = Math.max(0, subtotal - discountValue);
  let salesTaxRatePct = 0;
  if (salesTaxRateId) {
    const { data: rateRow } = await supabase.from("company_sales_tax_rates").select("rate").eq("id", salesTaxRateId).eq("company_id", companyId).single();
    salesTaxRatePct = rateRow ? Number(rateRow.rate) : 0;
  }
  const totalTax = (totalAfterDiscount * salesTaxRatePct) / 100;
  const totalAmount = totalAfterDiscount + totalTax;

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
      payment_terms: paymentTerms,
      delivery_time_amount: Number.isInteger(deliveryTimeAmount) ? deliveryTimeAmount : null,
      delivery_time_unit: validUnit,
      total_amount: totalAmount,
      total_tax: totalTax,
      discount_amount: discountAmountRaw,
      discount_type: discountType,
      sales_tax_rate_id: salesTaxRateId,
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

  await supabase.from("companies").update({ estimate_next_number: nextNum + 1 }).eq("id", companyId).eq("user_id", user.id);
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

  const subtotal = items.reduce((sum, i) => sum + Number(i.total_values), 0);
  const discountAmountRaw = Number((formData.get("discount_amount") as string) ?? 0) || 0;
  const discountType = (formData.get("discount_type") as string) === "percentage" ? "percentage" : "amount";
  const salesTaxRateId = (formData.get("sales_tax_rate_id") as string)?.trim() || null;
  const discountValue = discountType === "percentage" ? (subtotal * discountAmountRaw) / 100 : discountAmountRaw;
  const totalAfterDiscount = Math.max(0, subtotal - discountValue);
  let salesTaxRatePct = 0;
  if (salesTaxRateId) {
    const { data: rateRow } = await supabase.from("company_sales_tax_rates").select("rate").eq("id", salesTaxRateId).eq("company_id", companyId).single();
    salesTaxRatePct = rateRow ? Number(rateRow.rate) : 0;
  }
  const totalTax = (totalAfterDiscount * salesTaxRatePct) / 100;
  const totalAmount = totalAfterDiscount + totalTax;

  const estimateDate = (formData.get("estimate_date") as string) || new Date().toISOString().slice(0, 10);
  const status = (formData.get("status") as string) || "Draft";
  let validStatus = ["Draft", "Sent", "Expired", "Converted"].includes(status) ? status : "Draft";
  const validUntil = (formData.get("valid_until") as string)?.trim() || null;
  const notes = (formData.get("notes") as string)?.trim() || null;
  const projectName = (formData.get("project_name") as string)?.trim() || null;
  const subject = (formData.get("subject") as string)?.trim() || null;
  const paymentTerms = (formData.get("payment_terms") as string)?.trim() || null;
  const deliveryTimeAmountRaw = formData.get("delivery_time_amount") as string;
  const deliveryTimeAmount = deliveryTimeAmountRaw != null && deliveryTimeAmountRaw !== "" ? parseInt(String(deliveryTimeAmountRaw), 10) : null;
  const deliveryTimeUnit = (formData.get("delivery_time_unit") as string)?.trim() || null;
  const validUnit = deliveryTimeUnit === "days" || deliveryTimeUnit === "weeks" || deliveryTimeUnit === "months" ? deliveryTimeUnit : null;

  const { data: existing } = await supabase.from("estimates").select("status").eq("id", estimateId).eq("company_id", companyId).single();
  if (existing?.status === "Converted") validStatus = "Converted";

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
      payment_terms: paymentTerms,
      delivery_time_amount: Number.isInteger(deliveryTimeAmount) ? deliveryTimeAmount : null,
      delivery_time_unit: validUnit,
      total_amount: totalAmount,
      total_tax: totalTax,
      discount_amount: discountAmountRaw,
      discount_type: discountType,
      sales_tax_rate_id: salesTaxRateId,
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
    .select("id, company_id, customer_id, estimate_number, estimate_date, status, valid_until, notes, project_name, subject, payment_terms, delivery_time_amount, delivery_time_unit, total_amount, total_tax, discount_amount, discount_type, sales_tax_rate_id")
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

function escapeIlikePattern(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export async function getEstimatesList(
  companyId: string,
  page: number,
  perPage: number,
  searchQuery?: string | null,
  customerId?: string | null
): Promise<{ totalCount: number; list: Array<{
  id: string;
  estimate_number: string;
  estimate_date: string;
  status: string;
  total_amount: number | null;
  total_tax: number | null;
  customer_name: string;
  customer_id: string;
}> }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { totalCount: 0, list: [] };

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("id", companyId)
    .eq("user_id", user.id)
    .single();
  if (!company) return { totalCount: 0, list: [] };

  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabase
    .from("estimates")
    .select(
      `
      id,
      estimate_number,
      estimate_date,
      status,
      valid_until,
      total_amount,
      total_tax,
      created_at,
      customer:customers(id, name)
    `,
      { count: "exact" }
    )
    .eq("company_id", companyId)
    .order("estimate_date", { ascending: false });

  if (customerId?.trim()) {
    query = query.eq("customer_id", customerId.trim());
  }

  const q = searchQuery?.trim();
  if (q && q.length > 0) {
    const pattern = `%${escapeIlikePattern(q)}%`;
    const [customerRowsRes, itemsByDescRes, itemsByNumberRes] = await Promise.all([
      supabase
        .from("customers")
        .select("id")
        .eq("company_id", companyId)
        .ilike("name", pattern),
      supabase
        .from("estimate_items")
        .select("estimate_id")
        .ilike("product_description", pattern),
      supabase
        .from("estimate_items")
        .select("estimate_id")
        .ilike("item_number", pattern),
    ]);
    const customerIds = (customerRowsRes.data ?? []).map((r) => r.id).filter(Boolean);
    const estimateIdsFromItems = [
      ...new Set([
        ...(itemsByDescRes.data ?? []).map((r) => r.estimate_id),
        ...(itemsByNumberRes.data ?? []).map((r) => r.estimate_id),
      ].filter(Boolean)),
    ];
    let lineItemEstimateIds: string[] = [];
    if (estimateIdsFromItems.length > 0) {
      const { data: companyEstimateIds } = await supabase
        .from("estimates")
        .select("id")
        .eq("company_id", companyId)
        .in("id", estimateIdsFromItems);
      lineItemEstimateIds = (companyEstimateIds ?? []).map((r) => r.id).filter(Boolean);
    }
    const orParts = [
      `estimate_number.ilike.${pattern}`,
      `status.ilike.${pattern}`,
    ];
    if (customerIds.length > 0) {
      orParts.push(`customer_id.in.(${customerIds.join(",")})`);
    }
    if (lineItemEstimateIds.length > 0) {
      orParts.push(`id.in.(${lineItemEstimateIds.join(",")})`);
    }
    query = query.or(orParts.join(","));
  }

  const { data: estimates, error, count } = await query.range(from, to);

  if (error) return { totalCount: 0, list: [] };

  const today = new Date().toISOString().slice(0, 10);
  const list = (estimates ?? []).map((e) => {
    const effectiveStatus = e.status === "Sent" && e.valid_until && e.valid_until < today ? "Expired" : e.status;
    return {
      id: e.id,
      estimate_number: e.estimate_number,
      estimate_date: e.estimate_date,
      status: effectiveStatus,
      total_amount: e.total_amount,
      total_tax: e.total_tax,
      customer_name: (e.customer as { name?: string } | null)?.name ?? "",
      customer_id: (e.customer as { id?: string } | null)?.id ?? "",
    };
  });

  return { totalCount: count ?? 0, list };
}

export async function cloneEstimate(estimateId: string): Promise<EstimateFormState & { estimateId?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const { data: estimate, error: eErr } = await supabase
    .from("estimates")
    .select("id, company_id, customer_id, estimate_date, valid_until, notes, project_name, subject, payment_terms, delivery_time_amount, delivery_time_unit, total_amount, total_tax, discount_amount, discount_type, sales_tax_rate_id")
    .eq("id", estimateId)
    .single();
  if (eErr || !estimate) return { error: "Estimate not found." };

  const { data: company } = await supabase
    .from("companies")
    .select("id, estimate_prefix")
    .eq("id", estimate.company_id)
    .eq("user_id", user.id)
    .single();
  if (!company) return { error: "Company not found." };

  const prefix = company.estimate_prefix ?? "EST";
  const nextNum = await getNextEstimateNumber(supabase, estimate.company_id, prefix);
  const estimateNumber = `${prefix}-${String(nextNum).padStart(ESTIMATE_NUMBER_DIGITS, "0")}`;
  const estimateDate = new Date().toISOString().slice(0, 10);

  const { data: estimateItems } = await supabase
    .from("estimate_items")
    .select("*")
    .eq("estimate_id", estimateId)
    .order("sort_order");
  const items = estimateItems ?? [];

  const { data: newEstimate, error: insErr } = await supabase
    .from("estimates")
    .insert({
      company_id: estimate.company_id,
      customer_id: estimate.customer_id,
      estimate_number: estimateNumber,
      estimate_date: estimateDate,
      status: "Draft",
      valid_until: estimate.valid_until ?? null,
      notes: estimate.notes,
      project_name: estimate.project_name,
      subject: estimate.subject,
      payment_terms: estimate.payment_terms ?? null,
      delivery_time_amount: estimate.delivery_time_amount ?? null,
      delivery_time_unit: estimate.delivery_time_unit ?? null,
      total_amount: estimate.total_amount,
      total_tax: estimate.total_tax,
      discount_amount: estimate.discount_amount,
      discount_type: estimate.discount_type,
      sales_tax_rate_id: estimate.sales_tax_rate_id,
    })
    .select("id")
    .single();
  if (insErr) return { error: insErr.message };
  if (!newEstimate) return { error: "Failed to create estimate." };

  for (let i = 0; i < items.length; i++) {
    const it = items[i] as Record<string, unknown>;
    await supabase.from("estimate_items").insert({
      estimate_id: newEstimate.id,
      item_number: it.item_number ?? "",
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
      sort_order: i,
    });
  }

  await supabase.from("companies").update({ estimate_next_number: nextNum + 1 }).eq("id", estimate.company_id).eq("user_id", user.id);
  revalidatePath("/dashboard/estimates");
  return { estimateId: newEstimate.id };
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

const DELETE_ESTIMATES_CHUNK_SIZE = 80;

export type DeleteEstimatesResult = {
  error?: string;
  deletedCount: number;
  deletedIds: string[];
};

export async function deleteEstimates(
  companyId: string,
  estimateIds: string[]
): Promise<DeleteEstimatesResult> {
  if (estimateIds.length === 0) return { deletedCount: 0, deletedIds: [] };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in to delete estimates.", deletedCount: 0, deletedIds: [] };

  const chunkSize = DELETE_ESTIMATES_CHUNK_SIZE;
  const deletedIds: string[] = [];
  for (let i = 0; i < estimateIds.length; i += chunkSize) {
    const chunk = estimateIds.slice(i, i + chunkSize);
    const { error } = await supabase
      .from("estimates")
      .delete()
      .eq("company_id", companyId)
      .in("id", chunk);
    if (error) {
      console.error("[deleteEstimates] error:", error.message, { companyId, chunkIndex: i / chunkSize });
      return { error: error.message, deletedCount: deletedIds.length, deletedIds };
    }
    deletedIds.push(...chunk);
  }
  revalidatePath("/dashboard/estimates");
  return { deletedCount: deletedIds.length, deletedIds };
}

export async function convertEstimateToInvoice(estimateId: string): Promise<EstimateFormState & { invoiceId?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const { data: estimate, error: eErr } = await supabase
    .from("estimates")
    .select("id, company_id, customer_id, estimate_date, total_amount, total_tax, status, valid_until")
    .eq("id", estimateId)
    .single();
  if (eErr || !estimate) return { error: "Estimate not found." };
  if (estimate.status === "Converted") return { error: "This estimate was already converted to an invoice." };
  const validUntil = (estimate as { valid_until?: string | null }).valid_until;
  const isExpiredByDate = validUntil && validUntil < new Date().toISOString().slice(0, 10);
  if (estimate.status === "Expired" || isExpiredByDate) {
    return { error: "Cannot convert an expired estimate." };
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

export async function setEstimateStatus(
  estimateId: string,
  status: "Sent"
): Promise<EstimateFormState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const { data: estimate } = await supabase
    .from("estimates")
    .select("id, company_id")
    .eq("id", estimateId)
    .single();
  if (!estimate) return { error: "Estimate not found." };

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("id", estimate.company_id)
    .eq("user_id", user.id)
    .single();
  if (!company) return { error: "Estimate not found." };

  const { error } = await supabase
    .from("estimates")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", estimateId)
    .eq("company_id", estimate.company_id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/estimates");
  return {};
}

// -----------------------------------------------------------------------------
// Estimate CSV import (match customer by name only; skip if no match)
// -----------------------------------------------------------------------------

export type MappedEstimateItem = {
  product_description: string;
  quantity: number;
  unit_price: number;
  value_sales_excluding_st: number;
  sales_tax_applicable: number;
  discount: number;
  total_values: number;
  uom: string;
};

export type MappedEstimate = {
  customer_name: string;
  /** Set by client when using "Map customers" step; then server skips lookup and can batch insert */
  customer_id?: string;
  estimate_number: string;
  estimate_date: string;
  status: string;
  valid_until: string | null;
  notes: string | null;
  payment_terms: string | null;
  subject: string | null;
  project_name: string | null;
  total_amount: number;
  total_tax: number;
  discount_amount: number;
  discount_type: "amount" | "percentage";
  items: MappedEstimateItem[];
};

export type ImportEstimatesResult = {
  error?: string;
  imported: number;
  skipped: number;
  skippedNoCustomer: string[];
  skippedDuplicateNumber: string[];
  errors: string[];
};

function normalizeStatus(raw: string): "Draft" | "Sent" | "Accepted" | "Declined" | "Expired" | "Converted" {
  const s = (raw || "").trim();
  const lower = s.toLowerCase();
  if (lower === "draft") return "Draft";
  if (lower === "sent" || lower === "accepted" || lower === "declined") return "Sent";
  if (lower === "expired") return "Expired";
  if (lower === "converted") return "Converted";
  return "Draft";
}

async function getCustomerIdByName(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  customerName: string
): Promise<string | null> {
  const name = customerName.trim();
  if (!name) return null;
  const { data } = await supabase
    .from("customers")
    .select("id")
    .eq("company_id", companyId)
    .ilike("name", name)
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

const ESTIMATE_IMPORT_BATCH = 50;
const ESTIMATE_ITEMS_INSERT_BATCH = 400;

export async function importEstimatesFromCsv(
  companyId: string,
  mappedEstimates: MappedEstimate[]
): Promise<ImportEstimatesResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      error: "You must be signed in to import estimates.",
      imported: 0,
      skipped: 0,
      skippedNoCustomer: [],
      skippedDuplicateNumber: [],
      errors: [],
    };
  }

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("id", companyId)
    .eq("user_id", user.id)
    .single();
  if (!company) {
    return {
      error: "Company not found.",
      imported: 0,
      skipped: 0,
      skippedNoCustomer: [],
      skippedDuplicateNumber: [],
      errors: [],
    };
  }

  const allHaveCustomerId = mappedEstimates.length > 0 && mappedEstimates.every((e) => e.customer_id?.trim());

  if (allHaveCustomerId) {
    return runBatchImport(supabase, companyId, mappedEstimates as (MappedEstimate & { customer_id: string })[]);
  }

  return runLegacyImport(supabase, companyId, mappedEstimates);
}

function runBatchImport(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  mappedEstimates: (MappedEstimate & { customer_id: string })[]
): Promise<ImportEstimatesResult> {
  let imported = 0;
  const skippedDuplicateNumber: string[] = [];
  const errors: string[] = [];

  return (async () => {
    for (let i = 0; i < mappedEstimates.length; i += ESTIMATE_IMPORT_BATCH) {
      const chunk = mappedEstimates.slice(i, i + ESTIMATE_IMPORT_BATCH);
      const estimateRows = chunk.map((est) => {
        const validStatus = normalizeStatus(est.status);
        const validUntil = (est.valid_until && est.valid_until.trim()) || null;
        const discountType = est.discount_type === "percentage" ? "percentage" : "amount";
        return {
          company_id: companyId,
          customer_id: est.customer_id,
          estimate_number: est.estimate_number.trim(),
          estimate_date: est.estimate_date,
          status: validStatus,
          valid_until: validUntil,
          notes: est.notes,
          payment_terms: est.payment_terms,
          subject: est.subject,
          project_name: est.project_name,
          total_amount: est.total_amount,
          total_tax: est.total_tax,
          discount_amount: est.discount_amount,
          discount_type: discountType,
        };
      });

      const { data: insertedEstimates, error: estErr } = await supabase
        .from("estimates")
        .insert(estimateRows)
        .select("id");

      if (estErr) {
        if (estErr.code === "23505") {
          chunk.forEach((est) => skippedDuplicateNumber.push(est.estimate_number));
        } else {
          errors.push(chunk.map((e) => e.estimate_number).join(", ") + ": " + estErr.message);
        }
        continue;
      }
      if (!insertedEstimates || insertedEstimates.length === 0) continue;

      const allItemRows: {
        estimate_id: string;
        item_number: string;
        product_description: string;
        hs_code: string;
        rate_label: string;
        uom: string;
        quantity: number;
        unit_price: number;
        value_sales_excluding_st: number;
        sales_tax_applicable: number;
        sales_tax_withheld_at_source: number;
        extra_tax: number;
        further_tax: number;
        discount: number;
        total_values: number;
        sale_type: string;
        sort_order: number;
      }[] = [];
      chunk.forEach((est, idx) => {
        const estimateId = insertedEstimates[idx]?.id;
        if (!estimateId) return;
        est.items.forEach((it, sortOrder) => {
          allItemRows.push({
            estimate_id: estimateId,
            item_number: "",
            product_description: it.product_description || "—",
            hs_code: "",
            rate_label: "",
            uom: it.uom || "Nos",
            quantity: it.quantity,
            unit_price: it.unit_price,
            value_sales_excluding_st: it.value_sales_excluding_st,
            sales_tax_applicable: it.sales_tax_applicable ?? 0,
            sales_tax_withheld_at_source: 0,
            extra_tax: 0,
            further_tax: 0,
            discount: it.discount ?? 0,
            total_values: it.total_values,
            sale_type: "Goods at standard rate (default)",
            sort_order: sortOrder,
          });
        });
      });

      for (let j = 0; j < allItemRows.length; j += ESTIMATE_ITEMS_INSERT_BATCH) {
        const itemChunk = allItemRows.slice(j, j + ESTIMATE_ITEMS_INSERT_BATCH);
        const { error: itemErr } = await supabase.from("estimate_items").insert(itemChunk);
        if (itemErr) errors.push("Items: " + itemErr.message);
      }
      imported += chunk.length;
    }

    revalidatePath("/dashboard/estimates");
    return {
      imported,
      skipped: skippedDuplicateNumber.length,
      skippedNoCustomer: [],
      skippedDuplicateNumber,
      errors,
    };
  })();
}

async function runLegacyImport(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  mappedEstimates: MappedEstimate[]
): Promise<ImportEstimatesResult> {
  let imported = 0;
  const skippedNoCustomer: string[] = [];
  const skippedDuplicateNumber: string[] = [];
  const errors: string[] = [];
  const customerCache = new Map<string, string | null>();

  for (const est of mappedEstimates) {
    const nameKey = est.customer_name.trim().toLowerCase();
    let customerId = est.customer_id?.trim() ?? customerCache.get(nameKey);
    if (customerId === undefined) {
      customerId = await getCustomerIdByName(supabase, companyId, est.customer_name);
      customerCache.set(nameKey, customerId);
    }
    if (!customerId) {
      skippedNoCustomer.push(est.customer_name || est.estimate_number || "?");
      continue;
    }

    const validStatus = normalizeStatus(est.status);
    const validUntil = (est.valid_until && est.valid_until.trim()) || null;
    const discountType = est.discount_type === "percentage" ? "percentage" : "amount";

    const { data: inserted, error: insErr } = await supabase
      .from("estimates")
      .insert({
        company_id: companyId,
        customer_id: customerId,
        estimate_number: est.estimate_number.trim(),
        estimate_date: est.estimate_date,
        status: validStatus,
        valid_until: validUntil,
        notes: est.notes,
        payment_terms: est.payment_terms,
        subject: est.subject,
        project_name: est.project_name,
        total_amount: est.total_amount,
        total_tax: est.total_tax,
        discount_amount: est.discount_amount,
        discount_type: discountType,
      })
      .select("id")
      .single();

    if (insErr) {
      if (insErr.code === "23505") {
        skippedDuplicateNumber.push(est.estimate_number);
      } else {
        errors.push(`${est.estimate_number}: ${insErr.message}`);
      }
      continue;
    }
    if (!inserted) continue;

    if (est.items.length > 0) {
      const itemRows = est.items.map((it, i) => ({
        estimate_id: inserted.id,
        item_number: "",
        product_description: it.product_description || "—",
        hs_code: "",
        rate_label: "",
        uom: it.uom || "Nos",
        quantity: it.quantity,
        unit_price: it.unit_price,
        value_sales_excluding_st: it.value_sales_excluding_st,
        sales_tax_applicable: it.sales_tax_applicable ?? 0,
        sales_tax_withheld_at_source: 0,
        extra_tax: 0,
        further_tax: 0,
        discount: it.discount ?? 0,
        total_values: it.total_values,
        sale_type: "Goods at standard rate (default)",
        sort_order: i,
      }));
      await supabase.from("estimate_items").insert(itemRows);
    }
    imported += 1;
  }

  revalidatePath("/dashboard/estimates");
  const skipped = skippedNoCustomer.length + skippedDuplicateNumber.length;
  return {
    imported,
    skipped,
    skippedNoCustomer,
    skippedDuplicateNumber,
    errors,
  };
}
