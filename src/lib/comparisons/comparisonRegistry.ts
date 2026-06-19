// Single source of truth for the Comparisons feature: every comparison's
// metadata (slug, title, which two series it pairs, group, SEO copy) lives
// here, used by both the /comparisons workspace and the /comparisons/[slug]
// SEO subpages. Adding a new comparison means adding one entry here plus a
// case in comparisonData.ts's series dispatcher — nothing else.
//
// Only comparisons backed by a real, verified data source are listed here.
// See COMING_SOON_COMPARISONS below for the ones blocked by the lack of a
// KSE-100 (PSX) data feed in this project — those are deliberately NOT given
// SEO subpages, since there's no real content to index yet.

export type ComparisonGroupId =
  | "external-sector"
  | "monetary-conditions"
  | "international"
  | "asset-allocation"
  | "economic-structure";

export interface ComparisonGroup {
  id: ComparisonGroupId;
  label: string;
  description: string;
}

export const COMPARISON_GROUPS: ComparisonGroup[] = [
  {
    id: "external-sector",
    label: "External Sector",
    description: "How Pakistan's trade, reserves, and currency move together.",
  },
  {
    id: "monetary-conditions",
    label: "Monetary Conditions",
    description: "Inflation against the policy tools meant to control it.",
  },
  {
    id: "international",
    label: "International Comparisons",
    description: "Pakistan's inflation, rates, and growth against the US, India, and Bangladesh.",
  },
  {
    id: "asset-allocation",
    label: "Investor Asset Allocation",
    description: "Gold, the Rupee, and government securities as alternative places to hold money.",
  },
  {
    id: "economic-structure",
    label: "Economic Structure",
    description: "How the composition of Pakistan's GDP has shifted across sectors over time.",
  },
];

// Every underlying series this feature can chart, normalized to one shape by
// comparisonData.ts regardless of its original source (SBP EasyData, World
// Bank, FRED, or Yahoo Finance).
export type SeriesProviderId =
  | "sbp:usdPkr"
  | "sbp:foreignReserves"
  | "sbp:currentAccount"
  | "sbp:exports"
  | "sbp:imports"
  | "sbp:tradeBalance"
  | "sbp:policyRate"
  | "sbp:cpiInflation"
  | "sbp:coreInflation"
  | "sbp:moneySupplyM2"
  | "sbp:tbillYield3m"
  | "worldbank:gdpGrowthPak"
  | "worldbank:gdpGrowthIndia"
  | "worldbank:gdpGrowthBangladesh"
  | "fred:fedFunds"
  | "fred:usCpiInflation"
  | "yfinance:gold";

export interface ComparisonSeriesConfig {
  id: SeriesProviderId;
  label: string;
  shortLabel: string;
  unit: string;
  /** Hex color for this series' line/area — matches the dashboard's neon palette. */
  color: string;
}

export interface ComparisonDef {
  slug: string;
  title: string;
  shortTitle: string;
  group: ComparisonGroupId;
  seriesA: ComparisonSeriesConfig;
  seriesB: ComparisonSeriesConfig;
  /** 1-2 sentence explanation of what the comparison shows, used on cards and SEO pages. */
  description: string;
  whyItMatters: string;
  faq: { question: string; answer: string }[];
}

const NEON_BLUE = "#38bdf8";
const NEON_PURPLE = "#a855f7";
const AMBER = "#f59e0b";
const EMERALD = "#34d399";

export const COMPARISONS: ComparisonDef[] = [
  {
    slug: "usd-pkr-vs-forex-reserves",
    title: "USD/PKR Exchange Rate vs Foreign Exchange Reserves",
    shortTitle: "USD/PKR vs Forex Reserves",
    group: "external-sector",
    seriesA: { id: "sbp:usdPkr", label: "USD / PKR", shortLabel: "USD/PKR", unit: "PKR", color: NEON_BLUE },
    seriesB: { id: "sbp:foreignReserves", label: "Foreign Exchange Reserves", shortLabel: "Reserves", unit: "B USD", color: NEON_PURPLE },
    description: "Tracks the Rupee's exchange rate against the US Dollar alongside the State Bank's total foreign exchange reserves.",
    whyItMatters: "Reserves are the buffer that lets SBP defend the Rupee during external pressure — when reserves fall, the Rupee has historically come under more depreciation pressure, and vice versa when reserves are rebuilt.",
    faq: [
      { question: "Does a falling Rupee always mean reserves are falling?", answer: "Not always — exchange rate moves can also reflect interest rate differentials, market sentiment, and import demand. But sustained Rupee depreciation alongside falling reserves is historically a sign of external account stress." },
    ],
  },
  {
    slug: "current-account-vs-forex-reserves",
    title: "Current Account Balance vs Foreign Exchange Reserves",
    shortTitle: "Current Account vs Forex Reserves",
    group: "external-sector",
    seriesA: { id: "sbp:currentAccount", label: "Current Account Balance", shortLabel: "Current Account", unit: "B USD", color: NEON_PURPLE },
    seriesB: { id: "sbp:foreignReserves", label: "Foreign Exchange Reserves", shortLabel: "Reserves", unit: "B USD", color: NEON_BLUE },
    description: "Compares Pakistan's monthly current account balance (money flowing in vs out internationally) with the level of foreign exchange reserves it leaves behind.",
    whyItMatters: "A persistent current account deficit drains reserves over time unless offset by financial inflows (loans, FDI, remittances) — this comparison shows how directly the two have moved together historically.",
    faq: [
      { question: "Why would reserves rise even during a current account deficit?", answer: "Reserves reflect ALL foreign currency flows, not just the current account — external borrowing, IMF disbursements, and bilateral deposits can offset a current account deficit and keep reserves stable or rising." },
    ],
  },
  {
    slug: "exports-vs-imports",
    title: "Pakistan Exports vs Imports",
    shortTitle: "Exports vs Imports",
    group: "external-sector",
    seriesA: { id: "sbp:exports", label: "Exports (Goods, FOB)", shortLabel: "Exports", unit: "B USD", color: EMERALD },
    seriesB: { id: "sbp:imports", label: "Imports (Goods, FOB)", shortLabel: "Imports", unit: "B USD", color: AMBER },
    description: "Pakistan's monthly goods exports against goods imports — the two halves of the trade balance.",
    whyItMatters: "The gap between these two lines is the trade balance. A narrow textile-dominated export base means exports have historically grown more slowly than an import bill driven by energy and machinery needs.",
    faq: [
      { question: "Why does Pakistan usually import more than it exports?", answer: "Pakistan's export base is concentrated in textiles, while imports span energy, machinery, and raw materials for industry — a structural mismatch that has persisted for decades." },
    ],
  },
  {
    slug: "trade-balance-vs-usd-pkr",
    title: "Trade Balance vs USD/PKR Exchange Rate",
    shortTitle: "Trade Balance vs USD/PKR",
    group: "external-sector",
    seriesA: { id: "sbp:tradeBalance", label: "Trade Balance", shortLabel: "Trade Balance", unit: "B USD", color: AMBER },
    seriesB: { id: "sbp:usdPkr", label: "USD / PKR", shortLabel: "USD/PKR", unit: "PKR", color: NEON_BLUE },
    description: "Pakistan's monthly trade balance (exports minus imports) against the Rupee's exchange rate.",
    whyItMatters: "A widening trade deficit increases demand for foreign currency to pay for imports, which has historically coincided with periods of faster Rupee depreciation.",
    faq: [
      { question: "Does a wider trade deficit cause the Rupee to fall?", answer: "It's a contributing pressure, not the sole cause — the exchange rate also reflects reserve levels, remittances, capital flows, and market expectations." },
    ],
  },
  {
    slug: "inflation-vs-policy-rate",
    title: "CPI Inflation vs SBP Policy Rate",
    shortTitle: "Inflation vs Policy Rate",
    group: "monetary-conditions",
    seriesA: { id: "sbp:cpiInflation", label: "CPI Inflation (YoY)", shortLabel: "CPI Inflation", unit: "%", color: NEON_PURPLE },
    seriesB: { id: "sbp:policyRate", label: "SBP Policy Rate", shortLabel: "Policy Rate", unit: "%", color: NEON_BLUE },
    description: "Pakistan's headline year-over-year inflation rate against the State Bank's benchmark policy rate.",
    whyItMatters: "SBP's primary tool for controlling inflation is the policy rate — this comparison shows how closely (and with what lag) rate decisions have tracked actual inflation outcomes.",
    faq: [
      { question: "Why does the policy rate sometimes stay high after inflation falls?", answer: "Central banks often hold rates steady for a period after inflation cools to confirm the decline is durable before cutting — cutting too early risks reigniting price pressures." },
    ],
  },
  {
    slug: "inflation-vs-core-inflation",
    title: "Headline CPI Inflation vs Core Inflation",
    shortTitle: "Inflation vs Core Inflation",
    group: "monetary-conditions",
    seriesA: { id: "sbp:cpiInflation", label: "CPI Inflation (YoY)", shortLabel: "Headline CPI", unit: "%", color: NEON_PURPLE },
    seriesB: { id: "sbp:coreInflation", label: "Core Inflation (Urban NFNE, YoY)", shortLabel: "Core Inflation", unit: "%", color: EMERALD },
    description: "Headline CPI inflation against core inflation, which strips out volatile food and energy prices.",
    whyItMatters: "When headline inflation runs well above core inflation, food/energy price shocks are doing most of the work — when the two converge, price pressure has broadened across the economy.",
    faq: [
      { question: "Which measure does SBP pay more attention to?", answer: "Central banks generally weight core inflation more heavily for policy decisions, since it better reflects underlying, persistent price pressure rather than temporary food/energy swings." },
    ],
  },
  {
    slug: "inflation-vs-money-supply",
    title: "CPI Inflation vs M2 Money Supply Growth",
    shortTitle: "Inflation vs M2 Money Supply",
    group: "monetary-conditions",
    seriesA: { id: "sbp:cpiInflation", label: "CPI Inflation (YoY)", shortLabel: "CPI Inflation", unit: "%", color: NEON_PURPLE },
    seriesB: { id: "sbp:moneySupplyM2", label: "M2 Money Supply", shortLabel: "M2 Money Supply", unit: "T PKR", color: NEON_BLUE },
    description: "Inflation against the total level of M2 money supply circulating in the economy.",
    whyItMatters: "The quantity theory of money suggests faster money supply growth relative to real output tends to show up as inflation over time, with a lag — this comparison lets you see that relationship in Pakistan's own data.",
    faq: [
      { question: "Does more money supply always cause more inflation?", answer: "The relationship holds best over the medium-to-long term and depends on how fast the real economy is growing — money supply growing in line with output growth need not be inflationary." },
    ],
  },
  {
    slug: "pakistan-vs-us-inflation",
    title: "Pakistan Inflation vs US Inflation",
    shortTitle: "Pakistan vs US Inflation",
    group: "international",
    seriesA: { id: "sbp:cpiInflation", label: "Pakistan CPI Inflation (YoY)", shortLabel: "Pakistan", unit: "%", color: NEON_PURPLE },
    seriesB: { id: "fred:usCpiInflation", label: "US CPI Inflation (YoY)", shortLabel: "United States", unit: "%", color: NEON_BLUE },
    description: "Pakistan's headline inflation rate side-by-side with the US CPI inflation rate.",
    whyItMatters: "The inflation differential between Pakistan and the US is one of the structural forces behind long-run Rupee depreciation — persistently higher Pakistani inflation tends to erode the Rupee's value relative to the Dollar over time.",
    faq: [
      { question: "Why is Pakistan's inflation usually so much higher than the US's?", answer: "Higher energy import dependence, currency depreciation feeding into import costs, larger fiscal deficits, and a less diversified economy all contribute to Pakistan running structurally higher inflation than the US." },
    ],
  },
  {
    slug: "pakistan-vs-fed-funds-rate",
    title: "Pakistan Policy Rate vs US Fed Funds Rate",
    shortTitle: "Pakistan vs Fed Funds Rate",
    group: "international",
    seriesA: { id: "sbp:policyRate", label: "SBP Policy Rate", shortLabel: "Pakistan", unit: "%", color: NEON_PURPLE },
    seriesB: { id: "fred:fedFunds", label: "US Federal Funds Rate", shortLabel: "United States", unit: "%", color: NEON_BLUE },
    description: "SBP's benchmark policy rate against the US Federal Reserve's federal funds rate.",
    whyItMatters: "The gap between Pakistani and US interest rates affects the relative attractiveness of holding Rupee versus Dollar assets — a narrowing gap can pressure capital flows and the exchange rate.",
    faq: [
      { question: "Why does Pakistan's policy rate sit so much higher than the Fed Funds Rate?", answer: "Higher domestic inflation, currency depreciation risk, and a need to attract/retain foreign currency deposits all require Pakistan to offer a much higher policy rate than a low-inflation economy like the US." },
    ],
  },
  {
    slug: "pakistan-vs-india-gdp-growth",
    title: "Pakistan GDP Growth vs India GDP Growth",
    shortTitle: "Pakistan vs India GDP Growth",
    group: "international",
    seriesA: { id: "worldbank:gdpGrowthPak", label: "Pakistan Real GDP Growth", shortLabel: "Pakistan", unit: "%", color: NEON_PURPLE },
    seriesB: { id: "worldbank:gdpGrowthIndia", label: "India Real GDP Growth", shortLabel: "India", unit: "%", color: NEON_BLUE },
    description: "Annual real GDP growth rates for Pakistan and India side-by-side, going back up to 30 years.",
    whyItMatters: "India and Pakistan started from broadly comparable economic positions decades ago — the diverging growth trajectory since is one of the most cited comparisons in South Asian economic analysis.",
    faq: [
      { question: "Where does this GDP growth data come from?", answer: "The World Bank's annual GDP growth indicator (NY.GDP.MKTP.KD.ZG), the same free public dataset used for the headline GDP Growth KPI on this dashboard." },
    ],
  },
  {
    slug: "pakistan-vs-bangladesh-gdp-growth",
    title: "Pakistan GDP Growth vs Bangladesh GDP Growth",
    shortTitle: "Pakistan vs Bangladesh GDP Growth",
    group: "international",
    seriesA: { id: "worldbank:gdpGrowthPak", label: "Pakistan Real GDP Growth", shortLabel: "Pakistan", unit: "%", color: NEON_PURPLE },
    seriesB: { id: "worldbank:gdpGrowthBangladesh", label: "Bangladesh Real GDP Growth", shortLabel: "Bangladesh", unit: "%", color: EMERALD },
    description: "Annual real GDP growth rates for Pakistan and Bangladesh side-by-side, going back up to 30 years.",
    whyItMatters: "Bangladesh has frequently outgrown Pakistan over the past two decades despite a similar starting point in 1971 — a comparison often raised in discussions of textile-export competitiveness and structural reform.",
    faq: [
      { question: "Where does this GDP growth data come from?", answer: "The World Bank's annual GDP growth indicator (NY.GDP.MKTP.KD.ZG), the same free public dataset used for the headline GDP Growth KPI on this dashboard." },
    ],
  },
  {
    slug: "gold-vs-usd-pkr",
    title: "Gold Price vs USD/PKR Exchange Rate",
    shortTitle: "Gold vs USD/PKR",
    group: "asset-allocation",
    seriesA: { id: "yfinance:gold", label: "Gold (USD/oz)", shortLabel: "Gold", unit: "$/oz", color: AMBER },
    seriesB: { id: "sbp:usdPkr", label: "USD / PKR", shortLabel: "USD/PKR", unit: "PKR", color: NEON_BLUE },
    description: "The US Dollar gold price against the Rupee's exchange rate — two of the most common inflation/currency hedges held by Pakistani investors.",
    whyItMatters: "Gold is priced in Dollars globally, so for a Pakistani holder, returns come from both gold's own price movement and Rupee depreciation against the Dollar — this comparison separates the two effects visually.",
    faq: [
      { question: "Does gold protect against Rupee depreciation?", answer: "Historically, yes in large part — because gold is Dollar-priced, a depreciating Rupee mechanically raises gold's PKR value even if the Dollar gold price is flat, which is why gold is a commonly cited inflation/currency hedge in Pakistan." },
    ],
  },
  {
    slug: "gold-vs-treasury-bills",
    title: "Gold Price vs 3-Month Treasury Bill Yield",
    shortTitle: "Gold vs Treasury Bills",
    group: "asset-allocation",
    seriesA: { id: "yfinance:gold", label: "Gold (USD/oz)", shortLabel: "Gold", unit: "$/oz", color: AMBER },
    seriesB: { id: "sbp:tbillYield3m", label: "3-Month T-Bill Yield", shortLabel: "T-Bill Yield", unit: "%", color: NEON_PURPLE },
    description: "Gold's USD price against the yield on Pakistan's 3-month Treasury Bills — a non-yielding hedge asset against a risk-free Rupee yield.",
    whyItMatters: "When T-Bill yields are very high, the opportunity cost of holding non-yielding gold rises — this comparison shows how gold has performed across different domestic interest rate environments.",
    faq: [
      { question: "Why compare gold (a USD asset) to a PKR yield?", answer: "It frames the real choice Pakistani investors face: hold a Dollar-priced hedge with no yield, or hold a Rupee-denominated instrument with a high nominal yield but full exposure to Rupee depreciation and local inflation." },
    ],
  },
];

export interface SectorComposition {
  slug: string;
  title: string;
  shortTitle: string;
  group: ComparisonGroupId;
  description: string;
  whyItMatters: string;
  faq: { question: string; answer: string }[];
}

// Substitute for stock-market "sector performance" (Banking, Cement, Oil &
// Gas, etc.), which has no available data source — see the Phase 1
// feasibility audit. This is GDP composition by economic sector, a
// genuinely different (but real, citable) metric, not a stand-in for equity
// sector returns.
export const SECTOR_COMPOSITION: SectorComposition = {
  slug: "gdp-sector-composition",
  title: "Pakistan GDP Composition by Sector",
  shortTitle: "GDP Sector Composition",
  group: "economic-structure",
  description: "Agriculture, industry, and services as a share of Pakistan's GDP, going back up to 30 years.",
  whyItMatters: "This shows the structural shift in Pakistan's economy over time — not stock-market sector returns (no Pakistan Stock Exchange sector index data is available to this project; see the FAQ below).",
  faq: [
    {
      question: "Why isn't this a stock market sector performance comparison (Banking, Cement, Oil & Gas, etc.)?",
      answer: "Pakistan Stock Exchange sector indices require a commercial data license that this project does not have access to — the same constraint that keeps KSE-100 itself off this dashboard. GDP sectoral composition (World Bank data, free and public) is offered here as a real, different, clearly-labeled substitute: it shows how the economy's structure has shifted, not how sector stocks have performed.",
    },
  ],
};

export interface ComingSoonComparison {
  title: string;
  shortTitle: string;
  group: ComparisonGroupId;
}

// Blocked by the same root cause: no KSE-100 (or any PSX index) data source
// exists in this project — PSX requires a commercial data license. Shown as
// "Coming Soon" cards in the workspace, consistent with the existing PSX
// nav item elsewhere in the dashboard. Deliberately NOT given SEO subpages.
export const COMING_SOON_COMPARISONS: ComingSoonComparison[] = [
  { title: "KSE-100 vs SBP Policy Rate", shortTitle: "KSE-100 vs Policy Rate", group: "asset-allocation" },
  { title: "KSE-100 vs CPI Inflation", shortTitle: "KSE-100 vs Inflation", group: "asset-allocation" },
  { title: "KSE-100 vs USD/PKR", shortTitle: "KSE-100 vs USD/PKR", group: "asset-allocation" },
  { title: "KSE-100 vs Gold", shortTitle: "KSE-100 vs Gold", group: "asset-allocation" },
  { title: "KSE-100 vs GDP Growth", shortTitle: "KSE-100 vs GDP Growth", group: "asset-allocation" },
  { title: "KSE-100 vs Treasury Bills", shortTitle: "KSE-100 vs T-Bills", group: "asset-allocation" },
  { title: "Pakistan Market vs S&P 500", shortTitle: "Pakistan vs S&P 500", group: "international" },
  { title: "Pakistan Market vs MSCI Emerging Markets", shortTitle: "Pakistan vs MSCI EM", group: "international" },
  { title: "External Debt vs Foreign Exchange Reserves", shortTitle: "External Debt vs Reserves", group: "external-sector" },
  { title: "CPI Inflation vs Food Inflation", shortTitle: "Inflation vs Food Inflation", group: "monetary-conditions" },
];

export function getComparisonBySlug(slug: string): ComparisonDef | undefined {
  return COMPARISONS.find((c) => c.slug === slug);
}

export function getAllComparisonSlugs(): string[] {
  return [...COMPARISONS.map((c) => c.slug), SECTOR_COMPOSITION.slug];
}
