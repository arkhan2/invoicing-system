import { Suspense } from "react";
import { createClient, getUserSafe } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { EstimateSidebarWithData } from "./EstimateSidebarWithData";
import { EstimatesTopBar } from "./EstimatesTopBar";
import { EstimatesTopBarProvider } from "./EstimatesTopBarContext";
import { EstimatesResponsiveLayout } from "./EstimatesResponsiveLayout";

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

  const sidebarContent = (
    <Suspense fallback={<div className="flex h-full items-center justify-center text-sm text-[var(--color-on-surface-variant)]">Loading…</div>}>
      <EstimateSidebarWithData companyId={company.id} />
    </Suspense>
  );

  return (
    <EstimatesResponsiveLayout sidebarContent={sidebarContent}>
      <EstimatesTopBarProvider>
        <EstimatesTopBar />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </EstimatesTopBarProvider>
    </EstimatesResponsiveLayout>
  );
}
