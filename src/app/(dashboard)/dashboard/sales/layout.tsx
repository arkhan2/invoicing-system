import { createClient, getUserSafe } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { InvoiceSidebar } from "./InvoiceSidebar";

export default async function SalesLayout({
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

  const { data: invoices } = await supabase
    .from("sales_invoices")
    .select(`
      id,
      invoice_number,
      invoice_date,
      status,
      total_amount,
      total_tax,
      customer_id,
      estimate_id,
      customer:customers(id, name),
      estimate:estimates(estimate_number)
    `)
    .eq("company_id", company.id)
    .order("invoice_date", { ascending: false });

  const list = (invoices ?? []).map((inv) => ({
    id: inv.id,
    invoice_number: inv.invoice_number,
    invoice_date: inv.invoice_date,
    status: inv.status,
    total_amount: inv.total_amount,
    total_tax: inv.total_tax,
    customer_name: (inv.customer as { name?: string } | null)?.name ?? "",
    customer_id: (inv.customer as { id?: string } | null)?.id ?? "",
    estimate_number: (inv.estimate as { estimate_number?: string } | null)?.estimate_number ?? null,
  }));

  return (
    <div className="-m-6 flex min-h-0 min-w-0 flex-1 flex-shrink-0 overflow-hidden border-r border-b border-[var(--color-outline)] bg-[var(--color-card-bg)]">
      <aside className="w-80 flex-shrink-0 overflow-hidden">
        <InvoiceSidebar invoices={list} companyId={company.id} />
      </aside>
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}
