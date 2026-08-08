import type { SbpIndicatorKey } from "@/lib/data/sbp";

// Data-driven provider precedence for the canonical resolution layer
// (supabase/migrations/0050_raw_canonical_observations.sql). Every SBP
// indicator maps to an ordered list of provider ids — resolveCanonicalObservation
// callers (scripts/ingestSbp.ts today) always write with the FIRST entry as
// source_provider. Wave 1 ships every indicator single-sourced from SBP
// EasyData (the thing actually broken in production); Wave 2+ can extend
// any entry to e.g. ["pbs-web", "sbp-easydata"] without a schema change —
// this file is the single place that changes, not scattered code.
export const SBP_EASYDATA_PROVIDER_ID = "sbp-easydata";

export const CANONICAL_PROVIDER_PRECEDENCE: Record<SbpIndicatorKey, string[]> = {
  foreignReserves:     [SBP_EASYDATA_PROVIDER_ID],
  netBankReserves:     [SBP_EASYDATA_PROVIDER_ID],
  usdPkr:              [SBP_EASYDATA_PROVIDER_ID],
  policyRate:          [SBP_EASYDATA_PROVIDER_ID],
  cpiInflation:        [SBP_EASYDATA_PROVIDER_ID],
  coreInflation:       [SBP_EASYDATA_PROVIDER_ID],
  wpiInflation:        [SBP_EASYDATA_PROVIDER_ID],
  tbillYield3m:        [SBP_EASYDATA_PROVIDER_ID],
  pibYield3y:          [SBP_EASYDATA_PROVIDER_ID],
  remittances:         [SBP_EASYDATA_PROVIDER_ID],
  currentAccount:      [SBP_EASYDATA_PROVIDER_ID],
  tradeBalance:        [SBP_EASYDATA_PROVIDER_ID],
  moneySupplyM2:       [SBP_EASYDATA_PROVIDER_ID],
  exports:             [SBP_EASYDATA_PROVIDER_ID],
  imports:             [SBP_EASYDATA_PROVIDER_ID],
  fdiInflows:          [SBP_EASYDATA_PROVIDER_ID],
  reer:                [SBP_EASYDATA_PROVIDER_ID],
  lsm:                 [SBP_EASYDATA_PROVIDER_ID],
  privateCreditGrowth: [SBP_EASYDATA_PROVIDER_ID],
  fiscalBalance:       [SBP_EASYDATA_PROVIDER_ID],
};

/** The provider that currently wins canonical resolution for this indicator. */
export function primaryProviderFor(key: SbpIndicatorKey): string {
  return CANONICAL_PROVIDER_PRECEDENCE[key][0];
}

/** "sbp:foreignReserves" — the provider-qualified key stored in raw_observations/canonical_observations. */
export function canonicalIndicatorKey(key: SbpIndicatorKey): string {
  return `sbp:${key}`;
}

/**
 * Urban Food Inflation (src/lib/data/sbp.ts's FOOD_INFLATION_URBAN_SERIES_KEY)
 * is deliberately NOT one of the 20 SbpIndicatorKey members (it's a
 * Comparisons-only extra, not a homepage KPI card — see that file's header
 * comment), but it's still real SBP EasyData data rendered on a public page
 * (/pakistan-food-inflation) and therefore needs the same canonical-DB
 * backing as everything else — a page render must never depend on a live
 * SBP EasyData call. Same ingestion runner (scripts/ingestSbp.ts), same
 * tables, one more indicator_key.
 */
export const FOOD_INFLATION_URBAN_INDICATOR_KEY = "sbp:foodInflationUrban";
export const FOOD_INFLATION_URBAN_PROVIDER_ID = SBP_EASYDATA_PROVIDER_ID;
