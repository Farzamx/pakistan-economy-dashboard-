// Small, deterministic formatters for the Interest Rate page: no locale, no clock, so a render reads the same on every server and in every browser.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-10-26" -> "26 Oct 2026". Anything that is not a full ISO date is returned unchanged. */
export function formatDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const month = MONTHS[Number(m[2]) - 1];
  return month ? `${Number(m[3])} ${month} ${m[1]}` : iso;
}

/** "2026-10-26" -> "26 Oct '26": compact, for chart axes and bar labels. */
export function shortDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const month = MONTHS[Number(m[2]) - 1];
  return month ? `${Number(m[3])} ${month} '${m[1].slice(2)}` : iso;
}

/** A percentage-point change with an explicit sign and a true minus: +0.50 / −1.25 / 0.00. */
export function signedPp(value: number, decimals = 2): string {
  const v = Math.abs(value) < 0.5 * 10 ** -decimals ? 0 : value;
  const body = Math.abs(v).toFixed(decimals);
  return v > 0 ? `+${body}` : v < 0 ? `−${body}` : body;
}

/** A rate with a unit: 12.00% . Percent signs are part of the number, never a separate word. */
export function pct(value: number, decimals = 2): string {
  return `${value < 0 ? "−" : ""}${Math.abs(value).toFixed(decimals)}%`;
}

/** "18 months" / "1 month" / "less than a month". */
export function spanText(months: number): string {
  if (months <= 0) return "within one month";
  if (months === 1) return "1 month";
  if (months < 24) return `${months} months`;
  const years = months / 12;
  return `${Number.isInteger(years) ? years : years.toFixed(1)} years`;
}
