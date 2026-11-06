// Download Datasets — the catalogue of exportable series.
//
// Derived from the indicator registries this project already maintains
// (getAllSbpIndicatorKeys() plus the handful of non-SBP history functions),
// NOT a second hand-written list of indicators. Adding an SBP series to
// CONFIGS in sbp.ts makes it downloadable here automatically; a test asserts
// that every SBP key is accounted for, so a new indicator cannot silently
// go missing from the catalogue.
//
// WHAT IS DELIBERATELY EXCLUDED
// A dataset is only listed when a real HISTORY function exists for it.
// Spot quotes and latest-value KPIs (gold, silver, WTI, Brent, natural gas,
// DXY, the live FX cross-rates, the Pakistan ETF proxy) expose a single
// current observation and no series, so exporting them would produce a
// one-row "time series" that misrepresents what the source provides. Those
// are listed in EXCLUDED_DATASETS with the reason, and the page shows them
// rather than quietly omitting them.

import { getAllSbpIndicatorKeys } from "@/lib/data/sbp";
import { DATASET_CATEGORIES, type DatasetCategory } from "./datasetCategories";

// Re-exported so existing importers keep one import site for the catalogue.
export { DATASET_CATEGORIES };
export type { DatasetCategory };

/** How a period is written down, so the exporter never reformats a fiscal label into a calendar date. */
export type PeriodKind =
  /** A specific observation date, "YYYY-MM-DD". */
  | "date"
  /** A calendar year, "2025". */
  | "year"
  /** A fiscal year ending 30 June, carried as its own label (e.g. FY2025). */
  | "fiscalYear";

export interface DatasetDefinition {
  /** URL-safe id, used as the download route parameter and the filename stem. */
  id: string;
  name: string;
  category: DatasetCategory;
  /** Which loader produces this series. */
  kind: "sbp" | "spi" | "worldbank-gdp" | "fred";
  /** Loader argument: the SBP key, the World Bank country, or the FRED series id. */
  sourceKey: string;
  periodKind: PeriodKind;
  /** One-line description of what a reader is downloading. */
  description: string;
  /**
   * Publication context a reader needs BEFORE downloading, where the
   * source itself imposes a limit that could otherwise be mistaken for a
   * failed fetch or for an economic signal.
   *
   * Only set where the limitation is evidenced by this repository's own
   * source implementation — never a guess about a provider's schedule.
   */
  coverageNote?: string;
  /** Indicator page carrying fuller context for this series, where one exists. */
  contextHref?: string;
}

/** SBP series that are annual fiscal-year observations stamped at their 30 June year-end. */
const SBP_FISCAL_YEAR_KEYS: ReadonlySet<string> = new Set(["fiscalBalance"]);

/**
 * Publication context for SBP series, keyed by indicator. Same rule as
 * DatasetDefinition.coverageNote: only what this repository's own
 * configuration evidences.
 */
const SBP_COVERAGE_NOTES: Record<string, string> = {
  // Grounded in seriesRegistry.ts: SBP EasyData "exposes only Observation
  // Date/Value/Unit/Series Name — no release date", so expectsReleaseDate
  // is false for every SBP series and PEIC holds NO verified publication
  // date for this one. The annual grace is 450 days, described there as
  // ">1 full cycle + a generous buffer" — a tolerance, not a schedule. A
  // "Stale" badge therefore means the latest observation has passed that
  // window; it is not by itself evidence that the provider failed, and it
  // says nothing about whether the figure is correct.
  fiscalBalance:
    "An annual fiscal-year series (July–June), not a monthly or weekly one: a new observation is expected only once per year. PEIC has no verified SBP publication date for it — SBP EasyData reports no release date — so freshness is judged against a generous annual tolerance. A “Stale” label means the latest observation has passed that window, not that the provider has failed or that the figure is wrong.",
};

const SBP_META: Record<string, { name: string; category: DatasetCategory; description: string }> = {
  foreignReserves: { name: "Foreign Exchange Reserves (SBP)", category: "External sector", description: "Total SBP reserves, monthly." },
  netBankReserves: { name: "Commercial Bank Reserves", category: "External sector", description: "Net reserves held by commercial banks, monthly." },
  usdPkr: { name: "USD/PKR Exchange Rate", category: "External sector", description: "SBP monthly average interbank rate." },
  policyRate: { name: "SBP Policy Rate", category: "Money & rates", description: "Policy rate decisions, published when the rate changes." },
  cpiInflation: { name: "CPI Inflation", category: "Prices", description: "Headline consumer price inflation, year-on-year." },
  coreInflation: { name: "Core Inflation (NFNE)", category: "Prices", description: "Non-food non-energy inflation, year-on-year." },
  wpiInflation: { name: "Wholesale Price Inflation (WPI)", category: "Prices", description: "Wholesale price inflation, year-on-year." },
  tbillYield3m: { name: "3-Month T-Bill Yield", category: "Money & rates", description: "Cut-off yield at each T-bill auction." },
  pibYield3y: { name: "3-Year PIB Yield", category: "Money & rates", description: "Cut-off yield at each PIB auction." },
  remittances: { name: "Worker Remittances", category: "External sector", description: "Monthly inflows from overseas Pakistanis." },
  currentAccount: { name: "Current Account Balance", category: "External sector", description: "Monthly current account balance." },
  tradeBalance: { name: "Trade Balance", category: "External sector", description: "Monthly goods trade balance." },
  moneySupplyM2: { name: "Money Supply (M2)", category: "Money & rates", description: "Broad money stock, weekly." },
  exports: { name: "Exports", category: "External sector", description: "Monthly goods exports." },
  imports: { name: "Imports", category: "External sector", description: "Monthly goods imports." },
  fdiInflows: { name: "Foreign Direct Investment", category: "External sector", description: "Net FDI inflows, monthly." },
  reer: { name: "Real Effective Exchange Rate (REER)", category: "External sector", description: "Trade-weighted real exchange rate index." },
  lsm: { name: "Large-Scale Manufacturing (LSM)", category: "Real economy", description: "LSM output index, monthly." },
  privateCreditGrowth: { name: "Private Sector Credit Growth", category: "Money & rates", description: "Credit to the private sector, weekly." },
  fiscalBalance: { name: "Fiscal Balance", category: "Fiscal", description: "Consolidated fiscal balance, annual fiscal year (July–June)." },
};

function sbpDatasets(): DatasetDefinition[] {
  return getAllSbpIndicatorKeys().map((key) => {
    const meta = SBP_META[key];
    if (!meta) {
      // A new SBP series was added to CONFIGS without a catalogue entry.
      // Fail loudly in tests rather than shipping an unlabelled download.
      throw new Error(`datasetRegistry: SBP indicator "${key}" has no catalogue entry — add it to SBP_META`);
    }
    return {
      id: `sbp-${key.replace(/([A-Z])/g, "-$1").toLowerCase()}`,
      name: meta.name,
      category: meta.category,
      kind: "sbp" as const,
      sourceKey: key,
      periodKind: SBP_FISCAL_YEAR_KEYS.has(key) ? ("fiscalYear" as const) : ("date" as const),
      description: meta.description,
      coverageNote: SBP_COVERAGE_NOTES[key],
    };
  });
}

export const DATASETS: DatasetDefinition[] = [
  ...sbpDatasets(),
  {
    id: "pbs-spi-weekly",
    name: "Weekly Inflation (SPI)",
    category: "Prices",
    kind: "spi",
    sourceKey: "spi",
    periodKind: "date",
    description: "Sensitive Price Indicator — index level plus week-on-week and year-on-year change.",
    // Grounded in spi.ts: parseCombinedSpiTable() reads every row of the
    // "Page 1" table in the CURRENT week's PBS report and stops at the
    // first non-data row — it never truncates to a fixed number. The
    // history is therefore exactly what that one report embeds, and PBS
    // publishes no separate multi-year archive file. Deliberately phrased
    // without a fixed week count: the observation count shown beside this
    // note is the live figure, and the span can change between reports.
    coverageNote:
      "PBS publishes each SPI report with only a short run of recent weeks embedded, and offers no separate multi-year archive file. This download therefore covers just the weeks in the current report — a limit of the published source, not a failed fetch. The observation count and date range shown are the live figures.",
    contextHref: "/weekly-inflation-pakistan",
  },
  {
    id: "worldbank-gdp-growth-pak",
    name: "Real GDP Growth — Pakistan",
    category: "Real economy",
    kind: "worldbank-gdp",
    sourceKey: "PAK",
    periodKind: "year",
    description: "Annual real GDP growth.",
  },
  {
    id: "worldbank-gdp-growth-ind",
    name: "Real GDP Growth — India",
    category: "Global",
    kind: "worldbank-gdp",
    sourceKey: "IND",
    periodKind: "year",
    description: "Annual real GDP growth, for peer comparison.",
  },
  {
    id: "worldbank-gdp-growth-bgd",
    name: "Real GDP Growth — Bangladesh",
    category: "Global",
    kind: "worldbank-gdp",
    sourceKey: "BGD",
    periodKind: "year",
    description: "Annual real GDP growth, for peer comparison.",
  },
  { id: "fred-fed-funds", name: "US Fed Funds Rate", category: "Global", kind: "fred", sourceKey: "fedFunds", periodKind: "date", description: "US federal funds effective rate, monthly." },
  { id: "fred-us-10y", name: "US 10-Year Treasury Yield", category: "Global", kind: "fred", sourceKey: "us10y", periodKind: "date", description: "US 10-year Treasury constant-maturity yield, monthly." },
  { id: "fred-us-cpi", name: "US CPI Inflation", category: "Global", kind: "fred", sourceKey: "usCpi", periodKind: "date", description: "US consumer price inflation, year-on-year, monthly." },
];

export interface ExcludedDataset {
  name: string;
  reason: string;
}

/**
 * Series PEIC displays but cannot export as a time series, with the reason.
 * Shown on the page so a reader can see what is missing and why, instead of
 * wondering whether the catalogue is simply incomplete.
 */
export const EXCLUDED_DATASETS: ExcludedDataset[] = [
  { name: "Gold, silver, WTI, Brent, natural gas, US Dollar Index", reason: "The market data provider supplies only the latest quote to this project — there is no stored history to export." },
  { name: "Live FX cross-rates (EUR/PKR, GBP/PKR, SAR/PKR)", reason: "Intraday spot quotes with no historical series held by PEIC. The SBP monthly USD/PKR average is available above." },
  { name: "KSE-100 proxy (Pakistan ETF)", reason: "Latest quote only. Real KSE-100 index history requires a commercial PSX licence." },
  { name: "Net liquid reserves (weekly Forex_Arch series)", reason: "Held as a short rolling trend rather than a full archive; the monthly SBP reserves series above covers the same measure with full history." },
];

export function getDataset(id: string): DatasetDefinition | undefined {
  return DATASETS.find((d) => d.id === id);
}
