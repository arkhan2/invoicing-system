"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Settings } from "lucide-react";

export function PerPageDropdown({
  perPage,
  perPageOptions,
  onSelect,
  "aria-label": ariaLabel = "Items per page",
}: {
  perPage: number;
  perPageOptions: readonly number[];
  onSelect: (n: number) => void;
  "aria-label"?: string;
}) {

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 text-sm text-[var(--color-on-surface)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] rounded"
          aria-label={ariaLabel}
        >
          <Settings className="h-3.5 w-3.5 text-[var(--color-on-surface-variant)]" />
          <span>{perPage} per page</span>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side="top"
          sideOffset={4}
          className="min-w-[8rem] rounded-lg border border-[var(--color-outline)] bg-elevated py-1 shadow-elevated z-50"
          align="start"
        >
          {perPageOptions.map((n) => (
            <DropdownMenu.Item
              key={n}
              className="w-full cursor-pointer px-3 py-1.5 text-left text-sm text-[var(--color-on-surface)] hover:bg-[var(--color-surface-variant)] focus:bg-[var(--color-surface-variant)] focus:outline-none"
              onSelect={() => onSelect(n)}
            >
              {n} per page
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
