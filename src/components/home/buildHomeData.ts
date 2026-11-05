// Builds the homepage's row/tile view-models from data the /overview page
// has ALREADY fetched (PEIC redesign Phase 3).
//
// Pure functions, no I/O: every input is passed in by the page, so the
// homepage redesign adds zero requests. Nothing here computes an economic
// value — it only selects, formats and labels figures the data layer
// produced, and carries each one's own observation date, source and
// freshness verdict through to the UI.

import type { Kpi } from "@/data/kpiData";
import type { SbpIndicatorKey, SbpIndicatorResult } from "@/lib/data/sbp";
import { formatLatestDate } from "@/lib/dataFreshness";
import { formatFiscalYearLabel } from "@/lib/formatMonthLabel";
import { FRESHNESS_STATE_LABEL } from "@/lib/freshness/readModel";
import { KPI_SEO_SLUG } from "@/lib/seoConfig";
import type { IndicatorRow } from "./indicatorRows";
import { toNumericValue } from "./indicatorRows";
import type { SnapshotTile } from "./PakistanSnapshot";

/** The indicator detail page for a KPI title, via the existing registry. */
export function slugForKpi(title: string): string | null {
  return KPI_SEO_SLUG[title] ?? null;
}

type SbpMap = Record<SbpIndicatorKey, SbpIndicatorResult>;

/**
 * The snapshot tiles, in the priority order the brief specifies. An entry
 * whose indicator is missing upstream is skipped rather than rendered with a
 * substituted value; a merely STALE indicator is kept, badged with its own
 * freshness state, because hiding it would be less honest than showing it
 * with its real date.
 */
export function buildSnapshotTiles(args: {
  sbp: SbpMap;
  netLiquidReserves: SbpIndicatorResult;
  /** Live spot USD/PKR (fxRates) — preferred over SBP's monthly average for the headline rate. */
  usdPkrLive: Kpi;
}): SnapshotTile[] {
  const { sbp, netLiquidReserves, usdPkrLive } = args;

  const fromSbp = (key: SbpIndicatorKey, label: string): SnapshotTile | null => {
    const entry = sbp[key];
    if (!entry) return null;
    const slug = slugForKpi(entry.kpi.title);
    if (!slug) return null;
    return {
      label,
      kpi: entry.kpi,
      href: `/${slug}`,
      freshness: { severity: entry.meta.freshness.severity, label: FRESHNESS_STATE_LABEL[entry.meta.freshness.state] },
    };
  };

  const reservesSlug = slugForKpi(netLiquidReserves.kpi.title);
  const usdPkrSlug = slugForKpi("USD / PKR");

  const tiles: (SnapshotTile | null)[] = [
    fromSbp("cpiInflation", "CPI inflation (YoY)"),
    fromSbp("coreInflation", "Core inflation (NFNE)"),
    fromSbp("policyRate", "SBP policy rate"),
    reservesSlug
      ? {
          label: "Foreign reserves (SBP)",
          kpi: netLiquidReserves.kpi,
          href: `/${reservesSlug}`,
          freshness: {
            severity: netLiquidReserves.meta.freshness.severity,
            label: FRESHNESS_STATE_LABEL[netLiquidReserves.meta.freshness.state],
          },
        }
      : null,
    // The live spot quote, not SBP's monthly average — this tile is the
    // "what is the rupee right now" figure, and it carries its own quote
    // date via SourceStamp.
    usdPkrSlug ? { label: "USD/PKR", kpi: usdPkrLive, href: `/${usdPkrSlug}` } : null,
    fromSbp("currentAccount", "Current account"),
    fromSbp("remittances", "Remittances"),
    fromSbp("fiscalBalance", "Fiscal balance"),
  ];

  return tiles.filter((t): t is SnapshotTile => t !== null);
}

/** Thematic groups for the indicators table, in display order. */
const INDICATOR_GROUPS: { group: string; keys: SbpIndicatorKey[] }[] = [
  { group: "Prices", keys: ["cpiInflation", "coreInflation", "wpiInflation"] },
  { group: "Money & rates", keys: ["policyRate", "tbillYield3m", "pibYield3y", "moneySupplyM2", "privateCreditGrowth", "netBankReserves"] },
  { group: "External sector", keys: ["foreignReserves", "usdPkr", "reer", "currentAccount", "tradeBalance", "exports", "imports", "remittances", "fdiInflows"] },
  { group: "Fiscal", keys: ["fiscalBalance"] },
  { group: "Real economy", keys: ["lsm"] },
];

/**
 * One row per SBP indicator that has a detail page to link to, grouped by
 * theme. Rows carry the indicator's own unit, observation period, source and
 * freshness state — never a derived or filled-in value.
 */
export function buildIndicatorRows(sbp: SbpMap): IndicatorRow[] {
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
      rows.push({
        id: key,
        slug,
        name: entry.kpi.title,
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
        period: observationDate
          ? entry.meta.frequency === "Annual"
            ? formatFiscalYearLabel(observationDate)
            : formatLatestDate(observationDate, entry.kpi.frequency)
          : "—",
        observationDate,
        source: entry.meta.source,
        freshnessLabel: FRESHNESS_STATE_LABEL[entry.meta.freshness.state],
        freshnessSeverity: entry.meta.freshness.severity,
      });
    }
  }

  return rows;
}
