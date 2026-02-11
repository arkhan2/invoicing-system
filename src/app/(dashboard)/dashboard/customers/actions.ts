"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type CustomerFormState = { error?: string; customerId?: string };

function validateEmail(email: string | null): string | null {
  if (!email || !email.trim()) return null;
  if (!/.+@.+\..+/.test(email.trim())) return "Please enter a valid email address.";
  return null;
}

function validatePhone(phone: string | null): string | null {
  if (!phone || !phone.trim()) return null;
  const cleaned = phone.replace(/[\s\-+()]/g, "");
  if (!/^\d+$/.test(cleaned) || cleaned.length < 7 || cleaned.length > 20) {
    return "Please enter a valid phone number (7–20 digits).";
  }
  return null;
}

export async function checkDuplicateCustomer(
  companyId: string,
  name: string,
  ntn_cnic?: string | null,
  excludeCustomerId?: string
): Promise<{ duplicate: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { duplicate: false };

  const trimmedName = (name ?? "").trim();
  if (!trimmedName) return { duplicate: false };

  let query = supabase
    .from("customers")
    .select("id")
    .eq("company_id", companyId)
    .ilike("name", trimmedName);
  if (excludeCustomerId) query = query.neq("id", excludeCustomerId);
  const { data: byName } = await query.limit(1).maybeSingle();
  if (byName) return { duplicate: true };

  const trimmedNtn = (ntn_cnic ?? "").trim();
  if (!trimmedNtn) return { duplicate: false };

  let queryNtn = supabase
    .from("customers")
    .select("id")
    .eq("company_id", companyId)
    .ilike("ntn_cnic", trimmedNtn);
  if (excludeCustomerId) queryNtn = queryNtn.neq("id", excludeCustomerId);
  const { data: byNtn } = await queryNtn.limit(1).maybeSingle();
  return { duplicate: !!byNtn };
}

export type DeleteCustomersResult = {
  error?: string;
  deletedCount?: number;
  skippedCount?: number;
  deletedIds?: string[];
};

export async function createCustomer(
  companyId: string,
  _prev: CustomerFormState,
  formData: FormData
): Promise<CustomerFormState> {
  const name = (formData.get("name") as string)?.trim();
  if (!name) {
    return { error: "Customer name is required." };
  }

  const email = (formData.get("email") as string)?.trim() || null;
  const phone = (formData.get("phone") as string)?.trim() || null;
  const emailErr = validateEmail(email);
  if (emailErr) return { error: emailErr };
  const phoneErr = validatePhone(phone);
  if (phoneErr) return { error: phoneErr };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in to add a customer." };
  }

  const country = (formData.get("country") as string)?.trim() || null;
  const { data, error } = await supabase
    .from("customers")
    .insert({
      company_id: companyId,
      name,
      contact_person_name: (formData.get("contact_person_name") as string)?.trim() || null,
      ntn_cnic: (formData.get("ntn_cnic") as string)?.trim() || null,
      address: (formData.get("address") as string)?.trim() || null,
      city: (formData.get("city") as string)?.trim() || null,
      province: (formData.get("province") as string)?.trim() || null,
      country,
      registration_type: ["Registered", "Unregistered"].includes(
        (formData.get("registration_type") as string) || ""
      )
        ? (formData.get("registration_type") as string)
        : null,
      phone: phone,
      email: email,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/dashboard/customers");
  revalidatePath("/dashboard/estimates");
  return { customerId: data?.id };
}

export async function updateCustomer(
  customerId: string,
  companyId: string,
  _prev: CustomerFormState,
  formData: FormData
): Promise<CustomerFormState> {
  const name = (formData.get("name") as string)?.trim();
  if (!name) {
    return { error: "Customer name is required." };
  }

  const email = (formData.get("email") as string)?.trim() || null;
  const phone = (formData.get("phone") as string)?.trim() || null;
  const emailErr = validateEmail(email);
  if (emailErr) return { error: emailErr };
  const phoneErr = validatePhone(phone);
  if (phoneErr) return { error: phoneErr };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in to update a customer." };
  }

  const { error } = await supabase
    .from("customers")
    .update({
      name,
      contact_person_name: (formData.get("contact_person_name") as string)?.trim() || null,
      ntn_cnic: (formData.get("ntn_cnic") as string)?.trim() || null,
      address: (formData.get("address") as string)?.trim() || null,
      city: (formData.get("city") as string)?.trim() || null,
      province: (formData.get("province") as string)?.trim() || null,
      country: (formData.get("country") as string)?.trim() || null,
      registration_type: ["Registered", "Unregistered"].includes(
        (formData.get("registration_type") as string) || ""
      )
        ? (formData.get("registration_type") as string)
        : null,
      phone,
      email,
      updated_at: new Date().toISOString(),
    })
    .eq("id", customerId)
    .eq("company_id", companyId);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/customers");
  revalidatePath("/dashboard/estimates");
  return {};
}

export async function getCustomerDocumentCounts(
  customerId: string,
  companyId: string
): Promise<{ estimatesCount: number; invoicesCount: number }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { estimatesCount: 0, invoicesCount: 0 };

  const [est, inv] = await Promise.all([
    supabase
      .from("estimates")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("customer_id", customerId),
    supabase
      .from("sales_invoices")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("customer_id", customerId),
  ]);
  return {
    estimatesCount: est.count ?? 0,
    invoicesCount: inv.count ?? 0,
  };
}

export type CustomerListItem = {
  id: string;
  name: string;
  contact_person_name: string | null;
  ntn_cnic: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  country: string | null;
  registration_type: string | null;
  phone: string | null;
  email: string | null;
  created_at?: string;
  updated_at?: string | null;
};

function escapeIlikePattern(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export async function getCustomersList(
  companyId: string,
  page: number,
  perPage: number,
  searchQuery?: string | null
): Promise<{ totalCount: number; list: CustomerListItem[] }> {
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
    .from("customers")
    .select(
      "id, name, contact_person_name, ntn_cnic, address, city, province, country, registration_type, phone, email, created_at, updated_at",
      { count: "exact" }
    )
    .eq("company_id", companyId)
    .order("name", { ascending: true });

  const q = searchQuery?.trim();
  if (q && q.length > 0) {
    const pattern = `%${escapeIlikePattern(q)}%`;
    query = query.or(`name.ilike.${pattern},ntn_cnic.ilike.${pattern}`);
  }

  const { data: rows, count, error } = await query.range(from, to);

  if (error) {
    console.error("[getCustomersList]", error);
    return { totalCount: 0, list: [] };
  }

  const list: CustomerListItem[] = (rows ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    contact_person_name: c.contact_person_name ?? null,
    ntn_cnic: c.ntn_cnic ?? null,
    address: c.address ?? null,
    city: c.city ?? null,
    province: c.province ?? null,
    country: c.country ?? null,
    registration_type: c.registration_type ?? null,
    phone: c.phone ?? null,
    email: c.email ?? null,
    created_at: c.created_at ?? undefined,
    updated_at: c.updated_at ?? null,
  }));

  return { totalCount: count ?? 0, list };
}

export async function duplicateCustomer(
  customerId: string,
  companyId: string
): Promise<{ error?: string; customerId?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in to copy a customer." };

  const { data: existing } = await supabase
    .from("customers")
    .select("id, name, contact_person_name, ntn_cnic, address, city, province, country, registration_type, phone, email")
    .eq("id", customerId)
    .eq("company_id", companyId)
    .single();
  if (!existing) return { error: "Customer not found." };

  const { data: inserted, error } = await supabase
    .from("customers")
    .insert({
      company_id: companyId,
      name: "Copy of " + (existing.name ?? "").trim(),
      contact_person_name: existing.contact_person_name ?? null,
      ntn_cnic: existing.ntn_cnic ?? null,
      address: existing.address ?? null,
      city: existing.city ?? null,
      province: existing.province ?? null,
      country: existing.country ?? null,
      registration_type: existing.registration_type ?? null,
      phone: existing.phone ?? null,
      email: existing.email ?? null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/dashboard/customers");
  return { customerId: inserted?.id };
}

const EXPORT_CUSTOMERS_LIMIT = 10_000;

export async function exportCustomersCsv(
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
    .from("customers")
    .select("name, contact_person_name, email, phone, address, city, province, country, ntn_cnic, registration_type")
    .eq("company_id", companyId)
    .order("name", { ascending: true })
    .limit(EXPORT_CUSTOMERS_LIMIT);

  const header = "name,contact_person_name,email,phone,address,city,province,country,ntn_cnic,registration_type";
  const escape = (v: string | null | undefined) => {
    if (v == null) return "";
    const s = String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };
  const lines = [header];
  for (const r of rows ?? []) {
    lines.push(
      [
        escape(r.name),
        escape(r.contact_person_name ?? null),
        escape(r.email ?? null),
        escape(r.phone ?? null),
        escape(r.address ?? null),
        escape(r.city ?? null),
        escape(r.province ?? null),
        escape(r.country ?? null),
        escape(r.ntn_cnic ?? null),
        escape(r.registration_type ?? null),
      ].join(",")
    );
  }
  return { csv: lines.join("\r\n") };
}

export async function deleteCustomer(
  customerId: string,
  companyId: string
): Promise<CustomerFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in to delete a customer." };
  }

  // Do not delete if linked to estimates or invoices (same rule as bulk delete)
  const { data: estimate } = await supabase
    .from("estimates")
    .select("id")
    .eq("company_id", companyId)
    .eq("customer_id", customerId)
    .limit(1)
    .maybeSingle();
  if (estimate) {
    return { error: "Cannot delete: this customer has estimates." };
  }
  const { data: invoice } = await supabase
    .from("sales_invoices")
    .select("id")
    .eq("company_id", companyId)
    .eq("customer_id", customerId)
    .limit(1)
    .maybeSingle();
  if (invoice) {
    return { error: "Cannot delete: this customer has sales invoices." };
  }

  const { error } = await supabase
    .from("customers")
    .delete()
    .eq("id", customerId)
    .eq("company_id", companyId);
  if (error) {
    console.error("[deleteCustomer] error:", error.message, { customerId, companyId, code: error.code, details: error.details });
    return { error: error.message };
  }
  revalidatePath("/dashboard/customers");
  revalidatePath("/dashboard/estimates");
  return {};
}

/** PostgREST encodes .in() in the URL; large arrays cause 400 Bad Request. Process in chunks. */
const DELETE_CUSTOMERS_CHUNK_SIZE = 80;

export async function deleteCustomers(
  companyId: string,
  customerIds: string[]
): Promise<DeleteCustomersResult> {
  if (customerIds.length === 0) return { deletedCount: 0, skippedCount: 0, deletedIds: [] };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in to delete customers." };
  }

  const linkedIds = new Set<string>();
  const chunkSize = DELETE_CUSTOMERS_CHUNK_SIZE;

  // Customers with estimates or invoices cannot be deleted (FK restrict). Query in chunks to avoid URL length limits.
  for (let i = 0; i < customerIds.length; i += chunkSize) {
    const chunk = customerIds.slice(i, i + chunkSize);
    const { data: estimatesWithCustomer } = await supabase
      .from("estimates")
      .select("customer_id")
      .eq("company_id", companyId)
      .in("customer_id", chunk);
    for (const row of estimatesWithCustomer ?? []) {
      if (row.customer_id) linkedIds.add(row.customer_id);
    }
  }
  for (let i = 0; i < customerIds.length; i += chunkSize) {
    const chunk = customerIds.slice(i, i + chunkSize);
    const { data: invoicesWithCustomer } = await supabase
      .from("sales_invoices")
      .select("customer_id")
      .eq("company_id", companyId)
      .in("customer_id", chunk);
    for (const row of invoicesWithCustomer ?? []) {
      if (row.customer_id) linkedIds.add(row.customer_id);
    }
  }

  const idsToDelete = customerIds.filter((id) => !linkedIds.has(id));
  const skippedCount = customerIds.length - idsToDelete.length;

  if (idsToDelete.length === 0) {
    revalidatePath("/dashboard/customers");
    return {
      deletedCount: 0,
      skippedCount,
      deletedIds: [],
    };
  }

  const deletedIds: string[] = [];
  for (let i = 0; i < idsToDelete.length; i += chunkSize) {
    const chunk = idsToDelete.slice(i, i + chunkSize);
    const { error } = await supabase
      .from("customers")
      .delete()
      .eq("company_id", companyId)
      .in("id", chunk);
    if (error) {
      console.error("[deleteCustomers] error:", error.message, { companyId, chunkIndex: i / chunkSize, code: error.code, details: error.details });
      return { error: error.message };
    }
    deletedIds.push(...chunk);
  }

  revalidatePath("/dashboard/customers");
  revalidatePath("/dashboard/estimates");
  return {
    deletedCount: deletedIds.length,
    skippedCount,
    deletedIds,
  };
}

export type CustomerSearchResult = {
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
};

const CUSTOMER_SELECT =
  "id, name, contact_person_name, address, city, province, country, ntn_cnic, phone, email, registration_type";

export async function searchCustomers(
  companyId: string,
  query: string
): Promise<CustomerSearchResult[]> {
  const raw = (query || "").trim();
  if (!raw) return [];
  const q = raw.replace(/%/g, "").replace(/_/g, " ");
  if (!q) return [];
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const pattern = `%${q}%`;
  const { data, error } = await supabase
    .from("customers")
    .select(CUSTOMER_SELECT)
    .eq("company_id", companyId)
    .or(`name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern}`)
    .order("name")
    .limit(20);

  if (error) return [];
  return (data ?? []) as CustomerSearchResult[];
}

export async function getCustomerById(
  companyId: string,
  customerId: string
): Promise<CustomerSearchResult | null> {
  if (!customerId) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("customers")
    .select(CUSTOMER_SELECT)
    .eq("id", customerId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (error || !data) return null;
  return data as CustomerSearchResult;
}

export type ImportCustomersResult = {
  error?: string;
  imported: number;
  skipped: number;
  errors: string[];
};

/** Extract NTN only in format 2469357 or 2469357-0 (exactly 7 digits, or 7 digits + hyphen + 1 digit). */
function extractNtnFromField(raw: string | null): string | null {
  if (raw == null || raw.trim() === "") return null;
  const match = raw.trim().match(/\d{7}(?:-\d)?/);
  return match ? match[0]! : null;
}

export async function importCustomersFromCsv(
  companyId: string,
  rows: Record<string, string>[],
  columnMapping: Record<string, string | string[]>,
  options?: { extractNtn?: boolean }
): Promise<ImportCustomersResult> {
  const extractNtn = options?.extractNtn !== false;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in to import customers.", imported: 0, skipped: 0, errors: [] };
  }

  const toInsert: {
    company_id: string;
    name: string;
    contact_person_name: string | null;
    ntn_cnic: string | null;
    address: string | null;
    city: string | null;
    province: string | null;
    country: string;
    registration_type: string | null;
    phone: string | null;
    email: string | null;
  }[] = [];
  let skipped = 0;
  const errors: string[] = [];

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

  for (const row of rows) {
    const name = (get("name", row) ?? "").trim();
    if (!name) {
      skipped += 1;
      continue;
    }
    const rawNtn = get("ntn_cnic", row);
    const ntn_cnic = extractNtn ? extractNtnFromField(rawNtn) : (rawNtn || null);
    const registrationType = get("registration_type", row);
    const validReg =
      registrationType === "Registered" || registrationType === "Unregistered" ? registrationType : null;
    const countryRaw = get("country", row);
    const country = (countryRaw && countryRaw.length > 0) ? countryRaw : "Pakistan";
    toInsert.push({
      company_id: companyId,
      name,
      contact_person_name: get("contact_person_name", row),
      ntn_cnic,
      address: get("address", row),
      city: get("city", row),
      province: get("province", row),
      country,
      registration_type: validReg,
      phone: get("phone", row),
      email: get("email", row),
    });
  }

  const BATCH = 100;
  let imported = 0;
  for (let i = 0; i < toInsert.length; i += BATCH) {
    const batch = toInsert.slice(i, i + BATCH);
    const { error } = await supabase.from("customers").insert(batch);
    if (error) {
      errors.push(error.message);
      break;
    }
    imported += batch.length;
  }

  revalidatePath("/dashboard/customers");
  revalidatePath("/dashboard/estimates");
  return { imported, skipped, errors };
}
