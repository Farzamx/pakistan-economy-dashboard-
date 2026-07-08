import "server-only";

// SBP EasyData Freshness Audit — Phase 18 (SBP Pipeline Reliability).
//
// Root-cause context: the Money Supply (M2) KPI was found showing a value
// one full month behind what SBP had actually published, because it was
// configured against SBP EasyData's monthly M2 series (TS_GP_BAM_M3_M.
// MA3001700), which trails SBP's own weekly Broad Money M2 series
// (TS_GP_BAM_M2_W.M000070) by ~5 weeks — a "wrong series" bug, not a cache
// bug (see SERIES_KEYS.moneySupplyM2 in sbp.ts for the full account). This
// module exists so that class of bug — a configured series silently
// trailing behind what SBP actually has available — is caught automatically
// for every SBP-backed indicator, not just the one a user happened to
// notice and report.
//
// Runs as Step 9 of the 15-minute sync pipeline (syncPipeline.ts), so
// detection requires no manual intervention: every indicator is re-checked
// every ~15 minutes against SBP EasyData's own authoritative "Available
// Upto" metadata.

import { getSbpIndicator, getSbpIndicatorFresh, type SbpIndicatorKey } from "@/lib/data/sbp";
import { invalidateSbpIndicatorCache } from "@/lib/data/sbpCacheInvalidation";

// The 20 SbpIndicatorKey union members, enumerated explicitly — sbp.ts's
// CONFIGS map (the source of truth for this union) is module-private and
// not exported, so this list is maintained by hand. Any key here that is
// no longer a member of SbpIndicatorKey is a TypeScript compile error,
// and any key added to sbp.ts's CONFIGS but missing here simply won't be
// audited — a silent gap rather than a broken build. Keep in sync with
// SERIES_KEYS in src/lib/data/sbp.ts.
const ALL_INDICATOR_KEYS: readonly SbpIndicatorKey[] = [
  "foreignReserves",
  "netBankReserves",
  "usdPkr",
  "policyRate",
  "cpiInflation",
  "coreInflation",
  "wpiInflation",
  "tbillYield3m",
  "pibYield3y",
  "remittances",
  "currentAccount",
  "tradeBalance",
  "moneySupplyM2",
  "exports",
  "imports",
  "fdiInflows",
  "reer",
  "lsm",
  "privateCreditGrowth",
  "fiscalBalance",
];

const SBP_META_BASE = "https://easydata.sbp.org.pk/api/v1/series";
const META_FETCH_TIMEOUT_MS = 10_000;

const MONTH_ABBR: Record<string, string> = {
  Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
  Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
};

/** SBP /meta dates are always "DD-Mon-YYYY" (e.g. "31-May-2026"). Returns null on anything that doesn't match rather than trusting an upstream format change silently. */
function parseSbpMetaDate(input: string | undefined): string | null {
  if (!input) return null;
  const match = input.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (!match) return null;
  const [, day, mon, year] = match;
  const month = MONTH_ABBR[mon];
  if (!month) return null;
  return `${year}-${month}-${day.padStart(2, "0")}`;
}

interface SbpMetaInfo {
  availableUpto: string | null;
  lastRefreshDate: string | null;
}

/** Lightweight metadata-only call (no observation rows) — SBP EasyData's own record of a series' latest available date. Never throws; returns null on any failure so the audit degrades to "meta-unavailable" for that indicator rather than aborting the whole run. */
async function fetchSbpSeriesMeta(seriesKey: string): Promise<SbpMetaInfo | null> {
  const apiKey = process.env.SBP_EASYDATA_API_KEY;
  if (!apiKey) return null;
  try {
    const response = await fetch(
      `${SBP_META_BASE}/${seriesKey}/meta?api_key=${apiKey}&format=json`,
      { cache: "no-store", signal: AbortSignal.timeout(META_FETCH_TIMEOUT_MS) },
    );
    if (!response.ok) return null;
    const json = (await response.json()) as { columns: string[]; rows: string[][] };
    const row = json.rows?.[0];
    if (!row) return null;
    const uptoIdx = json.columns.indexOf("Available Upto");
    const refreshIdx = json.columns.indexOf("Last Refresh Date");
    return {
      availableUpto: parseSbpMetaDate(row[uptoIdx]),
      lastRefreshDate: parseSbpMetaDate(row[refreshIdx]),
    };
  } catch {
    return null;
  }
}

export type FreshnessStatus =
  | "fresh"
  | "stale-self-healed"
  | "stale-needs-review"
  | "meta-unavailable"
  | "serve-error";

export interface FreshnessAuditEntry {
  indicator: SbpIndicatorKey;
  seriesKey: string;
  /** Observation date the dashboard is currently serving (cache-aware — the same path every page render uses), before any action this audit takes. */
  servedObservationDate: string | null;
  servedSourceStatus: string;
  /** SBP EasyData's own "Available Upto" for this series, from its /meta endpoint. */
  sbpAvailableUpto: string | null;
  sbpLastRefreshDate: string | null;
  status: FreshnessStatus;
  detail: string;
}

/**
 * Audits every SBP EasyData-backed indicator against SBP's own authoritative
 * "Available Upto" metadata.
 *
 * For each indicator:
 *   1. Read what the dashboard is currently serving (cache-aware — cheap in
 *      the common case, just an L1/L2 cache read, not a new network call).
 *   2. Fetch SBP's own /meta for that series (a separate, lightweight call —
 *      metadata only, no observation rows).
 *   3. If SBP's Available Upto is newer than what we're serving:
 *      a. Invalidate the cache (L1 + Next.js L2 tag) and re-check with a
 *         genuinely forced-live fetch.
 *      b. If the live fetch now returns the newer date: "stale-self-healed"
 *         — this was just a cache timing gap, now resolved; the very next
 *         real page request will see the fresh value.
 *      c. If the live fetch STILL returns the old date even though SBP says
 *         newer data exists: "stale-needs-review" — the configured series
 *         itself cannot produce SBP's latest observation. This is a "wrong
 *         series" class bug (exactly what affected moneySupplyM2 before its
 *         2026-07 migration to TS_GP_BAM_M2_W.M000070) that requires a code
 *         change, not just a cache bust — flagged here for a maintainer.
 *
 * Never writes to any database and never throws — every per-indicator
 * failure is captured as its own entry (status "serve-error" or
 * "meta-unavailable") so one bad series never prevents the other 19 from
 * being audited.
 */
export async function auditSbpFreshness(): Promise<FreshnessAuditEntry[]> {
  return Promise.all(
    ALL_INDICATOR_KEYS.map(async (key): Promise<FreshnessAuditEntry> => {
      let served;
      try {
        served = await getSbpIndicator(key);
      } catch (err) {
        return {
          indicator: key,
          seriesKey: "unknown",
          servedObservationDate: null,
          servedSourceStatus: "error",
          sbpAvailableUpto: null,
          sbpLastRefreshDate: null,
          status: "serve-error",
          detail: `getSbpIndicator threw: ${err instanceof Error ? err.message : String(err)}`,
        };
      }

      const seriesKey = served.meta.seriesKey;
      const meta = await fetchSbpSeriesMeta(seriesKey);
      if (!meta || !meta.availableUpto) {
        return {
          indicator: key,
          seriesKey,
          servedObservationDate: served.meta.observationDate,
          servedSourceStatus: served.meta.sourceStatus ?? "unknown",
          sbpAvailableUpto: null,
          sbpLastRefreshDate: meta?.lastRefreshDate ?? null,
          status: "meta-unavailable",
          detail: "SBP /meta endpoint did not return a parseable 'Available Upto' date this cycle — freshness not verified, will retry next run.",
        };
      }

      if (served.meta.observationDate >= meta.availableUpto) {
        return {
          indicator: key,
          seriesKey,
          servedObservationDate: served.meta.observationDate,
          servedSourceStatus: served.meta.sourceStatus ?? "unknown",
          sbpAvailableUpto: meta.availableUpto,
          sbpLastRefreshDate: meta.lastRefreshDate,
          status: "fresh",
          detail: `Serving ${served.meta.observationDate}, matching SBP's latest available observation.`,
        };
      }

      // Drift: SBP has a newer observation than what we're currently serving.
      // Self-heal first — this is the common, benign case (cache hasn't
      // naturally expired yet) — then verify with a forced-live fetch.
      invalidateSbpIndicatorCache(key);
      let liveObservationDate: string | null = null;
      try {
        const live = await getSbpIndicatorFresh(key);
        liveObservationDate = live.meta.observationDate;
      } catch {
        // liveObservationDate stays null — treated as still-stale below.
      }

      if (liveObservationDate && liveObservationDate >= meta.availableUpto) {
        return {
          indicator: key,
          seriesKey,
          servedObservationDate: served.meta.observationDate,
          servedSourceStatus: served.meta.sourceStatus ?? "unknown",
          sbpAvailableUpto: meta.availableUpto,
          sbpLastRefreshDate: meta.lastRefreshDate,
          status: "stale-self-healed",
          detail: `Was serving ${served.meta.observationDate} (SBP available: ${meta.availableUpto}). Cache invalidated; live re-fetch now returns ${liveObservationDate} — the next page request will see the fresh value.`,
        };
      }

      return {
        indicator: key,
        seriesKey,
        servedObservationDate: served.meta.observationDate,
        servedSourceStatus: served.meta.sourceStatus ?? "unknown",
        sbpAvailableUpto: meta.availableUpto,
        sbpLastRefreshDate: meta.lastRefreshDate,
        status: "stale-needs-review",
        detail: `SBP /meta reports data available through ${meta.availableUpto}, but a forced live fetch of series ${seriesKey} still only returns ${liveObservationDate ?? "an error"}. This series cannot produce SBP's latest observation — likely the wrong/discontinued series (see moneySupplyM2's 2026-07 migration for precedent) or a response-parsing bug. Needs manual review.`,
      };
    }),
  );
}
