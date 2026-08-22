// Macro Intelligence Engine — shared types — Phase 9.1 foundation.
//
// WHAT THIS IS: a deterministic, rule-based layer that classifies existing
// certified observations (SBP EasyData, World Bank, FRED, Yahoo Gold — all
// already canonicalized/freshness-aware per the frozen Phase 8 architecture)
// into per-dimension analytical states — "is inflation rising or falling",
// "is policy tightening or easing" — rather than only exposing "what is the
// latest value" (today's KpiCard model).
//
// WHAT THIS IS NOT: this is not a second Health/Risk score. It does not
// duplicate src/lib/economicHealth.ts (single 0-100 Health Score) or
// src/lib/riskModels.ts (Recession/Default probability models) — those
// already exist, are deterministic, and remain untouched. This engine
// answers a genuinely different question (per-dimension direction/state,
// not one aggregate number) and reuses riskModels.ts's own confidence
// vocabulary (ConfidenceLevel, IndicatorStatus, computeDataConfidence)
// rather than inventing a parallel one — see evidence.ts.
//
// No file in this directory calls a provider API or queries
// raw_observations/canonical_observations directly. Every observation this
// engine consumes comes from an already-certified read-model function
// (sbpServer.ts, fxReserves.ts, worldBank.ts, fredCanonicalStore.ts,
// yahooGoldCanonicalStore.ts) — see macroIntelligence.ts, the only file in
// this directory that performs I/O.

import type { FreshnessResult } from "@/lib/freshness/freshnessEngine";
import type { ConfidenceLevel } from "@/lib/riskModels";
import type { AccelerationState } from "./trendAnalysis";

/**
 * The seven analytical dimensions this foundation phase covers. Each is
 * independently classified — never collapsed into one composite label (see
 * MacroRegimeSnapshot below). Kept as a small, fixed union: a future phase
 * may add a dimension, but this phase does not speculatively reserve one.
 */
export type IntelligenceDimension =
  | "Inflation"
  | "MonetaryPolicy"
  | "ExternalSector"
  | "LiquidityCredit"
  | "FiscalConditions"
  | "Growth"
  | "MarketStress";

/**
 * Pure sign of a period-over-period change — zero invented threshold. "Flat"
 * means the change was exactly zero; a value one cent off zero is Rising or
 * Falling, not "materially flat", because "materially" would require an
 * economic threshold this phase has no evidenced basis to invent (see
 * trendAnalysis.ts's header for the full reasoning).
 */
export type SignalDirection = "Rising" | "Falling" | "Flat" | "Unknown";

/**
 * How usable one underlying observation is for signal logic RIGHT NOW —
 * derived directly from the observation's own authoritative
 * FreshnessResult.state (via FRESHNESS_SEVERITY, freshnessEngine.ts), never
 * inferred from sourceStatus and never recomputed independently. See
 * evidence.ts's classifyAvailability().
 */
export type SignalInputAvailability = "Fresh" | "DelayedRelease" | "Stale" | "Unavailable";

/** Confidence for one signal — reuses riskModels.ts's ConfidenceLevel verbatim, adding only the "Insufficient" case that function doesn't model (zero valid inputs). See evidence.ts's confidence rationale. */
export type SignalConfidence = ConfidenceLevel | "Insufficient";

/**
 * One underlying indicator's contribution to a signal — the traceability
 * unit. Every field here must be answerable from data the read-model layer
 * already returned; nothing here is fabricated or inferred beyond a plain
 * period-over-period delta.
 */
export interface IndicatorObservationEvidence {
  /** Provider-qualified series id, matching seriesRegistry.ts's/SERIES_CATALOG's existing keys (e.g. "sbp:cpiInflation", "fred:fedFunds"). */
  seriesId: string;
  /** Human label, e.g. "CPI Inflation (YoY)". */
  label: string;
  /** The latest observation's raw value, exactly as the read model returned it — never rounded/transformed beyond what the read model itself already does. Null when unavailable. */
  value: number | null;
  unit: string;
  /** "YYYY-MM-DD" or null when unavailable. */
  observationPeriod: string | null;
  direction: SignalDirection;
  changeAbsolute: number | null;
  changePercent: number | null;
  /** Change-of-change: is the latest period's move itself faster or slower than the prior period's move, in the same direction? "Unknown" when fewer than 3 history points exist — never guessed. */
  acceleration: AccelerationState;
  availability: SignalInputAvailability;
  /** The exact 8-state verdict this evidence was gated on — never simplified away, even though `availability` above is the coarser 4-state summary a signal rule reasons over. */
  freshnessState: FreshnessResult["state"] | "not-registered";
  /** Freshness engine's own reason string, or a fixed explanation when the series has no freshness registry entry at all (e.g. a live intraday quote — see evidence.ts). */
  freshnessReason: string;
  /** True only when the read model itself already reported this value as a hardcoded/static fallback (never guessed) — independent of `availability`: a fallback snapshot can still fall inside its cadence's grace window and read as "Fresh" by date while remaining a non-live value, which is exactly what confidence scoring needs to weigh. */
  isFallback: boolean;
}

/**
 * One dimension's computed signal. `state` is a small, dimension-specific
 * string (documented per dimension in signalDefinitions.ts) — deliberately
 * NOT a shared enum across all seven dimensions, because "Rising" means
 * something different for Inflation than for MonetaryPolicy's rate-change
 * direction; each dimension names its own states honestly rather than
 * forcing a shared vocabulary that would blur meaning.
 */
export interface IntelligenceSignal {
  /** Stable, kebab-case identifier (matches this project's existing DashboardSection id convention) — e.g. "inflation", "monetary-policy". */
  id: string;
  dimension: IntelligenceDimension;
  label: string;
  /** Dimension-specific descriptive state — see signalDefinitions.ts. Always "insufficient-data" when evidence is inadequate, never a guessed state. */
  state: string;
  direction: SignalDirection;
  confidence: SignalConfidence;
  /** 0-100, from riskModels.ts's computeDataConfidence() — null only when confidence is "Insufficient" (computeDataConfidence is not called on zero inputs; see evidence.ts). */
  confidenceScore: number | null;
  /** One-sentence, non-causal, evidence-grounded description. Never asserts a threshold, target, or causal relationship this phase has no evidenced basis for. */
  summary: string;
  evidence: IndicatorObservationEvidence[];
  /** Labels of indicators this signal WOULD have used but could not (stale/unavailable/not registered) — explicit, not silently dropped. */
  missingInputs: string[];
  calculatedAt: string;
}

/**
 * Multi-dimensional snapshot — deliberately a per-dimension record, not one
 * composite regime label. Phase 9.1 brief section 8: "A multi-dimensional
 * state is preferable to an oversimplified single label." A dimension is
 * omitted from `dimensions` (rather than forced to a guessed key) only if
 * its own signal could not be computed at all.
 */
export interface MacroRegimeSnapshot {
  dimensions: Partial<Record<IntelligenceDimension, string>>;
  calculatedAt: string;
}

export interface MacroIntelligenceReport {
  signals: IntelligenceSignal[];
  regime: MacroRegimeSnapshot;
  calculatedAt: string;
}
