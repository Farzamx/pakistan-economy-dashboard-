// Server-only wrapper around src/lib/data/sbp.ts.
//
// sbp.ts must stay client-safe because comparisonData.ts imports it, and
// comparisonData.ts is consumed by ComparisonWorkspace.tsx (a Client Component).
// Any import of `server-only` (or of any server-only module such as
// canonicalObservation.ts) inside sbp.ts therefore breaks the client bundle.
//
// This module solves that split cleanly:
//   - sbp.ts        → client-safe, SBP EasyData only, imported by both server
//                     and client-reachable code (history, types, fallbacks)
//   - sbpServer.ts  → this file, server-only, adds the canonical PBS override
//                     for the 4 PBS-primary indicators (CPI, Core, LSM, Trade
//                     Balance). All server pages and server-only lib modules
//                     import from here instead of sbp.ts directly.
//
// The canonical override is applied after getSbpIndicator / getAllSbpIndicators
// resolves (whether from L1 cache, live SBP fetch, stale cache, or static
// fallback). For the 16 non-PBS indicators it is a fast no-op (immediate
// return on the CANONICAL_SERIES_SLUGS lookup). The SBP trend/sparkline is
// always preserved — PBS does not publish long time-series.
//
// Re-exports: every public export from sbp.ts is re-exported here (except
// getSbpIndicator and getAllSbpIndicators which are overridden) so callers
// can change `@/lib/data/sbp` → `@/lib/data/sbpServer` without splitting imports.

import "server-only";

// --- Pass-through re-exports from sbp.ts -----------------------------------
// (getSbpIndicator and getAllSbpIndicators are intentionally excluded — they
//  are defined locally below with the canonical override applied.)
export {
  getSbpIndicatorFresh,
  getSbpIndicatorHistory,
  getFoodInflationUrbanHistory,
  sbpCacheTag,
  type SbpIndicatorKey,
  type SbpIndicatorResult,
  type SbpMeta,
  type SbpSeries,
  type SbpSourceStatus,
  type SbpHistoryPoint,
  type SbpIndicatorHistory,
  type FoodInflationUrbanResult,
} from "@/lib/data/sbp";

import {
  getSbpIndicator as _getSbpIndicator,
  getAllSbpIndicators as _getAllSbpIndicators,
  type SbpIndicatorKey,
  type SbpIndicatorResult,
} from "@/lib/data/sbp";

import { getLatestCanonicalObservation } from "@/lib/data/canonicalObservation";

// --- Canonical override helpers --------------------------------------------

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

function formatMonthLabel(dateStr: string): string {
  const [year, month] = dateStr.split("-");
  return `${MONTH_NAMES[Number(month) - 1]} ${year}`;
}

function changeLabel(diff: number, prevLabel: string, format: (d: number) => string): string {
  const sign = diff >= 0 ? "+" : "";
  return `${sign}${format(diff)} vs ${prevLabel}`;
}

// Maps indicator key → series slug in economic_event_series.
// Only the 4 PBS-primary indicators are listed; all others skip immediately.
const CANONICAL_SERIES_SLUGS: Partial<Record<SbpIndicatorKey, string>> = {
  cpiInflation:  "cpi-inflation-release",
  coreInflation: "core-inflation-release",
  lsm:           "large-scale-manufacturing-lsm-growth",
  tradeBalance:  "trade-balance",
};

const INDICATOR_LABELS: Partial<Record<SbpIndicatorKey, string>> = {
  cpiInflation:  "CPI Inflation",
  coreInflation: "Core Inflation",
  lsm:           "LSM",
  tradeBalance:  "Trade Balance",
};

/**
 * Overlays the confirmed PBS observation from economic_events onto an SBP
 * EasyData result when the canonical observation covers a newer reference
 * period than SBP has published yet.
 *
 * Returns sbpResult unchanged on any failure or when SBP is already current.
 * The SBP trend/sparkline is always preserved.
 */
async function applyCanonicalOverride(
  key: SbpIndicatorKey,
  sbpResult: SbpIndicatorResult,
): Promise<SbpIndicatorResult> {
  const seriesSlug = CANONICAL_SERIES_SLUGS[key];
  if (!seriesSlug) return sbpResult;

  try {
    const canonical = await getLatestCanonicalObservation(seriesSlug);
    if (!canonical) return sbpResult;

    // Only override when canonical covers a newer reference period than SBP.
    // Lexicographic comparison is correct for ISO "YYYY-MM-DD" dates.
    if (canonical.observationDate <= sbpResult.meta.observationDate) {
      return sbpResult;
    }

    const prevLabel      = formatMonthLabel(sbpResult.meta.observationDate);
    const sbpLatestValue = parseFloat(sbpResult.kpi.value);

    let change: string;
    let trend: "up" | "down";
    if (key === "tradeBalance") {
      // PBS (customs-basis) and SBP (BPM6) use different methodologies.
      // A cross-method pp diff would mislead; explain the status instead.
      change = "PBS advance release — SBP BPM6 confirmation pending";
      trend  = canonical.value >= 0 ? "up" : "down";
    } else {
      // CPI, Core, LSM are all % YoY — pp diff vs SBP's last period is valid.
      const diff = canonical.value - sbpLatestValue;
      change = changeLabel(diff, prevLabel, (d) => `${d.toFixed(1)} pp`);
      trend  = diff >= 0 ? "up" : "down";
    }

    console.log(
      `[SBP/canonical] ${INDICATOR_LABELS[key]} override: ` +
      `PBS obs=${canonical.observationDate} > SBP obs=${sbpResult.meta.observationDate} ` +
      `| PBS value=${canonical.value} SBP-prev=${sbpLatestValue} (${canonical.sourceName})`,
    );

    return {
      ...sbpResult,
      kpi: {
        ...sbpResult.kpi,
        value:        key === "tradeBalance"
                        ? canonical.value.toFixed(2)
                        : canonical.value.toFixed(1),
        unit:         key === "lsm" ? "% YoY" : sbpResult.kpi.unit,
        change,
        trend,
        source:       canonical.sourceName,
        latestDate:   canonical.observationDate,
        sourceStatus: "live" as const,
        snapshotDate: undefined,
      },
      meta: {
        ...sbpResult.meta,
        observationDate: canonical.observationDate,
        sourceStatus:    "live" as const,
      },
    };
  } catch (err) {
    console.error(
      `[SBP/canonical] ${INDICATOR_LABELS[key] ?? key} override check failed: ` +
      (err instanceof Error ? err.message : String(err)),
    );
    return sbpResult;
  }
}

// --- Public API (canonical-aware) ------------------------------------------

/**
 * Fetches a single SBP indicator with PBS canonical override applied.
 *
 * Drop-in replacement for sbp.getSbpIndicator() for use in server components
 * and server-only lib modules. For the 4 PBS-primary indicators (CPI, Core,
 * LSM, Trade Balance) the KPI headline immediately reflects the PBS value once
 * the sync pipeline has written it to economic_events, without waiting for SBP
 * EasyData to publish (typical lag: 2–5 days for CPI, 5–10 days for LSM/TB).
 * All other indicators are returned unchanged (immediate no-op path).
 *
 * The underlying SBP EasyData trend/sparkline is always preserved.
 */
export async function getSbpIndicator(key: SbpIndicatorKey): Promise<SbpIndicatorResult> {
  return applyCanonicalOverride(key, await _getSbpIndicator(key));
}

/**
 * Fetches all 20 SBP indicators in parallel with PBS canonical override
 * applied to the 4 PBS-primary indicators.
 *
 * Drop-in replacement for sbp.getAllSbpIndicators() for server components.
 */
export async function getAllSbpIndicators(): Promise<Record<SbpIndicatorKey, SbpIndicatorResult>> {
  const base = await _getAllSbpIndicators();

  // Apply canonical override only to the 4 PBS-primary indicators in parallel.
  // The remaining 16 indicators short-circuit immediately in applyCanonicalOverride.
  const canonicalKeys = Object.keys(CANONICAL_SERIES_SLUGS) as SbpIndicatorKey[];
  const overrides = await Promise.all(
    canonicalKeys.map((key) => applyCanonicalOverride(key, base[key])),
  );

  const result = { ...base };
  canonicalKeys.forEach((key, i) => { result[key] = overrides[i]; });
  return result;
}
