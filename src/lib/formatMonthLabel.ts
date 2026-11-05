const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

/** "2026-06-12" -> "Jun 2026" */
export function formatMonthLabel(dateStr: string): string {
  const [year, month] = dateStr.split("-");
  return `${MONTH_NAMES[Number(month) - 1]} ${year}`;
}

/**
 * "2024-06-30" -> "FY2024" — for ANNUAL fiscal-year series only.
 *
 * Pakistan's fiscal year runs July–June, so SBP stamps each annual
 * observation with its 30 June end date. Formatting those with
 * formatMonthLabel produced "Jun 2024", which reads as a single month and
 * made the fiscal-balance card look like it was comparing June 2025 against
 * June 2024 — two consecutive FULL YEARS presented as two months (redesign
 * Phase 4C). The underlying values and the computed difference were always
 * correct; only this label was wrong.
 *
 * Falls back to formatMonthLabel for any date that is not a June year-end,
 * so a series that ever reports a different period is described accurately
 * rather than mislabelled the other way. (src/lib/data/sbp.ts carries its
 * own copy of this helper beside its own local formatMonthLabel.)
 */
export function formatFiscalYearLabel(dateStr: string): string {
  const [year, month] = dateStr.split("-");
  if (Number(month) !== 6) return formatMonthLabel(dateStr);
  return `FY${year}`;
}
