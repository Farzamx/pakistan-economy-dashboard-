// Builds the homepage's row/tile view-models from data the /overview page
// has ALREADY fetched (PEIC redesign Phase 3).
//
// Pure functions, no I/O: every input is passed in by the page, so the
// homepage redesign adds zero requests. Nothing here computes an economic
// value — it only selects, formats and labels figures the data layer
// produced, and carries each one's own observation date, source and
// freshness verdict through to the UI.

import type { SbpIndicatorKey, SbpIndicatorResult } from "@/lib/data/sbp";
import { FRESHNESS_STATE_LABEL } from "@/lib/freshness/readModel";
import { cleanSourceName, formatDayMonth, formatObservation } from "./overviewFormat";
import { statusFor } from "./valueDisplay";
import { KPI_SEO_SLUG } from "@/lib/seoConfig";
import type { IndicatorRow } from "./indicatorRows";
import { toNumericValue } from "./indicatorRows";

/** The indicator detail page for a KPI title, via the existing registry. */
export function slugForKpi(title: string): string | null {
  return KPI_SEO_SLUG[title] ?? null;
}

type SbpMap = Record<SbpIndicatorKey, SbpIndicatorResult>;

/** Thematic groups for the indicators table, in display order. */
const INDICATOR_GROUPS: { group: string; keys: SbpIndicatorKey[] }[] = [
  { group: "Prices", keys: ["cpiInflation", "coreInflation", "wpiInflation"] },
  { group: "Money & rates", keys: ["policyRate", "tbillYield3m", "pibYield3y", "moneySupplyM2", "privateCreditGrowth", "netBankReserves"] },
  { group: "External sector", keys: ["foreignReserves", "usdPkr", "reer", "currentAccount", "tradeBalance", "exports", "imports", "remittances", "fdiInflows"] },
  { group: "Fiscal", keys: ["fiscalBalance"] },
  { group: "Real economy", keys: ["lsm"] },
];

/**
 * The Economic Calendar series that publishes each indicator. Used only to show "next release" and "due today";
 * an indicator with no entry has no scheduled release on the calendar.
 */
export const INDICATOR_CALENDAR_SERIES: Partial<Record<SbpIndicatorKey, string>> = {
  cpiInflation: "cpi-inflation-release",
  coreInflation: "core-inflation-release",
  policyRate: "sbp-monetary-policy-committee-meeting",
  tbillYield3m: "treasury-bill-auction-3m",
  pibYield3y: "pib-auction",
  foreignReserves: "sbp-foreign-exchange-reserves",
  currentAccount: "current-account-balance",
  tradeBalance: "trade-balance",
  exports: "exports-release",
  imports: "imports-release",
  remittances: "worker-remittances",
  lsm: "large-scale-manufacturing-lsm-growth",
};

/**
 * The table's USD/PKR is SBP's MONTHLY AVERAGE, a different series from the market quote in the key-figure tile.
 * Naming it stops the two values reading as a contradiction.
 */
const NAME_OVERRIDE: Partial<Record<SbpIndicatorKey, string>> = { usdPkr: "USD/PKR, SBP monthly average" };

/**
 * One row per SBP indicator that has a detail page to link to, grouped by
 * theme. Rows carry the indicator's own unit, observation period, source and
 * freshness state — never a derived or filled-in value.
 */
export function buildIndicatorRows(sbp: SbpMap, calendar?: { todayIso: string; nextBySeries: ReadonlyMap<string, string> }): IndicatorRow[] {
  const rows: IndicatorRow[] = [];
  const seen = new Set<string>();

  for (const { group, keys } of INDICATOR_GROUPS) {
    for (const key of keys) {
      const entry = sbp[key];
      if (!entry) continue;
      const slug = slugForKpi(entry.kpi.title);
      // Two indicators (3M T-Bill, 3Y PIB) share the bond-yields page; both
      // are listed, keyed by their own series key so rows stay unique.
      if (!slug || seen.has(key)) continue;
      seen.add(key);

      const observationDate = entry.meta.observationDate || entry.kpi.latestDate || null;
      const seriesSlug = INDICATOR_CALENDAR_SERIES[key];
      const nextDate = seriesSlug && calendar ? (calendar.nextBySeries.get(seriesSlug) ?? null) : null;
      const dueToday = calendar !== undefined && nextDate === calendar.todayIso;
      rows.push({
        id: key,
        slug,
        name: NAME_OVERRIDE[key] ?? entry.kpi.title,
        nextRelease: nextDate ? (dueToday ? "Today" : formatDayMonth(nextDate)) : null,
        status: statusFor(entry.meta.freshness.state, dueToday),
        group,
        value: entry.kpi.value,
        unit: entry.kpi.unit,
        numericValue: toNumericValue(entry.kpi.value),
        // "No prior period"-style strings carry no delta; they are shown as
        // "—" rather than as a change of zero.
        change: entry.kpi.change && /\d/.test(entry.kpi.change) ? entry.kpi.change : null,
        // An annual series is a fiscal YEAR, not the month its end-date
        // falls in — formatLatestDate would render "2025" for a series whose
        // own page calls it FY2025 (Phase 4C).
        period: formatObservation(observationDate, entry.meta.frequency),
        observationDate,
        source: cleanSourceName(entry.meta.source),
        freshnessLabel: FRESHNESS_STATE_LABEL[entry.meta.freshness.state],
        freshnessSeverity: entry.meta.freshness.severity,
      });
    }
  }

  return rows;
}
