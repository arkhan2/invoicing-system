"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type CustomerFormState = { error?: string; customerId?: string };

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
      phone: (formData.get("phone") as string)?.trim() || null,
      email: (formData.get("email") as string)?.trim() || null,
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
      phone: (formData.get("phone") as string)?.trim() || null,
      email: (formData.get("email") as string)?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", customerId)
    .eq("company_id", companyId);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/customers");
  revalidatePath("/dashboard/estimates");
  return {};
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
