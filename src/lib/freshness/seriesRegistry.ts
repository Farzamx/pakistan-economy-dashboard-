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
const WORLD_BANK_GDP_GROWTH_SERIES_IDS = ["worldbank:gdpGrowthPak", "worldbank:gdpGrowthIndia", "worldbank:gdpGrowthBangladesh"] as const;
export const WORLD_BANK_PROVIDER_ID = "world-bank";

const WORLD_BANK_SERIES_DEFINITIONS: Record<string, SeriesDefinition> = Object.fromEntries(
  WORLD_BANK_GDP_GROWTH_SERIES_IDS.map((seriesId) => [
    seriesId,
    {
      seriesId,
      provider: WORLD_BANK_PROVIDER_ID,
      cadence: "annual" as ReleaseCadence,
      graceDays: CADENCE_GRACE_DAYS.annual,
      expectsReleaseDate: false,
      expectsSourceUpdatedAt: true,
    },
  ]),
);

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
