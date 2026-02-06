/** Format date string (YYYY-MM-DD) as "4 Feb 2026" for estimates and documents. */
export function formatEstimateDate(date: string | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getDate()} ${d.toLocaleDateString("en-GB", { month: "short" })} ${d.getFullYear()}`;
}
