// Centralized, provider-agnostic series freshness registry — Phase 5.
//
// Single place a series declares what the freshness engine should expect
// from it. Today every entry is SBP EasyData (Wave 1's only ingested
// provider); a future provider adds its own entries here, not inside a UI
// component or inside evaluateFreshness() itself.
//
// SBP entries mirror src/lib/systemHealth.ts's existing SLA_GRACE_DAYS /
// SLA_GRACE_OVERRIDE_DAYS values exactly (the Canonical SBP Freshness
// section, already production-validated against this project's own
// backfilled history — see that file's comments for the p95-gap evidence
// behind policyRate/pibYield3y/lsm's overrides), and — critically — the
// same TOTAL-tolerance-from-observationPeriod SEMANTICS: systemHealth.ts's
// own comments describe every number this way ("one release cycle + ~10
// day buffer" for Monthly's 40, ">1 full cycle + a generous buffer" for
// Annual's 450), never as extra time stacked on top of a separately
// computed due date. freshnessEngine.ts's evaluateFreshness() is
// responsible for honoring that (it subtracts the cadence interval already
// consumed by a cadence-derived due date before comparing against
// graceDays) — this file only supplies the number, unchanged from
// systemHealth.ts's validated total. (Phase 5.1 note: an earlier version of
// the engine added graceDays on top of the cadence-derived due date instead
// of treating it as the total, silently doubling Monthly's effective
// tolerance to ~71 days. Fixed in freshnessEngine.ts; these registry values
// were never wrong, only how the engine consumed them.)
//
// Mirrored, not imported: SLA_GRACE_DAYS/SLA_GRACE_OVERRIDE_DAYS are
// module-private to systemHealth.ts, and exporting them is a small refactor
// of an existing, working admin-health module that Phase 5's shadow-mode
// scope deliberately avoids ("read-only shadow instrumentation" only).
// Consolidating onto one shared source of these numbers is exactly the kind
// of cleanup Phase 6 (making this engine authoritative) is the right place
// to do — not before.
//
// Cadence here is a coarser, engine-facing vocabulary (ReleaseCadence) than
// sbp.ts's own Frequency type ("Monthly"|"As-Needed"|"Weekly"|"Annual") —
// mapped 1:1 below, no new frequencies invented.

import { getAllSbpIndicatorKeys, getSbpIndicatorFrequency, type SbpIndicatorKey, type Frequency } from "@/lib/data/sbp";
import { canonicalIndicatorKey, SBP_EASYDATA_PROVIDER_ID, FOOD_INFLATION_URBAN_INDICATOR_KEY, M2_YOY_GROWTH_INDICATOR_KEY } from "@/lib/data/canonicalResolutionConfig";
import type { SeriesDefinition, ReleaseCadence } from "@/lib/freshness/freshnessEngine";
import type { MarketType } from "@/lib/marketCalendar";
// Phase 8.20: SERIES_CATALOG is the single authoritative source for the
// cadence of every series ALSO used by the Comparisons feature (World Bank,
// FRED, Yahoo Gold below) — not re-declared here as an independent literal.
// SBP's own 20-indicator cadence continues to come from sbp.ts's Frequency
// (via FREQUENCY_TO_CADENCE below), unchanged — see SERIES_CATALOG's own
// header comment in seriesDefinition.ts for exactly why 3 of SBP's
// comparison-facing series (moneySupplyM2, policyRate, tbillYield3m) are a
// documented, deliberate exception to this cross-reference, not silently
// unified with it.
import { SERIES_CATALOG } from "@/lib/seriesDefinition";

const FREQUENCY_TO_CADENCE: Record<Frequency, ReleaseCadence> = {
  Monthly: "monthly",
  "As-Needed": "as-needed",
  Weekly: "weekly",
  Annual: "annual",
};

// Mirrors systemHealth.ts's SLA_GRACE_DAYS — see file header.
const CADENCE_GRACE_DAYS: Record<ReleaseCadence, number> = {
  "real-time": 1,
  hourly: 1,
  daily: 3,
  weekly: 14,
  monthly: 40,
  quarterly: 100,
  annual: 450,
  "as-needed": 45,
};

// Mirrors systemHealth.ts's SLA_GRACE_OVERRIDE_DAYS — see that file's
// comment for the p95/max-gap evidence this was computed from.
const SBP_GRACE_OVERRIDE_DAYS: Partial<Record<SbpIndicatorKey, number>> = {
  policyRate: 120,
  pibYield3y: 90,
  lsm: 75,
};

// USD/PKR, being a genuine tradeable FX rate (not merely SBP's own reported
// mid-rate print), is the one SBP-sourced indicator with a real market
// session — every other SBP indicator is a statistical release with no
// "market hours" concept, so no marketType is set for them.
const SBP_MARKET_TYPE: Partial<Record<SbpIndicatorKey, MarketType>> = {
  usdPkr: "forex",
};

/**
 * SBP EasyData's /data endpoint (see src/lib/data/sbp.ts's SbpApiResponse)
 * exposes only Observation Date/Value/Unit/Series Name — no release date, no
 * source-updated-at. Both stay false for every SBP entry, honestly, rather
 * than being fabricated per-series.
 */
const SBP_EXPECTS_RELEASE_DATE = false;
const SBP_EXPECTS_SOURCE_UPDATED_AT = false;

/** SBP's weekly Forex_Arch.xlsx "NET RESERVES WITH SBP" series — see the registry entry below for why this is here. */
export const FX_RESERVES_INDICATOR_KEY = "sbp-forex-arch:netLiquidReserves";
export const FX_RESERVES_PROVIDER_ID = "sbp-forex-arch";

function sbpSeriesDefinition(key: SbpIndicatorKey): SeriesDefinition {
  const cadence = FREQUENCY_TO_CADENCE[getSbpIndicatorFrequency(key)];
  return {
    seriesId: canonicalIndicatorKey(key),
    provider: SBP_EASYDATA_PROVIDER_ID,
    cadence,
    graceDays: SBP_GRACE_OVERRIDE_DAYS[key] ?? CADENCE_GRACE_DAYS[cadence],
    marketType: SBP_MARKET_TYPE[key],
    expectsReleaseDate: SBP_EXPECTS_RELEASE_DATE,
    expectsSourceUpdatedAt: SBP_EXPECTS_SOURCE_UPDATED_AT,
  };
}

// The two extra SBP-sourced series that aren't SbpIndicatorKey members (see
// canonicalResolutionConfig.ts's own header for why) — same provider, same
// honesty rules, cadences chosen to match their real revalidation windows
// in sbp.ts (REVALIDATE_MONTHLY / REVALIDATE_AS_NEEDED respectively).
const EXTRA_SERIES_DEFINITIONS: Record<string, SeriesDefinition> = {
  [FOOD_INFLATION_URBAN_INDICATOR_KEY]: {
    seriesId: FOOD_INFLATION_URBAN_INDICATOR_KEY,
    provider: SBP_EASYDATA_PROVIDER_ID,
    cadence: "monthly",
    graceDays: CADENCE_GRACE_DAYS.monthly,
    expectsReleaseDate: SBP_EXPECTS_RELEASE_DATE,
    expectsSourceUpdatedAt: SBP_EXPECTS_SOURCE_UPDATED_AT,
  },
  [M2_YOY_GROWTH_INDICATOR_KEY]: {
    seriesId: M2_YOY_GROWTH_INDICATOR_KEY,
    provider: SBP_EASYDATA_PROVIDER_ID,
    cadence: "weekly",
    graceDays: CADENCE_GRACE_DAYS.weekly,
    expectsReleaseDate: SBP_EXPECTS_RELEASE_DATE,
    expectsSourceUpdatedAt: SBP_EXPECTS_SOURCE_UPDATED_AT,
  },
  // Phase 6 integration finding: the dashboard's primary "Foreign Reserves"
  // KPI (and the hero Data Status tile that motivated Phase 6's Live-label
  // fix) is NOT an EasyData series at all — it comes from SBP's weekly
  // Forex_Arch.xlsx via src/lib/data/fxReserves.ts, which builds the same
  // SbpMeta shape but was never represented in this registry. Without an
  // entry it could not be given an authoritative verdict, so this is a
  // genuine integration gap rather than a style change. Weekly cadence and
  // the weekly grace period match systemHealth.ts's own Weekly SLA and
  // fxReserves.ts's declared `frequency: "Weekly"`. Same honesty flags as
  // every SBP source: the spreadsheet carries no release-date or
  // source-updated-at metadata either.
  [FX_RESERVES_INDICATOR_KEY]: {
    seriesId: FX_RESERVES_INDICATOR_KEY,
    provider: FX_RESERVES_PROVIDER_ID,
    cadence: "weekly",
    graceDays: CADENCE_GRACE_DAYS.weekly,
    expectsReleaseDate: false,
    expectsSourceUpdatedAt: false,
  },
};

// Phase 8.3: World Bank GDP-growth pilot (3 series — see
// src/lib/providers/worldBankAdapter.ts's WORLD_BANK_SERIES). Registered
// here, the same sanctioned extension point every provider uses ("a future
// provider adds its own entries here, not inside a UI component or inside
// evaluateFreshness() itself" — see file header) — this is not a change to
// the freshness engine or algorithm, only new data fed into it.
//
// Unlike every SBP entry, expectsSourceUpdatedAt is genuinely true here:
// the World Bank adapter populates source_updated_at from the API's own
// `lastupdated` field (see worldBankAdapter.ts's provenance decisions) —
// real evidence, not fabricated. expectsReleaseDate stays false: the API
// exposes no per-observation release date, confirmed live in Phase 8.2.
// graceDays reuses the same annual figure (450) already validated for
// SBP's own annual-cadence entries — GDP growth is at least as
// infrequently revised as SBP's slowest series, so there is no evidence to
// justify a different number, and inventing one without evidence would be
// exactly the kind of unearned precision this registry's SBP comments
// already warn against.
//
// cadence: derived from SERIES_CATALOG (Phase 8.20) rather than a hardcoded
// "annual" literal — these 3 series IDs are the same comparison-facing IDs
// SERIES_CATALOG already declares "annual" for, so this is a cross-reference
// to the single authoritative fact, not a new decision.
const WORLD_BANK_GDP_GROWTH_SERIES_IDS = ["worldbank:gdpGrowthPak", "worldbank:gdpGrowthIndia", "worldbank:gdpGrowthBangladesh"] as const;
export const WORLD_BANK_PROVIDER_ID = "world-bank";

const WORLD_BANK_SERIES_DEFINITIONS: Record<string, SeriesDefinition> = Object.fromEntries(
  WORLD_BANK_GDP_GROWTH_SERIES_IDS.map((seriesId) => {
    const cadence = SERIES_CATALOG[seriesId]?.cadence;
    if (!cadence) throw new Error(`seriesRegistry: no SERIES_CATALOG entry for World Bank series "${seriesId}"`);
    return [
      seriesId,
      {
        seriesId,
        provider: WORLD_BANK_PROVIDER_ID,
        cadence,
        graceDays: CADENCE_GRACE_DAYS[cadence],
        expectsReleaseDate: false,
        expectsSourceUpdatedAt: true,
      },
    ];
  }),
);

// Phase 8.12: FRED monthly canonicalization pilot — EXACTLY the two FRED
// series already consumed by the Comparisons feature in their existing
// monthly-transformed form (see src/lib/providers/fredAdapter.ts's own
// header for the full transformation-identity rationale). Registered here,
// the same sanctioned extension point every provider uses — not a new
// registry, not a change to evaluateFreshness() itself.
//
// cadence/graceDays: both series are genuinely monthly (FRED's own
// frequency=m/aggregation_method=eop and units=pc1 transforms produce one
// point per calendar month), so this reuses the SAME already-validated
// monthly graceDays=40 default every other monthly-cadence entry in this
// registry uses — a Phase 8.11 binding decision, not a fresh policy call.
// No daily-cadence FRED series is registered here — see the Phase 8.11
// audit for why that remains a blocked, separate policy decision.
//
// expectsReleaseDate/expectsSourceUpdatedAt: both false. FRED's
// /observations endpoint exposes no per-observation release date, and the
// realtime_start/realtime_end fields it does expose were confirmed live
// (Phase 8.12) to equal the QUERY date on every row, not a genuine
// per-observation update timestamp — see fredAdapter.ts's header for the
// full evidence. Populating either flag as true here would license a
// freshness read that doesn't exist.
// cadence: derived from SERIES_CATALOG (Phase 8.20) rather than a hardcoded
// "monthly" literal — same comparison-facing IDs SERIES_CATALOG already
// declares "monthly" for, so this is a cross-reference, not a new decision.
const FRED_SERIES_IDS = ["fred:fedFunds", "fred:usCpiInflation"] as const;
export const FRED_PROVIDER_ID = "fred";

const FRED_SERIES_DEFINITIONS: Record<string, SeriesDefinition> = Object.fromEntries(
  FRED_SERIES_IDS.map((seriesId) => {
    const cadence = SERIES_CATALOG[seriesId]?.cadence;
    if (!cadence) throw new Error(`seriesRegistry: no SERIES_CATALOG entry for FRED series "${seriesId}"`);
    return [
      seriesId,
      {
        seriesId,
        provider: FRED_PROVIDER_ID,
        cadence,
        graceDays: CADENCE_GRACE_DAYS[cadence],
        expectsReleaseDate: false,
        expectsSourceUpdatedAt: false,
      },
    ];
  }),
);

// Phase 8.17: Yahoo Gold Monthly canonicalization pilot — EXACTLY one
// series, the completed-monthly-close representation of GC=F (see
// src/lib/providers/yahooGoldAdapter.ts's own header for the full
// trailing-bar-exclusion and transformation-identity rationale). Registered
// here, the same sanctioned extension point every provider uses — not a
// new registry, not a change to evaluateFreshness() itself. Silver, DXY,
// Market FX, and every other Yahoo-backed instrument are explicitly out of
// scope for this pilot — see the Phase 8.15 audit / Phase 8.16 design
// confirmation for why gold alone is the safe first slice.
//
// cadence/graceDays: the series is genuinely monthly (one completed bar per
// calendar month, after the in-progress current month is excluded), so this
// reuses the SAME already-validated monthly graceDays=40 default every
// other monthly-cadence entry in this registry uses (SBP's monthly
// indicators, fred:fedFunds/fred:usCpiInflation) — a Phase 8.16 binding
// decision, not a fresh policy call.
//
// marketType: deliberately left undefined. Direct inspection (Phase 8.16
// Decision 3) confirmed no monthly-or-slower-cadence entry anywhere in this
// registry sets marketType — only sbp:usdPkr does, a genuinely near-daily
// tradeable rate with real day-to-day session gaps. freshnessEngine.ts's
// market-closed branch only matters when an observation's own period falls
// within the last ~14 days; for a monthly series the cadence-due-date
// arithmetic already dominates every realistic evaluation, so marketType
// would have no meaningful effect here — matching fred:fedFunds/
// fred:usCpiInflation's own identical choice, not a departure from it.
//
// expectsReleaseDate/expectsSourceUpdatedAt: both false. Yahoo's chart
// endpoint exposes no per-observation release date, and its historical-bars
// array exposes no per-bar "last updated"/"revised at" field — confirmed
// live during the Phase 8.15 investigation.
//
// cadence: derived from SERIES_CATALOG (Phase 8.20) rather than a hardcoded
// "monthly" literal — looked up under "yfinance:gold", the comparison-facing
// ID Phase 8.17 deliberately gave this series (distinct from this registry's
// own YAHOO_GOLD_MONTHLY_SERIES_ID key), not a new decision.
export const YAHOO_GOLD_MONTHLY_SERIES_ID = "yahoo:goldMonthly";
export const YAHOO_FINANCE_PROVIDER_ID = "yahoo-finance";

const YAHOO_GOLD_CATALOG_LOOKUP_KEY = "yfinance:gold";
const yahooGoldCadence = SERIES_CATALOG[YAHOO_GOLD_CATALOG_LOOKUP_KEY]?.cadence;
if (!yahooGoldCadence) throw new Error(`seriesRegistry: no SERIES_CATALOG entry for "${YAHOO_GOLD_CATALOG_LOOKUP_KEY}"`);

const YAHOO_GOLD_SERIES_DEFINITIONS: Record<string, SeriesDefinition> = {
  [YAHOO_GOLD_MONTHLY_SERIES_ID]: {
    seriesId: YAHOO_GOLD_MONTHLY_SERIES_ID,
    provider: YAHOO_FINANCE_PROVIDER_ID,
    cadence: yahooGoldCadence,
    graceDays: CADENCE_GRACE_DAYS[yahooGoldCadence],
    expectsReleaseDate: false,
    expectsSourceUpdatedAt: false,
  },
};

let cachedRegistry: Map<string, SeriesDefinition> | null = null;

function buildRegistry(): Map<string, SeriesDefinition> {
  const map = new Map<string, SeriesDefinition>();
  for (const key of getAllSbpIndicatorKeys()) {
    const def = sbpSeriesDefinition(key);
    map.set(def.seriesId, def);
  }
  for (const def of Object.values(EXTRA_SERIES_DEFINITIONS)) {
    map.set(def.seriesId, def);
  }
  for (const def of Object.values(WORLD_BANK_SERIES_DEFINITIONS)) {
    map.set(def.seriesId, def);
  }
  for (const def of Object.values(FRED_SERIES_DEFINITIONS)) {
    map.set(def.seriesId, def);
  }
  for (const def of Object.values(YAHOO_GOLD_SERIES_DEFINITIONS)) {
    map.set(def.seriesId, def);
  }
  return map;
}

/** All registered series definitions, keyed by provider-qualified seriesId (e.g. "sbp:usdPkr") — the same keys canonical_observations.indicator_key already uses. */
export function getSeriesRegistry(): Map<string, SeriesDefinition> {
  if (!cachedRegistry) cachedRegistry = buildRegistry();
  return cachedRegistry;
}

export function getSeriesDefinition(seriesId: string): SeriesDefinition | null {
  return getSeriesRegistry().get(seriesId) ?? null;
}

/** Convenience for SBP call sites that already have an SbpIndicatorKey rather than the provider-qualified string. */
export function getSbpSeriesDefinition(key: SbpIndicatorKey): SeriesDefinition {
  return sbpSeriesDefinition(key);
}
