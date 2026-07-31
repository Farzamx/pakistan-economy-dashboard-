"use client";

import { useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import InvestmentScenarioSimulatorForm from "@/components/investmentScenarioSimulator/InvestmentScenarioSimulatorForm";
import InflationRateField from "@/components/decisionSupportLab/InflationRateField";
import InvestmentScenarioSimulatorResults from "@/components/investmentScenarioSimulator/InvestmentScenarioSimulatorResults";
import InvestmentScenarioSimulatorCharts from "@/components/investmentScenarioSimulator/InvestmentScenarioSimulatorCharts";
import ToolShareCard from "@/components/decisionSupportLab/ToolShareCard";
import DecisionSupportPanel from "@/components/decisionSupportLab/DecisionSupportPanel";
import ExplainTheMath from "@/components/decisionSupportLab/ExplainTheMath";
import EducationalPanel from "@/components/decisionSupportLab/EducationalPanel";
import ReportDownloadButton from "@/components/decisionSupportLab/ReportDownloadButton";
import { SCENARIOS, type ScenarioId, type ScenarioDefinition } from "@/components/investmentScenarioSimulator/scenarios";
import { calculatePortfolioReturn, type PortfolioAllocationEntry } from "@/lib/decisionSupportLab/investmentEngine";
import { computeOfficialCpiPct } from "@/lib/personalInflation/engine";
import type { ReportDefinition } from "@/lib/decisionSupportLab/reportFramework";
import type { CpiCategoryBreakdown } from "@/lib/data/cpiCategoryBreakdown";
import type { LiveAssetData } from "@/lib/decisionSupportLab/liveAssetData";

interface Props {
  breakdown: CpiCategoryBreakdown | null;
  liveData: LiveAssetData;
}

const BASE_WEIGHTS: Record<"cash" | "gold" | "equities" | "govtSecurities" | "foreignCurrency", number> = {
  cash: 25,
  gold: 20,
  equities: 20,
  govtSecurities: 25,
  foreignCurrency: 10,
};

function runScenario(
  baseAllocations: PortfolioAllocationEntry[],
  baseInflationPct: number,
  scenario: ScenarioDefinition,
): { portfolioNominalReturnPct: number; portfolioRealReturnPct: number } {
  const adjustedAllocations = baseAllocations.map((a) => ({ ...a, nominalReturnPct: a.nominalReturnPct + (scenario.assetReturnDeltasPp[a.assetId as keyof typeof scenario.assetReturnDeltasPp] ?? 0) }));
  const adjustedInflation = baseInflationPct + scenario.inflationDeltaPp;
  const result = calculatePortfolioReturn(adjustedAllocations, adjustedInflation);
  return { portfolioNominalReturnPct: result.portfolioNominalReturnPct, portfolioRealReturnPct: result.portfolioRealReturnPct };
}

export default function InvestmentScenarioSimulatorCalculator({ breakdown, liveData }: Props) {
  const { t } = useLanguage();
  const officialInflationPct = useMemo(() => (breakdown ? computeOfficialCpiPct(breakdown.groups) : 0), [breakdown]);

  const [portfolioValue, setPortfolioValue] = useState(0);
  const [useCustomInflation, setUseCustomInflation] = useState(false);
  const [customInflationPct, setCustomInflationPct] = useState(0);
  const inflationPct = useCustomInflation ? customInflationPct : officialInflationPct;
  const [scenarioId, setScenarioId] = useState<ScenarioId>("baseline");

  const baseAllocations: PortfolioAllocationEntry[] = useMemo(
    () => [
      { assetId: "cash", assetName: t("decisionSupportLab.assetCash"), weightPct: BASE_WEIGHTS.cash, nominalReturnPct: liveData.savings.nominalReturnPct ?? 0 },
      { assetId: "gold", assetName: t("decisionSupportLab.assetGold"), weightPct: BASE_WEIGHTS.gold, nominalReturnPct: liveData.gold.nominalReturnPct ?? 0 },
      { assetId: "equities", assetName: t("decisionSupportLab.assetEquities"), weightPct: BASE_WEIGHTS.equities, nominalReturnPct: liveData.psx.nominalReturnPct ?? 0 },
      { assetId: "govtSecurities", assetName: t("decisionSupportLab.assetGovtSecurities"), weightPct: BASE_WEIGHTS.govtSecurities, nominalReturnPct: liveData.pib.nominalReturnPct ?? 0 },
      { assetId: "foreignCurrency", assetName: t("decisionSupportLab.assetForeignCurrency"), weightPct: BASE_WEIGHTS.foreignCurrency, nominalReturnPct: liveData.usd.nominalReturnPct ?? 0 },
    ],
    [liveData, t],
  );

  const scenario = SCENARIOS.find((s) => s.id === scenarioId) ?? SCENARIOS[0];
  const result = useMemo(() => runScenario(baseAllocations, inflationPct, scenario), [baseAllocations, inflationPct, scenario]);
  const realValue = portfolioValue * (1 + result.portfolioRealReturnPct / 100);
  const portfolioImpact = realValue - portfolioValue;

  const chartData = useMemo(
    () =>
      SCENARIOS.map((s) => {
        const r = runScenario(baseAllocations, inflationPct, s);
        return { name: t(s.labelKey), realReturnPct: r.portfolioRealReturnPct, isSelected: s.id === scenarioId };
      }),
    [baseAllocations, inflationPct, scenarioId, t],
  );

  function buildReport(): ReportDefinition {
    return {
      toolName: "Investment Scenario Simulator",
      subtitle: "Pakistan Economic Intelligence Center — Decision Support Lab",
      generatedAt: new Date().toISOString().slice(0, 10),
      sourceNote: `Source: PEIC Investment Intelligence Engine, baseline live data as of ${liveData.asOfDate}`,
      sections: [
        {
          heading: t(scenario.labelKey),
          paragraphs: [
            `Under this scenario, a Rs ${Math.round(portfolioValue).toLocaleString("en-US")} portfolio has a real return of ${result.portfolioRealReturnPct.toFixed(1)}%, a portfolio impact of Rs ${Math.round(portfolioImpact).toLocaleString("en-US")}.`,
          ],
          facts: [
            { label: "Portfolio Value", value: `Rs ${Math.round(portfolioValue).toLocaleString("en-US")}` },
            { label: "Nominal Return", value: `${result.portfolioNominalReturnPct.toFixed(1)}%` },
            { label: "Real Return", value: `${result.portfolioRealReturnPct >= 0 ? "+" : ""}${result.portfolioRealReturnPct.toFixed(1)}%` },
            { label: "Portfolio Impact", value: `Rs ${Math.round(portfolioImpact).toLocaleString("en-US")}` },
          ],
        },
        {
          heading: "All Scenarios (Real Return)",
          facts: chartData.map((d) => ({ label: d.name, value: `${d.realReturnPct >= 0 ? "+" : ""}${d.realReturnPct.toFixed(1)}%` })),
        },
      ],
    };
  }

  return (
    <div id="calculator-input" className="flex flex-col gap-6">
      <InvestmentScenarioSimulatorForm
        portfolioValue={portfolioValue}
        onPortfolioValueChange={setPortfolioValue}
        scenarioId={scenarioId}
        onScenarioIdChange={setScenarioId}
      />

      <div className="glass-card rounded-xl p-4 sm:p-5">
        <InflationRateField
          autoValuePct={officialInflationPct}
          autoLabel="Official Inflation (Latest)"
          tooltipText="Calculated automatically from the latest official CPI data. This is the baseline inflation rate scenarios apply their delta to."
          useCustom={useCustomInflation}
          onUseCustomChange={setUseCustomInflation}
          customValuePct={customInflationPct}
          onCustomValuePctChange={setCustomInflationPct}
        />
      </div>

      {portfolioValue <= 0 && (
        <div className="rounded-lg border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">{t("decisionSupportLab.validationEnterAmount")}</div>
      )}

      <InvestmentScenarioSimulatorResults portfolioImpact={portfolioImpact} realReturnPct={result.portfolioRealReturnPct} realValue={realValue} />

      <ToolShareCard
        title="My Scenario Result"
        headlineValue={`${result.portfolioRealReturnPct >= 0 ? "+" : ""}${result.portfolioRealReturnPct.toFixed(1)}%`}
        headlineTone={result.portfolioRealReturnPct >= 0 ? "down" : "up"}
        comparisonLine={`${t(scenario.labelKey)} — Rs ${Math.round(portfolioValue).toLocaleString("en-US")} portfolio`}
        deltaLine={`Portfolio impact: Rs ${Math.round(portfolioImpact).toLocaleString("en-US")}`}
        badgeLines={["PEIC Investment Intelligence", t(scenario.labelKey)]}
        shareUrl="https://www.pakeconintel.com/decision-support-lab/investment-scenario-simulator"
        shareSummary={`Under "${t(scenario.labelKey)}", my portfolio's real return would be ${result.portfolioRealReturnPct.toFixed(1)}% — a portfolio impact of Rs ${Math.round(portfolioImpact).toLocaleString("en-US")}.`}
        filenameBase="my-scenario-result"
      />

      <ReportDownloadButton buildDefinition={buildReport} filename="investment-scenario-report.pdf" label={t("decisionSupportLab.downloadReport")} generatingLabel={t("decisionSupportLab.generatingReport")} />

      <InvestmentScenarioSimulatorCharts data={chartData} />

      <ExplainTheMath
        formula="Adjusted Return = Base Return + Scenario Delta; Adjusted Inflation = Base Inflation + Scenario Delta; Real Return = calculateRealReturn(Adjusted Return, Adjusted Inflation)"
        variables={[
          { symbol: "Base Return / Inflation", description: "Your baseline portfolio's current return and inflation rate" },
          { symbol: "Scenario Delta", description: "A fixed, documented adjustment specific to each scenario (e.g. Market Crash: −25pp to equities)" },
        ]}
        methodology="Each scenario is a deterministic set of percentage-point adjustments applied to the same baseline allocation, then run through calculatePortfolioReturn() — the exact same function Portfolio Purchasing Power and Asset Allocation Explorer use, so a scenario's outcome is directly comparable to your baseline elsewhere in the Lab."
        sourceName="PEIC Investment Intelligence Engine"
        lastUpdated={liveData.asOfDate}
        assumptions={["Scenario deltas are fixed, illustrative assumptions, not forecasts — a real market crash or rate change could be larger, smaller, or affect different assets than modeled here.", "The baseline allocation (25% cash, 20% gold, 20% equities, 25% government securities, 10% foreign currency) is a representative starting point, not your actual portfolio."]}
        limitations={["This is a what-if tool for understanding sensitivity, not a prediction — no scenario here is more or less likely than another."]}
      />

      <EducationalPanel
        whatDoesThisMean="This shows how a representative portfolio would respond to a handful of specific, named shocks — a spike in inflation, a market crash in equities, a jump in interest rates, or a weaker rupee."
        whyDifferent="Each scenario affects different assets differently — a market crash hits equities hard but leaves government securities untouched, while currency depreciation only benefits foreign-currency holdings — this tool isolates that instead of applying one blanket shock to everything."
        howCalculated="The baseline allocation's returns and inflation rate are adjusted by each scenario's fixed deltas, then run through the same portfolio-return math used throughout this Lab."
        sources={["SBP EasyData, Yahoo Finance — baseline asset returns", "Pakistan Bureau of Statistics — baseline inflation rate"]}
      />

      <DecisionSupportPanel
        whatHappened={`You tested "${t(scenario.labelKey)}" against a Rs ${Math.round(portfolioValue).toLocaleString("en-US")} portfolio.`}
        whyItHappened="Different scenarios expose different weaknesses — a portfolio built for inflation protection may still be vulnerable to an equity crash, and vice versa."
        whatToUnderstand="Compare all six scenarios in the chart above to see which shocks your current mix is most and least resilient to — then adjust weights in Asset Allocation Explorer to see if a different mix holds up better."
        relatedTools={[{ title: "Asset Allocation Explorer", href: "/decision-support-lab/asset-allocation-explorer" }, { title: "Real Return Intelligence Dashboard", href: "/decision-support-lab/real-return-dashboard" }]}
        suggestedNext={{
          title: "See the full picture in the flagship dashboard",
          href: "/decision-support-lab/real-return-dashboard",
          reason: "Bring together nominal wealth, inflation, taxes and real wealth in one professional dashboard.",
        }}
      />
    </div>
  );
}
