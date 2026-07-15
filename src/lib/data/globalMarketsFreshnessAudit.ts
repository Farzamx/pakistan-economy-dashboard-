import "server-only";

// Global Markets Freshness Audit — Phase XX (Global Markets Data Freshness
// Audit & Permanent Fix).
//
// Root-cause context: unlike SBP EasyData (see sbpFreshnessAudit.ts), the 8
// Yahoo Finance / FRED / Twelve Data-backed Global Markets indicators
// (gold/silver/wti/brent/natural-gas/dxy/us10y/fed-funds) had no cache tags
// at all — only a passive next.revalidate window (1h/6h/24h) with no way to
// force a targeted refresh, and no automated check that the served value
// still matches what upstream actually has. A genuine drift (an expired API
// key, an upstream schema change, a wrong-series bug) would only ever be
// caught by a human noticing a stale value on the site. This module closes
// that gap using the same self-heal-then-verify pattern as
// sbpFreshnessAudit.ts, adapted to this pipeline's own architecture:
// cache-tag invalidation (globalMarketsCacheInvalidation.ts) + a genuinely
// live re-check (noCache=true, added to every getter in
// yfinance.ts/fred.ts/metals.ts/fxRates.ts) instead of SBP's /meta endpoint.
//
// Method per indicator: fetch what the site currently SERVES (the exact
// cached path a real page render uses), then a retried, cache-bypassing
// LIVE re-check of the same source. If the two already agree, the served
// value is definitionally current — including on weekends/holidays, when
// the live re-check itself naturally returns the last trading session's
// value too, so no separate day-count/closure heuristic is needed for
// *correctness* (marketCalendar.ts is still used to *label* why a date
// looks old, for a clearer report). If they disagree, invalidate this
// indicator's cache tag and re-serve; matching now means "self-healed" (a
// timing gap, now resolved for the next real visitor); still disagreeing
// means the configured source itself cannot produce the latest value —
// "needs-review", flagged for a maintainer rather than served silently.

import type { Kpi } from "@/data/kpiData";
import type { DataFrequency } from "@/lib/dataFreshness";
import { getMarketClosureReason, getLastTradingDay, type MarketType } from "@/lib/marketCalendar";
import { getGoldKpi, getSilverKpi, getDxyKpi } from "@/lib/data/metals";
import { getWtiKpi, getBrentKpi, getNaturalGasKpi, getUs10yKpi, getFedFundsKpi } from "@/lib/data/fred";
import { getFxRates, type FxRateKpis } from "@/lib/data/fxRates";
import { invalidateGlobalMarketCache, invalidateFxRatesCache } from "@/lib/data/globalMarketsCacheInvalidation";
import type { GlobalMarketSymbolKey } from "@/lib/data/globalMarketsCacheTags";

export type GlobalMarketFreshnessStatus =
  | "fresh"
  | "closed-weekend"
  | "closed-holiday"
  | "self-healed"
  | "needs-review"
  | "pipeline-failure"
  | "serve-error";

export interface GlobalMarketFreshnessEntry {
  indicator: string;
  source: string;
  servedValue: string;
  servedDate: string | null;
  servedSourceStatus: string;
  liveDate: string | null;
  status: GlobalMarketFreshnessStatus;
  detail: string;
}

const RETRY_ATTEMPTS = 2; // total tries = RETRY_ATTEMPTS + 1
const RETRY_BASE_DELAY_MS = 500;

/** Retries `fn` with exponential backoff (500ms, 1000ms, ...) — used only for the audit's live re-check, never on the hot page-render path, so a slow/flaky upstream never delays a real visitor. */
async function withRetryBackoff<T>(fn: () => Promise<T>, retries = RETRY_ATTEMPTS): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_BASE_DELAY_MS * 2 ** attempt));
      }
    }
  }
  throw lastErr;
}

interface GetterIndicatorConfig {
  key: GlobalMarketSymbolKey;
  title: string;
  marketType: MarketType;
  frequency: DataFrequency;
  getter: (noCache?: boolean) => Promise<Kpi>;
}

const GETTER_INDICATORS: GetterIndicatorConfig[] = [
  { key: "gold", title: "Gold", marketType: "global-market", frequency: "Hourly", getter: getGoldKpi },
  { key: "silver", title: "Silver", marketType: "global-market", frequency: "Hourly", getter: getSilverKpi },
  { key: "dxy", title: "US Dollar Index", marketType: "global-market", frequency: "Hourly", getter: getDxyKpi },
  { key: "wti", title: "WTI Crude", marketType: "global-market", frequency: "Hourly", getter: getWtiKpi },
  { key: "brent", title: "Brent Crude", marketType: "global-market", frequency: "Hourly", getter: getBrentKpi },
  { key: "natural-gas", title: "Natural Gas", marketType: "global-market", frequency: "Hourly", getter: getNaturalGasKpi },
  { key: "us10y", title: "US 10Y Treasury", marketType: "us-treasury", frequency: "Daily", getter: getUs10yKpi },
  { key: "fed-funds", title: "Fed Funds Rate", marketType: "us-treasury", frequency: "Daily", getter: getFedFundsKpi },
];

/** Human-readable reason a served date can legitimately trail "now" without anything being wrong — used only in the detail string, never in the fresh/stale decision itself (that's a direct served-vs-live-recheck comparison, which already handles weekends/holidays/publish lag correctly on its own). */
function closureLabel(marketType: MarketType): { reason: "closed-weekend" | "closed-holiday" | null; lastTradingDay: string } {
  const now = new Date();
  const reason = getMarketClosureReason(now);
  return { reason, lastTradingDay: getLastTradingDay(now) };
}

async function auditGetterIndicator(config: GetterIndicatorConfig): Promise<GlobalMarketFreshnessEntry> {
  const { key, title, marketType, getter } = config;

  let served: Kpi;
  try {
    served = await getter();
  } catch (err) {
    return {
      indicator: title,
      source: "unknown",
      servedValue: "",
      servedDate: null,
      servedSourceStatus: "error",
      liveDate: null,
      status: "serve-error",
      detail: `${title}'s getter threw unexpectedly: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  if (served.sourceStatus === "fallback") {
    return {
      indicator: title,
      source: served.source ?? "unknown",
      servedValue: served.value,
      servedDate: served.latestDate ?? null,
      servedSourceStatus: served.sourceStatus,
      liveDate: null,
      status: "pipeline-failure",
      detail: `Serving the static last-resort snapshot (captured ${served.snapshotDate ?? "unknown date"}) — both the primary and secondary source failed AND no persisted live snapshot exists in market_fallback_snapshots for "${key}". Needs manual investigation (API keys, upstream schema, network egress).`,
    };
  }

  let live: Kpi;
  try {
    live = await withRetryBackoff(() => getter(true));
  } catch (err) {
    return {
      indicator: title,
      source: served.source ?? "unknown",
      servedValue: served.value,
      servedDate: served.latestDate ?? null,
      servedSourceStatus: served.sourceStatus ?? "unknown",
      liveDate: null,
      status: "needs-review",
      detail: `Currently serving ${served.latestDate ?? "an unknown date"} (${served.sourceStatus}). A live re-check (with retries) failed: ${err instanceof Error ? err.message : String(err)}. The site is still serving graceful degraded data, but the upstream source could not be reached just now.`,
    };
  }

  const servedDate = served.latestDate ?? "";
  const liveDate = live.latestDate ?? "";

  if (servedDate >= liveDate) {
    const { reason, lastTradingDay } = closureLabel(marketType);
    if (reason && servedDate >= lastTradingDay) {
      return {
        indicator: title,
        source: served.source ?? "unknown",
        servedValue: served.value,
        servedDate: served.latestDate ?? null,
        servedSourceStatus: served.sourceStatus ?? "unknown",
        liveDate: live.latestDate ?? null,
        status: reason,
        detail: `Serving ${servedDate}, matching a genuinely live re-check — this market is closed today (${reason === "closed-weekend" ? "weekend" : "holiday"}); ${lastTradingDay} is the last trading day.`,
      };
    }
    return {
      indicator: title,
      source: served.source ?? "unknown",
      servedValue: served.value,
      servedDate: served.latestDate ?? null,
      servedSourceStatus: served.sourceStatus ?? "unknown",
      liveDate: live.latestDate ?? null,
      status: "fresh",
      detail: `Serving ${servedDate}, matching a genuinely live re-check of the same source (${live.source}).`,
    };
  }

  // Drift: a live, cache-bypassing re-check returned a newer date than what's
  // currently served. Self-heal first (the common, benign case — the cache
  // simply hasn't expired yet), then verify with the normal cached path.
  invalidateGlobalMarketCache(key);
  let selfHealDate: string | null = null;
  try {
    const reserved = await getter();
    selfHealDate = reserved.latestDate ?? null;
  } catch {
    // selfHealDate stays null — treated as still-drifted below.
  }

  if (selfHealDate && selfHealDate >= liveDate) {
    return {
      indicator: title,
      source: served.source ?? "unknown",
      servedValue: served.value,
      servedDate: served.latestDate ?? null,
      servedSourceStatus: served.sourceStatus ?? "unknown",
      liveDate: live.latestDate ?? null,
      status: "self-healed",
      detail: `Was serving ${servedDate}; a live re-check found ${liveDate} available. Cache tag invalidated — the next real page request now sees ${selfHealDate}.`,
    };
  }

  return {
    indicator: title,
    source: served.source ?? "unknown",
    servedValue: served.value,
    servedDate: served.latestDate ?? null,
    servedSourceStatus: served.sourceStatus ?? "unknown",
    liveDate: live.latestDate ?? null,
    status: "needs-review",
    detail: `A live re-check found ${liveDate} available upstream, but after invalidating the cache, this indicator still only serves ${selfHealDate ?? "an error"}. This source configuration cannot produce its own latest observation — likely a wrong/renamed series or a response-parsing bug. Needs manual review.`,
  };
}

const FX_PAIRS: { key: keyof FxRateKpis; title: string }[] = [
  { key: "usdPkr", title: "USD / PKR" },
  { key: "eurPkr", title: "EUR / PKR" },
  { key: "gbpPkr", title: "GBP / PKR" },
  { key: "sarPkr", title: "SAR / PKR" },
];

async function auditFxRates(): Promise<GlobalMarketFreshnessEntry[]> {
  let served: FxRateKpis;
  try {
    served = await getFxRates();
  } catch (err) {
    return FX_PAIRS.map(({ title }) => ({
      indicator: title,
      source: "unknown",
      servedValue: "",
      servedDate: null,
      servedSourceStatus: "error",
      liveDate: null,
      status: "serve-error" as const,
      detail: `getFxRates threw unexpectedly: ${err instanceof Error ? err.message : String(err)}`,
    }));
  }

  let live: FxRateKpis | null = null;
  let liveError: string | null = null;
  try {
    live = await withRetryBackoff(() => getFxRates(true));
  } catch (err) {
    liveError = err instanceof Error ? err.message : String(err);
  }

  if (!live) {
    return FX_PAIRS.map(({ key, title }) => {
      const kpi = served[key];
      return {
        indicator: title,
        source: kpi.source ?? "unknown",
        servedValue: kpi.value,
        servedDate: kpi.latestDate ?? null,
        servedSourceStatus: kpi.sourceStatus ?? "unknown",
        liveDate: null,
        status: "needs-review" as const,
        detail: `Currently serving ${kpi.latestDate ?? "an unknown date"} (${kpi.sourceStatus}). A live re-check (with retries) failed: ${liveError}.`,
      };
    });
  }

  const results: GlobalMarketFreshnessEntry[] = [];
  let anyDrifted = false;
  for (const { key, title } of FX_PAIRS) {
    const kpi = served[key];
    const liveKpi = live[key];
    const servedDate = kpi.latestDate ?? "";
    const liveDate = liveKpi.latestDate ?? "";
    if (servedDate >= liveDate) {
      results.push({
        indicator: title,
        source: kpi.source ?? "unknown",
        servedValue: kpi.value,
        servedDate: kpi.latestDate ?? null,
        servedSourceStatus: kpi.sourceStatus ?? "unknown",
        liveDate: liveKpi.latestDate ?? null,
        status: "fresh",
        detail: `Serving ${servedDate || "an unknown date"}, matching a genuinely live re-check of Yahoo Finance.`,
      });
    } else {
      anyDrifted = true;
      results.push({
        indicator: title,
        source: kpi.source ?? "unknown",
        servedValue: kpi.value,
        servedDate: kpi.latestDate ?? null,
        servedSourceStatus: kpi.sourceStatus ?? "unknown",
        liveDate: liveKpi.latestDate ?? null,
        status: "needs-review", // resolved below to self-healed if the shared tag invalidation fixes it
        detail: `A live re-check found ${liveDate} available upstream, ahead of the served ${servedDate || "unknown"} date.`,
      });
    }
  }

  if (!anyDrifted) return results;

  // FX pairs share one cache tag ("fx-rates") — invalidate once, re-serve once.
  invalidateFxRatesCache();
  let reservedAll: FxRateKpis | null = null;
  try {
    reservedAll = await getFxRates();
  } catch {
    // reservedAll stays null — every drifted entry below stays "needs-review".
  }

  return results.map((entry) => {
    if (entry.status !== "needs-review" || !reservedAll) return entry;
    const pair = FX_PAIRS.find((p) => p.title === entry.indicator);
    if (!pair) return entry;
    const resDate = reservedAll[pair.key].latestDate ?? null;
    if (resDate && entry.liveDate && resDate >= entry.liveDate) {
      return {
        ...entry,
        status: "self-healed" as const,
        detail: `${entry.detail} Cache tag "fx-rates" invalidated — the next real page request now sees ${resDate}.`,
      };
    }
    return entry;
  });
}

/**
 * Audits all 12 Global Markets indicators (8 via their own cached getters,
 * 4 FX cross-pairs via getFxRates()) against a genuinely live, cache-
 * bypassing re-check of the same source. Never throws — every per-indicator
 * failure is captured as its own entry so one bad symbol never prevents the
 * other 11 from being audited.
 */
export async function auditGlobalMarketsFreshness(): Promise<GlobalMarketFreshnessEntry[]> {
  const getterResults = await Promise.all(GETTER_INDICATORS.map(auditGetterIndicator));
  const fxResults = await auditFxRates();
  return [...getterResults, ...fxResults];
}
