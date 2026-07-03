import "server-only";
import { createPublicDataClient } from "@/lib/supabase/publicDataClient";
import { getFresh, setCache } from "@/lib/memoryCache";

// TTL for the canonical observation cache. Short enough that the KPI card
// reflects a new PBS sync within 5 minutes; long enough to avoid a Supabase
// round-trip on every ISR render when nothing has changed.
const CANONICAL_CACHE_TTL_MS = 5 * 60 * 1000;

export interface CanonicalObservation {
  /** Parsed numeric value (e.g. 11.3 for 11.3% CPI YoY, -2.84 for -$2.84B trade balance). */
  value: number;
  /** Last day of the observation's reference period, "YYYY-MM-DD" (e.g. "2026-06-30" for June CPI). */
  observationDate: string;
  /** Human-readable source name from economic_event_series.source_name. */
  sourceName: string;
  /** Raw formatted actual_value string from economic_events, e.g. "+11.3% YoY". */
  formattedValue: string;
}

// --- Value parsers keyed by series slug -----------------------------------
//
// Each parser handles the exact actual_value format written by the corresponding
// sync module. The format conventions are:
//   syncCpiFromPbs:          "+11.3% YoY" | "11.3% YoY" | "-2.1% YoY"
//   syncLsmFromPbs:          "+6.1% YoY"  | "-1.4% YoY"
//   syncLsmYoYFromEasyData:  "+6.1% YoY"  | "-1.4% YoY"
//   syncTradeBalanceFromPbs: "-$2.84B"    | "+$0.30B"    (trade balance, signed)
//                            "$2.69B"                    (exports, always positive)
//                            "$5.47B"                    (imports, always positive)

function parsePercentYoY(v: string): number | null {
  // Accepts "+11.3% YoY", "11.3% YoY", "-2.1% YoY"
  const m = v.match(/^([+-]?)([\d.]+)\s*%/);
  if (!m) return null;
  const n = parseFloat(m[2]);
  if (isNaN(n)) return null;
  return m[1] === "-" ? -n : n;
}

function parseBillionsUsd(v: string): number | null {
  // Accepts "-$2.84B", "+$0.30B", "$2.84B", "$5.47B"
  const m = v.match(/^([+-]?)\$?([\d.]+)B$/i);
  if (!m) return null;
  const n = parseFloat(m[2]);
  if (isNaN(n)) return null;
  return m[1] === "-" ? -n : n;
}

const PARSERS: Record<string, (v: string) => number | null> = {
  "cpi-inflation-release":                parsePercentYoY,
  "core-inflation-release":               parsePercentYoY,
  "large-scale-manufacturing-lsm-growth": parsePercentYoY,
  "trade-balance":                        parseBillionsUsd,
  "exports-release":                      parseBillionsUsd,
  "imports-release":                      parseBillionsUsd,
};

async function fetchFromDb(seriesSlug: string): Promise<CanonicalObservation | null> {
  const supabase = createPublicDataClient();

  // Two-query approach: first resolve slug → series_id + source_name, then
  // fetch the latest released event. This is more reliable than filtering on
  // a PostgREST embedded resource, and each query hits its own index.
  const { data: seriesRow, error: seriesErr } = await supabase
    .from("economic_event_series")
    .select("id, source_name")
    .eq("slug", seriesSlug)
    .maybeSingle();

  if (seriesErr || !seriesRow) return null;

  const { data: eventRow, error: eventErr } = await supabase
    .from("economic_events")
    .select("actual_value, observation_date")
    .eq("series_id", seriesRow.id)
    .eq("status", "released")
    .not("actual_value", "is", null)
    .not("observation_date", "is", null)
    .order("observation_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (eventErr || !eventRow || !eventRow.actual_value || !eventRow.observation_date) return null;

  const parser = PARSERS[seriesSlug];
  if (!parser) return null;

  const value = parser(eventRow.actual_value as string);
  if (value === null) return null;

  return {
    value,
    observationDate: eventRow.observation_date as string,
    sourceName: (seriesRow.source_name as string) ?? "Official Source",
    formattedValue: eventRow.actual_value as string,
  };
}

/**
 * Returns the latest confirmed canonical observation for a series from the
 * sync pipeline's economic_events store, or null if none exists.
 *
 * Covers 6 PBS-primary series whose sync modules write observation_date
 * (migrations 0028 + 0030): cpi-inflation-release, core-inflation-release,
 * large-scale-manufacturing-lsm-growth, trade-balance, exports-release,
 * imports-release.
 *
 * Cached for CANONICAL_CACHE_TTL_MS (5 min) to avoid a Supabase round-trip
 * on every ISR render. Cache is effectively invalidated when the L1 memoryCache
 * for the parent SBP indicator is cleared by invalidateSbpIndicatorCache(),
 * because that triggers a fresh getSbpIndicator() call which re-checks here.
 */
export async function getLatestCanonicalObservation(
  seriesSlug: string,
): Promise<CanonicalObservation | null> {
  if (!(seriesSlug in PARSERS)) return null;

  const cacheKey = `canonical-obs:${seriesSlug}`;
  const cached = getFresh<CanonicalObservation | null>(cacheKey, CANONICAL_CACHE_TTL_MS);
  if (cached) return cached.data;

  try {
    const result = await fetchFromDb(seriesSlug);
    setCache(cacheKey, result);
    return result;
  } catch (err) {
    console.error(
      `[canonical] fetch failed for ${seriesSlug}:`,
      err instanceof Error ? err.message : String(err),
    );
    return null;
  }
}
