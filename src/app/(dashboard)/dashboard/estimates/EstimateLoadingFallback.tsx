import { Loader2 } from "lucide-react";

export function EstimateLoadingFallback() {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 text-[var(--color-on-surface-variant)]">
      <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
      <p className="text-sm">Loading estimate…</p>
    </div>
  );
}
