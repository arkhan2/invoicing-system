import { Suspense } from "react";
import { createClient, getUserSafe } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { EstimateSidebarWithData } from "./EstimateSidebarWithData";
import { EstimatesTopBar } from "./EstimatesTopBar";
import { EstimatesTopBarProvider } from "./EstimatesTopBarContext";

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

  return (
    <div className="-m-6 flex min-h-0 min-w-0 flex-1 flex-shrink-0 overflow-hidden border-r border-b border-[var(--color-outline)] bg-base">
      <aside className="w-80 flex-shrink-0 overflow-hidden">
        <Suspense fallback={<div className="flex h-full items-center justify-center text-sm text-[var(--color-on-surface-variant)]">Loading…</div>}>
          <EstimateSidebarWithData companyId={company.id} />
        </Suspense>
      </aside>
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <EstimatesTopBarProvider>
          <EstimatesTopBar />
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {children}
          </div>
        </EstimatesTopBarProvider>
      </main>
    </div>
  );
}
