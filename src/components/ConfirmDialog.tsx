"use client";

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
  if (!open) return null;

  const btnClass =
    variant === "danger"
      ? "btn btn-danger btn-sm"
      : "btn btn-primary btn-sm";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-desc"
    >
      <div className="absolute inset-0" aria-hidden onClick={onCancel} />
      <div
        className="card relative z-10 w-full max-w-sm p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-title" className="text-lg font-semibold text-[var(--color-on-surface)]">
          {title}
        </h2>
        <p id="confirm-desc" className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
          {message}
        </p>
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
      </div>
    </div>
  );
}
