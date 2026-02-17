"use client";

import { useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";

export function Drawer({
  open,
  onClose,
  children,
  title,
  width = "w-80",
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  width?: string;
}) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <Dialog.Root open={open} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-50 bg-black/50"
          onClick={onClose}
        />
        <Dialog.Content
          className={`fixed left-0 top-0 z-50 h-full flex flex-col overflow-hidden border-r border-[var(--color-outline)] bg-base shadow-elevated ${width} max-w-[calc(100vw-2rem)]`}
          onClick={(e) => e.stopPropagation()}
        >
          {title != null && (
            <div className="flex flex-shrink-0 items-center justify-between border-b border-[var(--color-divider)] px-4 py-3">
              <Dialog.Title className="text-base font-semibold text-[var(--color-on-surface)]">
                {title}
              </Dialog.Title>
              <Dialog.Close
                type="button"
                className="rounded-lg p-2 text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-variant)] hover:text-[var(--color-on-surface)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                aria-label="Close"
              >
                <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Dialog.Close>
            </div>
          )}
          <div className="min-h-0 flex-1 flex flex-col overflow-hidden">
            {children}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
