import type { DataFrequency } from "@/lib/dataFreshness";
import type { MarketType } from "@/lib/marketCalendar";
import type { SourceStatus } from "@/lib/dataQuality";

export type Trend = "up" | "down";

export interface Kpi {
  title: string;
  value: string;
  unit: string;
  change: string;
  trend: Trend;
  glow: "blue" | "purple";
  // Source transparency — populated by every live data provider.
  // Optional only for backwards compat; all current providers set these.
  source?: string;
  seriesId?: string;
  latestDate?: string;   // "YYYY-MM-DD" or "YYYY" (annual)
  frequency?: DataFrequency;
  /** Where this value actually came from this request — drives the unified Data Quality badge (dataQuality.ts). Defaults to "live" when omitted (legacy providers that haven't been migrated yet) so existing KPIs keep behaving exactly as before until each is updated. */
  sourceStatus?: SourceStatus;
  /** When sourceStatus is "fallback", the date the static snapshot was captured — surfaced in the quality badge's tooltip so "Fallback" never reads as anonymous. */
  snapshotDate?: string;
  /** Set only for KPIs sourced from an actual tradeable market — enables weekend/holiday-aware freshness instead of a flat day-count threshold (see dataFreshness.ts). */
  marketType?: MarketType;
  /** "YYYY-MM-DD" of the most recent known scheduled release (from the Economic Calendar) — lets dataFreshness.ts flag a real delay sooner than its generic per-frequency threshold would, without misreading a not-yet-due release as late. */
  expectedReleaseDate?: string;
  /** Whether this KPI's value already matches the known outcome of expectedReleaseDate — see dataFreshness.ts's FreshnessOptions for why this matters (a "hold" decision produces no new dated observation at all). */
  releaseAlreadyReflected?: boolean;
  /** Recent historical values (oldest first) for the card's inline sparkline. Only ever a slice of a real fetched series — never fabricated — so cards without a wired-up history simply render without one. */
  sparkline?: number[];
}

// Fallback used by getGdpKpi() in src/lib/data/worldBank.ts when the API
// is unreachable, so the dashboard never shows a broken state.
export const fallbackGdpKpi: Kpi = {
  title: "GDP Growth",
  value: "2.5",
  unit: "%",
  change: "+0.3 pp vs 2022",
  trend: "up",
  glow: "blue",
  source: "World Bank",
  seriesId: "NY.GDP.MKTP.KD.ZG",
  latestDate: "2023",
  frequency: "Annual",
  sourceStatus: "fallback",
  snapshotDate: "2023",
};

// Fallback used by getQuarterlyGdpKpi() when the SBP QGDP.xlsx is unreachable.
export const fallbackQuarterlyGdpKpi: Kpi = {
  title: "Quarterly GDP Growth (YoY)",
  value: "3.99",
  unit: "%",
  change: "-0.06 pp vs Q2 FY26",
  trend: "down",
  glow: "blue",
  source: "SBP / PBS",
  seriesId: "QGDP.xlsx / Growth_Q / row D.",
  latestDate: "2026-03-31",
  frequency: "Quarterly",
  sourceStatus: "fallback",
  snapshotDate: "2026-03-31",
};
