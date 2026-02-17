"use client";

import * as Dialog from "@radix-ui/react-dialog";

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  variant = "danger",
  loadingLabel,
  onConfirm,
  onCancel,
  loading = false,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
  loadingLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  const btnClass =
    variant === "danger"
      ? "btn btn-danger btn-sm"
      : "btn btn-primary btn-sm";

  return (
    <Dialog.Root open={open} onOpenChange={(open) => !open && onCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-50 bg-black/50"
          onClick={onCancel}
        />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-elevated p-8 shadow-elevated "
          onClick={(e) => e.stopPropagation()}
        >
          <Dialog.Title className="text-lg font-semibold text-[var(--color-on-surface)]">
            {title}
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-[var(--color-on-surface-variant)] leading-relaxed">
            {message}
          </Dialog.Description>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="btn btn-secondary btn-sm"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className={btnClass}
            >
              {loading ? (loadingLabel ?? "Deleting…") : confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
