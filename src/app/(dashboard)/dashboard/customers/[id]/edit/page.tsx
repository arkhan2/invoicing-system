import { createClient, getUserSafe } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { CustomerFormPage } from "../../CustomerFormPage";

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!company) redirect("/dashboard/company");

  const { data: customer } = await supabase
    .from("customers")
    .select("id, name, contact_person_name, ntn_cnic, address, city, province, country, registration_type, phone, email")
    .eq("id", id)
    .eq("company_id", company.id)
    .maybeSingle();

  if (!customer) notFound();

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--color-card-bg)]">
        <CustomerFormPage
          customer={{
            id: customer.id,
            name: customer.name,
            contact_person_name: customer.contact_person_name ?? null,
            ntn_cnic: customer.ntn_cnic ?? null,
            address: customer.address ?? null,
            city: customer.city ?? null,
            province: customer.province ?? null,
            country: customer.country ?? null,
            registration_type: customer.registration_type ?? null,
            phone: customer.phone ?? null,
            email: customer.email ?? null,
          }}
          companyId={company.id}
          title="Edit customer"
          backHref={`/dashboard/customers/${id}`}
        />
      </div>
    </div>
  );
}
