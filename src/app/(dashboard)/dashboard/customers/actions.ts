"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type CustomerFormState = { error?: string; customerId?: string };

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

  const { data, error } = await supabase
    .from("customers")
    .insert({
      company_id: companyId,
      name,
      ntn_cnic: (formData.get("ntn_cnic") as string)?.trim() || null,
      address: (formData.get("address") as string)?.trim() || null,
      city: (formData.get("city") as string)?.trim() || null,
      province: (formData.get("province") as string)?.trim() || null,
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
      ntn_cnic: (formData.get("ntn_cnic") as string)?.trim() || null,
      address: (formData.get("address") as string)?.trim() || null,
      city: (formData.get("city") as string)?.trim() || null,
      province: (formData.get("province") as string)?.trim() || null,
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

export async function deleteCustomer(customerId: string): Promise<CustomerFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in to delete a customer." };
  }

  const { error } = await supabase.from("customers").delete().eq("id", customerId);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/customers");
  return {};
}

export async function deleteCustomers(customerIds: string[]): Promise<CustomerFormState> {
  if (customerIds.length === 0) return {};
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in to delete customers." };
  }

  const { error } = await supabase.from("customers").delete().in("id", customerIds);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/customers");
  return {};
}

export type CustomerSearchResult = {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  ntn_cnic?: string | null;
  phone?: string | null;
  email?: string | null;
  registration_type?: string | null;
};

const CUSTOMER_SELECT =
  "id, name, address, city, province, ntn_cnic, phone, email, registration_type";

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
