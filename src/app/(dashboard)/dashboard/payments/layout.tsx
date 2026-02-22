import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PaymentsProvider } from "./PaymentsContext";
import { PaymentsDataLoader } from "./PaymentsDataLoader";

export default async function PaymentsLayout({
  children,
}: {
  children: React.ReactNode;
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

  return (
    <PaymentsProvider companyId={company.id}>
      <Suspense
        fallback={
          <div className="-m-4 flex min-h-0 flex-1 overflow-hidden lg:-m-6">
            <aside className="w-80 flex-shrink-0 overflow-hidden border-r border-[var(--color-outline)] bg-base">
              <div className="flex flex-1 items-center justify-center p-4 text-sm text-[var(--color-on-surface-variant)]">
                Loading…
              </div>
            </aside>
            <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              <div className="flex flex-1 items-center justify-center p-4 text-sm text-[var(--color-on-surface-variant)]">
                Loading…
              </div>
            </main>
          </div>
        }
      >
        <PaymentsDataLoader>{children}</PaymentsDataLoader>
      </Suspense>
    </PaymentsProvider>
  );
}
