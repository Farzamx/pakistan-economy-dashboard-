// Data Freshness & Source Transparency utility.
//
// Every KPI passes its latestDate + frequency through here to get a
// FreshnessStatus that drives the colored badge on each card and the
// dashboard-wide Data Sources audit table.

import { getMarketClosureReason, getLastTradingDay, MARKET_TYPE_LABEL, type MarketType } from "@/lib/marketCalendar";

export type DataFrequency =
  | "Real-time"
  | "Hourly"
  | "Daily"
  | "Weekly"
  | "Monthly"
  | "Quarterly"
  | "Annual"
  | "As Needed";

// "closed-weekend"/"closed-holiday" are distinct from "delayed" — they mean
// the market itself isn't in session, so the latest available value is
// already the correct, complete answer. See getFreshnessStatus below for
// how a KPI opts into this (via `marketType`).
export type FreshnessStatus = "current" | "delayed" | "stale" | "closed-weekend" | "closed-holiday";

/**
 * Thresholds [delayedAfterDays, staleAfterDays] per frequency.
 *
 * Monthly, Quarterly, Annual indicators have large windows because the
 * official source typically takes 4–8 weeks to publish the latest period.
 * "As Needed" (MPC decisions, T-Bill auctions) stays green for 90 days —
 * the data is not stale just because no auction or meeting has occurred.
 */
const THRESHOLDS: Record<DataFrequency, [number, number]> = {
  "Real-time": [1,   2],
  "Hourly":    [1,   3],
  "Daily":     [3,   7],
  "Weekly":    [10,  21],
  "As Needed": [90,  180],
  "Monthly":   [60,  90],
  "Quarterly": [130, 200],
  "Annual":    [400, 548],
};

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

/** Days between latestDate ("YYYY-MM-DD" or "YYYY") and today. */
function daysSince(latestDate: string): number {
  const normalized = latestDate.length === 4 ? `${latestDate}-12-31` : latestDate;
  const diff = Date.now() - new Date(normalized).getTime();
  return Math.floor(diff / 86_400_000);
}

export interface FreshnessOptions {
  /** Set for KPIs sourced from an actual tradeable market (forex/futures/Treasury) — enables weekend/holiday-aware classification instead of a flat day-count threshold. */
  marketType?: MarketType;
  /**
   * "YYYY-MM-DD" of the most recent *known* scheduled release for this
   * indicator (e.g. the last SBP MPC meeting date from the Economic
   * Calendar) — when set, a release that hasn't happened yet is never
   * misread as "delayed" by the generic threshold, and one that *has*
   * happened but hasn't reached this KPI yet is flagged sooner than the
   * generic threshold otherwise would.
   */
  expectedReleaseDate?: string;
  /**
   * Set when the KPI's current value already matches the known outcome of
   * `expectedReleaseDate` (see economicCalendarData.ts's
   * valueMatchesEventOutcome) — suppresses the delayed/stale override
   * above. Needed because a "hold" decision (e.g. SBP keeping the policy
   * rate unchanged) legitimately produces no new dated observation from
   * the source, so an old `latestDate` doesn't mean the value is wrong.
   */
  releaseAlreadyReflected?: boolean;
}

export function getFreshnessStatus(
  latestDate: string | undefined,
  frequency: DataFrequency | undefined,
  options?: FreshnessOptions,
): FreshnessStatus {
  if (!latestDate || !frequency) return "stale";

  const now = new Date();

  // Market-closure override — only ever engages when *today* is a
  // non-trading day, and only when latestDate already reflects the most
  // recent actual trading session (otherwise this is a genuine delay that
  // happens to coincide with a weekend/holiday, and falls through below).
  if (options?.marketType) {
    const closure = getMarketClosureReason(now);
    if (closure) {
      const lastTradingDay = getLastTradingDay(now);
      if (latestDate >= lastTradingDay) return closure;
    }
  }

  const [delayedAt, staleAt] = THRESHOLDS[frequency];
  const age = daysSince(latestDate);

  // Economic-Calendar-aware override — see FreshnessOptions.expectedReleaseDate.
  if (options?.expectedReleaseDate) {
    if (now.toISOString().slice(0, 10) < options.expectedReleaseDate) {
      // The next/most-recently-known scheduled release hasn't happened yet
      // — don't penalize the indicator for not having moved.
      return "current";
    }
    if (latestDate < options.expectedReleaseDate && !options.releaseAlreadyReflected) {
      // The scheduled release has come and gone, but this KPI's value
      // still predates it — a real delay, flagged ahead of the generic
      // (and much more generous) As-Needed/Monthly threshold. (Skipped
      // when releaseAlreadyReflected — see FreshnessOptions for why.)
      const graceDays = daysSince(options.expectedReleaseDate);
      return graceDays > 7 ? "stale" : "delayed";
    }
  }

  if (age <= delayedAt) return "current";
  if (age <= staleAt) return "delayed";
  return "stale";
}

/** "30 Apr 2026", "2024", "Jun 2026" — for display on cards and the audit table. */
export function formatLatestDate(
  latestDate: string | undefined,
  frequency: DataFrequency | undefined,
): string {
  if (!latestDate) return "Unknown";
  // Annual-only: show year
  if (latestDate.length === 4 || frequency === "Annual") return latestDate.slice(0, 4);
  const parts = latestDate.split(/[-T ]/);
  const year = parts[0];
  const month = MONTH_NAMES[Number(parts[1]) - 1] ?? "?";
  const day = parts[2] ? String(Number(parts[2])) : undefined;
  return day ? `${day} ${month} ${year}` : `${month} ${year}`;
}

export const FRESHNESS_DOT: Record<FreshnessStatus, string> = {
  current:         "text-emerald-400 light:text-emerald-700",
  delayed:         "text-amber-400 light:text-amber-600",
  stale:           "text-rose-400 light:text-rose-700",
  "closed-weekend": "text-sky-400 light:text-sky-700",
  "closed-holiday": "text-indigo-400 light:text-indigo-700",
};

export const FRESHNESS_LABEL: Record<FreshnessStatus, string> = {
  current:          "Current",
  delayed:          "Delayed",
  stale:            "Stale",
  "closed-weekend": "Last Market Close",
  "closed-holiday": "Market Closed",
};

/**
 * User-trust messaging (requirement: explain *why* a value isn't moving) —
 * only ever non-null for the two closed-market statuses, so callers can
 * render it conditionally without their own status-comparison logic.
 */
export function getClosureMessage(status: FreshnessStatus, marketType?: MarketType): string | null {
  const subject = marketType ? `${MARKET_TYPE_LABEL[marketType]} is` : "Markets are";
  if (status === "closed-weekend") {
    return `${subject} closed for the weekend. Displaying the latest available market close.`;
  }
  if (status === "closed-holiday") {
    return `${subject} closed for a holiday. Displaying the latest available market close.`;
  }
  return null;
}

export const FRESHNESS_BADGE: Record<FreshnessStatus, string> = {
  current:          "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  delayed:          "bg-amber-500/10   text-amber-400   border-amber-500/20",
  stale:            "bg-rose-500/10    text-rose-400    border-rose-500/20",
  "closed-weekend": "bg-sky-500/10     text-sky-400     border-sky-500/20",
  "closed-holiday": "bg-indigo-500/10  text-indigo-400  border-indigo-500/20",
};
