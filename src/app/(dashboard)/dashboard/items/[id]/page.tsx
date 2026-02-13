import { createClient, getUserSafe } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { ItemDetailView } from "../ItemDetailView";
import { getItemById, getItemDocumentCounts } from "../actions";

export default async function ItemViewPage({
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

  const [item, counts] = await Promise.all([
    getItemById(company.id, id),
    getItemDocumentCounts(id, company.id),
  ]);

  if (!item) notFound();

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-base">
        <ItemDetailView
          item={{
            id: item.id,
            name: item.name,
            description: item.description ?? null,
            reference: item.reference ?? null,
            hs_code: item.hs_code ?? null,
            unit_rate: item.unit_rate ?? null,
            rate_label: item.rate_label ?? null,
            uom_code: item.uom_code ?? null,
            sale_type: item.sale_type ?? null,
            created_at: item.created_at ?? null,
            updated_at: item.updated_at ?? null,
          }}
          companyId={company.id}
          estimatesCount={counts.estimatesCount}
          invoicesCount={counts.invoicesCount}
        />
      </div>
    </div>
  );
}
