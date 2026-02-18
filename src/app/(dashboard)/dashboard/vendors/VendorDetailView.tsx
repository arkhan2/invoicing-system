"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Copy, Pencil, Plus, Trash2, X } from "lucide-react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { VendorsTopBar } from "./VendorsTopBar";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { IconButton } from "@/components/IconButton";
import { deleteVendor } from "./actions";
import { startGlobalProcessing, endGlobalProcessing } from "@/components/GlobalProcessing";

export type VendorDetailData = {
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

export function VendorDetailView({
  vendor,
  companyId,
  purchaseInvoicesCount = 0,
}: {
  vendor: VendorDetailData;
  companyId: string;
  purchaseInvoicesCount?: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [deleteState, setDeleteState] = useState<{ loading: boolean } | null>(null);
  const [copyLoading, setCopyLoading] = useState(false);
  const isLg = useMediaQuery("(min-width: 1024px)");

  function handleCopy() {
    const lines = [
      vendor.name,
      vendor.contact_person_name ? `Contact: ${vendor.contact_person_name}` : null,
      vendor.email ? `Email: ${vendor.email}` : null,
      vendor.phone ? `Phone: ${vendor.phone}` : null,
      vendor.address ? `Address: ${vendor.address}` : null,
      [vendor.city, vendor.province, vendor.country].filter(Boolean).length > 0
        ? [vendor.city, vendor.province, vendor.country].filter(Boolean).join(", ")
        : null,
      vendor.ntn_cnic ? `NTN/CNIC: ${vendor.ntn_cnic}` : null,
      vendor.registration_type ? `Registration: ${vendor.registration_type}` : null,
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
  backParams.set("highlight", vendor.id);
  backParams.set("page", backPage);
  backParams.set("perPage", backPerPage);
  if (backQ.trim()) backParams.set("q", backQ.trim());
  const backHref = `/dashboard/vendors?${backParams.toString()}`;
  const backLabel = "Back to list";

  const addParams = new URLSearchParams();
  addParams.set("page", backPage);
  addParams.set("perPage", backPerPage);
  if (backQ.trim()) addParams.set("q", backQ.trim());

  async function handleDelete() {
    setDeleteState({ loading: true });
    startGlobalProcessing("Deleting…");
    try {
      const result = await deleteVendor(vendor.id, companyId);
      setDeleteState(null);
      if (result?.error) {
        endGlobalProcessing({ error: result.error });
        return;
      }
      endGlobalProcessing({ success: "Vendor deleted." });
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
        <VendorsTopBar
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
                {vendor.name}
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
                href={addParams.toString() ? `/dashboard/vendors/new?${addParams.toString()}` : "/dashboard/vendors/new"}
                className="btn btn-add btn-icon shrink-0"
                aria-label="New vendor"
                title="New vendor"
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
                  return qs ? `/dashboard/vendors/${vendor.id}/edit?${qs}` : `/dashboard/vendors/${vendor.id}/edit`;
                })()}
                className="btn btn-edit btn-icon shrink-0"
                aria-label="Edit vendor"
                title="Edit vendor"
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
            {purchaseInvoicesCount > 0 && (
              <div className="flex flex-wrap items-center gap-3 border-b border-[var(--color-outline)] pb-4">
                <Link
                  href={`/dashboard/purchases?vendorId=${vendor.id}`}
                  className="text-sm font-medium text-[var(--color-primary)] hover:underline"
                >
                  Purchase Invoices ({purchaseInvoicesCount})
                </Link>
              </div>
            )}
            <dl className="grid gap-4 sm:grid-cols-[auto_1fr]">
              <DetailRow label="Name" value={vendor.name} />
              <DetailRow label="Contact person name" value={vendor.contact_person_name} />
              <DetailRow label="NTN / CNIC" value={vendor.ntn_cnic} />
              <DetailRow label="Registration type" value={vendor.registration_type} />
              <DetailRow label="Email" value={vendor.email} />
              <DetailRow label="Phone" value={vendor.phone} />
              <DetailRow label="Address" value={vendor.address} />
              <DetailRow label="Country" value={vendor.country} />
              <DetailRow label="Province / State" value={vendor.province} />
              <DetailRow label="City" value={vendor.city} />
              <DetailRow label="Created at" value={formatDate(vendor.created_at)} />
              <DetailRow label="Updated at" value={formatDate(vendor.updated_at)} />
            </dl>
          </div>
        </div>

        {/* Sticky bottom action bar on mobile */}
        {!isLg && (
          <div
            className="sticky bottom-0 z-10 flex flex-shrink-0 items-center justify-end gap-2 border-t border-[var(--color-outline)] bg-base px-4 py-3 lg:hidden"
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
          >
            <Link href={backHref} className="btn btn-secondary btn-sm">
              Back
            </Link>
            <Link
              href={addParams.toString() ? `/dashboard/vendors/new?${addParams.toString()}` : "/dashboard/vendors/new"}
              className="btn btn-add btn-sm"
            >
              Add
            </Link>
            <Link
              href={(() => {
                const p = new URLSearchParams();
                p.set("page", backPage);
                p.set("perPage", backPerPage);
                if (backQ.trim()) p.set("q", backQ.trim());
                const qs = p.toString();
                return qs ? `/dashboard/vendors/${vendor.id}/edit?${qs}` : `/dashboard/vendors/${vendor.id}/edit`;
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
        title="Delete vendor?"
        message="This vendor will be removed. This cannot be undone. Vendors with purchase invoices cannot be deleted."
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
