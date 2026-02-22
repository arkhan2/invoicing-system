import { redirect } from "next/navigation";
import { getPaymentById, getUnpaidInvoicesForCustomer } from "../../actions";
import { AllocatePageClient } from "./AllocatePageClient";
import { createClient } from "@/lib/supabase/server";

export default async function AllocatePaymentPage({
  params,
}: {
  params: Promise<{ id: string }>;
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

  const { id } = await params;
  const payment = await getPaymentById(company.id, id);
  if (!payment) redirect("/dashboard/payments");

  const invoices = await getUnpaidInvoicesForCustomer(company.id, payment.customer_id);

  return (
    <AllocatePageClient
      payment={payment}
      invoices={invoices}
      companyId={company.id}
    />
  );
}
