import { createClient, getUserSafe } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, X } from "lucide-react";
import { CustomerSpreadsheetView } from "./CustomerSpreadsheetView";
import { CustomersTopBar } from "./CustomersTopBar";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const isSpreadsheet = view === "spreadsheet";

  if (isSpreadsheet) {
    const supabase = await createClient();
    const { data: { user } } = await getUserSafe(supabase);
    if (!user) redirect("/login");

    const { data: company } = await supabase
      .from("companies")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!company) redirect("/dashboard/company");

    const { data: customers } = await supabase
      .from("customers")
      .select("id, name, contact_person_name, ntn_cnic, address, city, province, country, registration_type, phone, email, created_at, updated_at")
      .eq("company_id", company.id)
      .order("name");

    return (
      <CustomerSpreadsheetView
        customers={customers ?? []}
        companyId={company.id}
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <CustomersTopBar
        left={
          <h2 className="truncate text-lg font-semibold text-[var(--color-on-surface)]">
            Customers
          </h2>
        }
        right={
          <Link
            href="/dashboard/customers?view=spreadsheet"
            className="btn btn-secondary btn-icon shrink-0"
            aria-label="Switch to spreadsheet view"
            title="Spreadsheet view"
          >
            <X className="size-4" />
          </Link>
        }
      />
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-8">
        <div className="rounded-xl border border-dashed border-[var(--color-outline)] bg-[var(--color-surface-variant)]/30 px-6 py-10 text-center">
          <p className="text-sm text-[var(--color-on-surface-variant)]">
            Select a customer from the list or create a new one.
          </p>
          <Link
            href="/dashboard/customers/new"
            className="btn btn-add btn-icon mt-3"
            aria-label="New customer"
            title="New customer"
          >
            <Plus className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
