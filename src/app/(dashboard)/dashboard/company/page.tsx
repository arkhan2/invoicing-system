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
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-on-surface)]">
          {company ? "Company profile" : "Create your company"}
        </h1>
        <p className="max-w-xl text-sm text-[var(--color-on-surface-variant)]">
          {company
            ? "Update your company details. This profile is used on invoices and across the app."
            : "Complete your company profile to access customers, vendors, and invoices."}
        </p>
      </header>

      <div className="card w-fit max-w-full overflow-hidden p-0 shadow-card">
        <CompanyForm company={company} />
      </div>
    </div>
  );
}
