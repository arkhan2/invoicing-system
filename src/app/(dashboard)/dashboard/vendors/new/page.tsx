import { createClient, getUserSafe } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { VendorFormPage } from "../VendorFormPage";

export default async function NewVendorPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; perPage?: string; view?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!company) redirect("/dashboard/company");

  const { q, page = "1", perPage = "100" } = await searchParams;
  const listParams = new URLSearchParams();
  listParams.set("page", page);
  listParams.set("perPage", perPage);
  if (q?.trim()) listParams.set("q", q.trim());
  const listQs = listParams.toString();
  const listHref = listQs ? `/dashboard/vendors?${listQs}` : "/dashboard/vendors";

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-surface">
        <VendorFormPage
          vendor={null}
          companyId={company.id}
          title="New vendor"
          backHref={listHref}
          listHref={listHref}
        />
      </div>
    </div>
  );
}
