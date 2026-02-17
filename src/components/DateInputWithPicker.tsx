"use client";

import { useState, useMemo } from "react";
import { Calendar } from "lucide-react";
import { DayPicker } from "react-day-picker";
import * as Popover from "@radix-ui/react-popover";
import { DateInput } from "./DateInput";

function isoToDate(iso: string): Date | undefined {
  if (!iso || iso.length < 10) return undefined;
  const d = new Date(iso.slice(0, 10) + "T12:00:00");
  return isNaN(d.getTime()) ? undefined : d;
}

function dateToIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function DateInputWithPicker({
  value,
  onChange,
  id,
  name,
  className,
  placeholder = "DD/MM/YYYY",
  disabled,
  "aria-label": ariaLabel,
  "aria-required": ariaRequired,
}: {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  name?: string;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  "aria-label"?: string;
  "aria-required"?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selectedDate = useMemo(() => isoToDate(value), [value]);

  function handleSelect(d: Date | undefined) {
    if (d) {
      onChange(dateToIso(d));
      setOpen(false);
    }
  }

  return (
    <div className="flex items-center gap-1">
      <DateInput
        value={value}
        onChange={onChange}
        id={id}
        name={name}
        className={className}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-required={ariaRequired}
      />
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            type="button"
            disabled={disabled}
            className="flex h-[2.5rem] w-[2.5rem] shrink-0 items-center justify-center rounded-lg border border-[var(--color-outline)] bg-[var(--color-input-bg)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-variant)] hover:text-[var(--color-on-surface)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            aria-label="Open calendar"
          >
            <Calendar className="h-4 w-4" />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            className="rounded-xl border border-[var(--color-outline)] bg-elevated p-3 shadow-elevated z-50"
            align="end"
            sideOffset={4}
          >
            <DayPicker
              mode="single"
              selected={selectedDate}
              onSelect={handleSelect}
              disabled={{ before: new Date(1900, 0, 1), after: new Date(2100, 11, 31) }}
            />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
