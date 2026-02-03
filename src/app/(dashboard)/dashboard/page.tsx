import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: companies } = await supabase
    .from("companies")
    .select("id, name")
    .limit(1);

  const hasCompany = companies && companies.length > 0;
  const company = companies?.[0];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-medium text-[var(--color-on-surface)]">Dashboard</h1>
      {hasCompany ? (
        <p className="text-[var(--color-on-surface-variant)]">
          Company: <strong className="text-[var(--color-on-surface)]">{company?.name}</strong>. Use the sidebar to manage customers, vendors, items, and invoices.
        </p>
      ) : (
        <div className="card p-4">
          <p className="font-medium text-[var(--color-card-text)]">Create your company first</p>
          <p className="text-sm text-[var(--color-on-surface-variant)] mt-1">
            You need a company to add customers, vendors, and invoices.
          </p>
          <Link href="/dashboard/company" className="btn btn-primary btn-md mt-4 inline-block">
            Create company
          </Link>
        </div>
      )}
    </div>
  );
}
