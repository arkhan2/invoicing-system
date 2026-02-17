import { createClient, getUserSafe } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { VendorFormPage } from "../../VendorFormPage";

export default async function EditVendorPage({
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
  const listHref = listQs ? `/dashboard/vendors?${listQs}` : "/dashboard/vendors";

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

  const { data: vendor } = await supabase
    .from("vendors")
    .select("id, name, contact_person_name, ntn_cnic, address, city, province, country, registration_type, phone, email")
    .eq("id", id)
    .eq("company_id", company.id)
    .maybeSingle();

  if (!vendor) notFound();

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-base">
        <VendorFormPage
          vendor={{
            id: vendor.id,
            name: vendor.name,
            contact_person_name: vendor.contact_person_name ?? null,
            ntn_cnic: vendor.ntn_cnic ?? null,
            address: vendor.address ?? null,
            city: vendor.city ?? null,
            province: vendor.province ?? null,
            country: vendor.country ?? null,
            registration_type: vendor.registration_type ?? null,
            phone: vendor.phone ?? null,
            email: vendor.email ?? null,
          }}
          companyId={company.id}
          title="Edit vendor"
          backHref={detailQs ? `/dashboard/vendors/${id}?${detailQs}` : `/dashboard/vendors/${id}`}
          listHref={listHref}
        />
      </div>
    </div>
  );
}
