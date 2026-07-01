// Multi-Source Failover Engine — Phase 3 (Parts 1, 2, 7)
//
// This module implements the generic source-chain resolver described in
// SERIES_PUBLICATION_META[slug].sourceHierarchy. Each source is represented
// by a SourceAdapter; the runner tries them in order and returns the first
// successful result. Sources with implemented=false are skipped without
// attempting a fetch.
//
// Design principles:
//   - Never hardcode source-specific logic here. Adapters are injected.
//   - Never overwrite verified data. Each adapter's result is validated by
//     the caller's period-validator before being written.
//   - Never mix measures. Each adapter's format contract must be upheld by
//     the adapter itself (e.g. no BPM6 values in a PBS-labeled series).
//   - Performance: adapters share the existing two-layer cache (L1 in-memory
//     + L2 Next.js Data Cache) from sbp.ts / spi.ts. No new HTTP calls are
//     made when L1 or L2 is fresh, even across multiple adapters.
//
// Current adapter coverage:
//   sbp-easydata  — getSbpIndicatorAdapter() below. Wraps getSbpIndicator().
//   pbs-web/spi   — getSpiAdapter() below. Wraps getSpiHistory().
//   lsm-yoy       — getLsmYoYAdapter() below. Wraps getSbpIndicatorHistory().
//   other types   — not yet implemented; entries with implemented=false are skipped.
//
// Adding a new adapter: implement SourceAdapter and register it in
// buildAdapter() below. No changes to the sync loop or period validator needed.

import { getSbpIndicator, type SbpIndicatorKey } from "@/lib/data/sbp";
import { getSpiHistory } from "@/lib/data/spi";
import { getSbpIndicatorHistory } from "@/lib/data/sbp";
import type { SourceHierarchyEntry } from "@/lib/economicCalendar/seriesPublicationConfig";

// ─── Core types ──────────────────────────────────────────────────────────────

/**
 * Result from a single source attempt. The caller validates the observation
 * period before writing to the database.
 */
export interface SourceAttemptResult {
  /** Whether the fetch and parse succeeded for this source. */
  success: boolean;
  /** Raw observation date returned by the source ("YYYY-MM-DD"). */
  observationDate?: string;
  /** Formatted actual value ready to write to economic_events (e.g. "11.7% YoY"). */
  actualValue?: string;
  /** Human-readable source name for provenance and logging. */
  sourceName: string;
  /** Whether the result came from the live API vs a local cache/fallback. */
  isFallback?: boolean;
  /** Error message if success=false. */
  error?: string;
  /** Source type code, matching SourceHierarchyEntry.type. */
  sourceType: SourceHierarchyEntry["type"];
}

/**
 * A source adapter — a function that attempts to fetch and format one indicator
 * value from one specific data source. Returns SourceAttemptResult regardless
 * of success or failure; never throws.
 */
export type SourceAdapter = () => Promise<SourceAttemptResult>;

/**
 * Result of resolveFromSourceChain(): the winning source's data plus an audit
 * trail of which sources were tried, in what order, and what happened.
 */
export interface SourceChainResult {
  /** The resolved value to write (only present when resolved=true). */
  observationDate?: string;
  actualValue?: string;
  sourceName?: string;
  sourceType?: SourceHierarchyEntry["type"];
  isFallback?: boolean;
  /** True if at least one adapter returned a live result. */
  resolved: boolean;
  /** Full ordered list of attempted sources and their outcomes. */
  attempts: SourceAttemptResult[];
}

// ─── Runner ──────────────────────────────────────────────────────────────────

/**
 * Tries each adapter in order. Returns the first successful live result.
 * A "live" result is one where isFallback is not true — fallback data
 * (stale snapshots, offline caches) is never written as a confirmed actual.
 *
 * All attempted sources are recorded in attempts[] even when successful,
 * enabling the cron log to show "tried SBP EasyData: success" vs.
 * "tried SBP PDF: failed, reason=..., fell back to SBP EasyData: success".
 */
export async function resolveFromSourceChain(adapters: SourceAdapter[]): Promise<SourceChainResult> {
  const attempts: SourceAttemptResult[] = [];

  for (const adapter of adapters) {
    const result = await adapter();
    attempts.push(result);

    if (result.success && !result.isFallback) {
      return {
        observationDate: result.observationDate,
        actualValue: result.actualValue,
        sourceName: result.sourceName,
        sourceType: result.sourceType,
        isFallback: false,
        resolved: true,
        attempts,
      };
    }
    // If success but fallback, or failed, fall through to next source.
    // This implements automatic failover: a degraded-cache response causes
    // the engine to try the next source rather than accepting stale data.
  }

  return { resolved: false, attempts };
}

// ─── Built-in adapters ───────────────────────────────────────────────────────

/**
 * Adapter factory for SBP EasyData indicators.
 * Wraps getSbpIndicator() and applies a value formatter.
 *
 * @param indicatorKey   SbpIndicatorKey matching the CONFIGS entry in sbp.ts.
 * @param format         Converts the raw kpi.value string to the calendar's
 *                       actual_value convention (e.g. "$3.53B", "11.7% YoY").
 * @param previousValue  The event's current previous_value (for MPC bps calc).
 */
export function getSbpEasyDataAdapter(
  indicatorKey: SbpIndicatorKey,
  format: (value: string, previousValue: string | null) => string,
  previousValue: string | null = null,
): SourceAdapter {
  return async (): Promise<SourceAttemptResult> => {
    try {
      const indicator = await getSbpIndicator(indicatorKey);
      const isFallback = indicator.meta.source === "SBP EasyData (fallback)";
      return {
        success: true,
        observationDate: indicator.meta.observationDate,
        actualValue: format(indicator.kpi.value, previousValue),
        sourceName: "SBP EasyData",
        sourceType: "sbp-easydata",
        isFallback,
      };
    } catch (err) {
      return {
        success: false,
        sourceName: "SBP EasyData",
        sourceType: "sbp-easydata",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  };
}

/**
 * Adapter for the PBS SPI weekly report (via getSpiHistory()).
 * Only returns success if the SPI result contains a point matching the
 * expected event date exactly.
 *
 * @param eventDate   The calendar event's date ("YYYY-MM-DD"). Must match
 *                    a point.date in the SPI history for success.
 */
export function getPbsSpiAdapter(eventDate: string): SourceAdapter {
  return async (): Promise<SourceAttemptResult> => {
    try {
      const spi = await getSpiHistory();
      if (!spi || spi.points.length === 0) {
        return {
          success: false,
          sourceName: "PBS SPI Weekly Report",
          sourceType: "pbs-web",
          error: "PBS SPI fetch returned no data",
        };
      }
      const point = spi.points.find((p) => p.date === eventDate);
      if (!point) {
        return {
          success: false,
          sourceName: "PBS SPI Weekly Report",
          sourceType: "pbs-web",
          error: `No PBS SPI point matching event date ${eventDate} (latest: ${spi.points.at(-1)?.date ?? "none"})`,
        };
      }
      const sign = point.wowPct >= 0 ? "+" : "";
      return {
        success: true,
        observationDate: eventDate,
        actualValue: `${sign}${point.wowPct.toFixed(2)}% WoW`,
        sourceName: "PBS SPI Weekly Report",
        sourceType: "pbs-web",
        isFallback: false,
      };
    } catch (err) {
      return {
        success: false,
        sourceName: "PBS SPI Weekly Report",
        sourceType: "pbs-web",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  };
}

/**
 * Adapter for LSM YoY derived from SBP EasyData full index history.
 * Computes YoY = (currentIndex / sameMonthPriorYearIndex - 1) × 100.
 * See lsmSync.ts for full methodology documentation.
 */
export function getLsmYoYAdapter(): SourceAdapter {
  return async (): Promise<SourceAttemptResult> => {
    try {
      const history = await getSbpIndicatorHistory("lsm");
      const isFallback = history.meta.sourceStatus === "fallback";

      if (isFallback) {
        return {
          success: true,
          observationDate: history.meta.observationDate,
          actualValue: undefined,
          sourceName: "SBP EasyData — LSM Index (fallback)",
          sourceType: "sbp-easydata",
          isFallback: true,
          error: "EasyData serving fallback snapshot — prior-year lookup unreliable",
        };
      }

      const points = history.points;
      if (points.length < 13) {
        return {
          success: false,
          sourceName: "SBP EasyData — LSM Index",
          sourceType: "sbp-easydata",
          error: `History too short (${points.length} points, need ≥13)`,
        };
      }

      const latest = points[points.length - 1];
      const priorYearPrefix = `${parseInt(latest.date.slice(0, 4), 10) - 1}-${latest.date.slice(5, 7)}`;
      const prior = points.find((p) => p.date.startsWith(priorYearPrefix));
      if (!prior || prior.value === 0) {
        return {
          success: false,
          sourceName: "SBP EasyData — LSM Index",
          sourceType: "sbp-easydata",
          error: `No prior-year point found for ${priorYearPrefix}`,
        };
      }

      const yoyPct = ((latest.value / prior.value) - 1) * 100;
      const sign = yoyPct >= 0 ? "+" : "";
      return {
        success: true,
        observationDate: latest.date,
        actualValue: `${sign}${yoyPct.toFixed(1)}% YoY`,
        sourceName: "SBP EasyData — LSM Quantum Index (YoY derived)",
        sourceType: "sbp-easydata",
        isFallback: false,
      };
    } catch (err) {
      return {
        success: false,
        sourceName: "SBP EasyData — LSM Index",
        sourceType: "sbp-easydata",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  };
}
