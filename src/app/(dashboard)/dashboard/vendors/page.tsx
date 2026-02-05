import { createClient, getUserSafe } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { VendorList } from "./VendorList";

export default async function VendorsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await getUserSafe(supabase);
  if (!user) redirect("/login");

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!company) {
    redirect("/dashboard/company");
  }

  const { data: vendors } = await supabase
    .from("vendors")
    .select("id, name, ntn_cnic, address, city, province, phone, email, created_at, updated_at")
    .eq("company_id", company.id)
    .order("name");

  return (
    <div className="mx-auto w-full max-w-[1600px] flex flex-col gap-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-on-surface)]">
          Vendors
        </h1>
        <p className="max-w-xl text-sm text-[var(--color-on-surface-variant)]">
          Manage vendors for purchase invoices. Add, edit, or remove vendors.
        </p>
      </header>

      <section className="w-full">
        <div className="card overflow-hidden p-0">
          <VendorList vendors={vendors ?? []} companyId={company.id} />
        </div>
      </section>
    </div>
  );
}
