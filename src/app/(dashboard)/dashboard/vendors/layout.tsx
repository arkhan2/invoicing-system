import { Suspense } from "react";
import { createClient, getUserSafe } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { VendorsTopBarProvider } from "./VendorsTopBarContext";
import { VendorsDataLoader } from "./VendorsDataLoader";

export default async function VendorsLayout({
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

  return (
    <VendorsTopBarProvider>
      <Suspense fallback={<div className="-m-4 flex min-h-0 flex-1 overflow-hidden lg:-m-6" />}>
        <VendorsDataLoader companyId={company.id}>
          {children}
        </VendorsDataLoader>
      </Suspense>
    </VendorsTopBarProvider>
  );
}
