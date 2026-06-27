import { unstable_cache } from "next/cache";
import { fetchYfQuote } from "@/lib/data/yfinance";
import { dedupeInFlight, getFresh, getStale, setCache } from "@/lib/memoryCache";
import type { Kpi } from "@/data/kpiData";

// Live interbank exchange rates — PKR cross-pairs.
//
// Source: Yahoo Finance (query1.finance.yahoo.com/v8/finance/chart), via the
// same fetchYfQuote() this dashboard already uses for gold/silver/oil/DXY/
// 10Y/PAK ETF (see src/lib/data/yfinance.ts) — no new dependency, no API
// key, same proven infra.
//
// MIGRATION HISTORY — second-stage source audit, 2026-06-22: the previous
// source (ExchangeRate-API, both v4 and v6) was verified to update only
// ONCE PER DAY despite "Live FX" branding (see fxRates.ts git history for
// the first-stage audit). This second audit directly compared live values
// against XE.com (timestamped mid-market quotes) and Wise (mid-market
// quotes) at the same moment:
//   - Yahoo Finance variance vs XE: 0.06%-0.21% (USD/EUR/GBP/SAR/PKR)
//   - Wise variance vs XE:          0.00%-0.11%
//   - ExchangeRate-API variance vs XE: 0.62%-1.07% (its snapshot was ~42h
//     old at the time of the test — the variance is staleness, not a
//     methodology difference)
// Yahoo's own USDPKR=X/EURPKR=X/GBPPKR=X/SARPKR=X quote timestamps were
// independently observed advancing every ~10-30 minutes during active
// trading hours (confirmed by polling, not assumed) — a different order of
// magnitude from once-daily. XE has no free API tier ($799+/yr); Wise's
// official API requires account+token signup; Open Exchange Rates' free
// tier is hourly and needs an app_id signup. Yahoo Finance was the only
// candidate that is simultaneously free, keyless, *and* genuinely
// intraday — and this dashboard already depends on it for commodities, so
// there's no new infrastructure risk.
//
// Direct quotes (USDPKR=X etc.) also avoid a small accuracy cost the old
// USD-base cross-rate computation had: EUR/PKR, GBP/PKR, SAR/PKR are each
// Yahoo's own direct market quote, not derived by dividing two separate
// USD legs.
//
// This is still distinct from the SBP monthly-average series shown in the
// historical trend chart (sbp.ts → usdPkr series) — that one is intentionally
// slower-moving and not meant to track same-day moves.
//
// ── Caching architecture (unchanged in shape from the first-stage audit,
// retuned in numbers now that the source is genuinely intraday) ───────────
// L1 — in-memory (memoryCache.ts): fast path + concurrent-call de-dupe
//      across the 5 routes that independently call this.
// L2 — unstable_cache (Next.js Data Cache): the durability layer, tagged
//      "fx-rates" for on-demand refresh. Kept short (15 min) — long enough
//      to avoid hammering an unofficial, keyless endpoint that's already
//      called for 7 commodity symbols, short enough that "near-real-time"
//      is actually true.
// L3 — daily Vercel Cron (src/app/api/revalidate-fx/route.ts + vercel.json)
//      — much less load-bearing now than under the once-daily source (L2's
//      15-min window already gets there on its own with normal traffic);
//      left in place as a free, harmless freshness floor for the lowest-
//      traffic overnight hours, not because it's doing the main work.

const YF_SYMBOLS = {
  usdPkr: "USDPKR=X",
  eurPkr: "EURPKR=X",
  gbpPkr: "GBPPKR=X",
  sarPkr: "SARPKR=X",
} as const;

const L1_CACHE_KEY = "fx-rates-yf";
const L1_TTL_MS = 3 * 60 * 1000; // 3 min fast path

// 15 min: matches the observed ~10-30 min real update cadence of these
// specific PKR cross quotes — short enough to be genuinely "near-real-time",
// long enough not to hammer an unofficial, keyless Yahoo endpoint already
// shared with 7 commodity symbols.
const L2_REVALIDATE_SECONDS = 15 * 60;

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"] as const;

export interface FxRateKpis {
  usdPkr: Kpi;
  eurPkr: Kpi;
  gbpPkr: Kpi;
  sarPkr: Kpi;
}

// Last-resort snapshot — used only when there is no cached real data at all
// (e.g. very first cold start after a deploy, with Yahoo Finance also down).
// Refreshed 2026-06-22 from a verified live quote; "(fallback)" in `source`
// matches this codebase's existing convention for flagging non-live data
// (see src/app/page.tsx's `isFallback` checks).
const FALLBACK_RATES: FxRateKpis = {
  usdPkr: {
    title: "USD / PKR",
    value: "277.93",
    unit: "PKR",
    change: "fallback snapshot — live rate unavailable",
    trend: "up",
    glow: "blue",
    source: "Yahoo Finance (fallback)",
    latestDate: "2026-06-22",
    frequency: "Hourly",
    marketType: "forex",
  },
  eurPkr: {
    title: "EUR / PKR",
    value: "317.79",
    unit: "PKR",
    change: "fallback snapshot — live rate unavailable",
    trend: "up",
    glow: "blue",
    source: "Yahoo Finance (fallback)",
    latestDate: "2026-06-22",
    frequency: "Hourly",
    marketType: "forex",
  },
  gbpPkr: {
    title: "GBP / PKR",
    value: "368.22",
    unit: "PKR",
    change: "fallback snapshot — live rate unavailable",
    trend: "up",
    glow: "purple",
    source: "Yahoo Finance (fallback)",
    latestDate: "2026-06-22",
    frequency: "Hourly",
    marketType: "forex",
  },
  sarPkr: {
    title: "SAR / PKR",
    value: "74.03",
    unit: "PKR",
    change: "fallback snapshot — live rate unavailable",
    trend: "up",
    glow: "purple",
    source: "Yahoo Finance (fallback)",
    latestDate: "2026-06-22",
    frequency: "Hourly",
    marketType: "forex",
  },
};

function makeKpi(
  title: string,
  amountPkr: number,
  updatedAtUnix: number,
  glow: Kpi["glow"],
): Kpi {
  const d = new Date(updatedAtUnix * 1000);
  const dateLabel = `${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
  return {
    title,
    value: amountPkr.toFixed(2),
    unit: "PKR",
    change: `interbank · ${dateLabel}`,
    trend: "up",
    glow,
    source: "Yahoo Finance",
    latestDate: d.toISOString().slice(0, 10),
    frequency: "Hourly",
    marketType: "forex",
  };
}

/** The actual upstream calls — no caching of their own; the L2 wrapper below owns the cache lifetime. */
async function fetchFromUpstream(): Promise<FxRateKpis> {
  const [usd, eur, gbp, sar] = await Promise.all([
    fetchYfQuote(YF_SYMBOLS.usdPkr),
    fetchYfQuote(YF_SYMBOLS.eurPkr),
    fetchYfQuote(YF_SYMBOLS.gbpPkr),
    fetchYfQuote(YF_SYMBOLS.sarPkr),
  ]);

  return {
    usdPkr: makeKpi("USD / PKR", usd.price, usd.updatedAt, "blue"),
    eurPkr: makeKpi("EUR / PKR", eur.price, eur.updatedAt, "blue"),
    gbpPkr: makeKpi("GBP / PKR", gbp.price, gbp.updatedAt, "purple"),
    sarPkr: makeKpi("SAR / PKR", sar.price, sar.updatedAt, "purple"),
  };
}

// L2 — see header note. Tag lets src/app/api/revalidate-fx/route.ts force a
// refresh on-demand via revalidateTag("fx-rates", "max").
const getFromL2 = unstable_cache(fetchFromUpstream, ["fx-rates-yf"], {
  revalidate: L2_REVALIDATE_SECONDS,
  tags: ["fx-rates"],
});

export async function getFxRates(): Promise<FxRateKpis> {
  // L1 fast path.
  const l1 = getFresh<FxRateKpis>(L1_CACHE_KEY, L1_TTL_MS);
  if (l1) return l1.data;

  // De-dupe concurrent callers (the 5 routes that use this can all miss L1
  // at once on a cold instance) so only one of them actually drives the L2 call.
  return dedupeInFlight(L1_CACHE_KEY, async () => {
    try {
      const result = await getFromL2();
      setCache(L1_CACHE_KEY, result);
      return result;
    } catch (err) {
      console.error(
        "[fxRates] upstream fetch failed:",
        err instanceof Error ? err.message : String(err),
      );
      const stale = getStale<FxRateKpis>(L1_CACHE_KEY);
      if (stale) {
        console.warn(`[fxRates] serving last-known-good rate, ${Math.round(stale.ageMs / 60_000)} min old`);
        return stale.data;
      }
      console.warn("[fxRates] no cached rate available at all — serving hardcoded fallback snapshot");
      return FALLBACK_RATES;
    }
  });
}
