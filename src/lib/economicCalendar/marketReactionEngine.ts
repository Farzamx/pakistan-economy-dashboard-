import { parseEventValue, type SurpriseDirection } from "./surpriseAnalysis";

// Market Reaction Engine (Phase 2B) — "Potential Market Reaction" section on
// each event/archive detail page. Keyed by series slug, not category: two
// series in the same category (Trade Balance vs Current Account, both
// "External Sector") have genuinely different market mechanics, so a
// shared category-level template would be wrong for one of them. Monetary
// Policy is special-cased entirely — a rate decision's reaction depends on
// the CUT/HIKE/HOLD direction (actual vs previous), not forecast surprise.

export interface MarketReaction {
  headline: string;
  points: string[];
}

type SeriesReactionSet = Partial<Record<SurpriseDirection, MarketReaction>>;

const FALLBACK_REACTION: SeriesReactionSet = {
  positive: { headline: "Came in above forecast", points: ["Market reaction depends on direction relative to expectations — check the Why It Matters section for this release's typical interpretation."] },
  negative: { headline: "Came in below forecast", points: ["Market reaction depends on direction relative to expectations — check the Why It Matters section for this release's typical interpretation."] },
  "in-line": { headline: "In line with forecast", points: ["Limited immediate market reaction typically expected when a release matches expectations."] },
};

const SERIES_REACTIONS: Record<string, SeriesReactionSet> = {
  "cpi-inflation-release": {
    negative: {
      headline: "Lower-than-expected CPI",
      points: ["Bullish for bonds", "Supports the case for future SBP rate cuts", "Positive for leveraged and rate-sensitive sectors"],
    },
    positive: {
      headline: "Higher-than-expected CPI",
      points: ["Hawkish for interest rate expectations", "Negative for rate-sensitive sectors", "May support the Rupee if it raises real interest rate appeal"],
    },
    "in-line": {
      headline: "CPI in line with forecast",
      points: ["Limited immediate market reaction expected", "SBP's policy path likely unchanged for now"],
    },
  },
  "core-inflation-release": {
    negative: {
      headline: "Lower-than-expected core inflation",
      points: ["Reinforces an underlying disinflation trend, which SBP weighs heavily", "Supports the case for future rate cuts", "Mildly positive for rate-sensitive sectors"],
    },
    positive: {
      headline: "Higher-than-expected core inflation",
      points: ["Signals price pressure is broadening beyond food/energy", "Reduces room for near-term rate cuts", "May weigh on rate-sensitive sectors"],
    },
    "in-line": {
      headline: "Core inflation in line with forecast",
      points: ["No meaningful shift in the underlying inflation picture"],
    },
  },
  "spi-weekly-inflation-release": {
    negative: { headline: "SPI cooler than the previous week", points: ["An early, partial signal that price pressure may be easing", "Rarely market-moving on its own — markets typically wait for the monthly CPI print to confirm"] },
    positive: { headline: "SPI hotter than the previous week", points: ["An early, partial signal of building price pressure", "Rarely market-moving on its own — markets typically wait for the monthly CPI print to confirm"] },
    "in-line": { headline: "SPI broadly unchanged", points: ["No new signal for markets this week"] },
  },
  "trade-balance": {
    positive: {
      headline: "Stronger trade balance (narrower deficit)",
      points: ["Positive for external account stability", "Potentially supportive for the Rupee", "Eases some pressure on the financing gap SBP needs to cover"],
    },
    negative: {
      headline: "Weaker trade balance (wider deficit)",
      points: ["Adds pressure on foreign exchange reserves", "Potentially negative for the Rupee", "Widens the external financing gap"],
    },
    "in-line": { headline: "Trade balance in line with forecast", points: ["No material change to the external account outlook"] },
  },
  "current-account-balance": {
    positive: {
      headline: "Stronger current account (narrower deficit or surplus)",
      points: ["Reduces Pakistan's external financing needs", "Supportive for reserves and the Rupee"],
    },
    negative: {
      headline: "Weaker current account (wider deficit)",
      points: ["Increases reliance on external borrowing or reserve drawdowns", "Potentially negative for the Rupee and reserves"],
    },
    "in-line": { headline: "Current account in line with forecast", points: ["No material change to the external financing outlook"] },
  },
  "worker-remittances": {
    positive: { headline: "Remittances stronger than expected", points: ["A direct, low-volatility source of foreign exchange — supportive for reserves and the Rupee", "Reduces reliance on external borrowing"] },
    negative: { headline: "Remittances weaker than expected", points: ["A smaller-than-usual foreign exchange inflow", "Modestly negative for the external account, though remittances are typically less volatile than trade or portfolio flows"] },
    "in-line": { headline: "Remittances in line with forecast", points: ["Steady, expected contribution to foreign exchange inflows"] },
  },
  "sbp-foreign-exchange-reserves": {
    positive: { headline: "Reserves rose more than expected", points: ["Strengthens SBP's buffer to defend the Rupee", "Modestly positive for investor and creditor sentiment"] },
    negative: { headline: "Reserves fell more than expected", points: ["Reduces SBP's buffer to defend the Rupee", "Watch for renewed currency pressure or import-cover concerns"] },
    "in-line": { headline: "Reserves in line with forecast", points: ["No material change to reserve adequacy"] },
  },
  "gdp-growth-release": {
    positive: { headline: "Stronger-than-expected GDP growth", points: ["Generally positive for equities", "Signals stronger corporate earnings potential across cyclical sectors", "May reduce urgency for additional policy support"] },
    negative: { headline: "Weaker-than-expected GDP growth", points: ["Negative for cyclical and growth-sensitive sectors", "May increase pressure for supportive fiscal or monetary policy"] },
    "in-line": { headline: "GDP growth in line with forecast", points: ["Confirms the existing growth outlook with no major surprise"] },
  },
  "large-scale-manufacturing-lsm": {
    positive: { headline: "Stronger-than-expected LSM growth", points: ["Positive for industrial and manufacturing-linked equities", "An early read on GDP momentum ahead of the official growth release"] },
    negative: { headline: "Weaker-than-expected LSM growth", points: ["Negative for industrial and manufacturing-linked equities", "May foreshadow a softer GDP growth print"] },
    "in-line": { headline: "LSM growth in line with forecast", points: ["No new signal on industrial momentum"] },
  },
  "treasury-bill-auction-3m": {
    positive: { headline: "T-Bill yields came in higher than expected", points: ["Signals investors demanding more compensation to hold short-term government debt", "Can reflect tighter liquidity or rate-hike expectations"] },
    negative: { headline: "T-Bill yields came in lower than expected", points: ["Signals strong investor demand for short-term government debt", "Can reflect expectations of rate cuts or ample market liquidity"] },
    "in-line": { headline: "T-Bill yields in line with forecast", points: ["Confirms the market's existing short-term rate expectations"] },
  },
  "pib-auction": {
    positive: { headline: "PIB yields came in higher than expected", points: ["Signals investors demanding more compensation for longer-dated government debt", "Can pressure existing bond prices lower"] },
    negative: { headline: "PIB yields came in lower than expected", points: ["Signals strong investor demand for longer-dated government debt", "Supportive for existing bond holders"] },
    "in-line": { headline: "PIB yields in line with forecast", points: ["Confirms the market's existing longer-term rate expectations"] },
  },
};

/** Rate decision reaction is keyed by direction (cut/hike/hold), not forecast surprise — a policy rate "surprise" is meaningless without knowing which way it moved. */
const MPC_REACTIONS: Record<"cut" | "hike" | "hold", MarketReaction> = {
  cut: {
    headline: "SBP Rate Cut",
    points: ["Generally positive for equities, especially leveraged and rate-sensitive sectors", "Lowers borrowing costs for businesses and consumers", "Can weigh on the Rupee if the cut is larger than markets expected"],
  },
  hike: {
    headline: "SBP Rate Hike",
    points: ["Negative for leveraged and rate-sensitive sectors", "Supportive for fixed-income instruments (new T-Bills/PIBs issued at higher yields)", "Typically supports the Rupee by raising the relative return on PKR assets"],
  },
  hold: {
    headline: "SBP Holds Rates Steady",
    points: ["Limited immediate market reaction typically expected", "Markets refocus on the next inflation/external-sector data point for clues on the future policy path"],
  },
};

export type RateChangeDirection = "cut" | "hike" | "hold";

/** Compares actual vs previous (not forecast) — what a policy-rate decision's reaction actually depends on. */
export function getRateChangeDirection(actual: string | null, previous: string | null): RateChangeDirection | null {
  const parsedActual = parseEventValue(actual);
  const parsedPrevious = parseEventValue(previous);
  if (!parsedActual || !parsedPrevious) return null;
  const delta = parsedActual.num - parsedPrevious.num;
  if (Math.abs(delta) < 0.01) return "hold";
  return delta > 0 ? "hike" : "cut";
}

/**
 * Resolves the "Potential Market Reaction" content for an event. Monetary
 * Policy uses rate-change direction (previous vs actual); everything else
 * uses forecast-surprise direction. Falls back to a generic-but-honest
 * placeholder only for a series with no specific rules defined yet, never
 * silently reusing another series' text.
 */
export function getMarketReaction(
  seriesSlug: string,
  category: string,
  surpriseDirection: SurpriseDirection,
  actual: string | null,
  previous: string | null,
): MarketReaction | null {
  if (category === "Monetary Policy") {
    const rateDirection = getRateChangeDirection(actual, previous);
    return rateDirection ? MPC_REACTIONS[rateDirection] : null;
  }

  const set = SERIES_REACTIONS[seriesSlug] ?? FALLBACK_REACTION;
  if (surpriseDirection === "unavailable") return null;
  return set[surpriseDirection] ?? null;
}

export interface MarketReactionScenario {
  scenarioLabel: string;
  reaction: MarketReaction;
}

/**
 * All possible reactions for a series, shown on Event Detail pages BEFORE
 * a release happens — there's no actual value yet to compute a real
 * surprise from, so this previews "if it comes in above/below/in line
 * with forecast" (or "if SBP cuts/holds/hikes" for Monetary Policy)
 * instead of resolving to one outcome.
 */
export function getMarketReactionPreview(seriesSlug: string, category: string): MarketReactionScenario[] {
  if (category === "Monetary Policy") {
    return [
      { scenarioLabel: "If SBP cuts the policy rate", reaction: MPC_REACTIONS.cut },
      { scenarioLabel: "If SBP holds the policy rate", reaction: MPC_REACTIONS.hold },
      { scenarioLabel: "If SBP hikes the policy rate", reaction: MPC_REACTIONS.hike },
    ];
  }

  const set = SERIES_REACTIONS[seriesSlug] ?? FALLBACK_REACTION;
  const scenarios: MarketReactionScenario[] = [];
  if (set.positive) scenarios.push({ scenarioLabel: "If actual comes in above forecast", reaction: set.positive });
  if (set.negative) scenarios.push({ scenarioLabel: "If actual comes in below forecast", reaction: set.negative });
  if (set["in-line"]) scenarios.push({ scenarioLabel: "If actual is in line with forecast", reaction: set["in-line"] });
  return scenarios;
}
