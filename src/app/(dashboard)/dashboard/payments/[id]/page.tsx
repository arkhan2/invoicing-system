import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { getPaymentForView } from "../actions";
import { PaymentDetailView } from "../PaymentDetailView";

export default async function PaymentViewPage({
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
  const payment = await getPaymentForView(company.id, id);
  if (!payment) notFound();

  const { page = "1", perPage = "25", customerId, status } = await searchParams;
  const listParams = new URLSearchParams();
  listParams.set("page", page);
  listParams.set("perPage", perPage);
  if (customerId) listParams.set("customerId", customerId);
  if (status) listParams.set("status", status);
  const listQs = listParams.toString();
  const backHref = listQs ? `/dashboard/payments?${listQs}` : "/dashboard/payments";

  const editParams = new URLSearchParams();
  editParams.set("page", page);
  editParams.set("perPage", perPage);
  if (customerId) editParams.set("customerId", customerId);
  if (status) editParams.set("status", status);
  const editQs = editParams.toString();
  const editHref = editQs ? `/dashboard/payments/${id}/edit?${editQs}` : `/dashboard/payments/${id}/edit`;

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-base">
        <PaymentDetailView
          payment={payment}
          companyId={company.id}
          backHref={backHref}
          editHref={editHref}
        />
      </div>
    </div>
  );
}
