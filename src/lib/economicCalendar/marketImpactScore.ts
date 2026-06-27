// Numeric Market Impact Score (1-10) — sits alongside the existing
// High/Medium/Low badge (economicCalendarRegistry.ts's IMPORTANCE_LEVELS),
// which stays as-is. The score gives finer-grained ranking within a tier
// (e.g. CPI vs GDP are both "High" but CPI moves markets more often) for
// sorting, the Next Major Events panel, and the Top Market-Moving Events
// ranking table. High tier = 8-10, Medium = 4-7, Low = 1-3, matching every
// series' existing importance classification (scripts/generateEconomicCalendarSeed.ts).

export const MARKET_IMPACT_SCORE: Record<string, number> = {
  "sbp-monetary-policy-committee-meeting": 10,
  "cpi-inflation-release": 9,
  "gdp-growth-release": 8,
  "federal-budget": 8,
  "core-inflation-release": 8,
  "pakistan-economic-survey": 7,
  "large-scale-manufacturing-lsm-growth": 6,
  "current-account-balance": 6,
  "trade-balance": 5,
  "worker-remittances": 5,
  "treasury-bill-auction": 5,
  "pib-auction": 5,
  "sbp-foreign-exchange-reserves": 4,
  "government-debt-release": 4,
  "spi-weekly-inflation-release": 3,
  "kse-100-weekly-market-review": 2,
  "psx-holiday-calendar": 1,
};

/** Falls back to the midpoint of the series' importance tier if a slug isn't in the table above (keeps every score consistent with its High/Medium/Low badge even for a series added later and not yet scored by hand). */
export function getMarketImpactScore(seriesSlug: string, importance: "High" | "Medium" | "Low"): number {
  const known = MARKET_IMPACT_SCORE[seriesSlug];
  if (known !== undefined) return known;
  return importance === "High" ? 8 : importance === "Medium" ? 5 : 2;
}

/** Display title for each scored series — powers the "Top Market-Moving Events in Pakistan" ranking table, which lists recurring release TYPES (not specific dated events), so it needs its own label rather than borrowing one from any single instance. */
const SERIES_TITLE: Record<string, string> = {
  "sbp-monetary-policy-committee-meeting": "SBP Monetary Policy Committee Meeting",
  "cpi-inflation-release": "CPI Inflation",
  "gdp-growth-release": "GDP Growth Release",
  "federal-budget": "Federal Budget",
  "core-inflation-release": "Core Inflation",
  "pakistan-economic-survey": "Pakistan Economic Survey",
  "large-scale-manufacturing-lsm-growth": "Large Scale Manufacturing (LSM)",
  "current-account-balance": "Current Account",
  "trade-balance": "Trade Balance",
  "worker-remittances": "Worker Remittances",
  "treasury-bill-auction": "Treasury Bill Auction",
  "pib-auction": "PIB Auction",
  "sbp-foreign-exchange-reserves": "SBP Foreign Exchange Reserves",
  "government-debt-release": "Government Debt Release",
  "spi-weekly-inflation-release": "SPI Weekly Inflation",
  "kse-100-weekly-market-review": "KSE-100 Weekly Market Review",
  "psx-holiday-calendar": "PSX Holiday Calendar",
};

export interface MarketImpactRankingEntry {
  slug: string;
  title: string;
  score: number;
}

/** Pre-sorted, highest score first — ties broken by insertion order in MARKET_IMPACT_SCORE above. */
export const MARKET_IMPACT_RANKING: MarketImpactRankingEntry[] = Object.entries(MARKET_IMPACT_SCORE)
  .map(([slug, score]) => ({ slug, title: SERIES_TITLE[slug] ?? slug, score }))
  .sort((a, b) => b.score - a.score);
