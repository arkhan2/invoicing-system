"use client";

import { useEffect } from "react";

export function Modal({
  open,
  onClose,
  title,
  children,
  contentClassName,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  contentClassName?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="absolute inset-0"
        aria-hidden
        onClick={onClose}
      />
      <div
        className={`relative z-10 flex max-h-[90vh] w-full ${contentClassName ?? "max-w-lg"} flex-col rounded-2xl overflow-hidden bg-[var(--color-card-bg)] shadow-lg`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-shrink-0 items-center justify-between border-b border-[var(--color-divider)] bg-[var(--color-card-bg)] px-6 py-4">
          <h2 id="modal-title" className="text-lg font-semibold text-[var(--color-on-surface)]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[var(--color-outline)] p-2 text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-variant)] hover:text-[var(--color-on-surface)] transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            aria-label="Close"
          >
            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}
