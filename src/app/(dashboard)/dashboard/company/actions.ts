"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type CompanyFormState = {
  error?: string;
};

export async function createCompany(
  _prev: CompanyFormState,
  formData: FormData
): Promise<CompanyFormState> {
  const name = (formData.get("name") as string)?.trim();
  if (!name) {
    return { error: "Company name is required." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in to create a company." };
  }

  const { error } = await supabase.from("companies").insert({
    user_id: user.id,
    name,
    ntn: (formData.get("ntn") as string)?.trim() || null,
    cnic: (formData.get("cnic") as string)?.trim() || null,
    address: (formData.get("address") as string)?.trim() || null,
    city: (formData.get("city") as string)?.trim() || null,
    province: (formData.get("province") as string)?.trim() || null,
    gst_number: (formData.get("gst_number") as string)?.trim() || null,
    registration_type: ["Registered", "Unregistered"].includes(
      (formData.get("registration_type") as string) || ""
    )
      ? (formData.get("registration_type") as string)
      : null,
    phone: (formData.get("phone") as string)?.trim() || null,
    email: (formData.get("email") as string)?.trim() || null,
    sales_invoice_prefix:
      (formData.get("sales_invoice_prefix") as string)?.trim() || "INV",
    purchase_invoice_prefix:
      (formData.get("purchase_invoice_prefix") as string)?.trim() || "PUR",
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/company");
  redirect("/dashboard");
}

export async function updateCompany(
  companyId: string,
  _prev: CompanyFormState,
  formData: FormData
): Promise<CompanyFormState> {
  const name = (formData.get("name") as string)?.trim();
  if (!name) {
    return { error: "Company name is required." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in to update the company." };
  }

  const { error } = await supabase
    .from("companies")
    .update({
      name,
      ntn: (formData.get("ntn") as string)?.trim() || null,
      cnic: (formData.get("cnic") as string)?.trim() || null,
      address: (formData.get("address") as string)?.trim() || null,
      city: (formData.get("city") as string)?.trim() || null,
      province: (formData.get("province") as string)?.trim() || null,
      gst_number: (formData.get("gst_number") as string)?.trim() || null,
      registration_type: ["Registered", "Unregistered"].includes(
        (formData.get("registration_type") as string) || ""
      )
        ? (formData.get("registration_type") as string)
        : null,
      phone: (formData.get("phone") as string)?.trim() || null,
      email: (formData.get("email") as string)?.trim() || null,
      sales_invoice_prefix:
        (formData.get("sales_invoice_prefix") as string)?.trim() || "INV",
      purchase_invoice_prefix:
        (formData.get("purchase_invoice_prefix") as string)?.trim() || "PUR",
      updated_at: new Date().toISOString(),
    })
    .eq("id", companyId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/company");
  redirect("/dashboard");
}
