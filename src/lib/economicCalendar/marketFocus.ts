import type { EventCategory } from "./economicCalendarTypes";

// "Expected Market Focus" — what investors are specifically watching
// *before* a release, as opposed to whyItMatters.ts (why the release
// matters in general) or marketReactionEngine.ts (what happens *after*,
// once an outcome is known). Keyed by series slug first, falling back to a
// category-level list for series without bespoke points yet.

const SERIES_MARKET_FOCUS: Record<string, string[]> = {
  "cpi-inflation-release": ["Inflation trend", "Food inflation pressure", "Future rate-cut expectations"],
  "core-inflation-release": ["Underlying price pressure excluding food/energy", "Whether inflation is broad-based or a one-off shock", "Signal for how long SBP holds rates elevated"],
  "spi-weekly-inflation-release": ["Early read on the next CPI print", "Week-over-week food price moves", "Whether price pressure is building or easing"],
  "sbp-monetary-policy-committee-meeting": ["Probability of a rate cut", "Liquidity conditions", "Inflation outlook"],
  "sbp-foreign-exchange-reserves": ["Import cover (months of reserves on hand)", "SBP's capacity to defend the Rupee", "External financing gap"],
  "trade-balance": ["Export momentum", "Import demand", "Currency pressure"],
  "current-account-balance": ["Import growth", "Export performance", "External financing needs"],
  "worker-remittances": ["Inflow momentum heading into Eid/seasonal periods", "Formal vs informal (hawala) channel share", "Contribution to reserve buildup"],
  "gdp-growth-release": ["Whether growth is outpacing population growth", "Sector-level contribution (agriculture/industry/services)", "Implications for the next fiscal year's revenue target"],
  "large-scale-manufacturing-lsm-growth": ["Industrial momentum ahead of the quarterly GDP print", "Energy-intensive sector output (textiles, cement, autos)", "Early signal for export capacity"],
  "treasury-bill-auction": ["Cut-off yield versus the prevailing policy rate", "Bid-to-cover ratio (demand strength)", "Government's short-term borrowing cost"],
  "pib-auction": ["Longer-tenor yield versus T-Bill yields", "Market's medium-term inflation/rate expectations", "Investor appetite for duration risk"],
  "government-debt-release": ["Domestic vs external debt mix", "Debt-servicing cost as a share of the budget", "Debt-to-GDP trajectory"],
  "federal-budget": ["Fiscal deficit", "Debt servicing", "Development spending"],
  "pakistan-economic-survey": ["Government's own growth and inflation assumptions", "Sector performance scorecard", "What the following day's budget will be built on"],
  "kse-100-weekly-market-review": ["Sector rotation over the week", "Foreign vs local investor flows", "Volume and volatility trends"],
  "psx-holiday-calendar": ["No trading session — settlement and clearing pause for the day"],
};

const CATEGORY_MARKET_FOCUS: Record<EventCategory, string[]> = {
  Inflation: ["Price trend direction", "Core vs headline divergence", "Rate-decision implications"],
  "Monetary Policy": ["Rate-decision probability", "Liquidity conditions", "Forward guidance tone"],
  "External Sector": ["Reserve adequacy", "Currency pressure", "External financing needs"],
  "Fiscal Sector": ["Deficit trajectory", "Borrowing cost", "Debt sustainability"],
  "Real Economy": ["Growth momentum", "Sector contribution", "Income/jobs implications"],
  "Financial Markets": ["Investor sentiment", "Flow direction", "Volatility"],
  "Global Events": ["Impact on Pakistan's reserves", "Financing cost implications", "Bond market access"],
};

export function getMarketFocus(seriesSlug: string, category: EventCategory): string[] {
  return SERIES_MARKET_FOCUS[seriesSlug] ?? CATEGORY_MARKET_FOCUS[category];
}
