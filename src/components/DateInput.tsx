"use client";

import { useState, useEffect, useCallback } from "react";

/** Convert YYYY-MM-DD to DD/MM/YYYY for display. */
function toDisplay(iso: string): string {
  if (!iso || iso.length < 10) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!d || !m || !y) return "";
  const day = d.padStart(2, "0");
  const month = m.padStart(2, "0");
  return `${day}/${month}/${y}`;
}

/** Parse DD/MM/YYYY or D/M/YYYY (with or without slashes) to YYYY-MM-DD, or null if invalid. */
function parseDDMMYYYY(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length !== 8) return null;
  const dd = digits.slice(0, 2);
  const mm = digits.slice(2, 4);
  const yyyy = digits.slice(4, 8);
  const day = parseInt(dd, 10);
  const month = parseInt(mm, 10);
  const year = parseInt(yyyy, 10);
  if (month < 1 || month > 12) return null;
  const lastDay = new Date(year, month, 0).getDate();
  if (day < 1 || day > lastDay) return null;
  if (year < 1900 || year > 2100) return null;
  return `${yyyy}-${mm}-${dd}`;
}

/** Format typing value with slashes: 04022026 -> 04/02/2026. */
function formatWithSlashes(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function DateInput({
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
  const [display, setDisplay] = useState(() => toDisplay(value));

  useEffect(() => {
    setDisplay(toDisplay(value));
  }, [value]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const formatted = formatWithSlashes(raw);
      setDisplay(formatted);
      const iso = parseDDMMYYYY(formatted);
      if (iso) onChange(iso);
    },
    [onChange]
  );

  const handleBlur = useCallback(() => {
    const iso = parseDDMMYYYY(display);
    if (iso) {
      onChange(iso);
      setDisplay(toDisplay(iso));
    } else if (display.trim() === "") {
      onChange("");
      setDisplay("");
    } else {
      setDisplay(toDisplay(value) || "");
    }
  }, [display, value, onChange]);

  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      id={id}
      name={name}
      value={display}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
      aria-label={ariaLabel}
      aria-required={ariaRequired}
      maxLength={10}
    />
  );
}
