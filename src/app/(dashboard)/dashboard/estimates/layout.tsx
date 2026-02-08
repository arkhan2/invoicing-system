import { createClient, getUserSafe } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { EstimateSidebar } from "./EstimateSidebar";

export default async function EstimatesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await getUserSafe(supabase);
  if (!user) redirect("/login");

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!company) redirect("/dashboard/company");

  const { data: estimates } = await supabase
    .from("estimates")
    .select(`
      id,
      estimate_number,
      estimate_date,
      status,
      valid_until,
      total_amount,
      total_tax,
      created_at,
      customer:customers(id, name)
    `)
    .eq("company_id", company.id)
    .order("estimate_date", { ascending: false });

  const today = new Date().toISOString().slice(0, 10);
  const list = (estimates ?? []).map((e) => {
    const effectiveStatus = e.status === "Sent" && e.valid_until && e.valid_until < today ? "Expired" : e.status;
    return {
      id: e.id,
      estimate_number: e.estimate_number,
      estimate_date: e.estimate_date,
      status: effectiveStatus,
      total_amount: e.total_amount,
      total_tax: e.total_tax,
      created_at: e.created_at,
      customer_name: (e.customer as { name?: string } | null)?.name ?? "",
      customer_id: (e.customer as { id?: string } | null)?.id ?? "",
    };
  });

  return (
    <div className="-m-6 flex min-h-0 min-w-0 flex-1 flex-shrink-0 overflow-hidden border-r border-b border-[var(--color-outline)] bg-[var(--color-card-bg)]">
      <aside className="w-80 flex-shrink-0 overflow-hidden">
        <EstimateSidebar estimates={list} companyId={company.id} />
      </aside>
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}
