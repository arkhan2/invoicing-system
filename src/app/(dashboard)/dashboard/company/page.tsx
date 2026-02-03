import { createClient, getUserSafe } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CompanyForm } from "./CompanyForm";

export default async function CompanyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await getUserSafe(supabase);
  if (!user) redirect("/login");

  const { data: company } = await supabase
    .from("companies")
    .select(
      "id, name, ntn, cnic, address, city, province, gst_number, registration_type, phone, email, sales_invoice_prefix, purchase_invoice_prefix, logo_url"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-medium text-[var(--color-on-surface)]">
        {company ? "Company profile" : "Create your company"}
      </h1>
      <p className="text-sm text-[var(--color-on-surface-variant)]">
        {company
          ? "Update your company details. Other pages use this profile."
          : "Complete your company profile to access customers, vendors, and invoices."}
      </p>
      <div className="card p-6">
        <CompanyForm company={company} />
      </div>
    </div>
  );
}
