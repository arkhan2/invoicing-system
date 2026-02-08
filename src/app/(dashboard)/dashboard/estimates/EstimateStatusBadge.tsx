/**
 * Renders estimate status with consistent colors (Draft, Sent, Expired, Converted).
 * Uses CSS variables from globals.css: --color-estimate-{status}-bg/text.
 */
export function EstimateStatusBadge({ status, className = "" }: { status: string; className?: string }) {
  const normalized = status.trim();
  const dataStatus = normalized.toLowerCase();
  const safeStatus = ["draft", "sent", "expired", "converted"].includes(dataStatus) ? dataStatus : "draft";
  return (
    <span
      className={`estimate-status-badge ${className}`.trim()}
      data-status={safeStatus}
    >
      {normalized || "Draft"}
    </span>
  );
}
