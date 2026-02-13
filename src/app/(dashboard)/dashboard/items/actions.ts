"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ItemFormState = { error?: string; itemId?: string };

export type ItemListItem = {
  id: string;
  name: string;
  description: string | null;
  reference: string | null;
  hs_code: string | null;
  unit_rate: number | null;
  default_tax_rate_id: string | null;
  uom_id: string | null;
  sale_type: string | null;
  rate_label?: string;
  uom_code?: string;
  created_at?: string;
  updated_at?: string | null;
};

export type ItemSearchResult = {
  id: string;
  name: string;
  description: string | null;
  reference: string | null;
  hs_code: string | null;
  unit_rate: number | null;
  rate_label: string;
  uom: string;
  sale_type: string;
};

export async function searchItems(
  companyId: string,
  query: string
): Promise<ItemSearchResult[]> {
  const raw = (query || "").trim();
  if (!raw) return [];

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const q = raw.replace(/%/g, "").replace(/_/g, " ");
  if (!q) return [];

  const pattern = `%${q}%`;
  const { data, error } = await supabase
    .from("items")
    .select(`
      id,
      name,
      description,
      reference,
      hs_code,
      unit_rate,
      sale_type,
      tax_rates(rate_label),
      uom(code)
    `)
    .eq("company_id", companyId)
    .or(`name.ilike.${pattern},description.ilike.${pattern},reference.ilike.${pattern}`)
    .order("name")
    .limit(20);

  if (error) return [];

  return (data ?? []).map((row) => mapRowToItemSearchResult(row as Record<string, unknown>));
}

function mapRowToItemSearchResult(row: Record<string, unknown>): ItemSearchResult {
  const tax = row.tax_rates as { rate_label?: string } | null;
  const uomRow = row.uom as { code?: string } | null;
  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string | null) ?? null,
    reference: (row.reference as string | null) ?? null,
    hs_code: (row.hs_code as string | null) ?? null,
    unit_rate: row.unit_rate != null ? Number(row.unit_rate) : null,
    rate_label: tax?.rate_label ?? "",
    uom: uomRow?.code ?? "Nos",
    sale_type: (row.sale_type as string) ?? "Goods at standard rate (default)",
  };
}

export async function getItemsForPicker(
  companyId: string,
  query?: string,
  limit = 50
): Promise<ItemSearchResult[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  let dbQuery = supabase
    .from("items")
    .select(`
      id,
      name,
      description,
      reference,
      hs_code,
      unit_rate,
      sale_type,
      tax_rates(rate_label),
      uom(code)
    `)
    .eq("company_id", companyId)
    .order("name", { ascending: true })
    .limit(limit);

  const raw = (query || "").trim();
  if (raw) {
    const q = raw.replace(/%/g, "").replace(/_/g, " ");
    if (q) {
      const pattern = `%${q}%`;
      dbQuery = dbQuery.or(`name.ilike.${pattern},description.ilike.${pattern},reference.ilike.${pattern}`);
    }
  }

  const { data, error } = await dbQuery;

  if (error) return [];

  return (data ?? []).map((row) => mapRowToItemSearchResult(row as Record<string, unknown>));
}

function escapeIlikePattern(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export async function getItemsList(
  companyId: string,
  page: number,
  perPage: number,
  searchQuery?: string | null
): Promise<{ totalCount: number; list: ItemListItem[] }> {
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
    .from("items")
    .select(
      "id, name, description, reference, hs_code, unit_rate, default_tax_rate_id, uom_id, sale_type, created_at, updated_at, tax_rates(rate_label), uom(code)",
      { count: "exact" }
    )
    .eq("company_id", companyId)
    .order("name", { ascending: true });

  const q = searchQuery?.trim();
  if (q && q.length > 0) {
    const pattern = `%${escapeIlikePattern(q)}%`;
    query = query.or(`name.ilike.${pattern},description.ilike.${pattern},reference.ilike.${pattern}`);
  }

  const { data: rows, count, error } = await query.range(from, to);

  if (error) {
    console.error("[getItemsList]", error);
    return { totalCount: 0, list: [] };
  }

  const list: ItemListItem[] = (rows ?? []).map((r: Record<string, unknown>) => {
    const tax = r.tax_rates as { rate_label?: string } | null;
    const uomRow = r.uom as { code?: string } | null;
    return {
      id: r.id as string,
      name: r.name as string,
      description: (r.description as string | null) ?? null,
      reference: (r.reference as string | null) ?? null,
      hs_code: (r.hs_code as string | null) ?? null,
      unit_rate: r.unit_rate != null ? Number(r.unit_rate) : null,
      default_tax_rate_id: (r.default_tax_rate_id as string | null) ?? null,
      uom_id: (r.uom_id as string | null) ?? null,
      sale_type: (r.sale_type as string | null) ?? null,
      rate_label: tax?.rate_label ?? undefined,
      uom_code: uomRow?.code ?? undefined,
      created_at: r.created_at as string | undefined,
      updated_at: (r.updated_at as string | null) ?? null,
    };
  });

  return { totalCount: count ?? 0, list };
}

export async function createItem(
  companyId: string,
  _prev: ItemFormState,
  formData: FormData
): Promise<ItemFormState> {
  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Item name is required." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in to add an item." };

  const defaultTaxRateId = (formData.get("default_tax_rate_id") as string)?.trim() || null;
  const uomId = (formData.get("uom_id") as string)?.trim() || null;
  const unitRateRaw = (formData.get("unit_rate") as string)?.trim();
  const unitRate = unitRateRaw ? parseFloat(unitRateRaw) : null;

  const { data, error } = await supabase
    .from("items")
    .insert({
      company_id: companyId,
      name,
      description: (formData.get("description") as string)?.trim() || null,
      reference: (formData.get("reference") as string)?.trim() || null,
      hs_code: (formData.get("hs_code") as string)?.trim() || null,
      unit_rate: unitRate,
      default_tax_rate_id: defaultTaxRateId || null,
      uom_id: uomId || null,
      sale_type: (formData.get("sale_type") as string)?.trim() || "Goods at standard rate (default)",
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/dashboard/items");
  return { itemId: data?.id };
}

export async function updateItem(
  itemId: string,
  companyId: string,
  _prev: ItemFormState,
  formData: FormData
): Promise<ItemFormState> {
  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Item name is required." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in to update an item." };

  const defaultTaxRateId = (formData.get("default_tax_rate_id") as string)?.trim() || null;
  const uomId = (formData.get("uom_id") as string)?.trim() || null;
  const unitRateRaw = (formData.get("unit_rate") as string)?.trim();
  const unitRate = unitRateRaw ? parseFloat(unitRateRaw) : null;

  const { error } = await supabase
    .from("items")
    .update({
      name,
      description: (formData.get("description") as string)?.trim() || null,
      reference: (formData.get("reference") as string)?.trim() || null,
      hs_code: (formData.get("hs_code") as string)?.trim() || null,
      unit_rate: unitRate,
      default_tax_rate_id: defaultTaxRateId || null,
      uom_id: uomId || null,
      sale_type: (formData.get("sale_type") as string)?.trim() || "Goods at standard rate (default)",
      updated_at: new Date().toISOString(),
    })
    .eq("id", itemId)
    .eq("company_id", companyId);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/items");
  return {};
}

export async function deleteItem(itemId: string, companyId: string): Promise<ItemFormState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in to delete an item." };

  const { error } = await supabase
    .from("items")
    .delete()
    .eq("id", itemId)
    .eq("company_id", companyId);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/items");
  return {};
}

export type DeleteItemsResult = {
  error?: string;
  deletedCount?: number;
  skippedCount?: number;
  deletedIds?: string[];
};

const DELETE_ITEMS_CHUNK_SIZE = 80;

export async function deleteItems(
  companyId: string,
  itemIds: string[]
): Promise<DeleteItemsResult> {
  if (itemIds.length === 0) return { deletedCount: 0, skippedCount: 0, deletedIds: [] };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in to delete items." };

  const idsToDelete = [...itemIds];
  const deletedIds: string[] = [];
  const chunkSize = DELETE_ITEMS_CHUNK_SIZE;

  for (let i = 0; i < idsToDelete.length; i += chunkSize) {
    const chunk = idsToDelete.slice(i, i + chunkSize);
    const { error } = await supabase
      .from("items")
      .delete()
      .eq("company_id", companyId)
      .in("id", chunk);
    if (error) {
      console.error("[deleteItems] error:", error.message);
      return { error: error.message };
    }
    deletedIds.push(...chunk);
  }

  revalidatePath("/dashboard/items");
  return { deletedCount: deletedIds.length, skippedCount: 0, deletedIds };
}

export async function getItemById(
  companyId: string,
  itemId: string
): Promise<ItemListItem | null> {
  if (!itemId) return null;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("items")
    .select("id, name, description, reference, hs_code, unit_rate, default_tax_rate_id, uom_id, sale_type, created_at, updated_at, tax_rates(rate_label), uom(code)")
    .eq("id", itemId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (error || !data) return null;
  const r = data as Record<string, unknown>;
  const tax = r.tax_rates as { rate_label?: string } | null;
  const uomRow = r.uom as { code?: string } | null;
  return {
    id: r.id as string,
    name: r.name as string,
    description: (r.description as string | null) ?? null,
    reference: (r.reference as string | null) ?? null,
    hs_code: (r.hs_code as string | null) ?? null,
    unit_rate: r.unit_rate != null ? Number(r.unit_rate) : null,
    default_tax_rate_id: (r.default_tax_rate_id as string | null) ?? null,
    uom_id: (r.uom_id as string | null) ?? null,
    sale_type: (r.sale_type as string | null) ?? null,
    rate_label: tax?.rate_label ?? undefined,
    uom_code: uomRow?.code ?? undefined,
    created_at: r.created_at as string | undefined,
    updated_at: (r.updated_at as string | null) ?? null,
  };
}

export async function getItemDocumentCounts(
  itemId: string,
  companyId: string
): Promise<{ estimatesCount: number; invoicesCount: number }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { estimatesCount: 0, invoicesCount: 0 };

  const [est, inv] = await Promise.all([
    supabase.from("estimate_items").select("id", { count: "exact", head: true }).eq("item_id", itemId),
    supabase.from("sales_invoice_items").select("id", { count: "exact", head: true }).eq("item_id", itemId),
  ]);

  return {
    estimatesCount: est.count ?? 0,
    invoicesCount: inv.count ?? 0,
  };
}

export async function duplicateItem(
  itemId: string,
  companyId: string
): Promise<{ error?: string; itemId?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in to copy an item." };

  const { data: existing } = await supabase
    .from("items")
    .select("name, description, reference, hs_code, unit_rate, default_tax_rate_id, uom_id, sale_type")
    .eq("id", itemId)
    .eq("company_id", companyId)
    .single();
  if (!existing) return { error: "Item not found." };

  const { data: inserted, error } = await supabase
    .from("items")
    .insert({
      company_id: companyId,
      name: "Copy of " + (existing.name ?? "").trim(),
      description: existing.description ?? null,
      reference: existing.reference ?? null,
      hs_code: existing.hs_code ?? null,
      unit_rate: existing.unit_rate ?? null,
      default_tax_rate_id: existing.default_tax_rate_id ?? null,
      uom_id: existing.uom_id ?? null,
      sale_type: existing.sale_type ?? "Goods at standard rate (default)",
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/dashboard/items");
  return { itemId: inserted?.id };
}

const EXPORT_ITEMS_LIMIT = 10_000;

export async function exportItemsCsv(
  companyId: string
): Promise<{ error?: string; csv?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in to export." };

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("id", companyId)
    .eq("user_id", user.id)
    .single();
  if (!company) return { error: "Company not found." };

  const { data: rows } = await supabase
    .from("items")
    .select("name, description, reference, hs_code, unit_rate, sale_type, tax_rates(rate_label), uom(code)")
    .eq("company_id", companyId)
    .order("name", { ascending: true })
    .limit(EXPORT_ITEMS_LIMIT);

  const header = "name,description,reference,hs_code,unit_rate,rate_label,uom,sale_type";
  const escape = (v: string | number | null | undefined) => {
    if (v == null) return "";
    const s = String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };
  const lines = [header];
  for (const r of rows ?? []) {
    const rr = r as Record<string, unknown>;
    const tax = rr.tax_rates as { rate_label?: string } | null;
    const uomRow = rr.uom as { code?: string } | null;
    lines.push(
      [
        escape(rr.name as string),
        escape(rr.description as string),
        escape(rr.reference as string),
        escape(rr.hs_code as string),
        escape(rr.unit_rate != null ? Number(rr.unit_rate) : null),
        escape(tax?.rate_label ?? ""),
        escape(uomRow?.code ?? ""),
        escape(rr.sale_type as string),
      ].join(",")
    );
  }
  return { csv: lines.join("\r\n") };
}

export type ImportItemsResult = {
  error?: string;
  imported: number;
  skipped: number;
  errors: string[];
};

export async function importItemsFromCsv(
  companyId: string,
  rows: Record<string, string>[],
  columnMapping: Record<string, string | string[]>
): Promise<ImportItemsResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in to import items.", imported: 0, skipped: 0, errors: [] };

  const get = (field: string, row: Record<string, string>): string | null => {
    const colOrCols = columnMapping[field];
    if (colOrCols == null) return null;
    if (Array.isArray(colOrCols)) {
      const combined = colOrCols
        .filter((c) => c && c.trim())
        .map((c) => (row[c] ?? "").trim())
        .filter(Boolean)
        .join(" ");
      return combined || null;
    }
    const v = (row[colOrCols] ?? "").trim();
    return v || null;
  };

  const { data: taxRates } = await supabase
    .from("tax_rates")
    .select("id, rate_label")
    .eq("company_id", companyId);
  const rateLabelToId = new Map<string, string>();
  for (const tr of taxRates ?? []) {
    if (tr.rate_label) rateLabelToId.set(tr.rate_label.trim(), tr.id);
  }

  const { data: uomRows } = await supabase.from("uom").select("id, code");
  const uomCodeToId = new Map<string, string>();
  for (const u of uomRows ?? []) {
    if (u.code) uomCodeToId.set(u.code.trim(), u.id);
  }

  const toInsert: {
    company_id: string;
    name: string;
    description: string | null;
    reference: string | null;
    hs_code: string | null;
    unit_rate: number | null;
    default_tax_rate_id: string | null;
    uom_id: string | null;
    sale_type: string;
  }[] = [];
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const name = (get("name", row) ?? "").trim();
    if (!name) {
      skipped += 1;
      continue;
    }
    const unitRateRaw = get("unit_rate", row);
    const unitRate = unitRateRaw ? parseFloat(String(unitRateRaw).replace(/,/g, "")) : null;
    const uomCode = get("uom", row);
    const uomId = uomCode && uomCodeToId.has(uomCode.trim()) ? uomCodeToId.get(uomCode.trim())! : null;
    const rateLabel = get("rate_label", row);
    const defaultTaxRateId = rateLabel && rateLabelToId.has(rateLabel.trim()) ? rateLabelToId.get(rateLabel.trim())! : null;

    toInsert.push({
      company_id: companyId,
      name,
      description: get("description", row),
      reference: get("reference", row),
      hs_code: get("hs_code", row),
      unit_rate: Number.isFinite(unitRate) ? unitRate : null,
      default_tax_rate_id: defaultTaxRateId,
      uom_id: uomId,
      sale_type: (get("sale_type", row) ?? "Goods at standard rate (default)").trim() || "Goods at standard rate (default)",
    });
  }

  const BATCH = 100;
  let imported = 0;
  for (let i = 0; i < toInsert.length; i += BATCH) {
    const batch = toInsert.slice(i, i + BATCH);
    const { error } = await supabase.from("items").insert(batch);
    if (error) {
      errors.push(error.message);
      break;
    }
    imported += batch.length;
  }

  revalidatePath("/dashboard/items");
  return { imported, skipped, errors };
}

export type TaxRateOption = { id: string; rate_value: number; rate_label: string };
export type UomOption = { id: string; code: string; description: string };

export async function getTaxRatesForCompany(companyId: string): Promise<TaxRateOption[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("tax_rates")
    .select("id, rate_value, rate_label")
    .eq("company_id", companyId)
    .order("rate_value", { ascending: true });
  return (data ?? []) as TaxRateOption[];
}

export async function getUomList(): Promise<UomOption[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("uom")
    .select("id, code, description")
    .order("code", { ascending: true });
  return (data ?? []) as UomOption[];
}
