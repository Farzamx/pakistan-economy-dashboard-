// Macro Intelligence Engine — orchestrator — Phase 9.1.
//
// THE ONLY FILE IN src/lib/intelligence/ THAT PERFORMS I/O. Every call below
// goes through an already-certified Phase 8 read-model function — never a
// provider API directly, never raw_observations/canonical_observations
// directly:
//   Provider -> ingestion -> canonical/read model -> (this file) -> UI
//
// SBP-sourced indicators (CPI, Core CPI, Policy Rate, Remittances, Current
// Account, Trade Balance, Exports, Imports, M2, Private Credit Growth,
// Fiscal Balance, USD/PKR monthly average) all go through
// getSbpIndicator()/sbpServer.ts — each result already carries its own
// authoritative freshness verdict (meta.freshness), computed by
// evaluateSbpFreshness() inside sbp.ts. This file never recomputes it.
//
// Foreign Reserves uses getNetLiquidReserves() (fxReserves.ts) rather than
// SBP EasyData's own "Total SBP Reserves" series (sbp:foreignReserves) —
// matching what the platform's own /overview dashboard already treats as
// its primary Foreign Reserves KPI (Phase 9.1 pre-implementation audit),
// not a new editorial choice made here.
//
// GDP Growth uses getGdpGrowthHistory("PAK") (worldBank.ts) for its trend
// history, joined to a freshness verdict via the same public
// evaluateWorldBankFreshness() getGdpKpi() itself uses — no duplicated
// logic, just called directly rather than through the single-point Kpi
// wrapper (which has no history array to compute direction from).
//
// Gold (yahoo:goldMonthly, COMEX futures monthly closes — never the live
// intraday quote, see below) uses getCanonicalYahooGoldHistory()
// (yahooGoldCanonicalStore.ts), joined to freshness via
// buildFreshnessAwareObservation() (readModel.ts) — the purpose-built
// generic joiner for canonical rows that don't carry a pre-attached
// verdict. Phase 8.22 already established that Yahoo's intraday quote
// (fetchYfQuote/getFxRates) must never be treated as a completed economic
// observation; this file does not reopen that finding or call fetchYfQuote/
// getFxRates anywhere. USD/PKR market pressure (Market Stress dimension)
// instead uses SBP's own monthly-average USD/PKR series (sbp:usdPkr),
// which IS freshness-registered.
//
// FRED (fred:fedFunds, fred:usCpiInflation) has a fully audited, trustworthy
// read path (getCanonicalFredHistory) but is DELIBERATELY NOT wired into
// any of the seven dimensions below — see the Phase 9.1 report's "out of
// scope" section for why (no evidenced rule to build from it yet, not a
// missing read model).

import { getSbpIndicator, type SbpIndicatorKey } from "@/lib/data/sbpServer";
import { getNetLiquidReserves } from "@/lib/data/fxReserves";
import { getGdpGrowthHistory, evaluateWorldBankFreshness } from "@/lib/data/worldBank";
import { getCanonicalYahooGoldHistory } from "@/lib/data/yahooGoldCanonicalStore";
import { getSeriesDefinition, FX_RESERVES_INDICATOR_KEY } from "@/lib/freshness/seriesRegistry";
import { buildFreshnessAwareObservation } from "@/lib/freshness/readModel";
import { buildIndicatorEvidence } from "./evidence";
import {
  evaluateExternalSectorSignal,
  evaluateFiscalConditionsSignal,
  evaluateGrowthSignal,
  evaluateInflationSignal,
  evaluateLiquidityCreditSignal,
  evaluateMarketStressSignal,
  evaluateMonetaryPolicySignal,
} from "./signalDefinitions";
import type { IndicatorObservationEvidence, IntelligenceSignal, MacroIntelligenceReport, MacroRegimeSnapshot } from "./types";

const YAHOO_GOLD_SERIES_ID = "yahoo:goldMonthly";
const YAHOO_GOLD_HISTORY_LIMIT = 24;

async function safeSbpEvidence(key: SbpIndicatorKey, label: string, seriesId: string): Promise<IndicatorObservationEvidence | null> {
  try {
    const result = await getSbpIndicator(key);
    return buildIndicatorEvidence({
      seriesId,
      label,
      unit: result.kpi.unit,
      points: result.trend,
      observationPeriod: result.meta.observationDate,
      freshness: result.meta.freshness,
      isFallback: result.meta.source.includes("fallback"),
      // Phase 9.6A fix: getSbpIndicator() may return a PBS-overridden
      // kpi.value/meta.observationDate pair (sbpServer.ts's
      // applyCanonicalOverride) while result.trend deliberately still ends
      // at the older SBP-only period. Passing kpi.value here lets
      // buildIndicatorEvidence guarantee value/observationPeriod always
      // describe the same observation, degrading direction/change/
      // acceleration to Unknown instead of comparing against a period
      // `points` hasn't reached — see evidence.ts's header on this field.
      authoritativeValueDisplay: result.kpi.value,
    });
  } catch (err) {
    console.error(`[macroIntelligence] failed to read ${label} (${seriesId}): ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

async function safeReservesEvidence(): Promise<IndicatorObservationEvidence | null> {
  try {
    const result = await getNetLiquidReserves();
    return buildIndicatorEvidence({
      seriesId: FX_RESERVES_INDICATOR_KEY,
      label: "Foreign Reserves (Net Liquid)",
      unit: result.kpi.unit,
      points: result.trend,
      observationPeriod: result.meta.observationDate,
      freshness: result.meta.freshness,
      isFallback: result.meta.source.includes("fallback"),
    });
  } catch (err) {
    console.error(`[macroIntelligence] failed to read Foreign Reserves: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

async function safeGdpEvidence(): Promise<IndicatorObservationEvidence | null> {
  try {
    const series = await getGdpGrowthHistory("PAK");
    if (!series) return null;
    const observationPeriod = `${series.latestYear}-12-31`;
    const freshness = evaluateWorldBankFreshness("worldbank:gdpGrowthPak", observationPeriod);
    return buildIndicatorEvidence({
      seriesId: "worldbank:gdpGrowthPak",
      label: "GDP Growth",
      unit: "%",
      points: series.history,
      observationPeriod,
      freshness,
      isFallback: false, // getGdpGrowthHistory() returns null on total failure rather than a static fallback (see worldBank.ts) — there is no fallback state to detect here
    });
  } catch (err) {
    console.error(`[macroIntelligence] failed to read GDP Growth: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

async function safeGoldEvidence(): Promise<IndicatorObservationEvidence | null> {
  try {
    const rows = await getCanonicalYahooGoldHistory(YAHOO_GOLD_SERIES_ID, YAHOO_GOLD_HISTORY_LIMIT);
    if (rows.length === 0) return null;
    const latest = rows[rows.length - 1];
    const seriesDefinition = getSeriesDefinition(YAHOO_GOLD_SERIES_ID);
    if (!seriesDefinition) return null; // registry entry genuinely missing — represented as unavailable, never assumed fresh
    const { freshness } = buildFreshnessAwareObservation(
      {
        observationPeriod: latest.observationPeriod,
        value: latest.value,
        releaseDate: latest.releaseDate,
        sourceUpdatedAt: latest.sourceUpdatedAt,
        fetchedAt: latest.fetchedAt,
        vintage: latest.vintage,
      },
      seriesDefinition,
      { sourceStatus: "live", vintage: latest.vintage, fetchedAt: latest.fetchedAt },
    );
    return buildIndicatorEvidence({
      seriesId: YAHOO_GOLD_SERIES_ID,
      label: "Gold (COMEX futures, monthly)",
      unit: latest.unit,
      points: rows,
      observationPeriod: latest.observationPeriod,
      freshness,
      isFallback: false, // canonical rows have no "hardcoded fallback" concept — see evidence.ts's header
    });
  } catch (err) {
    console.error(`[macroIntelligence] failed to read Gold (yahoo:goldMonthly): ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

/**
 * Fetches every indicator this foundation phase's seven signals need, in
 * parallel, from already-certified read models only. A failure on any one
 * indicator does not fail the others — each `safe*Evidence()` helper
 * degrades to `null`, which downstream signal rules represent as
 * "insufficient-data" / a listed missing input, never a thrown error and
 * never a fabricated value.
 */
async function fetchAllEvidence() {
  const [cpi, core, policyRate, remittances, reserves, currentAccount, tradeBalance, exports, imports, m2, privateCreditGrowth, fiscalBalance, usdPkr, gdpGrowth, gold] = await Promise.all([
    safeSbpEvidence("cpiInflation", "CPI Inflation (YoY)", "sbp:cpiInflation"),
    safeSbpEvidence("coreInflation", "Core Inflation (YoY)", "sbp:coreInflation"),
    safeSbpEvidence("policyRate", "SBP Policy Rate", "sbp:policyRate"),
    safeSbpEvidence("remittances", "Remittances", "sbp:remittances"),
    safeReservesEvidence(),
    safeSbpEvidence("currentAccount", "Current Account", "sbp:currentAccount"),
    safeSbpEvidence("tradeBalance", "Trade Balance", "sbp:tradeBalance"),
    safeSbpEvidence("exports", "Exports", "sbp:exports"),
    safeSbpEvidence("imports", "Imports", "sbp:imports"),
    safeSbpEvidence("moneySupplyM2", "M2 Money Supply", "sbp:moneySupplyM2"),
    safeSbpEvidence("privateCreditGrowth", "Private Credit Growth", "sbp:privateCreditGrowth"),
    safeSbpEvidence("fiscalBalance", "Fiscal Balance", "sbp:fiscalBalance"),
    safeSbpEvidence("usdPkr", "USD/PKR (SBP monthly average)", "sbp:usdPkr"),
    safeGdpEvidence(),
    safeGoldEvidence(),
  ]);
  return { cpi, core, policyRate, remittances, reserves, currentAccount, tradeBalance, exports, imports, m2, privateCreditGrowth, fiscalBalance, usdPkr, gdpGrowth, gold };
}

function buildRegime(signals: readonly IntelligenceSignal[], calculatedAt: string): MacroRegimeSnapshot {
  const dimensions: MacroRegimeSnapshot["dimensions"] = {};
  for (const signal of signals) {
    dimensions[signal.dimension] = signal.state;
  }
  return { dimensions, calculatedAt };
}

/**
 * Builds the full Macro Intelligence report: fetches every underlying
 * indicator (in parallel, read-model layer only), evaluates all seven
 * dimension signals (pure, deterministic — signalDefinitions.ts), and
 * assembles the multi-dimensional regime snapshot. Safe to call from a
 * Server Component; performs no writes, no scheduling, no external API
 * calls beyond what the underlying read models already do internally.
 */
export async function buildMacroIntelligenceReport(now: Date = new Date()): Promise<MacroIntelligenceReport> {
  const calculatedAt = now.toISOString();
  const evidence = await fetchAllEvidence();

  const signals: IntelligenceSignal[] = [
    evaluateInflationSignal({ cpi: evidence.cpi, core: evidence.core }, calculatedAt),
    evaluateMonetaryPolicySignal({ policyRate: evidence.policyRate, cpi: evidence.cpi }, calculatedAt),
    evaluateExternalSectorSignal(
      {
        reserves: evidence.reserves,
        currentAccount: evidence.currentAccount,
        tradeBalance: evidence.tradeBalance,
        exports: evidence.exports,
        imports: evidence.imports,
        remittances: evidence.remittances,
      },
      calculatedAt,
    ),
    evaluateLiquidityCreditSignal({ m2: evidence.m2, privateCreditGrowth: evidence.privateCreditGrowth }, calculatedAt),
    evaluateFiscalConditionsSignal({ fiscalBalance: evidence.fiscalBalance }, calculatedAt),
    evaluateGrowthSignal({ gdpGrowth: evidence.gdpGrowth }, calculatedAt),
    evaluateMarketStressSignal({ gold: evidence.gold, usdPkr: evidence.usdPkr }, calculatedAt),
  ];

  return { signals, regime: buildRegime(signals, calculatedAt), calculatedAt };
}
