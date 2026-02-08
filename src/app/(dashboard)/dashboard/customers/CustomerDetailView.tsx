"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Pencil, Trash2, X } from "lucide-react";
import { CustomersTopBar } from "./CustomersTopBar";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { IconButton } from "@/components/IconButton";
import { deleteCustomer } from "./actions";
import { startGlobalProcessing, endGlobalProcessing } from "@/components/GlobalProcessing";

export type CustomerDetailData = {
  id: string;
  name: string;
  contact_person_name: string | null;
  ntn_cnic: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  country: string | null;
  registration_type: string | null;
  phone: string | null;
  email: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export function CustomerDetailView({
  customer,
  companyId,
}: {
  customer: CustomerDetailData;
  companyId: string;
}) {
  const router = useRouter();
  const [deleteState, setDeleteState] = useState<{ loading: boolean } | null>(null);

  async function handleDelete() {
    setDeleteState({ loading: true });
    startGlobalProcessing("Deleting…");
    try {
      const result = await deleteCustomer(customer.id, companyId);
      setDeleteState(null);
      if (result?.error) {
        endGlobalProcessing({ error: result.error });
        return;
      }
      endGlobalProcessing({ success: "Customer deleted." });
      router.push("/dashboard/customers?view=spreadsheet");
      router.refresh();
    } finally {
      endGlobalProcessing();
    }
  }

  const formatDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : null;

  return (
    <>
      <div className="flex h-full min-h-0 w-full flex-col">
        <CustomersTopBar
          left={
            <>
              <Link
                href="/dashboard/customers?view=spreadsheet"
                className="btn btn-secondary btn-icon shrink-0"
                aria-label="Back to spreadsheet"
                title="Back to spreadsheet"
              >
                <ChevronLeft className="size-4" />
              </Link>
              <h2 className="truncate text-lg font-semibold text-[var(--color-on-surface)]">
                {customer.name}
              </h2>
            </>
          }
          right={
            <>
              <Link
                href={`/dashboard/customers/${customer.id}/edit`}
                className="btn btn-edit btn-icon shrink-0"
                aria-label="Edit customer"
                title="Edit customer"
              >
                <Pencil className="w-4 h-4" />
              </Link>
              <IconButton
                variant="danger"
                icon={<Trash2 className="w-4 h-4" />}
                label="Delete"
                onClick={() => setDeleteState({ loading: false })}
              />
              <Link
                href="/dashboard/customers?view=spreadsheet"
                className="btn btn-secondary btn-icon shrink-0"
                aria-label="Switch to spreadsheet view"
                title="Spreadsheet view"
              >
                <X className="size-4" />
              </Link>
            </>
          }
        />

        {/* Detail body — all DB fields separately */}
        <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--color-card-bg)] p-6">
          <div className="card max-w-2xl p-6">
            <dl className="grid gap-4 sm:grid-cols-[auto_1fr]">
              <DetailRow label="Name" value={customer.name} />
              <DetailRow label="Contact person name" value={customer.contact_person_name} />
              <DetailRow label="NTN / CNIC" value={customer.ntn_cnic} />
              <DetailRow label="Registration type" value={customer.registration_type} />
              <DetailRow label="Email" value={customer.email} />
              <DetailRow label="Phone" value={customer.phone} />
              <DetailRow label="Address" value={customer.address} />
              <DetailRow label="Country" value={customer.country} />
              <DetailRow label="Province / State" value={customer.province} />
              <DetailRow label="City" value={customer.city} />
              <DetailRow label="Created at" value={formatDate(customer.created_at)} />
              <DetailRow label="Updated at" value={formatDate(customer.updated_at)} />
            </dl>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteState}
        title="Delete customer?"
        message="This customer will be removed. This cannot be undone. Customers with estimates or invoices cannot be deleted."
        confirmLabel="Delete"
        variant="danger"
        loading={deleteState?.loading ?? false}
        onConfirm={handleDelete}
        onCancel={() => setDeleteState(null)}
      />
    </>
  );
}

function DetailRow({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string | null;
  className?: string;
}) {
  const display = value != null && value !== "" ? value : "—";
  return (
    <>
      <dt className={`text-sm font-medium text-[var(--color-on-surface-variant)] ${className}`}>
        {label}
      </dt>
      <dd className={`text-sm text-[var(--color-on-surface)] ${className}`}>
        {display}
      </dd>
    </>
  );
}
