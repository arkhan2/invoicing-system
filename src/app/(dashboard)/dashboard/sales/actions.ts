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

function toInvoiceItemRow(
  it: LineItemInput,
  salesInvoiceId: string,
  sortOrder: number
): Record<string, unknown> {
  return {
    sales_invoice_id: salesInvoiceId,
    item_number: it.item_number ?? "",
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
    sort_order: sortOrder,
  };
}

const INVOICE_NUMBER_DIGITS = 6;

async function getNextInvoiceNumber(
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
      .from("sales_invoices")
      .select("invoice_number")
      .eq("company_id", companyId)
      .range(offset, offset + pageSize - 1);
    const list = rows ?? [];
    hasMore = list.length === pageSize;
    offset += pageSize;
    for (const r of list) {
      const raw = (r.invoice_number ?? "").trim();
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

/** Returns the next invoice number (e.g. INV-000001) for display when creating a new invoice. */
export async function getNextInvoiceNumberForDisplay(companyId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: company } = await supabase
    .from("companies")
    .select("sales_invoice_prefix")
    .eq("id", companyId)
    .eq("user_id", user.id)
    .single();
  if (!company) return null;
  const prefix = company.sales_invoice_prefix ?? "INV";
  const nextNum = await getNextInvoiceNumber(supabase, companyId, prefix);
  return `${prefix}-${String(nextNum).padStart(INVOICE_NUMBER_DIGITS, "0")}`;
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
    .select("sales_invoice_prefix")
    .eq("id", companyId)
    .eq("user_id", user.id)
    .single();
  if (!company) return { error: "Company not found." };

  const prefix = company.sales_invoice_prefix ?? "INV";
  const nextNum = await getNextInvoiceNumber(supabase, companyId, prefix);
  const invoiceNumber = `${prefix}-${String(nextNum).padStart(INVOICE_NUMBER_DIGITS, "0")}`;
  const invoiceDate = (formData.get("invoice_date") as string) || new Date().toISOString().slice(0, 10);
  const status = (formData.get("status") as string) || "Draft";
  const validStatus = ["Draft", "Final", "Sent"].includes(status) ? status : "Draft";
  const invoiceRefNo = (formData.get("invoice_ref_no") as string)?.trim() || null;
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

  const { data: invoice, error: invErr } = await supabase
    .from("sales_invoices")
    .insert({
      company_id: companyId,
      customer_id: customerId,
      invoice_number: invoiceNumber,
      invoice_date: invoiceDate,
      status: validStatus,
      invoice_ref_no: invoiceRefNo,
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
  if (invErr) return { error: invErr.message };

  const itemRows = items.map((it, i) => toInvoiceItemRow(it, invoice.id, i));
  const { error: itemsErr } = await supabase.from("sales_invoice_items").insert(itemRows);
  if (itemsErr) return { error: itemsErr.message };

  await supabase.from("companies").update({ sales_invoice_next_number: nextNum + 1 }).eq("id", companyId).eq("user_id", user.id);
  revalidatePath("/dashboard/sales");
  return { invoiceId: invoice.id };
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

  const invoiceDate = (formData.get("invoice_date") as string) || new Date().toISOString().slice(0, 10);
  const status = (formData.get("status") as string) || "Draft";
  const validStatus = ["Draft", "Final", "Sent"].includes(status) ? status : "Draft";
  const invoiceRefNo = (formData.get("invoice_ref_no") as string)?.trim() || null;
  const notes = (formData.get("notes") as string)?.trim() || null;
  const projectName = (formData.get("project_name") as string)?.trim() || null;
  const subject = (formData.get("subject") as string)?.trim() || null;
  const paymentTerms = (formData.get("payment_terms") as string)?.trim() || null;
  const deliveryTimeAmountRaw = formData.get("delivery_time_amount") as string;
  const deliveryTimeAmount = deliveryTimeAmountRaw != null && deliveryTimeAmountRaw !== "" ? parseInt(String(deliveryTimeAmountRaw), 10) : null;
  const deliveryTimeUnit = (formData.get("delivery_time_unit") as string)?.trim() || null;
  const validUnit = deliveryTimeUnit === "days" || deliveryTimeUnit === "weeks" || deliveryTimeUnit === "months" ? deliveryTimeUnit : null;

  const { error: upErr } = await supabase
    .from("sales_invoices")
    .update({
      customer_id: customerId,
      invoice_date: invoiceDate,
      status: validStatus,
      invoice_ref_no: invoiceRefNo,
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
    .eq("id", invoiceId)
    .eq("company_id", companyId);
  if (upErr) return { error: upErr.message };

  await supabase.from("sales_invoice_items").delete().eq("sales_invoice_id", invoiceId);
  const itemRows = items.map((it, i) => toInvoiceItemRow(it, invoiceId, i));
  const { error: itemsErr } = await supabase.from("sales_invoice_items").insert(itemRows);
  if (itemsErr) return { error: itemsErr.message };

  revalidatePath("/dashboard/sales");
  return {};
}

export async function getInvoiceWithItems(invoiceId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: invoice } = await supabase
    .from("sales_invoices")
    .select("id, company_id, customer_id, estimate_id, invoice_number, invoice_date, status, invoice_ref_no, notes, project_name, subject, payment_terms, delivery_time_amount, delivery_time_unit, total_amount, total_tax, discount_amount, discount_type, sales_tax_rate_id")
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

function escapeIlikePattern(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export async function getInvoicesList(
  companyId: string,
  page: number,
  perPage: number,
  searchQuery?: string | null,
  customerId?: string | null
): Promise<{ totalCount: number; list: Array<{
  id: string;
  invoice_number: string;
  invoice_date: string;
  status: string;
  total_amount: number | null;
  total_tax: number | null;
  customer_name: string;
  customer_id: string;
  estimate_number: string | null;
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
    .from("sales_invoices")
    .select(
      `
      id,
      invoice_number,
      invoice_date,
      status,
      total_amount,
      total_tax,
      estimate_id,
      customer:customers(id, name)
    `,
      { count: "exact" }
    )
    .eq("company_id", companyId)
    .order("invoice_date", { ascending: false });

  if (customerId?.trim()) {
    query = query.eq("customer_id", customerId.trim());
  }

  const q = searchQuery?.trim();
  if (q && q.length > 0) {
    const pattern = `%${escapeIlikePattern(q)}%`;
    const [customerRowsRes, itemsByDescRes, itemsByNumberRes, estimateNumbersRes] = await Promise.all([
      supabase.from("customers").select("id").eq("company_id", companyId).ilike("name", pattern),
      supabase.from("sales_invoice_items").select("sales_invoice_id").ilike("product_description", pattern),
      supabase.from("sales_invoice_items").select("sales_invoice_id").ilike("item_number", pattern),
      supabase.from("estimates").select("id, estimate_number").eq("company_id", companyId).ilike("estimate_number", pattern),
    ]);
    const customerIds = (customerRowsRes.data ?? []).map((r) => r.id).filter(Boolean);
    const invoiceIdsFromItems = [
      ...new Set([
        ...(itemsByDescRes.data ?? []).map((r) => r.sales_invoice_id),
        ...(itemsByNumberRes.data ?? []).map((r) => r.sales_invoice_id),
      ].filter(Boolean)),
    ];
    const estimateIdsFromNumber = (estimateNumbersRes.data ?? []).map((r) => r.id).filter(Boolean);
    const orParts = [
      `invoice_number.ilike.${pattern}`,
      `status.ilike.${pattern}`,
    ];
    if (customerIds.length > 0) orParts.push(`customer_id.in.(${customerIds.join(",")})`);
    if (invoiceIdsFromItems.length > 0) orParts.push(`id.in.(${invoiceIdsFromItems.join(",")})`);
    if (estimateIdsFromNumber.length > 0) orParts.push(`estimate_id.in.(${estimateIdsFromNumber.join(",")})`);
    query = query.or(orParts.join(","));
  }

  const { data: invoices, error, count } = await query.range(from, to);
  if (error) return { totalCount: 0, list: [] };

  const estimateIds = [...new Set((invoices ?? []).map((inv) => inv.estimate_id).filter(Boolean))] as string[];
  let estimateNumberById: Record<string, string> = {};
  if (estimateIds.length > 0) {
    const { data: estRows } = await supabase
      .from("estimates")
      .select("id, estimate_number")
      .in("id", estimateIds);
    for (const row of estRows ?? []) {
      estimateNumberById[row.id] = row.estimate_number ?? "";
    }
  }

  const list = (invoices ?? []).map((inv) => ({
    id: inv.id,
    invoice_number: inv.invoice_number,
    invoice_date: inv.invoice_date,
    status: inv.status,
    total_amount: inv.total_amount,
    total_tax: inv.total_tax,
    customer_name: (inv.customer as { name?: string } | null)?.name ?? "",
    customer_id: (inv.customer as { id?: string } | null)?.id ?? "",
    estimate_number: inv.estimate_id ? (estimateNumberById[inv.estimate_id] ?? null) : null,
  }));

  return { totalCount: count ?? 0, list };
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

const DELETE_INVOICES_CHUNK_SIZE = 80;

export type DeleteInvoicesResult = {
  error?: string;
  deletedCount: number;
  deletedIds: string[];
};

export async function deleteInvoices(
  companyId: string,
  invoiceIds: string[]
): Promise<DeleteInvoicesResult> {
  if (invoiceIds.length === 0) return { deletedCount: 0, deletedIds: [] };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in to delete invoices.", deletedCount: 0, deletedIds: [] };

  const chunkSize = DELETE_INVOICES_CHUNK_SIZE;
  const deletedIds: string[] = [];
  for (let i = 0; i < invoiceIds.length; i += chunkSize) {
    const chunk = invoiceIds.slice(i, i + chunkSize);
    const { error } = await supabase
      .from("sales_invoices")
      .delete()
      .eq("company_id", companyId)
      .in("id", chunk);
    if (error) {
      console.error("[deleteInvoices] error:", error.message, { companyId, chunkIndex: i / chunkSize });
      return { error: error.message, deletedCount: deletedIds.length, deletedIds };
    }
    deletedIds.push(...chunk);
  }
  revalidatePath("/dashboard/sales");
  return { deletedCount: deletedIds.length, deletedIds };
}
