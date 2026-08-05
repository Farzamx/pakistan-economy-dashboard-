// Decision Support Lab — Investment Intelligence engine (Phase 5).
//
// This is the platform's core investment-analytics library, following the
// exact split established by timeValueEngine.ts and purchasingPowerEngine.ts:
// pure functions here, presentation in the tools. Every Investment
// Intelligence tool (Real Return Calculator, Asset Comparison Lab,
// Investment Growth Explorer, Portfolio Purchasing Power, Inflation Drag
// Analyzer, Asset Allocation Explorer, Investment Scenario Simulator) is a
// thin UI wrapper over the functions below — and every future portfolio
// tool (Portfolio Analytics, Goal Planning, Retirement Planning,
// Institutional Research) is expected to reuse them.
//
// Deliberately NOT reimplemented here: compounding a value forward
// (timeValueEngine.buildGrowthSeries), stripping inflation out of a
// nominal figure (purchasingPowerEngine.deflateCompounding), and the
// precise real-rate-from-nominal-and-inflation formula
// (purchasingPowerEngine.computeRealRateChange). This engine imports and
// composes those rather than re-deriving the same math a third time —
// there is exactly one place in the codebase that knows how to compound a
// value and exactly one that knows how to strip out inflation.
import { computeRealRateChange, deflateCompounding, projectCompounding } from "@/lib/decisionSupportLab/purchasingPowerEngine";
import { buildGrowthSeries } from "@/lib/decisionSupportLab/timeValueEngine";

// ---------------------------------------------------------------------
// Core return primitives
// ---------------------------------------------------------------------

/** Total (non-annualized) % return between two values — the simplest "how much did this grow" figure. */
export function calculateNominalReturn(beginValue: number, endValue: number): number {
  if (beginValue <= 0) return 0;
  return ((endValue - beginValue) / beginValue) * 100;
}

/** Compound Annual Growth Rate — the annualized return implied by a total change over `years`. Canonical implementation; calculateAnnualizedReturn() is the same formula under the name tools' UI copy uses. */
export function calculateCAGR(beginValue: number, endValue: number, years: number): number {
  if (beginValue <= 0 || years <= 0) return 0;
  return (Math.pow(endValue / beginValue, 1 / years) - 1) * 100;
}

/** Alias of calculateCAGR() — "annualized return" and "CAGR" are the same number, surfaced under both names since tools and formula references use different vocabulary for the same primitive. */
export function calculateAnnualizedReturn(beginValue: number, endValue: number, years: number): number {
  return calculateCAGR(beginValue, endValue, years);
}

/** Real (inflation-adjusted) return from a nominal return and an inflation rate — reuses purchasingPowerEngine's precise compounding formula rather than the common (and slightly wrong) nominal-minus-inflation shorthand. This is the one function every Investment Intelligence tool calls to answer "how much did this actually grow after inflation." */
export function calculateRealReturn(nominalReturnPct: number, inflationPct: number): number {
  return computeRealRateChange(nominalReturnPct, inflationPct);
}

// ---------------------------------------------------------------------
// Risk primitives
// ---------------------------------------------------------------------

/** Return per unit of risk — a simple return-to-volatility ratio, useful for ranking assets when a risk-free rate isn't specified. Higher is better. */
export function calculateRiskAdjustedReturn(returnPct: number, volatilityPct: number): number {
  if (volatilityPct <= 0) return 0;
  return returnPct / volatilityPct;
}

/** A Sharpe-ratio approximation: excess return (over the risk-free rate) per unit of volatility. Called an "approximation" deliberately — a true Sharpe ratio uses a full return distribution, not a single period's return and volatility figure. */
export function calculateSharpeApproximation(returnPct: number, riskFreeRatePct: number, volatilityPct: number): number {
  if (volatilityPct <= 0) return 0;
  return (returnPct - riskFreeRatePct) / volatilityPct;
}

export interface DrawdownResult {
  maxDrawdownPct: number;
  /** Drawdown at each point in `series`, as a % below the running peak-to-date (0 at a new high). */
  drawdownSeries: number[];
}

/** Peak-to-trough decline at every point in a value series, and the worst (maximum) drawdown overall — the standard risk metric for "how bad did it get" independent of the final return. */
export function calculateDrawdown(series: number[]): DrawdownResult {
  let peak = -Infinity;
  let maxDrawdownPct = 0;
  const drawdownSeries: number[] = [];
  for (const value of series) {
    peak = Math.max(peak, value);
    const drawdownPct = peak > 0 ? ((value - peak) / peak) * 100 : 0;
    drawdownSeries.push(drawdownPct);
    maxDrawdownPct = Math.min(maxDrawdownPct, drawdownPct);
  }
  return { maxDrawdownPct, drawdownSeries };
}

// ---------------------------------------------------------------------
// Growth & purchasing power
// ---------------------------------------------------------------------

export interface InflationAdjustedGrowthResult {
  nominalEndValue: number;
  realEndValue: number;
  purchasingPowerLostPct: number;
}

/** Projects a starting value forward at a nominal return, then strips out inflation over the same horizon — the composed nominal-growth + inflation-adjustment calculation every "what did my investment really earn" tool needs. Reuses projectCompounding() (nominal growth) and deflateCompounding() (inflation adjustment) rather than reimplementing either. */
export function calculateInflationAdjustedGrowth(beginValue: number, nominalReturnPct: number, inflationPct: number, years: number): InflationAdjustedGrowthResult {
  const nominalEndValue = projectCompounding(beginValue, nominalReturnPct, years);
  const realEndValue = deflateCompounding(nominalEndValue, inflationPct, years);
  const purchasingPowerLostPct = beginValue > 0 ? ((beginValue - realEndValue) / beginValue) * 100 : 0;
  return { nominalEndValue, realEndValue, purchasingPowerLostPct };
}

/** % of original purchasing power retained after inflation — 100 means fully preserved, below 100 means eroded, above 100 means real wealth actually grew. */
export function calculatePurchasingPowerPreservation(beginValue: number, realEndValue: number): number {
  if (beginValue <= 0) return 0;
  return (realEndValue / beginValue) * 100;
}

export interface ReturnSeriesPoint {
  year: number;
  nominalValue: number;
  realValue: number;
}

/** Year-by-year nominal growth path — a thin, explicitly-named wrapper over timeValueEngine.buildGrowthSeries() (annual compounding), not a reimplementation, so every Investment Intelligence chart shares the exact same compounding code as the Time Value of Money tools. */
export function buildReturnSeries(beginValue: number, annualReturnPct: number, years: number): ReturnSeriesPoint[] {
  return buildGrowthSeries(beginValue, annualReturnPct, years, 1).map((p) => ({ year: p.period, nominalValue: p.value, realValue: p.value }));
}

/** Year-by-year nominal AND real (inflation-stripped) growth path in one series — the data behind every "Nominal vs. Real" chart in this section of the Lab. */
export function buildRealReturnSeries(beginValue: number, nominalReturnPct: number, inflationPct: number, years: number): ReturnSeriesPoint[] {
  return buildGrowthSeries(beginValue, nominalReturnPct, years, 1).map((p) => ({
    year: p.period,
    nominalValue: p.value,
    realValue: deflateCompounding(p.value, inflationPct, p.period),
  }));
}

/**
 * Annualized volatility (standard deviation of period-over-period %
 * changes, scaled by √periodsPerYear) from a raw historical price/level
 * series — the "Risk" figure the Asset Comparison Lab shows for assets
 * with a real price history (gold, USD/PKR, PSX proxy), left undefined
 * for quoted-rate assets (T-Bills, PIBs, Policy Rate) where a return
 * distribution isn't meaningful in the same way.
 */
export function calculateVolatility(series: HistoricalPoint[], periodsPerYear: number = 12): number | null {
  if (series.length < 3) return null;
  const sorted = [...series].sort((a, b) => a.date.localeCompare(b.date));
  const periodReturns: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i - 1].value > 0) periodReturns.push(calculateNominalReturn(sorted[i - 1].value, sorted[i].value));
  }
  if (periodReturns.length < 2) return null;
  const mean = periodReturns.reduce((s, r) => s + r, 0) / periodReturns.length;
  const variance = periodReturns.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / (periodReturns.length - 1);
  return Math.sqrt(variance) * Math.sqrt(periodsPerYear);
}

// ---------------------------------------------------------------------
// Multi-asset & portfolio primitives
// ---------------------------------------------------------------------

export interface AssetInput {
  id: string;
  name: string;
  nominalReturnPct: number;
  volatilityPct?: number;
  /** Whether nominalReturnPct came from a live PEIC data source or a visitor-entered estimate — surfaced so tools can honestly label each row rather than implying every figure is equally verified. */
  isEstimate?: boolean;
}

export interface AssetComparisonResult extends AssetInput {
  realReturnPct: number;
  riskAdjustedReturn: number | null;
  rank: number;
}

/** Ranks a set of assets by real (inflation-adjusted) return — the deterministic core of the Asset Comparison Lab. Real return, not nominal, decides the ranking, since a higher nominal return at higher inflation can lose to a lower nominal return at lower inflation. */
export function compareAssets(assets: AssetInput[], inflationPct: number): AssetComparisonResult[] {
  const withReturns = assets.map((asset) => ({
    ...asset,
    realReturnPct: calculateRealReturn(asset.nominalReturnPct, inflationPct),
    riskAdjustedReturn: asset.volatilityPct !== undefined && asset.volatilityPct > 0 ? calculateRiskAdjustedReturn(asset.nominalReturnPct, asset.volatilityPct) : null,
  }));
  return [...withReturns]
    .sort((a, b) => b.realReturnPct - a.realReturnPct)
    .map((asset, i) => ({ ...asset, rank: i + 1 }));
}

export interface PortfolioAllocationEntry {
  assetId: string;
  assetName: string;
  weightPct: number;
  nominalReturnPct: number;
}

export interface PortfolioContribution extends PortfolioAllocationEntry {
  /** This asset's share of the portfolio's overall nominal return — weightPct/100 × nominalReturnPct. */
  contributionPct: number;
}

export interface PortfolioReturnResult {
  portfolioNominalReturnPct: number;
  portfolioRealReturnPct: number;
  contributions: PortfolioContribution[];
}

/** Weighted-average portfolio return (nominal and real) plus each asset's contribution to the total — the same weighted-sum pattern personalInflation/engine.ts's computeWeightedRate() uses, applied to asset returns instead of CPI category rates. */
export function calculatePortfolioReturn(allocations: PortfolioAllocationEntry[], inflationPct: number): PortfolioReturnResult {
  const totalWeight = allocations.reduce((sum, a) => sum + a.weightPct, 0);
  const normalized = totalWeight > 0 ? allocations.map((a) => ({ ...a, weightPct: (a.weightPct / totalWeight) * 100 })) : allocations;

  const contributions: PortfolioContribution[] = normalized.map((a) => ({ ...a, contributionPct: (a.weightPct / 100) * a.nominalReturnPct }));
  const portfolioNominalReturnPct = contributions.reduce((sum, c) => sum + c.contributionPct, 0);
  const portfolioRealReturnPct = calculateRealReturn(portfolioNominalReturnPct, inflationPct);

  return { portfolioNominalReturnPct, portfolioRealReturnPct, contributions };
}

/**
 * Diversification score (0-100) from a set of portfolio weights, based on
 * the inverse Herfindahl-Hirschman Index — a 100%-in-one-asset portfolio
 * scores 0, an equally-split portfolio across N assets approaches 100 as
 * N grows. Standard portfolio-theory concentration measure, not a
 * bespoke heuristic.
 */
export function calculateDiversificationScore(weightsPct: number[]): number {
  const total = weightsPct.reduce((sum, w) => sum + w, 0);
  if (total <= 0) return 0;
  const hhi = weightsPct.reduce((sum, w) => sum + Math.pow(w / total, 2), 0);
  return Math.max(0, Math.min(100, (1 - hhi) * 100));
}

// ---------------------------------------------------------------------
// Scenario Engine — formalizes what was previously a private, non-exported
// helper inside InvestmentScenarioSimulatorCalculator.tsx. Pure relocation,
// no behavior change: that Calculator now imports this instead of defining
// its own copy, and Asset Allocation Explorer's Scenario Comparison strip
// (Phase 5.5) reuses the same function against its own bucket weights
// rather than reimplementing scenario math a second time.
// ---------------------------------------------------------------------

export type ScenarioAssetId = "cash" | "gold" | "equities" | "govtSecurities" | "foreignCurrency";

export interface ScenarioDefinitionInput {
  inflationDeltaPp: number;
  assetReturnDeltasPp: Partial<Record<ScenarioAssetId, number>>;
}

export interface ScenarioRunResult {
  portfolioNominalReturnPct: number;
  portfolioRealReturnPct: number;
}

/** Applies a scenario's fixed, documented deltas to a baseline allocation and inflation rate, then runs the result through calculatePortfolioReturn() — the same function every other portfolio tool in the Lab uses, so a scenario's outcome is always directly comparable to the unshocked baseline. */
export function runInvestmentScenario(baseAllocations: PortfolioAllocationEntry[], baseInflationPct: number, scenario: ScenarioDefinitionInput): ScenarioRunResult {
  const adjustedAllocations = baseAllocations.map((a) => ({ ...a, nominalReturnPct: a.nominalReturnPct + (scenario.assetReturnDeltasPp[a.assetId as ScenarioAssetId] ?? 0) }));
  const adjustedInflation = baseInflationPct + scenario.inflationDeltaPp;
  const result = calculatePortfolioReturn(adjustedAllocations, adjustedInflation);
  return { portfolioNominalReturnPct: result.portfolioNominalReturnPct, portfolioRealReturnPct: result.portfolioRealReturnPct };
}

// ---------------------------------------------------------------------
// Portfolio risk (correlation-adjusted volatility) & recommended
// allocation — new for the Asset Allocation Explorer redesign (Phase
// 5.5). ASSET_CORRELATIONS is explicitly a fixed, illustrative
// assumption, not computed from live return data — no correlation data
// source exists for these asset classes (quoted-rate assets like T-Bills
// have no return distribution to correlate in the first place). Any
// component rendering a correlation figure MUST label it as illustrative
// directly on the panel, not only in ExplainTheMath's limitations prop —
// the same credibility problem the Money Market Fund/Property copy fix
// addressed would otherwise resurface here.
// ---------------------------------------------------------------------

/** Symmetric, illustrative correlation assumptions between the 5 Asset Allocation Explorer buckets — documented, fixed values, not derived from any live data source. */
export const ASSET_CORRELATIONS: Record<ScenarioAssetId, Partial<Record<ScenarioAssetId, number>>> = {
  cash: { cash: 1, gold: 0.05, equities: -0.1, govtSecurities: 0.3, foreignCurrency: 0.1 },
  gold: { cash: 0.05, gold: 1, equities: -0.2, govtSecurities: 0.1, foreignCurrency: 0.3 },
  equities: { cash: -0.1, gold: -0.2, equities: 1, govtSecurities: -0.1, foreignCurrency: 0.2 },
  govtSecurities: { cash: 0.3, gold: 0.1, equities: -0.1, govtSecurities: 1, foreignCurrency: 0.15 },
  foreignCurrency: { cash: 0.1, gold: 0.3, equities: 0.2, govtSecurities: 0.15, foreignCurrency: 1 },
};

/** Illustrative fallback annualized volatility (%) per bucket, used only when no real price-history volatility is available (e.g. quoted-rate assets) — same "documented assumption, not live data" caveat as ASSET_CORRELATIONS. */
export const ASSET_VOLATILITY_FALLBACK_PCT: Record<ScenarioAssetId, number> = {
  cash: 2,
  gold: 15,
  equities: 25,
  govtSecurities: 5,
  foreignCurrency: 8,
};

export interface VolatilityAllocationEntry {
  assetId: ScenarioAssetId;
  weightPct: number;
  volatilityPct: number | null;
}

/** Portfolio-level volatility via the standard weighted-covariance formula (√ΣΣ wᵢwⱼσᵢσⱼρᵢⱼ) — legitimate textbook math; the illustrative *input* is ASSET_CORRELATIONS, not the formula itself. Falls back to ASSET_VOLATILITY_FALLBACK_PCT for any asset with no real volatility figure. */
export function calculatePortfolioVolatility(allocations: VolatilityAllocationEntry[]): number {
  const totalWeight = allocations.reduce((sum, a) => sum + a.weightPct, 0);
  if (totalWeight <= 0) return 0;
  const normalized = allocations.map((a) => ({ ...a, weight: a.weightPct / totalWeight, volatility: a.volatilityPct ?? ASSET_VOLATILITY_FALLBACK_PCT[a.assetId] }));

  let variance = 0;
  for (const i of normalized) {
    for (const j of normalized) {
      const rho = ASSET_CORRELATIONS[i.assetId]?.[j.assetId] ?? (i.assetId === j.assetId ? 1 : 0);
      variance += i.weight * j.weight * i.volatility * j.volatility * rho;
    }
  }
  return Math.sqrt(Math.max(0, variance));
}

export type RiskTolerance = "conservative" | "moderate" | "aggressive";

/** 3 fixed preset target allocations, keyed by the profile's risk_tolerance — a starting point to compare against, staged into What-If rather than applied directly (the caller decides when/whether to adopt it). */
export function getRecommendedAllocation(riskTolerance: RiskTolerance): Record<ScenarioAssetId, number> {
  switch (riskTolerance) {
    case "conservative":
      return { cash: 40, gold: 15, equities: 10, govtSecurities: 30, foreignCurrency: 5 };
    case "aggressive":
      return { cash: 10, gold: 15, equities: 45, govtSecurities: 15, foreignCurrency: 15 };
    case "moderate":
    default:
      return { cash: 20, gold: 20, equities: 25, govtSecurities: 25, foreignCurrency: 10 };
  }
}

export interface RebalanceAction {
  assetId: string;
  assetName: string;
  currentWeightPct: number;
  targetWeightPct: number;
  /** Positive = buy this much more (percentage points of portfolio); negative = sell. */
  actionPct: number;
}

/** Diffs a current allocation against a target allocation — the buy/sell adjustment needed per asset to reach the target. Deliberately simple (no tax-lot or transaction-cost modeling) — the mechanical starting point a future Portfolio Analytics tool would layer real-world constraints onto. */
export function rebalancePortfolio(current: PortfolioAllocationEntry[], target: Record<string, number>): RebalanceAction[] {
  return current.map((entry) => {
    const targetWeightPct = target[entry.assetId] ?? entry.weightPct;
    return { assetId: entry.assetId, assetName: entry.assetName, currentWeightPct: entry.weightPct, targetWeightPct, actionPct: targetWeightPct - entry.weightPct };
  });
}

export interface HistoricalPoint {
  date: string;
  value: number;
}

/**
 * Annualized return implied by two points roughly `approxDays` apart in a
 * raw historical series (latest point vs. the nearest point at or before
 * `approxDays` ago) — reusable by any future tool that only has a raw
 * price/level history and needs an honest realized return, rather than a
 * quoted rate. Returns null when the series doesn't span far enough back.
 */
export function calculateTrailingReturn(series: HistoricalPoint[], approxDays: number): number | null {
  if (series.length < 2) return null;
  const sorted = [...series].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted[sorted.length - 1];
  const targetTime = new Date(latest.date).getTime() - approxDays * 86_400_000;
  const eligible = sorted.filter((p) => new Date(p.date).getTime() <= targetTime);
  if (eligible.length === 0) return null;
  const anchor = eligible[eligible.length - 1];
  if (anchor.value <= 0) return null;
  const actualDays = (new Date(latest.date).getTime() - new Date(anchor.date).getTime()) / 86_400_000;
  const totalReturnPct = calculateNominalReturn(anchor.value, latest.value);
  // Annualize using the ACTUAL elapsed days between the two points found,
  // not the requested approxDays — history points are irregularly spaced
  // (SBP auctions, market holidays), so the nearest available anchor is
  // rarely exactly `approxDays` away.
  const years = actualDays / 365;
  return years > 0 ? calculateCAGR(anchor.value, latest.value, years) : totalReturnPct;
}
