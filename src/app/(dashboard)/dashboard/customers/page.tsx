import { createClient, getUserSafe } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CustomerList } from "./CustomerList";

export default async function CustomersPage() {
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

  const { data: customers } = await supabase
    .from("customers")
    .select("id, name, ntn_cnic, address, city, province, registration_type, phone, email, created_at, updated_at")
    .eq("company_id", company.id)
    .order("name");

  return (
    <div className="mx-auto w-full max-w-[1600px] flex flex-col gap-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-on-surface)]">
          Customers
        </h1>
        <p className="max-w-xl text-sm text-[var(--color-on-surface-variant)]">
          Manage customers for sales invoices. Add, edit, or remove customers.
        </p>
      </header>

      <section className="w-full">
        <div className="card overflow-hidden p-0">
          <CustomerList customers={customers ?? []} companyId={company.id} />
        </div>
      </section>
    </div>
  );
}
