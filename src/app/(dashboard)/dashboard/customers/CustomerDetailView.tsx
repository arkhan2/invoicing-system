"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Copy, Pencil, Plus, Trash2, X } from "lucide-react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
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
  estimatesCount = 0,
  invoicesCount = 0,
}: {
  customer: CustomerDetailData;
  companyId: string;
  estimatesCount?: number;
  invoicesCount?: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [deleteState, setDeleteState] = useState<{ loading: boolean } | null>(null);
  const [copyLoading, setCopyLoading] = useState(false);
  const isLg = useMediaQuery("(min-width: 1024px)");

  function handleCopy() {
    const lines = [
      customer.name,
      customer.contact_person_name ? `Contact: ${customer.contact_person_name}` : null,
      customer.email ? `Email: ${customer.email}` : null,
      customer.phone ? `Phone: ${customer.phone}` : null,
      customer.address ? `Address: ${customer.address}` : null,
      [customer.city, customer.province, customer.country].filter(Boolean).length > 0
        ? [customer.city, customer.province, customer.country].filter(Boolean).join(", ")
        : null,
      customer.ntn_cnic ? `NTN/CNIC: ${customer.ntn_cnic}` : null,
      customer.registration_type ? `Registration: ${customer.registration_type}` : null,
    ].filter(Boolean) as string[];
    const text = lines.join("\n");
    setCopyLoading(true);
    navigator.clipboard.writeText(text).then(
      () => {
        setCopyLoading(false);
        startGlobalProcessing("Copied to clipboard.");
        setTimeout(() => endGlobalProcessing(), 1500);
      },
      () => {
        setCopyLoading(false);
        endGlobalProcessing({ error: "Could not copy to clipboard." });
      }
    );
  }

  const backPage = searchParams.get("page") ?? "1";
  const backPerPage = searchParams.get("perPage") ?? "100";
  const backQ = searchParams.get("q") ?? "";

  const backParams = new URLSearchParams();
  backParams.set("highlight", customer.id);
  backParams.set("page", backPage);
  backParams.set("perPage", backPerPage);
  if (backQ.trim()) backParams.set("q", backQ.trim());
  const backHref = `/dashboard/customers?${backParams.toString()}`;
  const backLabel = "Back to list";

  const addParams = new URLSearchParams();
  addParams.set("page", backPage);
  addParams.set("perPage", backPerPage);
  if (backQ.trim()) addParams.set("q", backQ.trim());

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
      router.push(backHref);
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
                href={backHref}
                className="btn btn-secondary btn-icon shrink-0"
                aria-label={backLabel}
                title={backLabel}
              >
                <ChevronLeft className="size-4" />
              </Link>
              <h2 className="truncate text-lg font-semibold text-[var(--color-on-surface)]">
                {customer.name}
              </h2>
              <IconButton
                variant="secondary"
                icon={<Copy className="w-4 h-4" />}
                label="Copy to clipboard"
                onClick={handleCopy}
                disabled={copyLoading}
                className="shrink-0"
              />
            </>
          }
          right={
            <>
              <Link
                href={addParams.toString() ? `/dashboard/customers/new?${addParams.toString()}` : "/dashboard/customers/new"}
                className="btn btn-add btn-icon shrink-0"
                aria-label="New customer"
                title="New customer"
              >
                <Plus className="size-4" />
              </Link>
              <Link
                href={(() => {
                  const p = new URLSearchParams();
                  p.set("page", backPage);
                  p.set("perPage", backPerPage);
                  if (backQ.trim()) p.set("q", backQ.trim());
                  const qs = p.toString();
                  return qs ? `/dashboard/customers/${customer.id}/edit?${qs}` : `/dashboard/customers/${customer.id}/edit`;
                })()}
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
                href={backHref}
                className="btn btn-secondary btn-icon shrink-0"
                aria-label={backLabel}
                title={backLabel}
              >
                <X className="size-4" />
              </Link>
            </>
          }
        />

        {/* Detail body — documents + all DB fields */}
        <div className={`min-h-0 flex-1 overflow-y-auto bg-base p-4 lg:p-6 ${!isLg ? "pb-24" : ""}`}>
          <div className="card max-w-2xl p-6 space-y-6">
            {(estimatesCount > 0 || invoicesCount > 0) && (
              <div className="flex flex-wrap items-center gap-3 border-b border-[var(--color-outline)] pb-4">
                {estimatesCount > 0 && (
                  <Link
                    href={`/dashboard/estimates?customerId=${customer.id}`}
                    className="text-sm font-medium text-[var(--color-primary)] hover:underline"
                  >
                    Estimates ({estimatesCount})
                  </Link>
                )}
                {invoicesCount > 0 && (
                  <Link
                    href={`/dashboard/sales?customerId=${customer.id}`}
                    className="text-sm font-medium text-[var(--color-primary)] hover:underline"
                  >
                    Invoices ({invoicesCount})
                  </Link>
                )}
              </div>
            )}
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

        {/* Sticky bottom action bar on mobile */}
        {!isLg && (
          <div className="sticky bottom-0 z-10 flex flex-shrink-0 items-center justify-end gap-2 border-t border-[var(--color-outline)] bg-base px-4 py-3 lg:hidden"
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
            <Link
              href={backHref}
              className="btn btn-secondary btn-sm"
            >
              Back
            </Link>
            <Link
              href={(() => {
                const p = new URLSearchParams();
                p.set("page", backPage);
                p.set("perPage", backPerPage);
                if (backQ.trim()) p.set("q", backQ.trim());
                const qs = p.toString();
                return qs ? `/dashboard/customers/${customer.id}/edit?${qs}` : `/dashboard/customers/${customer.id}/edit`;
              })()}
              className="btn btn-edit btn-sm"
            >
              Edit
            </Link>
            <button
              type="button"
              onClick={() => setDeleteState({ loading: false })}
              className="btn btn-danger btn-sm"
            >
              Delete
            </button>
          </div>
        )}
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
