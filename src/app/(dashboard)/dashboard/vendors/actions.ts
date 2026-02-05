"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type VendorFormState = { error?: string };

export async function createVendor(
  companyId: string,
  _prev: VendorFormState,
  formData: FormData
): Promise<VendorFormState> {
  const name = (formData.get("name") as string)?.trim();
  if (!name) {
    return { error: "Vendor name is required." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in to add a vendor." };
  }

  const { error } = await supabase.from("vendors").insert({
    company_id: companyId,
    name,
    ntn_cnic: (formData.get("ntn_cnic") as string)?.trim() || null,
    address: (formData.get("address") as string)?.trim() || null,
    city: (formData.get("city") as string)?.trim() || null,
    province: (formData.get("province") as string)?.trim() || null,
    phone: (formData.get("phone") as string)?.trim() || null,
    email: (formData.get("email") as string)?.trim() || null,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard/vendors");
  return {};
}

export async function updateVendor(
  vendorId: string,
  companyId: string,
  _prev: VendorFormState,
  formData: FormData
): Promise<VendorFormState> {
  const name = (formData.get("name") as string)?.trim();
  if (!name) {
    return { error: "Vendor name is required." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in to update a vendor." };
  }

  const { error } = await supabase
    .from("vendors")
    .update({
      name,
      ntn_cnic: (formData.get("ntn_cnic") as string)?.trim() || null,
      address: (formData.get("address") as string)?.trim() || null,
      city: (formData.get("city") as string)?.trim() || null,
      province: (formData.get("province") as string)?.trim() || null,
      phone: (formData.get("phone") as string)?.trim() || null,
      email: (formData.get("email") as string)?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", vendorId)
    .eq("company_id", companyId);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/vendors");
  return {};
}

export async function deleteVendor(vendorId: string): Promise<VendorFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in to delete a vendor." };
  }

  const { error } = await supabase.from("vendors").delete().eq("id", vendorId);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/vendors");
  return {};
}

export async function deleteVendors(vendorIds: string[]): Promise<VendorFormState> {
  if (vendorIds.length === 0) return {};
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in to delete vendors." };
  }

  const { error } = await supabase.from("vendors").delete().in("id", vendorIds);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/vendors");
  return {};
}
