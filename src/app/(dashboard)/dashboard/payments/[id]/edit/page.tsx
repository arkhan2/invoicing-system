import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getPaymentForEdit } from "../../actions";
import { PaymentFormPage } from "../../PaymentFormPage";

export default async function EditPaymentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string; perPage?: string; customerId?: string; status?: string }>;
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
  const initialPayment = await getPaymentForEdit(company.id, id);
  if (!initialPayment) redirect("/dashboard/payments");

  const { page = "1", perPage = "25", customerId, status } = await searchParams;
  const listParams = new URLSearchParams();
  listParams.set("page", page);
  listParams.set("perPage", perPage);
  if (customerId) listParams.set("customerId", customerId);
  if (status) listParams.set("status", status);
  const listQs = listParams.toString();
  const listHref = listQs ? `/dashboard/payments?${listQs}` : "/dashboard/payments";
  const viewHref = listQs ? `/dashboard/payments/${id}?${listQs}` : `/dashboard/payments/${id}`;

  return (
    <PaymentFormPage
      companyId={company.id}
      title={`Edit payment (${initialPayment.payment_number})`}
      backHref={viewHref}
      listHref={listHref}
      editPaymentId={id}
      initialPayment={initialPayment}
    />
  );
}
