import { createClient, getUserSafe } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { ItemFormPage } from "../../ItemFormPage";
import { getItemById, getTaxRatesForCompany, getUomList } from "../../actions";

export default async function EditItemPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; view?: string; q?: string; page?: string; perPage?: string }>;
}) {
  const { id } = await params;
  const { from, view, q, page = "1", perPage = "100" } = await searchParams;
  const fromSpreadsheet = from === "spreadsheet" || view === "spreadsheet";
  const listParams = new URLSearchParams();
  listParams.set("page", page);
  listParams.set("perPage", perPage);
  if (q?.trim()) listParams.set("q", q.trim());
  if (fromSpreadsheet) listParams.set("view", "spreadsheet");
  const listQs = listParams.toString();
  const listHref = listQs ? `/dashboard/items?${listQs}` : "/dashboard/items";

  const detailParams = new URLSearchParams();
  detailParams.set("page", page);
  detailParams.set("perPage", perPage);
  if (q?.trim()) detailParams.set("q", q.trim());
  if (fromSpreadsheet) detailParams.set("from", "spreadsheet");
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

  const [item, taxRates, uomList] = await Promise.all([
    getItemById(company.id, id),
    getTaxRatesForCompany(company.id),
    getUomList(),
  ]);

  if (!item) notFound();

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-base">
        <ItemFormPage
          item={{
            id: item.id,
            name: item.name,
            description: item.description ?? null,
            reference: item.reference ?? null,
            hs_code: item.hs_code ?? null,
            unit_rate: item.unit_rate ?? null,
            default_tax_rate_id: item.default_tax_rate_id ?? null,
            uom_id: item.uom_id ?? null,
            sale_type: item.sale_type ?? null,
            created_at: item.created_at,
            updated_at: item.updated_at ?? null,
          }}
          companyId={company.id}
          taxRates={taxRates}
          uomList={uomList}
          title="Edit item"
          backHref={detailQs ? `/dashboard/items/${id}?${detailQs}` : `/dashboard/items/${id}`}
          listHref={listHref}
          returnToSpreadsheet={fromSpreadsheet}
        />
      </div>
    </div>
  );
}
