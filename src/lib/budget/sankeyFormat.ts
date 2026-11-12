// Display formatting for the Budget Sankey. Pure and shared by the diagram, the mobile stage list, the detail panel and the tables, so one amount is
// never printed two different ways on the same page.

/** "Rs 8,054bn" for large amounts, "Rs 152.0bn" below Rs 1,000bn, "Rs 1.20bn" below Rs 10bn: enough digits that small flows are not shown as zero. */
export function formatBn(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  const digits = abs >= 1000 ? 0 : abs >= 10 ? 1 : 2;
  return `Rs ${value.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}bn`;
}

/** Percentages: one decimal, two below 1% so a small share is not rounded to "0.0%". */
export function formatShare(pct: number): string {
  if (!Number.isFinite(pct)) return "—";
  return `${pct.toFixed(Math.abs(pct) < 1 ? 2 : 1)}%`;
}

/** Plain number with thousands separators, for table cells (the unit is in the column heading). */
export function formatNumber(value: number, decimals = 1): string {
  if (!Number.isFinite(value)) return "—";
  return value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/** Signed difference for reconciliation tables, e.g. "+0.417" or "−0.402" (a true minus sign). */
export function formatSigned(value: number, decimals = 3): string {
  if (!Number.isFinite(value)) return "—";
  const s = Math.abs(value).toFixed(decimals);
  return value > 0 ? `+${s}` : value < 0 ? `−${s}` : s;
}
