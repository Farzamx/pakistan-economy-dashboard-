const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

/** "2026-06-12" -> "Jun 2026" */
export function formatMonthLabel(dateStr: string): string {
  const [year, month] = dateStr.split("-");
  return `${MONTH_NAMES[Number(month) - 1]} ${year}`;
}
