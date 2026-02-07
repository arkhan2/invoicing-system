"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type CompanyFormState = {
  error?: string;
  success?: boolean;
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

  const logoUrl = (formData.get("logo_url") as string)?.trim() || null;

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
    logo_url: logoUrl,
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

  let logoUrl: string | null = (formData.get("logo_url") as string)?.trim() || null;
  const removeLogo = formData.get("remove_logo") === "1";
  const logoFile = formData.get("logo") as File | null;

  if (removeLogo) {
    logoUrl = null;
  } else if (logoFile?.size && logoFile.size > 0) {
    const ext = logoFile.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${companyId}/logo.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("company-logos")
      .upload(path, logoFile, { upsert: true, contentType: logoFile.type });
    if (uploadError) {
      return { error: uploadError.message };
    }
    const { data: urlData } = supabase.storage.from("company-logos").getPublicUrl(path);
    logoUrl = urlData.publicUrl;
  } else if (logoUrl === null) {
    const { data: existing } = await supabase
      .from("companies")
      .select("logo_url")
      .eq("id", companyId)
      .eq("user_id", user.id)
      .single();
    logoUrl = existing?.logo_url ?? null;
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
      logo_url: logoUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", companyId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/company");
  return { success: true };
}

export type TaxRateRow = { id: string; name: string; rate: number };

export async function getCompanyTaxRates(companyId: string): Promise<{
  salesTaxRates: TaxRateRow[];
  withholdingTaxRates: TaxRateRow[];
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { salesTaxRates: [], withholdingTaxRates: [] };

  const [salesRes, withholdingRes] = await Promise.all([
    supabase
      .from("company_sales_tax_rates")
      .select("id, name, rate")
      .eq("company_id", companyId)
      .order("created_at"),
    supabase
      .from("company_withholding_tax_rates")
      .select("id, name, rate")
      .eq("company_id", companyId)
      .order("created_at"),
  ]);

  const salesTaxRates: TaxRateRow[] = (salesRes.data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    rate: Number(r.rate),
  }));
  const withholdingTaxRates: TaxRateRow[] = (withholdingRes.data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    rate: Number(r.rate),
  }));
  return { salesTaxRates, withholdingTaxRates };
}

export async function addSalesTaxRate(
  companyId: string,
  name: string,
  rate: number
): Promise<CompanyFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };
  const trimmed = (name || "").trim();
  if (!trimmed) return { error: "Name is required." };
  if (rate < 0 || rate > 100) return { error: "Rate must be between 0 and 100." };

  const { error } = await supabase.from("company_sales_tax_rates").insert({
    company_id: companyId,
    name: trimmed,
    rate,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard/company");
  return {};
}

export async function deleteSalesTaxRate(rateId: string): Promise<CompanyFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const { error } = await supabase.from("company_sales_tax_rates").delete().eq("id", rateId);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/company");
  return {};
}

export async function addWithholdingTaxRate(
  companyId: string,
  name: string,
  rate: number
): Promise<CompanyFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };
  const trimmed = (name || "").trim();
  if (!trimmed) return { error: "Name is required." };
  if (rate < 0 || rate > 100) return { error: "Rate must be between 0 and 100." };

  const { error } = await supabase.from("company_withholding_tax_rates").insert({
    company_id: companyId,
    name: trimmed,
    rate,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard/company");
  return {};
}

export async function deleteWithholdingTaxRate(rateId: string): Promise<CompanyFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const { error } = await supabase.from("company_withholding_tax_rates").delete().eq("id", rateId);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/company");
  return {};
}
