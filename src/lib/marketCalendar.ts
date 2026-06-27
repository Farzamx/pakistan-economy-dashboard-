// Minimal global market-session calendar — exists to answer one question
// for dataFreshness.ts: "is this indicator quiet because its market is
// closed, or because something is actually wrong?"
//
// Deliberately scoped to the markets this dashboard actually depends on
// (forex, CME/ICE-style commodity & index futures, US-listed equities, the
// US Treasury market) at DAY granularity — not a full multi-exchange
// intraday-hours engine, and not a complete regional holiday calendar
// (no Eid, no PSX-specific closures — see the comment on HOLIDAYS below).
//
// All checks are UTC-based, matching how the underlying providers (Yahoo
// Finance, FRED) timestamp their data — see yfinance.ts's regularMarketTime
// handling — a viewer's local wall-clock day is irrelevant to whether a
// global market is open.

export type MarketType = "forex" | "global-market" | "us-treasury";

export type MarketClosureReason = "closed-weekend" | "closed-holiday";

function isWeekendUtc(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 0 || day === 6; // Sunday, Saturday
}

// Fixed-date holidays observed (closed) across forex / CME-style futures /
// US equities / the US Treasury market. Deliberately a short, high-
// confidence list rather than a full SIFMA/NYSE holiday calendar (no MLK
// Day, Presidents' Day, Memorial Day, Juneteenth, Labor Day, Columbus Day,
// Veterans Day, Thanksgiving) — each of those is a single weekday closure,
// already absorbed by the existing Daily/Hourly "delayed" thresholds
// without being misread as a real delay. New Year's Day, Christmas Day, and
// Good Friday are the ones long/frequent enough (often adjacent to a
// weekend) to otherwise produce a false "Delayed"/"Stale" reading.
function isFixedHolidayUtc(date: Date): boolean {
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  return (month === 1 && day === 1) || (month === 12 && day === 25);
}

/** Good Friday (UTC) for a given year — via the Meeus/Jones/Butcher Gregorian Easter algorithm, since it has no fixed calendar date. */
function isGoodFridayUtc(date: Date): boolean {
  const year = date.getUTCFullYear();
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const easterMonth = Math.floor((h + l - 7 * m + 114) / 31); // 3 = March, 4 = April
  const easterDay = ((h + l - 7 * m + 114) % 31) + 1;
  const easterUtc = Date.UTC(year, easterMonth - 1, easterDay);
  const goodFridayUtc = easterUtc - 2 * 86_400_000;
  return Date.UTC(year, date.getUTCMonth(), date.getUTCDate()) === goodFridayUtc;
}

/**
 * Whether `marketType` is closed on `date` (UTC calendar day), and why.
 * Returns null when the market is open — callers treat null as "use the
 * normal current/delayed/stale thresholds, nothing special going on".
 *
 * All three market types share the same closure pattern at this day-level
 * granularity (see file header for what's intentionally not modeled).
 */
export function getMarketClosureReason(date: Date): MarketClosureReason | null {
  if (isWeekendUtc(date)) return "closed-weekend";
  if (isFixedHolidayUtc(date) || isGoodFridayUtc(date)) return "closed-holiday";
  return null;
}

/** "YYYY-MM-DD" (UTC) for the most recent date <= `date` that is NOT closed. */
export function getLastTradingDay(date: Date): string {
  const cursor = new Date(date.getTime());
  for (let i = 0; i < 14; i++) { // hard cap — never walks back more than ~2 weeks
    if (!getMarketClosureReason(cursor)) {
      return cursor.toISOString().slice(0, 10);
    }
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return date.toISOString().slice(0, 10); // unreachable in practice
}

export const MARKET_TYPE_LABEL: Record<MarketType, string> = {
  forex: "FX market",
  "global-market": "this market",
  "us-treasury": "the US Treasury market",
};
