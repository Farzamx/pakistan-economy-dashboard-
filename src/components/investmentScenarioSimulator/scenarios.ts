// Scenario definitions for the Investment Scenario Simulator — each
// scenario is a deterministic set of adjustments (inflation delta,
// per-bucket return deltas) applied to the same 5-bucket allocation the
// Asset Allocation Explorer uses, reusing calculatePortfolioReturn() to
// compute the outcome. No AI-generated scenario content — every number
// here is a fixed, documented assumption.
export type ScenarioId = "baseline" | "higherInflation" | "lowerInflation" | "marketCrash" | "interestRateIncrease" | "currencyDepreciation";

export interface ScenarioDefinition {
  id: ScenarioId;
  labelKey: string;
  inflationDeltaPp: number;
  assetReturnDeltasPp: Partial<Record<"cash" | "gold" | "equities" | "govtSecurities" | "foreignCurrency", number>>;
}

export const SCENARIOS: ScenarioDefinition[] = [
  { id: "baseline", labelKey: "investmentScenarioSimulator.scenarioBaseline", inflationDeltaPp: 0, assetReturnDeltasPp: {} },
  { id: "higherInflation", labelKey: "investmentScenarioSimulator.scenarioHigherInflation", inflationDeltaPp: 5, assetReturnDeltasPp: {} },
  { id: "lowerInflation", labelKey: "investmentScenarioSimulator.scenarioLowerInflation", inflationDeltaPp: -3, assetReturnDeltasPp: {} },
  { id: "marketCrash", labelKey: "investmentScenarioSimulator.scenarioMarketCrash", inflationDeltaPp: 0, assetReturnDeltasPp: { equities: -25 } },
  { id: "interestRateIncrease", labelKey: "investmentScenarioSimulator.scenarioInterestRateIncrease", inflationDeltaPp: 0, assetReturnDeltasPp: { cash: 3, govtSecurities: 3 } },
  { id: "currencyDepreciation", labelKey: "investmentScenarioSimulator.scenarioCurrencyDepreciation", inflationDeltaPp: 0, assetReturnDeltasPp: { foreignCurrency: 10 } },
];
