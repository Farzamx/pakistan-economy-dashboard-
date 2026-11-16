// Display formatting shared by the Overview page's sections. Pure functions, no I/O.
//
// ONE date format for the whole page:
//   monthly / quarterly series -> "Oct 2026" (never a month-end day)
//   daily / weekly / as-needed -> "16 Nov 2026"
//   annual (fiscal) series     -> "FY2025"; a bare calendar year stays "2025"
// Source names are shown as institutions ("SBP"), never as file or API names.

import { formatFiscalYearLabel } from "@/lib/formatMonthLabel";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] as const;

export const PKT_TIME_ZONE = "Asia/Karachi";

/** The observation period of a figure, in the page's one format. "—" when unknown. */
export function formatObservation(date: string | null | undefined, frequency?: string): string {
  if (!date) return "—";
  if (/^\d{4}$/.test(date)) return date;
  const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?/.exec(date);
  if (!m) return date;
  const [, year, month, day] = m;
  if (frequency === "Annual") return formatFiscalYearLabel(date);
  const monthName = MONTHS[Number(month) - 1] ?? "?";
  if (frequency === "Monthly" || frequency === "Quarterly" || !day) return `${monthName} ${year}`;
  return `${Number(day)} ${monthName} ${year}`;
}

/** "SBP Forex_Arch.xlsx (fallback)" -> "SBP". Institutions only: no file names, API names or delivery notes. */
export function cleanSourceName(source: string | null | undefined): string {
  if (!source) return "";
  const s = source.replace(/\s*\(fallback\)\s*/i, "").trim();
  if (/^SBP\b/i.test(s)) return "SBP";
  if (/^PBS\b/i.test(s)) return "PBS";
  return s.replace(/\s+\S+\.(xlsx?|csv|json|pdf)\b/gi, "").trim();
}

export type ChangeDirection = "up" | "down" | "flat";

/**
 * Splits an existing change string ("-0.7 pp vs Sep 2026") into its direction and its unsigned text ("0.7 pp vs Sep 2026").
 * Null when the string carries no leading number ("YoY change", "No prior period").
 */
export function splitChange(change: string | null | undefined): { direction: ChangeDirection; text: string } | null {
  if (!change) return null;
  const m = /^\s*([+\-−]?)(\d+(?:[.,]\d+)*)(.*)$/.exec(change);
  if (!m) return null;
  const n = Number(m[2].replace(/,/g, ""));
  if (!Number.isFinite(n)) return null;
  const negative = m[1] === "-" || m[1] === "−";
  const direction: ChangeDirection = n === 0 ? "flat" : negative ? "down" : "up";
  return { direction, text: normalizeDatesInText(`${m[2]}${m[3]}`.trim()) };
}

const MONTH_ALT = MONTHS.join("|");

/**
 * Brings the dates inside a data-layer change string to the page's one format (day before month, four-digit year):
 *   "vs 24 Jul '26"            -> "vs 24 Jul 2026"   (two-digit year read as 20xx: every series here is dated 2000 or later)
 *   "interbank Nov 16, 2026"   -> "interbank 16 Nov 2026"
 *   "vs prev close · Nov 16"   -> "vs prev close · 16 Nov"
 * "vs Apr 2026" is already in the page format and is left alone.
 */
export function normalizeDatesInText(text: string): string {
  return text
    .replace(new RegExp(`\\b(${MONTH_ALT}) '(\\d{2})\\b`, "g"), "$1 20$2")
    .replace(new RegExp(`\\b(${MONTH_ALT}) (\\d{1,2}), (\\d{4})\\b`, "g"), "$2 $1 $3")
    .replace(new RegExp(`\\b(${MONTH_ALT}) (\\d{1,2})\\b(?!,)`, "g"), "$2 $1");
}

export const DIRECTION_GLYPH: Record<ChangeDirection, string> = { up: "▲", down: "▼", flat: "◆" };

/** Today's date in Pakistan, "YYYY-MM-DD". */
export function pktDateIso(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: PKT_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** "Monday 16 November 2026" for a date-only string, with no timezone shift. */
export function formatLongDate(iso: string): string {
  const d = parseIsoDate(iso);
  if (!d) return iso;
  const weekday = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d.getUTCDay()];
  return `${weekday} ${d.getUTCDate()} ${MONTHS_LONG[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** "Mon 16 Nov" for a date-only string. */
export function formatShortDay(iso: string): string {
  const d = parseIsoDate(iso);
  if (!d) return iso;
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getUTCDay()];
  return `${weekday} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** "1 Dec" for a date-only string. */
export function formatDayMonth(iso: string): string {
  const d = parseIsoDate(iso);
  if (!d) return iso;
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

export function parseIsoDate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** `iso` plus `days`, as "YYYY-MM-DD". */
export function addDays(iso: string, days: number): string {
  const d = parseIsoDate(iso);
  if (!d) return iso;
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** The Sunday that ends the week containing `iso` (weeks run Monday to Sunday). */
export function endOfWeek(iso: string): string {
  const d = parseIsoDate(iso);
  if (!d) return iso;
  const dow = d.getUTCDay(); // 0 = Sunday
  return addDays(iso, dow === 0 ? 0 : 7 - dow);
}

/** "October 2026" found inside a title ("CPI Inflation — October 2026"), or null. */
export function extractMonthYear(text: string): { long: string; short: string } | null {
  const m = new RegExp(`\\b(${MONTHS_LONG.join("|")})\\s+(\\d{4})\\b`, "i").exec(text);
  if (!m) return null;
  const idx = MONTHS_LONG.findIndex((x) => x.toLowerCase() === m[1].toLowerCase());
  return { long: `${MONTHS_LONG[idx]} ${m[2]}`, short: MONTHS[idx] };
}

/** A headline's time for the Overview: "08:14" when published today (PKT), otherwise "15 Nov". Null for an unparseable timestamp. */
export function formatHeadlineTime(publishedAt: string, todayIso: string): string | null {
  const d = new Date(publishedAt);
  if (Number.isNaN(d.getTime())) return null;
  const dayIso = pktDateIso(d);
  if (dayIso === todayIso) {
    return new Intl.DateTimeFormat("en-GB", { timeZone: PKT_TIME_ZONE, hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
  }
  return formatDayMonth(dayIso);
}
