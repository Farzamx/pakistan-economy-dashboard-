// Yahoo Finance Gold Monthly provider adapter — Phase 8.17 pilot.
//
// Implements the Phase 8.1 ProviderAdapter contract for EXACTLY one series:
// yahoo:goldMonthly, the completed-monthly-close representation of GC=F
// (COMEX gold futures, continuous front-month). This adapter is STANDALONE
// and NOT WIRED INTO PRODUCTION until Section 13's explicit, conditional
// cutover: nothing imports it except its own tests, scripts/ingestYahooGold.ts,
// and (after reconciliation passes) comparisonData.ts's DB-first dispatch for
// "yfinance:gold". It does not modify src/lib/data/yfinance.ts, which
// continues serving every existing consumer (KPI cards, Market FX, WTI/
// Brent/Natural Gas/US10Y/PAK ETF, the legacy gold comparisons history)
// completely unchanged.
//
// Pilot scope: EXACTLY gold. Silver (SI=F), DXY (DX-Y.NYB), Market FX, and
// every other Yahoo-backed instrument are explicitly out of scope — see the
// Phase 8.15 audit and Phase 8.16 design confirmation for why gold alone is
// the safe first slice.
//
// --- Reuses, never duplicates, the existing Yahoo transport ---
// fetchYfHistory() (yfinance.ts) is called unmodified. This adapter owns
// only what happens to ITS OUTPUT: trailing-bar exclusion, period-end
// normalization, and NormalizedObservation construction. No new HTTP
// client, no new Yahoo endpoint, no second transport.
//
// --- Trailing-bar exclusion rule (Phase 8.16 Decision 1, binding) ---
// A bar is a candidate completed observation if and only if its own UTC
// month (derived from fetchYfHistory's already-UTC-converted `date` field)
// is strictly earlier than the CURRENT UTC month, computed fresh at fetch
// time. This is evaluated PER BAR BY VALUE, never by array position — it is
// therefore inherently robust to reordering, to more than one current-month
// row appearing, and to no current-month row appearing at all (the filter
// is simply a no-op in that case). Empirically verified live (Phase 8.15):
// every genuinely settled monthly bar's date is the 1st of its month; the
// current, still-open month's trailing bar carries today's actual trade
// date instead — the two are always distinguishable by month-key alone.
//
// --- Period-end normalization (Phase 8.16 Decision, section 3) ---
// fetchYfHistory() converts Yahoo's raw Unix timestamp to a UTC
// "YYYY-MM-DD" string already (yfinance.ts's own existing logic, untouched
// here). For a settled monthly bar this date is always day 1 of its month
// (verified live, Phase 8.15) — this adapter converts it to that month's
// actual LAST calendar day before it becomes observationPeriod, matching
// the ProviderAdapter contract's period-END convention and mirroring
// fredAdapter.ts's/worldBankAdapter.ts's own identical-shaped conversions.
// The conversion is a pure calendar computation from the bar's own date —
// never derived from "now".
//
// --- Malformed date handling ---
// If fetchYfHistory() ever returned a bar whose `date` field is not a
// well-formed "YYYY-MM-DD" string, this adapter throws rather than passing
// it through or guessing its period — the same "throw on unrecognized date"
// precedent already established by worldBankAdapter.ts/fredAdapter.ts. A
// thrown error here is isolated at the per-series level by
// ingestionOrchestrator.ts, exactly as for every other adapter.
//
// --- Provenance decisions (documented, not invented) ---
// releaseDate: always null. Yahoo's chart endpoint exposes no release-date
// concept for a market bar.
// sourceUpdatedAt: always null. The historical-bars array exposes no
// per-bar "last updated"/"revised at" field (confirmed live, Phase 8.15) —
// only timestamp + close.
// qualityStatus: always "official" — reasoned choice (Phase 8.16 Section F):
// reuses the single free-text word already used by SBP/World Bank/FRED for
// a genuine primary-source value; COMEX's own settlement/close print is a
// real exchange print, not a derived estimate.
// sourceReference: { endpoint, symbol, interval, range } — the keyless
// public endpoint's own request shape, no credential of any kind exists to
// redact (Yahoo's v8/finance/chart endpoint requires no API key).
//
// --- Value semantics ---
// Raw `close` only, full precision, never adjclose (futures have no
// dividend/split adjustment concept) and never rounded/truncated.

import type { NormalizedObservation, ProviderAdapter } from "./providerAdapter";
import { fetchYfHistory } from "@/lib/data/yfinance";

export const GOLD_SYMBOL = "GC=F";
export const YAHOO_GOLD_INDICATOR_KEY = "yahoo:goldMonthly";
const YF_CHART_ENDPOINT = "https://query1.finance.yahoo.com/v8/finance/chart";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** "YYYY-MM" for the current UTC month, computed fresh at call time — never cached, never derived from a bar's own date. */
export function currentUtcMonth(now: Date = new Date()): string {
  return now.toISOString().slice(0, 7);
}

function monthKeyOf(dateStr: string): string {
  return dateStr.slice(0, 7);
}

/**
 * "YYYY-MM-01" (or any day) -> "YYYY-MM-<lastDay>". A pure calendar
 * computation from the bar's own date -- never uses "now". Mirrors
 * fredAdapter.ts's monthStartToMonthEnd() exactly (same conversion, same
 * reasoning, independently duplicated here rather than imported since the
 * two adapters have no other coupling and importing across provider
 * adapters would be an unwarranted dependency for one shared helper).
 */
export function monthStartToMonthEnd(dateStr: string): string {
  const [year, month] = dateStr.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
}

export function buildYahooGoldSourceReference(): Record<string, unknown> {
  return { endpoint: YF_CHART_ENDPOINT, symbol: GOLD_SYMBOL, interval: "1mo", range: "10y" };
}

/**
 * Fetches GC=F's monthly history via the existing, unmodified
 * fetchYfHistory() transport, excludes the current in-progress month
 * (Phase 8.16 Decision 1), and normalizes the remainder into the Phase 8.1
 * NormalizedObservation contract. Never retries (see
 * ingestionOrchestrator.ts — retries are the orchestrator's
 * responsibility); throws on any transport failure (propagated from
 * fetchYfHistory unmodified) or malformed bar date.
 */
export async function fetchYahooGoldSeries(now: Date = new Date()): Promise<NormalizedObservation[]> {
  const bars = await fetchYfHistory(GOLD_SYMBOL, "10y", "1mo");
  const currentMonth = currentUtcMonth(now);
  const sourceReference = buildYahooGoldSourceReference();

  const completedBars = bars.filter((bar) => {
    if (!ISO_DATE_RE.test(bar.date)) {
      throw new Error(`yahooGoldAdapter: Yahoo returned an unrecognized date "${bar.date}" for ${GOLD_SYMBOL} — expected "YYYY-MM-DD"`);
    }
    return monthKeyOf(bar.date) !== currentMonth; // trailing-bar exclusion — evaluated per bar, never by array position
  });

  return completedBars.map((bar) => ({
    indicatorKey: YAHOO_GOLD_INDICATOR_KEY,
    observationPeriod: monthStartToMonthEnd(bar.date),
    value: bar.close,
    unit: "$/oz",
    cadence: "monthly",
    provider: "yahoo-finance",
    sourceSeriesId: GOLD_SYMBOL,
    qualityStatus: "official",
    releaseDate: null,
    sourceUpdatedAt: null,
    sourceReference,
    methodology: null,
  }));
}

export const yahooGoldAdapter: ProviderAdapter = {
  providerId: "yahoo-finance",
  async fetchObservations({ indicatorKey }) {
    if (indicatorKey !== YAHOO_GOLD_INDICATOR_KEY) {
      throw new Error(`yahooGoldAdapter: no series configuration for indicatorKey "${indicatorKey}" — pilot scope is limited to ${YAHOO_GOLD_INDICATOR_KEY}`);
    }
    return fetchYahooGoldSeries();
  },
};
