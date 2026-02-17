import { createClient, getUserSafe } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { CustomerFormPage } from "../../CustomerFormPage";

export default async function EditCustomerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; q?: string; page?: string; perPage?: string }>;
}) {
  const { id } = await params;
  const { q, page = "1", perPage = "100" } = await searchParams;
  const listParams = new URLSearchParams();
  listParams.set("page", page);
  listParams.set("perPage", perPage);
  if (q?.trim()) listParams.set("q", q.trim());
  const listQs = listParams.toString();
  const listHref = listQs ? `/dashboard/customers?${listQs}` : "/dashboard/customers";

  const detailParams = new URLSearchParams();
  detailParams.set("page", page);
  detailParams.set("perPage", perPage);
  if (q?.trim()) detailParams.set("q", q.trim());
  const detailQs = detailParams.toString();
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
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-base">
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
          backHref={detailQs ? `/dashboard/customers/${id}?${detailQs}` : `/dashboard/customers/${id}`}
          listHref={listHref}
        />
      </div>
    </div>
  );
}
