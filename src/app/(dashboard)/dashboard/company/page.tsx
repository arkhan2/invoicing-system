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
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden w-full bg-[var(--color-card-bg)]">
        <CompanyForm company={company} />
      </div>
    </div>
  );
}
