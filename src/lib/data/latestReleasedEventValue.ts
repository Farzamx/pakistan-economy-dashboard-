import "server-only";
import { createPublicDataClient } from "@/lib/supabase/publicDataClient";
import { getFresh, setCache } from "@/lib/memoryCache";

// Phase 8.0 rename (was canonicalObservation.ts / getLatestCanonicalObservation).
//
// ARCHITECTURAL BOUNDARY (Phase 8.0 finding — this is the one place this
// project's two differently-authoritative "observation" concepts meet, and
// the reason this file no longer uses the word "canonical"):
//
//   canonical_observations (migration 0050+, src/lib/data/sbpCanonicalStore.ts)
//     = the NUMERIC OBSERVATION LEDGER. Append-only, provider-precedence-
//       resolved, provenance-bearing (migration 0051). Sole authority for
//       "what was the value" for SBP EasyData-sourced series.
//
//   economic_events (migration 0002+, this file)
//     = the RELEASE/CALENDAR LEDGER. Schedule, status (scheduled/released/
//       postponed/cancelled), forecast_value, importance, event_date
//       (publication date) vs observation_date (reference period) — see
//       migration 0028's own header for that distinction. It has never been
//       an observation ledger; the old name here ("canonicalObservation.ts")
//       was misleading about which of the two it was, not about which one
//       is more authoritative.
//
// This file is the ONLY thing that reads economic_events to answer "what is
// the latest PBS-published value for this series" — it does not compete
// with canonical_observations, and nothing here writes to either ledger.
// (Whether PBS itself should become a first-class canonical_observations
// provider for CPI/Core/LSM is a Phase 8.x provider-migration decision, not
// implemented here — see the Phase 8.0 architecture review.)
//
// CONFIRMED PHASE 8.0 FINDING, DELIBERATELY NOT FIXED HERE (out of scope —
// belongs to the future PBS provider migration, not a rename/refactor
// phase): syncCpiFromPbs.ts (and the other PBS sync modules) already hold
// the full-precision numeric PBS value in memory, then format it with
// `.toFixed(1)` into the display string persisted to
// economic_events.actual_value (e.g. a true 11.34 becomes "+11.3% YoY").
// The parsers below then regex-parse that STRING back into a number. This
// is a lossy round-trip: the persisted value has already lost a decimal
// digit of precision before this file ever reads it, and nothing records
// that this happened. Fixing it means changing what PBS sync writes (out of
// this phase's allowed scope, which is rename-only) — recorded here so the
// future PBS migration phase does not have to rediscover it.

// TTL for the released-event-value cache. Short enough that the KPI card
// reflects a new PBS sync within 5 minutes; long enough to avoid a Supabase
// round-trip on every ISR render when nothing has changed.
const CACHE_TTL_MS = 5 * 60 * 1000;

export interface ReleasedEventValue {
  /** Parsed numeric value (e.g. 11.3 for 11.3% CPI YoY, -2.84 for -$2.84B trade balance). See the precision-loss note above — this is already lossy relative to the true PBS figure. */
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

async function fetchFromDb(seriesSlug: string): Promise<ReleasedEventValue | null> {
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
 * The single source of truth for this module's L1 cache key format. Sync
 * modules that write a fresh observation call `invalidate(releasedEventValueCacheKey(slug))`
 * afterward (production-hardening audit, 2026-07-18: previously each of the
 * 5 call sites re-typed the `canonical-obs:${slug}` template string
 * independently — a silent-drift risk if this format ever changed here
 * without every invalidation call site being updated in lockstep).
 *
 * Phase 8.0: function renamed; the literal key prefix ("canonical-obs:") is
 * intentionally left unchanged — this cache is in-memory only (memoryCache.ts,
 * 5-minute TTL, never persisted), so changing the string would have zero
 * observable effect beyond a single cold-start cache miss, but leaving it
 * exactly as-is is the more conservative choice for a phase whose only
 * requirement is zero behavioral change.
 */
export function releasedEventValueCacheKey(seriesSlug: string): string {
  return `canonical-obs:${seriesSlug}`;
}

/**
 * Returns the latest confirmed released value for a series from the sync
 * pipeline's economic_events store, or null if none exists.
 *
 * Covers 6 PBS-primary series whose sync modules write observation_date
 * (migrations 0028 + 0030): cpi-inflation-release, core-inflation-release,
 * large-scale-manufacturing-lsm-growth, trade-balance, exports-release,
 * imports-release.
 *
 * Cached for CACHE_TTL_MS (5 min) to avoid a Supabase round-trip on every
 * ISR render. Cache is effectively invalidated when the L1 memoryCache for
 * the parent SBP indicator is cleared by invalidateSbpIndicatorCache(),
 * because that triggers a fresh getSbpIndicator() call which re-checks here.
 */
export async function getLatestReleasedEventValue(
  seriesSlug: string,
): Promise<ReleasedEventValue | null> {
  if (!(seriesSlug in PARSERS)) return null;

  const cacheKey = releasedEventValueCacheKey(seriesSlug);
  const cached = getFresh<ReleasedEventValue | null>(cacheKey, CACHE_TTL_MS);
  if (cached) return cached.data;

  try {
    const result = await fetchFromDb(seriesSlug);
    setCache(cacheKey, result);
    return result;
  } catch (err) {
    console.error(
      `[releasedEventValue] fetch failed for ${seriesSlug}:`,
      err instanceof Error ? err.message : String(err),
    );
    return null;
  }
}
