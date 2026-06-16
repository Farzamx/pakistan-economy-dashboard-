// Data Freshness & Source Transparency utility.
//
// Every KPI passes its latestDate + frequency through here to get a
// FreshnessStatus that drives the colored badge on each card and the
// dashboard-wide Data Sources audit table.

export type DataFrequency =
  | "Real-time"
  | "Hourly"
  | "Daily"
  | "Weekly"
  | "Monthly"
  | "Quarterly"
  | "Annual"
  | "As Needed";

export type FreshnessStatus = "current" | "delayed" | "stale";

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

export function getFreshnessStatus(
  latestDate: string | undefined,
  frequency: DataFrequency | undefined,
): FreshnessStatus {
  if (!latestDate || !frequency) return "stale";
  const [delayedAt, staleAt] = THRESHOLDS[frequency];
  const age = daysSince(latestDate);
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
  current: "text-emerald-400",
  delayed: "text-amber-400",
  stale:   "text-rose-400",
};

export const FRESHNESS_LABEL: Record<FreshnessStatus, string> = {
  current: "Current",
  delayed: "Delayed",
  stale:   "Stale",
};

export const FRESHNESS_BADGE: Record<FreshnessStatus, string> = {
  current: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  delayed: "bg-amber-500/10  text-amber-400  border-amber-500/20",
  stale:   "bg-rose-500/10   text-rose-400   border-rose-500/20",
};
