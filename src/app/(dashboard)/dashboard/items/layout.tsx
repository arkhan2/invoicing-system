import { Suspense } from "react";
import { createClient, getUserSafe } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ItemsTopBarProvider } from "./ItemsTopBarContext";
import { ItemsDataLoader } from "./ItemsDataLoader";

export default async function ItemsLayout({
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
    <ItemsTopBarProvider>
      <Suspense fallback={<div className="-m-6 flex min-h-0 flex-1 overflow-hidden" />}>
        <ItemsDataLoader companyId={company.id}>
          {children}
        </ItemsDataLoader>
      </Suspense>
    </ItemsTopBarProvider>
  );
}
