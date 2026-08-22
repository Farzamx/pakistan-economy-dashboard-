// Deterministic per-dimension signal rules — Phase 9.1 foundation.
//
// Every rule here is a plain, explainable comparison — sign-of-change or a
// textbook accounting-sign fact, never an invented economic threshold or a
// causal claim from co-movement. Where this phase deliberately declined to
// build a rule the brief's own examples suggested (e.g. "inflation above/
// below a defined reference"), that omission is documented in the function
// it would have belonged to, not silently skipped — see each dimension's
// comment block below and Section T of the Phase 9.1 report.
//
// Pure and synchronous: every function here takes already-built
// IndicatorObservationEvidence (see evidence.ts) and returns an
// IntelligenceSignal. No I/O, no read-model calls, no Date.now() — the
// caller (macroIntelligence.ts) supplies `calculatedAt` explicitly so this
// file is exhaustively deterministic and fixture-testable.
//
// SIGN-CONVENTION EVIDENCE (not assumed): Current Account, Trade Balance,
// and Fiscal Balance all use SBP's standard BOP/fiscal accounting
// convention — deficit is negative, surplus/balance is less-negative or
// positive — confirmed directly against src/data/sbpFallbackData.ts's real
// fallback figures (Current Account "-0.32", Trade Balance "-3.32", Fiscal
// Balance "-6.17", all B USD/T PKR). "Rising toward positive" therefore
// means "improving" for all three, not an assumption.

import { computeSignalConfidence } from "./evidence";
import type { IndicatorObservationEvidence, IntelligenceDimension, IntelligenceSignal, SignalDirection } from "./types";
import { isUsableForSignal } from "./evidence";

function usable(e: IndicatorObservationEvidence | null): e is IndicatorObservationEvidence {
  return e !== null && isUsableForSignal(e.availability);
}

function directionWord(direction: SignalDirection, risingWord: string, fallingWord: string, flatWord: string): string {
  if (direction === "Rising") return risingWord;
  if (direction === "Falling") return fallingWord;
  if (direction === "Flat") return flatWord;
  return "insufficient-data";
}

/** Shared assembly for every dimension below: gathers non-null evidence, computes confidence, and fills missingInputs from anything that was expected but not usable. */
function assembleSignal(params: {
  id: string;
  dimension: IntelligenceDimension;
  label: string;
  state: string;
  direction: SignalDirection;
  summary: string;
  allInputs: readonly { label: string; evidence: IndicatorObservationEvidence | null }[];
  calculatedAt: string;
}): IntelligenceSignal {
  const evidence = params.allInputs.filter((i): i is { label: string; evidence: IndicatorObservationEvidence } => i.evidence !== null).map((i) => i.evidence);
  const missingInputs = params.allInputs.filter((i) => i.evidence === null || !isUsableForSignal(i.evidence.availability)).map((i) => i.label);
  const { confidence, confidenceScore } = computeSignalConfidence(evidence, params.calculatedAt);
  return {
    id: params.id,
    dimension: params.dimension,
    label: params.label,
    state: params.state,
    direction: params.direction,
    confidence,
    confidenceScore,
    summary: params.summary,
    evidence,
    missingInputs,
    calculatedAt: params.calculatedAt,
  };
}

function insufficientSignal(params: {
  id: string;
  dimension: IntelligenceDimension;
  label: string;
  allInputs: readonly { label: string; evidence: IndicatorObservationEvidence | null }[];
  calculatedAt: string;
}): IntelligenceSignal {
  return assembleSignal({
    ...params,
    state: "insufficient-data",
    direction: "Unknown",
    summary: `Not enough fresh evidence to classify ${params.label.toLowerCase()} this period.`,
  });
}

// ── 1. Inflation ─────────────────────────────────────────────────────────
//
// State reads off CPI Inflation's own direction only (the primary,
// headline series) — Core Inflation is carried as supplementary evidence,
// not blended into the state, since the two can legitimately diverge and
// forcing them into one label would hide that. Acceleration (is the latest
// move itself faster/slower than the prior one) is reported as evidence,
// not folded into `state`, per the brief's own "rising/falling" +
// "acceleration/deceleration" being two separate facts.
//
// DELIBERATELY NOT IMPLEMENTED: "inflation above/below a defined
// reference" (an explicit brief example). No SBP/State Bank inflation
// target or comparable reference threshold exists anywhere in this
// repository — inventing one (e.g. "5% is high") would be exactly the kind
// of unevidenced economic threshold the brief prohibits. Omitted, not
// silently worked around.
export function evaluateInflationSignal(inputs: { cpi: IndicatorObservationEvidence | null; core: IndicatorObservationEvidence | null }, calculatedAt: string): IntelligenceSignal {
  const allInputs = [
    { label: "CPI Inflation (YoY)", evidence: inputs.cpi },
    { label: "Core Inflation (YoY)", evidence: inputs.core },
  ];
  if (!usable(inputs.cpi)) {
    return insufficientSignal({ id: "inflation", dimension: "Inflation", label: "Inflation", allInputs, calculatedAt });
  }
  const state = directionWord(inputs.cpi.direction, "rising", "falling", "flat");
  const accelNote = inputs.cpi.acceleration !== "Unknown" ? `, ${inputs.cpi.acceleration.toLowerCase()}` : "";
  return assembleSignal({
    id: "inflation",
    dimension: "Inflation",
    label: "Inflation",
    state,
    direction: inputs.cpi.direction,
    summary: `Headline CPI inflation is ${state}${accelNote} versus the prior reading.`,
    allInputs,
    calculatedAt,
  });
}

// ── 2. Monetary Policy ───────────────────────────────────────────────────
//
// `state` (tightening/easing/held) reads off the Policy Rate's own latest
// move only — this is the central bank's actual action, unambiguous from
// sign of change alone. The real-rate proxy (policy rate minus CPI YoY,
// both in percentage points) is reported as supplementary evidence ONLY
// when both inputs are usable — a textbook approximation (nominal rate
// minus realized inflation), not the full Fisher equation with expected
// inflation, and labeled as a proxy in the summary rather than presented as
// a real-rate calculation. It never changes `state`: action and stance are
// two separate facts, not merged into one label.
export function evaluateMonetaryPolicySignal(inputs: { policyRate: IndicatorObservationEvidence | null; cpi: IndicatorObservationEvidence | null }, calculatedAt: string): IntelligenceSignal {
  const allInputs = [
    { label: "SBP Policy Rate", evidence: inputs.policyRate },
    { label: "CPI Inflation (YoY)", evidence: inputs.cpi },
  ];
  if (!usable(inputs.policyRate)) {
    return insufficientSignal({ id: "monetary-policy", dimension: "MonetaryPolicy", label: "Monetary Policy", allInputs, calculatedAt });
  }
  const state = directionWord(inputs.policyRate.direction, "tightening", "easing", "held");
  let realRateNote = "";
  if (usable(inputs.cpi) && inputs.policyRate.value !== null && inputs.cpi.value !== null) {
    const realRateProxy = inputs.policyRate.value - inputs.cpi.value;
    realRateNote = ` Real-rate proxy (policy rate minus CPI YoY): ${realRateProxy.toFixed(2)} pp.`;
  }
  return assembleSignal({
    id: "monetary-policy",
    dimension: "MonetaryPolicy",
    label: "Monetary Policy",
    state,
    direction: inputs.policyRate.direction,
    summary: `SBP's policy stance is ${state} — the policy rate ${state === "held" ? "was unchanged" : `moved (${state})`} at its latest reading.${realRateNote}`,
    allInputs,
    calculatedAt,
  });
}

// ── 3. External Sector ───────────────────────────────────────────────────
//
// Combines Reserves, Current Account, Trade Balance, Exports, Imports, and
// Remittances into one improving/deteriorating/mixed state via a
// polarity-aware vote — NOT an arbitrary weighted score. Each indicator
// contributes exactly +1 (moved in its textbook-positive direction), -1
// (textbook-negative), or 0 (Flat or unusable); the signal state is the
// SIGN of the sum, never a magnitude-weighted blend. Polarity itself is
// definitional, not a judgment call: higher reserves/current account/trade
// balance/exports/remittances are unambiguously a stronger external
// position; higher imports add pressure on the trade balance holding
// exports constant (ceteris paribus — a textbook accounting fact, not an
// opinion about whether more imports are "good" for growth).
//
// USD/PKR is deliberately EXCLUDED from this vote — a weaker or stronger
// PKR is a genuinely two-sided textbook question (import cost vs. export
// competitiveness), unlike the other six. It is tracked instead under
// Market Stress, where it is presented as a parallel observation, not
// folded into a polarity judgment this phase has no evidenced basis for.
const EXTERNAL_SECTOR_POLARITY: Record<"reserves" | "currentAccount" | "tradeBalance" | "exports" | "imports" | "remittances", 1 | -1> = {
  reserves: 1,
  currentAccount: 1,
  tradeBalance: 1,
  exports: 1,
  imports: -1,
  remittances: 1,
};

function directionSign(direction: SignalDirection): 1 | 0 | -1 {
  if (direction === "Rising") return 1;
  if (direction === "Falling") return -1;
  return 0;
}

export function evaluateExternalSectorSignal(
  inputs: {
    reserves: IndicatorObservationEvidence | null;
    currentAccount: IndicatorObservationEvidence | null;
    tradeBalance: IndicatorObservationEvidence | null;
    exports: IndicatorObservationEvidence | null;
    imports: IndicatorObservationEvidence | null;
    remittances: IndicatorObservationEvidence | null;
  },
  calculatedAt: string,
): IntelligenceSignal {
  const allInputs = [
    { label: "Foreign Reserves", evidence: inputs.reserves, key: "reserves" as const },
    { label: "Current Account", evidence: inputs.currentAccount, key: "currentAccount" as const },
    { label: "Trade Balance", evidence: inputs.tradeBalance, key: "tradeBalance" as const },
    { label: "Exports", evidence: inputs.exports, key: "exports" as const },
    { label: "Imports", evidence: inputs.imports, key: "imports" as const },
    { label: "Remittances", evidence: inputs.remittances, key: "remittances" as const },
  ];
  const usableInputs = allInputs.filter((i): i is typeof i & { evidence: IndicatorObservationEvidence } => usable(i.evidence));
  if (usableInputs.length === 0) {
    return insufficientSignal({ id: "external-sector", dimension: "ExternalSector", label: "External Sector", allInputs, calculatedAt });
  }
  const vote = usableInputs.reduce((sum, i) => sum + directionSign(i.evidence.direction) * EXTERNAL_SECTOR_POLARITY[i.key], 0);
  const state = vote > 0 ? "improving" : vote < 0 ? "deteriorating" : "mixed";
  const direction: SignalDirection = vote > 0 ? "Rising" : vote < 0 ? "Falling" : "Flat";
  return assembleSignal({
    id: "external-sector",
    dimension: "ExternalSector",
    label: "External Sector",
    state,
    direction,
    summary: `External sector position is ${state}, based on ${usableInputs.length} of ${allInputs.length} tracked indicators (reserves, current account, trade balance, exports, imports, remittances).`,
    allInputs,
    calculatedAt,
  });
}

// ── 4. Liquidity / Credit ────────────────────────────────────────────────
export function evaluateLiquidityCreditSignal(inputs: { m2: IndicatorObservationEvidence | null; privateCreditGrowth: IndicatorObservationEvidence | null }, calculatedAt: string): IntelligenceSignal {
  const allInputs = [
    { label: "M2 Money Supply", evidence: inputs.m2 },
    { label: "Private Credit Growth", evidence: inputs.privateCreditGrowth },
  ];
  const usableInputs = allInputs.filter((i): i is typeof i & { evidence: IndicatorObservationEvidence } => usable(i.evidence));
  if (usableInputs.length === 0) {
    return insufficientSignal({ id: "liquidity-credit", dimension: "LiquidityCredit", label: "Liquidity & Credit", allInputs, calculatedAt });
  }
  const vote = usableInputs.reduce((sum, i) => sum + directionSign(i.evidence.direction), 0);
  const state = vote > 0 ? "expanding" : vote < 0 ? "contracting" : "mixed";
  const direction: SignalDirection = vote > 0 ? "Rising" : vote < 0 ? "Falling" : "Flat";
  return assembleSignal({
    id: "liquidity-credit",
    dimension: "LiquidityCredit",
    label: "Liquidity & Credit",
    state,
    direction,
    summary: `Liquidity and credit conditions are ${state}, based on ${usableInputs.length} of ${allInputs.length} tracked indicators (M2, private credit growth).`,
    allInputs,
    calculatedAt,
  });
}

// ── 5. Fiscal Conditions ─────────────────────────────────────────────────
//
// Fiscal Balance's own direction, reusing the same "rising toward positive
// = improving" accounting fact confirmed at the top of this file (SBP's
// series is negative-for-deficit). Single-indicator dimension in this
// foundation phase — no other fiscal series is currently canonicalized.
export function evaluateFiscalConditionsSignal(inputs: { fiscalBalance: IndicatorObservationEvidence | null }, calculatedAt: string): IntelligenceSignal {
  const allInputs = [{ label: "Fiscal Balance", evidence: inputs.fiscalBalance }];
  if (!usable(inputs.fiscalBalance)) {
    return insufficientSignal({ id: "fiscal-conditions", dimension: "FiscalConditions", label: "Fiscal Conditions", allInputs, calculatedAt });
  }
  const state = directionWord(inputs.fiscalBalance.direction, "improving", "deteriorating", "flat");
  return assembleSignal({
    id: "fiscal-conditions",
    dimension: "FiscalConditions",
    label: "Fiscal Conditions",
    state,
    direction: inputs.fiscalBalance.direction,
    summary: `Fiscal balance is ${state} versus its prior annual reading.`,
    allInputs,
    calculatedAt,
  });
}

// ── 6. Growth ─────────────────────────────────────────────────────────────
//
// DELIBERATELY NOT IMPLEMENTED: sector-composition-aware growth
// classification. getGdpSectorComposition() exists and is available, but
// turning agriculture/industry/services shares into a directional signal
// would require a weighting judgment this phase has no evidenced basis
// for — omitted, not silently approximated. This dimension is headline GDP
// growth direction only.
export function evaluateGrowthSignal(inputs: { gdpGrowth: IndicatorObservationEvidence | null }, calculatedAt: string): IntelligenceSignal {
  const allInputs = [{ label: "GDP Growth", evidence: inputs.gdpGrowth }];
  if (!usable(inputs.gdpGrowth)) {
    return insufficientSignal({ id: "growth", dimension: "Growth", label: "Growth", allInputs, calculatedAt });
  }
  const state = directionWord(inputs.gdpGrowth.direction, "accelerating", "decelerating", "flat");
  return assembleSignal({
    id: "growth",
    dimension: "Growth",
    label: "Growth",
    state,
    direction: inputs.gdpGrowth.direction,
    summary: `GDP growth is ${state} versus the prior annual reading.`,
    allInputs,
    calculatedAt,
  });
}

// ── 7. Market Stress ─────────────────────────────────────────────────────
//
// Gold (yahoo:goldMonthly — COMEX futures, not spot; see Phase 8.22) and
// USD/PKR (SBP's monthly-average series, sbp:usdPkr — the live intraday
// Yahoo quote is deliberately excluded, see macroIntelligence.ts's header)
// are reported as two INDEPENDENT observations. `state` describes only
// whether they moved in directions historically associated with risk-off
// sentiment AT THE SAME TIME ("pressure-building"/"pressure-easing") or did
// not ("mixed") — this is a factual co-occurrence label, never a causal
// claim. The summary text says so explicitly, per the brief's "Do NOT claim
// causal relationships merely because two variables moved together."
export function evaluateMarketStressSignal(inputs: { gold: IndicatorObservationEvidence | null; usdPkr: IndicatorObservationEvidence | null }, calculatedAt: string): IntelligenceSignal {
  const allInputs = [
    { label: "Gold (COMEX futures, monthly)", evidence: inputs.gold },
    { label: "USD/PKR (SBP monthly average)", evidence: inputs.usdPkr },
  ];
  const goldUsable = usable(inputs.gold);
  const fxUsable = usable(inputs.usdPkr);
  if (!goldUsable && !fxUsable) {
    return insufficientSignal({ id: "market-stress", dimension: "MarketStress", label: "Market Stress", allInputs, calculatedAt });
  }
  let state: string;
  let direction: SignalDirection;
  if (goldUsable && fxUsable) {
    const goldRising = inputs.gold!.direction === "Rising";
    const goldFalling = inputs.gold!.direction === "Falling";
    const pkrWeakening = inputs.usdPkr!.direction === "Rising"; // higher PKR-per-USD = depreciation
    const pkrStrengthening = inputs.usdPkr!.direction === "Falling";
    if (goldRising && pkrWeakening) {
      state = "pressure-building";
      direction = "Rising";
    } else if (goldFalling && pkrStrengthening) {
      state = "pressure-easing";
      direction = "Falling";
    } else {
      state = "mixed";
      direction = "Unknown";
    }
  } else {
    // Only one of the two usable — report its own direction, do not guess a joint state.
    const only = goldUsable ? inputs.gold! : inputs.usdPkr!;
    state = "mixed";
    direction = only.direction;
  }
  return assembleSignal({
    id: "market-stress",
    dimension: "MarketStress",
    label: "Market Stress",
    state,
    direction,
    summary: `Gold and USD/PKR movement this period: ${state.replace("-", " ")}. This describes co-occurrence only — no causal relationship between the two is asserted.`,
    allInputs,
    calculatedAt,
  });
}
