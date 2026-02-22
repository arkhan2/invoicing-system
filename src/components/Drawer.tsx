"use client";

import { useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";

export function Drawer({
  open,
  onClose,
  children,
  title,
  width = "w-80",
  keepMounted = false,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  width?: string;
  /** When true, children stay mounted when drawer is closed so content (e.g. list sidebar) keeps its data. */
  keepMounted?: boolean;
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

  const content = (
    <>
      <Dialog.Overlay
        className={`fixed inset-0 z-50 bg-black/50 transition-opacity ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
      />
<Dialog.Content
            className={`fixed left-0 top-0 z-50 h-full flex flex-col overflow-hidden border-r border-[var(--color-outline)] bg-base shadow-elevated ${width} max-w-[calc(100vw-2rem)] transition-transform duration-200 ease-out ${open ? "translate-x-0" : "-translate-x-full"} ${keepMounted && !open ? "pointer-events-none" : ""}`}
            onClick={(e) => e.stopPropagation()}
            onEscapeKeyDown={() => onClose()}
            aria-hidden={!open}
            style={keepMounted && !open ? { visibility: "hidden" as const } : undefined}
          >
        <Dialog.Title
          className={title != null && title !== "" ? "flex flex-shrink-0 items-center justify-between border-b border-[var(--color-divider)] px-4 py-3 text-base font-semibold text-[var(--color-on-surface)]" : "sr-only"}
        >
          {title != null && title !== "" ? (
            <>
              <span>{title}</span>
              <Dialog.Close
                type="button"
                className="rounded-lg p-2 text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-variant)] hover:text-[var(--color-on-surface)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                aria-label="Close"
              >
                <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Dialog.Close>
            </>
          ) : (
            "Navigation"
          )}
        </Dialog.Title>
        <div className="min-h-0 flex-1 flex flex-col overflow-hidden">
          {children}
        </div>
      </Dialog.Content>
    </>
  );

  return (
    <Dialog.Root open={open} onOpenChange={(openState) => !openState && onClose()}>
      {keepMounted ? (
        <Dialog.Portal>{content}</Dialog.Portal>
      ) : (
        open && <Dialog.Portal>{content}</Dialog.Portal>
      )}
    </Dialog.Root>
  );
}
