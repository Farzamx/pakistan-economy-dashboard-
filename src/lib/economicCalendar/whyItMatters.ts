import type { EventCategory } from "./economicCalendarTypes";

// "Why It Matters" content for Event/Archive detail pages (Phase 2B) —
// distinct from each series' `description` (which explains what the
// release IS); this explains why investors and policymakers track it.
// Keyed by series slug first, falling back to a category-level explanation
// for series without bespoke text yet, so every detail page always shows
// something substantive rather than an empty section.

const SERIES_WHY_IT_MATTERS: Record<string, string> = {
  "cpi-inflation-release":
    "CPI is the single number SBP weighs most heavily when setting the policy rate. A higher reading raises the odds of a rate hike (or delays a cut); a lower reading does the opposite. It also directly affects real returns on savings and the affordability of everyday goods for Pakistani households.",
  "core-inflation-release":
    "Core inflation strips out volatile food and energy prices, showing whether price pressure is broad-based and persistent rather than a temporary shock. SBP treats a sticky core reading as a stronger signal for keeping rates higher for longer than a headline CPI move alone.",
  "spi-weekly-inflation-release":
    "SPI is the fastest available read on prices — published weekly, well ahead of the monthly CPI. It rarely moves markets on its own, but a sustained run of weekly increases is often the first hint that the next CPI print will surprise to the upside.",
  "sbp-monetary-policy-committee-meeting":
    "The policy rate is the benchmark cost of borrowing across the entire economy — it reprices everything from mortgages to corporate loans to government debt. A rate decision is the single most reliably market-moving event on this calendar.",
  "sbp-foreign-exchange-reserves":
    "Reserves are the buffer SBP uses to defend the Rupee and meet external debt obligations. A sustained decline signals mounting pressure on the currency; a rebuild gives SBP more room to manage volatility without resorting to aggressive rate hikes.",
  "trade-balance":
    "The gap between exports and imports determines how much foreign currency the economy generates versus consumes. A widening deficit increases demand for Dollars and pressures both reserves and the exchange rate.",
  "current-account-balance":
    "The current account is the broadest measure of money flowing in and out of Pakistan internationally. A persistent deficit must be financed by external borrowing or reserve drawdowns, making it one of the most closely watched signals of external vulnerability — and a recurring focus of IMF program discussions.",
  "worker-remittances":
    "Remittances are a large, comparatively stable source of foreign exchange — for many months, larger than goods exports. They directly support reserves and household consumption, making this one of the few external-sector releases that's usually a one-way positive signal rather than a source of volatility.",
  "gdp-growth-release":
    "GDP growth is the headline number used to judge whether the economy is creating jobs and raising incomes fast enough — Pakistan generally needs growth above 5% to meaningfully outpace its population growth and reduce poverty over time.",
  "large-scale-manufacturing-lsm-growth":
    "LSM is published monthly, far more often than the annual GDP figure, making it the timeliest available proxy for industrial momentum. A run of weak LSM prints often foreshadows a softer GDP growth number months before the official release.",
  "treasury-bill-auction":
    "T-Bill cut-off yields are a live, twice-monthly vote by the market on where short-term interest rates are headed — often moving ahead of an actual SBP policy decision as investors price in their own rate expectations.",
  "pib-auction":
    "PIB yields reflect investor expectations for inflation and interest rates over a multi-year horizon, not just the next few months. Rising PIB yields can signal the market expects inflation or rates to stay elevated longer than SBP's own guidance suggests.",
  "government-debt-release":
    "Pakistan's total government debt — domestic and external combined — determines future debt-servicing costs, which already consume a larger share of the federal budget than defence. A faster-than-expected rise in the debt stock raises questions about fiscal sustainability.",
  "federal-budget":
    "The federal budget sets next year's tax measures, spending allocations, and the fiscal deficit target in a single sitting — sector-specific tax changes (e.g. on cement, autos, or banking) can move individual PSX stocks sharply on budget day.",
  "pakistan-economic-survey":
    "Released the day before the budget, the Economic Survey frames the government's own narrative on growth, inflation, and the fiscal/external accounts — giving an early read on what assumptions the following day's budget will be built on.",
  "kse-100-weekly-market-review":
    "A weekly read on aggregate investor sentiment and sector rotation on the Pakistan Stock Exchange — useful context for the week, though rarely a release that moves markets on its own the way a data print or policy decision does.",
  "psx-holiday-calendar":
    "Trading is fully closed — no KSE-100 session, no T-Bill/PIB settlement. Worth noting only so a flat or missing data point on that date isn't mistaken for a market event.",
};

const CATEGORY_WHY_IT_MATTERS: Record<EventCategory, string> = {
  Inflation: "Inflation erodes how far household income stretches and is the figure SBP weighs most heavily when setting the policy rate.",
  "Monetary Policy": "SBP's policy decisions set the benchmark cost of borrowing across the entire economy.",
  "External Sector": "External sector data — reserves, trade, the current account, remittances — together determine how much pressure the Rupee and SBP's reserves are under.",
  "Fiscal Sector": "Fiscal releases shape government borrowing needs and the debt burden the economy carries into future years.",
  "Real Economy": "Real economy releases measure how fast Pakistan's economy is actually growing, the basis for jobs and income growth.",
  "Financial Markets": "Market-facing releases provide context on investor sentiment and trading conditions on the Pakistan Stock Exchange.",
  "Global Events": "Pakistan-specific international events like IMF program reviews directly affect Pakistan's reserves, financing costs, and bond market access.",
};

export function getWhyItMatters(seriesSlug: string, category: EventCategory): string {
  return SERIES_WHY_IT_MATTERS[seriesSlug] ?? CATEGORY_WHY_IT_MATTERS[category];
}
