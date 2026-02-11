import { createClient, getUserSafe } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { VendorDetailView } from "../VendorDetailView";
import { getVendorDocumentCounts } from "../actions";

export default async function VendorViewPage({
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

  const [vendorResult, counts] = await Promise.all([
    supabase
      .from("vendors")
      .select("id, name, contact_person_name, ntn_cnic, address, city, province, country, registration_type, phone, email, created_at, updated_at")
      .eq("id", id)
      .eq("company_id", company.id)
      .maybeSingle(),
    getVendorDocumentCounts(id, company.id),
  ]);

  const vendor = vendorResult.data;
  if (!vendor) notFound();

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-base">
        <VendorDetailView
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
            created_at: vendor.created_at ?? null,
            updated_at: vendor.updated_at ?? null,
          }}
          companyId={company.id}
          purchaseInvoicesCount={counts.purchaseInvoicesCount}
        />
      </div>
    </div>
  );
}
