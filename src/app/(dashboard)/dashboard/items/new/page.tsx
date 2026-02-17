import { createClient, getUserSafe } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ItemFormPage } from "../ItemFormPage";
import { getTaxRatesForCompany, getUomList } from "../actions";

export default async function NewItemPage({
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
  const listHref = listQs ? `/dashboard/items?${listQs}` : "/dashboard/items";

  const [taxRates, uomList] = await Promise.all([
    getTaxRatesForCompany(company.id),
    getUomList(),
  ]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-surface">
        <ItemFormPage
          item={null}
          companyId={company.id}
          taxRates={taxRates}
          uomList={uomList}
          title="New item"
          backHref={listHref}
          listHref={listHref}
        />
      </div>
    </div>
  );
}
