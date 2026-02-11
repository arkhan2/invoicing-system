import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: companies } = await supabase
    .from("companies")
    .select("id, name")
    .limit(1);

  const hasCompany = companies && companies.length > 0;
  const company = companies?.[0];

  return (
    <div className="mx-auto w-full max-w-[1600px] flex flex-col gap-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-on-surface)]">
          Dashboard
        </h1>
        <p className="max-w-xl text-sm text-[var(--color-on-surface-variant)]">
          {hasCompany
            ? `Company: ${company?.name}. Use the sidebar to manage customers, items, and invoices.`
            : "Create your company to get started."}
        </p>
      </header>

      {!hasCompany && (
        <section>
          <div className="card max-w-xl p-6 flex flex-col">
            <h3 className="text-lg font-semibold text-[var(--color-on-surface)] truncate">
              Create your company first
            </h3>
            <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
              You need a company to add customers and invoices.
            </p>
            <div className="mt-auto pt-4 flex justify-end">
              <Link href="/dashboard/company" className="btn btn-add btn-icon" aria-label="Create company" title="Create company">
                <Plus className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
