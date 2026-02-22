"use client";

import * as Dialog from "@radix-ui/react-dialog";

export function Modal({
  open,
  onClose,
  title,
  children,
  contentClassName,
  headerRight,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  contentClassName?: string;
  /** Optional slot for the header right side (e.g. action buttons). When set, replaces the default close button. */
  headerRight?: React.ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-50 bg-black/50"
          onClick={onClose}
        />
        <Dialog.Content
          className={`fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-full -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl overflow-hidden bg-elevated shadow-elevated p-0 ${contentClassName ?? "max-w-lg"}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-shrink-0 items-center justify-between gap-4 border-b border-[var(--color-divider)] bg-elevated px-6 py-4">
            <Dialog.Title className="min-w-0 truncate text-lg font-semibold text-[var(--color-on-surface)]">
              {title}
            </Dialog.Title>
            {headerRight != null ? (
              headerRight
            ) : (
              <Dialog.Close
                type="button"
                className="shrink-0 rounded-xl border border-[var(--color-outline)] p-2 text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-variant)] hover:text-[var(--color-on-surface)] transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                aria-label="Close"
              >
                <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Dialog.Close>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-6">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
