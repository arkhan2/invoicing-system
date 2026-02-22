import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PaymentFormPage } from "../PaymentFormPage";

export default async function NewPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string; returnTo?: string; allocateToInvoice?: string; page?: string; perPage?: string }>;
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

  const { customerId, returnTo, allocateToInvoice, page = "1", perPage = "100" } = await searchParams;
  const listParams = new URLSearchParams();
  listParams.set("page", page);
  listParams.set("perPage", perPage);
  const listQs = listParams.toString();
  const listHref = listQs ? `/dashboard/payments?${listQs}` : "/dashboard/payments";
  const backHref = returnTo ?? listHref;
  const fromInvoice = !!(customerId && returnTo && allocateToInvoice);

  return (
    <PaymentFormPage
      companyId={company.id}
      title={fromInvoice ? "New payment (for this invoice)" : "New payment"}
      backHref={backHref}
      listHref={listHref}
      returnTo={returnTo ?? null}
      allocateToInvoice={allocateToInvoice ?? null}
      initialCustomerId={customerId ?? null}
      lockCustomer={fromInvoice}
    />
  );
}
