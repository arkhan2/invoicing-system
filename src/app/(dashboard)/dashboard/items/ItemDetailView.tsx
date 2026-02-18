"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Copy, Pencil, Plus, Trash2, X } from "lucide-react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { ItemsTopBar } from "./ItemsTopBar";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { IconButton } from "@/components/IconButton";
import { deleteItem } from "./actions";
import { startGlobalProcessing, endGlobalProcessing } from "@/components/GlobalProcessing";

export type ItemDetailData = {
  id: string;
  name: string;
  description: string | null;
  reference: string | null;
  hs_code: string | null;
  unit_rate: number | null;
  rate_label?: string | null;
  uom_code?: string | null;
  sale_type: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export function ItemDetailView({
  item,
  companyId,
  estimatesCount = 0,
  invoicesCount = 0,
}: {
  item: ItemDetailData;
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
      item.name,
      item.description ? `Description: ${item.description}` : null,
      item.reference ? `Reference: ${item.reference}` : null,
      item.hs_code ? `HS Code: ${item.hs_code}` : null,
      item.unit_rate != null ? `Unit rate: ${item.unit_rate}` : null,
      item.uom_code ? `UOM: ${item.uom_code}` : null,
      item.rate_label ? `Tax rate: ${item.rate_label}` : null,
      item.sale_type ? `Sale type: ${item.sale_type}` : null,
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

  async function handleDelete() {
    setDeleteState({ loading: true });
    startGlobalProcessing("Deleting…");
    try {
      const result = await deleteItem(item.id, companyId);
      setDeleteState(null);
      if (result?.error) {
        endGlobalProcessing({ error: result.error });
        return;
      }
      endGlobalProcessing({ success: "Item deleted." });
      router.push(backHref);
      router.refresh();
    } finally {
      endGlobalProcessing();
    }
  }

  const formatDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : null;

  const backPage = searchParams.get("page") ?? "1";
  const backPerPage = searchParams.get("perPage") ?? "100";
  const backQ = searchParams.get("q") ?? "";
  const backParams = new URLSearchParams();
  backParams.set("highlight", item.id);
  backParams.set("page", backPage);
  backParams.set("perPage", backPerPage);
  if (backQ.trim()) backParams.set("q", backQ.trim());
  const backHref = `/dashboard/items?${backParams.toString()}`;
  const backLabel = "Back to list";

  const editParams = new URLSearchParams();
  editParams.set("page", backPage);
  editParams.set("perPage", backPerPage);
  if (backQ.trim()) editParams.set("q", backQ.trim());
  const editQs = editParams.toString();
  const editHref = editQs ? `/dashboard/items/${item.id}/edit?${editQs}` : `/dashboard/items/${item.id}/edit`;

  const addParams = new URLSearchParams();
  addParams.set("page", backPage);
  addParams.set("perPage", backPerPage);
  if (backQ.trim()) addParams.set("q", backQ.trim());
  const newItemHref = addParams.toString() ? `/dashboard/items/new?${addParams.toString()}` : "/dashboard/items/new";

  return (
    <>
      <div className="flex h-full min-h-0 w-full flex-col">
        <ItemsTopBar
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
                {item.name}
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
                href={newItemHref}
                className="btn btn-add btn-icon shrink-0"
                aria-label="New item"
                title="New item"
              >
                <Plus className="size-4" />
              </Link>
              <Link
                href={editHref}
                className="btn btn-edit btn-icon shrink-0"
                aria-label="Edit item"
                title="Edit item"
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

        <div className={`min-h-0 flex-1 overflow-y-auto bg-base p-4 lg:p-6 ${!isLg ? "pb-24" : ""}`}>
          <div className="card max-w-2xl p-6 space-y-6">
            {(estimatesCount > 0 || invoicesCount > 0) && (
              <div className="flex flex-wrap items-center gap-3 border-b border-[var(--color-outline)] pb-4">
                {estimatesCount > 0 && (
                  <Link
                    href={`/dashboard/estimates`}
                    className="text-sm font-medium text-[var(--color-primary)] hover:underline"
                  >
                    Estimates ({estimatesCount})
                  </Link>
                )}
                {invoicesCount > 0 && (
                  <Link
                    href={`/dashboard/sales`}
                    className="text-sm font-medium text-[var(--color-primary)] hover:underline"
                  >
                    Invoices ({invoicesCount})
                  </Link>
                )}
              </div>
            )}
            <dl className="grid gap-4 sm:grid-cols-[auto_1fr]">
              <DetailRow label="Item #" value={item.reference} />
              <DetailRow label="Description" value={item.name} />
              <DetailRow label="UOM" value={item.uom_code ?? null} />
              <DetailRow
                label="Unit price"
                value={item.unit_rate != null ? String(item.unit_rate) : null}
              />
              <DetailRow label="Additional notes" value={item.description} />
              <DetailRow label="HS Code" value={item.hs_code} />
              <DetailRow label="Default tax rate" value={item.rate_label ?? null} />
              <DetailRow label="Sale type" value={item.sale_type} />
              <DetailRow label="Created at" value={formatDate(item.created_at)} />
              <DetailRow label="Updated at" value={formatDate(item.updated_at)} />
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
            <Link href={newItemHref} className="btn btn-add btn-sm">
              Add
            </Link>
            <Link href={editHref} className="btn btn-edit btn-sm">
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
        title="Delete item?"
        message="This item will be removed. This cannot be undone."
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
