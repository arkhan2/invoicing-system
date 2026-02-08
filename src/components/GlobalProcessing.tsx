"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Check, AlertCircle } from "lucide-react";

const EVENT_START = "global-processing-start";
const EVENT_END = "global-processing-end";

type StartDetail = { label?: string };
type EndDetail = { success?: string; error?: string };

/**
 * Call when starting an async action. Pair with endGlobalProcessing() in a finally block.
 * Multiple overlapping actions are supported (counter); the latest label is shown.
 */
export function startGlobalProcessing(label?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(EVENT_START, { detail: { label: label || "Processing…" } as StartDetail })
  );
}

/**
 * Call when the async action finishes. Always call in a finally block.
 * Pass { success: "Done!" } to show a brief "complete" message (checkmark + text) for ~2s.
 * Pass { error: "Bad request" } to show the error in the same global status control.
 */
export function endGlobalProcessing(options?: { success?: string; error?: string }) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT_END, { detail: options ?? {} }));
}

const COMPLETE_DURATION_MS = 2200;

export function GlobalProcessingIndicator() {
  const [count, setCount] = useState(0);
  const [label, setLabel] = useState("Processing…");
  const [completeMessage, setCompleteMessage] = useState<string | null>(null);
  const [completeType, setCompleteType] = useState<"success" | "error">("success");
  const [completeVisible, setCompleteVisible] = useState(false);

  const onStart = useCallback((e: Event) => {
    const detail = (e as CustomEvent<StartDetail>).detail;
    setCount((c) => c + 1);
    setLabel(detail?.label ?? "Processing…");
    setCompleteMessage(null);
  }, []);

  const onEnd = useCallback((e: Event) => {
    const detail = (e as CustomEvent<EndDetail>).detail ?? {};
    setCount((c) => Math.max(0, c - 1));
    if (detail.success) {
      setCompleteMessage(detail.success);
      setCompleteType("success");
      setCompleteVisible(true);
    } else if (detail.error) {
      setCompleteMessage(detail.error);
      setCompleteType("error");
      setCompleteVisible(true);
    }
  }, []);

  useEffect(() => {
    window.addEventListener(EVENT_START, onStart);
    window.addEventListener(EVENT_END, onEnd);
    return () => {
      window.removeEventListener(EVENT_START, onStart);
      window.removeEventListener(EVENT_END, onEnd);
    };
  }, [onStart, onEnd]);

  useEffect(() => {
    if (!completeMessage) return;
    const fadeOutAt = COMPLETE_DURATION_MS - 300;
    const hideAt = COMPLETE_DURATION_MS;
    const t1 = setTimeout(() => setCompleteVisible(false), fadeOutAt);
    const t2 = setTimeout(() => setCompleteMessage(null), hideAt);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [completeMessage]);

  if (completeMessage) {
    const isError = completeType === "error";
    return (
      <div
        role="alert"
        aria-live="assertive"
        className={`fixed bottom-4 right-4 z-[100] flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium shadow-lg transition-opacity duration-300 ${completeVisible ? "opacity-100" : "opacity-0"} ${
          isError
            ? "border-[var(--color-error)] bg-[var(--color-error)] text-white"
            : "border-[var(--color-badge-success-bg)] bg-[var(--color-badge-success-bg)] text-[var(--color-badge-success-text)]"
        }`}
      >
        {isError ? (
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
        ) : (
          <Check className="h-4 w-4 shrink-0" aria-hidden />
        )}
        <span>{completeMessage}</span>
      </div>
    );
  }

  if (count === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-[100] flex items-center gap-2 rounded-full border border-[var(--color-outline)] bg-[var(--color-card-bg)] px-4 py-2.5 text-sm font-medium text-[var(--color-on-surface)] shadow-lg"
    >
      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[var(--color-primary)]" aria-hidden />
      <span>{label}</span>
      {count > 1 && (
        <span className="rounded-full bg-[var(--color-surface-variant)] px-1.5 py-0.5 text-xs text-[var(--color-on-surface-variant)]">
          {count}
        </span>
      )}
    </div>
  );
}
