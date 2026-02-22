"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, X, List, Trash2 } from "lucide-react";
import { IconButton } from "@/components/IconButton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PaymentForm } from "./PaymentForm";
import { usePaymentsListDrawer } from "./PaymentsListDrawerContext";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { deletePayment, type PaymentForEdit } from "./actions";
import { startGlobalProcessing, endGlobalProcessing } from "@/components/GlobalProcessing";

const topBarClass =
  "dashboard-top-bar flex flex-shrink-0 items-center justify-between gap-4 border-b border-[var(--color-divider)] bg-base px-4 py-3 max-lg:sticky max-lg:top-0 max-lg:z-10";

const FORM_ID = "payment-form";

export function PaymentFormPage({
  companyId,
  title,
  backHref,
  listHref,
  returnTo,
  allocateToInvoice,
  initialCustomerId,
  lockCustomer,
  editPaymentId,
  initialPayment,
}: {
  companyId: string;
  title: string;
  backHref: string;
  listHref: string;
  returnTo?: string | null;
  /** When set (from invoice), allocate the new payment to this invoice after create. */
  allocateToInvoice?: string | null;
  initialCustomerId?: string | null;
  /** When true (from invoice), customer is pre-selected and cannot be changed. */
  lockCustomer?: boolean;
  /** When set, form is in edit mode (same card as create). */
  editPaymentId?: string | null;
  initialPayment?: PaymentForEdit | null;
}) {
  const router = useRouter();
  const listDrawer = usePaymentsListDrawer();
  const isLg = useMediaQuery("(min-width: 1024px)");
  const showListButton = !isLg && listDrawer != null;
  const successHref = returnTo ?? listHref;
  const isEdit = !!editPaymentId && !!initialPayment;
  const [deleteState, setDeleteState] = useState<{ loading: boolean } | null>(null);

  function handleSave() {
    const form = document.getElementById(FORM_ID) as HTMLFormElement | null;
    form?.requestSubmit();
  }

  function handleCancel() {
    router.push(backHref);
  }

  function handleClose() {
    router.push(backHref);
  }

  async function handleDelete() {
    if (!editPaymentId) return;
    setDeleteState({ loading: true });
    startGlobalProcessing("Deleting…");
    try {
      const result = await deletePayment(companyId, editPaymentId);
      setDeleteState(null);
      if (result?.error) {
        endGlobalProcessing({ error: result.error });
        return;
      }
      endGlobalProcessing({ success: "Payment deleted." });
      router.push(backHref);
      router.refresh();
    } finally {
      endGlobalProcessing();
    }
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className={topBarClass}>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {showListButton && (
            <button
              type="button"
              onClick={() => listDrawer?.openListDrawer()}
              className="btn btn-secondary btn-icon shrink-0 lg:hidden"
              aria-label="Open list"
              title="List"
            >
              <List className="size-4" />
            </button>
          )}
          <h2 className="truncate text-lg font-semibold text-[var(--color-on-surface)]">
            {title}
          </h2>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <IconButton
            variant="primary"
            icon={<Save className="size-4" />}
            label="Save"
            onClick={handleSave}
          />
          {isEdit && (
            <IconButton
              variant="danger"
              icon={<Trash2 className="size-4" />}
              label="Delete payment"
              onClick={() => setDeleteState({ loading: false })}
            />
          )}
          <IconButton
            variant="secondary"
            icon={<X className="size-4" />}
            label="Close"
            onClick={handleClose}
          />
        </div>
      </div>
      <ConfirmDialog
        open={!!deleteState}
        title="Delete payment?"
        message="This payment will be removed. All allocations to invoices will also be removed. This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={deleteState?.loading ?? false}
        onConfirm={handleDelete}
        onCancel={() => setDeleteState(null)}
      />
      <div className="min-h-0 flex-1 overflow-y-auto bg-base p-4">
        <div className="card max-w-3xl p-4 mx-auto">
          <PaymentForm
            companyId={companyId}
            initialCustomerId={initialPayment?.customer_id ?? initialCustomerId}
            lockCustomer={lockCustomer ?? false}
            allocateToInvoice={isEdit ? null : allocateToInvoice}
            initialPayment={initialPayment ?? null}
            paymentId={editPaymentId ?? null}
            hideBottomActions
            onSuccess={(paymentId) => {
              if (paymentId && returnTo && !isEdit) {
                router.push(returnTo);
              } else if (paymentId && !isEdit) {
                router.push(`${listHref}?created=${paymentId}`);
              } else {
                router.push(successHref);
              }
              router.refresh();
            }}
            onCancel={() => router.push(backHref)}
          />
        </div>
      </div>
    </div>
  );
}
