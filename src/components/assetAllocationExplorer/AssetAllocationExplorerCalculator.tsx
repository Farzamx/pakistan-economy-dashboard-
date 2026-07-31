"use client";

import { useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import AssetAllocationExplorerForm, { type AllocationBucket } from "@/components/assetAllocationExplorer/AssetAllocationExplorerForm";
import AssetAllocationExplorerResults from "@/components/assetAllocationExplorer/AssetAllocationExplorerResults";
import InflationRateField from "@/components/decisionSupportLab/InflationRateField";
import SpendingCompositionDonut from "@/components/decisionSupportLab/SpendingCompositionDonut";
import DecisionSupportPanel from "@/components/decisionSupportLab/DecisionSupportPanel";
import ExplainTheMath from "@/components/decisionSupportLab/ExplainTheMath";
import EducationalPanel from "@/components/decisionSupportLab/EducationalPanel";
import { calculatePortfolioReturn, calculateDiversificationScore } from "@/lib/decisionSupportLab/investmentEngine";
import { computeOfficialCpiPct } from "@/lib/personalInflation/engine";
import type { CpiCategoryBreakdown } from "@/lib/data/cpiCategoryBreakdown";
import type { LiveAssetData } from "@/lib/decisionSupportLab/liveAssetData";

interface Props {
  breakdown: CpiCategoryBreakdown | null;
  liveData: LiveAssetData;
}

// clamp(50 + realReturn × 5, 0, 100) — a 0% real return scores 50
// (neutral protection), each percentage point of real return above/below
// that shifts the score by 5, matching the scoring-band convention
// established by healthScoreEngine.ts (Phase 3).
function inflationProtectionScore(blendedRealReturnPct: number): number {
  return Math.max(0, Math.min(100, 50 + blendedRealReturnPct * 5));
}

export default function AssetAllocationExplorerCalculator({ breakdown, liveData }: Props) {
  const { t } = useLanguage();
  const officialInflationPct = useMemo(() => (breakdown ? computeOfficialCpiPct(breakdown.groups) : 0), [breakdown]);
  const [useCustomInflation, setUseCustomInflation] = useState(false);
  const [customInflationPct, setCustomInflationPct] = useState(0);
  const inflationPct = useCustomInflation ? customInflationPct : officialInflationPct;

  const initialBuckets: AllocationBucket[] = useMemo(
    () => [
      { id: "cash", name: t("decisionSupportLab.assetCash"), weightPct: 25, nominalReturnPct: liveData.savings.nominalReturnPct ?? 0, color: "#4d8df7" },
      { id: "gold", name: t("decisionSupportLab.assetGold"), weightPct: 20, nominalReturnPct: liveData.gold.nominalReturnPct ?? 0, color: "#fbbf24" },
      { id: "equities", name: t("decisionSupportLab.assetEquities"), weightPct: 20, nominalReturnPct: liveData.psx.nominalReturnPct ?? 0, color: "#34d399" },
      { id: "govtSecurities", name: t("decisionSupportLab.assetGovtSecurities"), weightPct: 25, nominalReturnPct: liveData.pib.nominalReturnPct ?? 0, color: "#f472b6" },
      { id: "foreignCurrency", name: t("decisionSupportLab.assetForeignCurrency"), weightPct: 10, nominalReturnPct: liveData.usd.nominalReturnPct ?? 0, color: "#9b8afb" },
    ],
    [liveData, t],
  );

  const [buckets, setBuckets] = useState(initialBuckets);

  function handleWeightChange(id: string, value: number) {
    setBuckets((prev) => prev.map((b) => (b.id === id ? { ...b, weightPct: value } : b)));
  }

  const portfolioResult = useMemo(
    () => calculatePortfolioReturn(buckets.map((b) => ({ assetId: b.id, assetName: b.name, weightPct: b.weightPct, nominalReturnPct: b.nominalReturnPct })), inflationPct),
    [buckets, inflationPct],
  );
  const diversificationScore = useMemo(() => calculateDiversificationScore(buckets.map((b) => b.weightPct)), [buckets]);
  const protectionScore = inflationProtectionScore(portfolioResult.portfolioRealReturnPct);

  const donutData = buckets.filter((b) => b.weightPct > 0).map((b) => ({ label: b.name, value: b.weightPct, color: b.color }));

  return (
    <div id="calculator-input" className="flex flex-col gap-6">
      <AssetAllocationExplorerForm buckets={buckets} onWeightChange={handleWeightChange} />

      <div className="glass-card rounded-xl p-4 sm:p-5">
        <InflationRateField
          autoValuePct={officialInflationPct}
          autoLabel="Official Inflation (Latest)"
          tooltipText="Calculated automatically from the latest official CPI data."
          useCustom={useCustomInflation}
          onUseCustomChange={setUseCustomInflation}
          customValuePct={customInflationPct}
          onCustomValuePctChange={setCustomInflationPct}
        />
      </div>

      <AssetAllocationExplorerResults
        blendedReturnPct={portfolioResult.portfolioNominalReturnPct}
        blendedRealReturnPct={portfolioResult.portfolioRealReturnPct}
        inflationProtectionScore={protectionScore}
        diversificationScore={diversificationScore}
      />

      <div className="glass-card rounded-xl p-4 sm:p-5">
        <h3 className="mb-2 text-sm font-semibold text-white light:text-slate-900">{t("assetAllocationExplorer.allocationChartTitle")}</h3>
        <SpendingCompositionDonut data={donutData} />
      </div>

      <ExplainTheMath
        formula="Blended Return = Σ (Weight × Asset Return); Diversification = (1 − Σ Weight²) × 100"
        variables={[
          { symbol: "Weight", description: "Each bucket's share of the allocation, as a percentage" },
          { symbol: "Asset Return", description: "Each bucket's nominal return — cash and government securities from live SBP rates, gold and equities from live market data" },
        ]}
        methodology="Reuses calculatePortfolioReturn() for the blended return and calculateDiversificationScore() (an inverse Herfindahl-Hirschman Index — the standard portfolio-concentration measure) for diversification, both from the Investment Intelligence engine."
        sourceName="PEIC Investment Intelligence Engine"
        lastUpdated={liveData.asOfDate}
        assumptions={["Assumes each bucket's current return applies for a full year at your chosen weight."]}
        limitations={["Diversification score measures concentration across these 5 broad buckets only, not correlation between them or diversification within a bucket (e.g. which specific equities)."]}
      />

      <EducationalPanel
        whatDoesThisMean="This lets you experiment with a simple 5-bucket allocation and immediately see the trade-off between return, inflation protection and concentration risk."
        whyDifferent="More cash feels safe but usually means a lower inflation protection score; more equities usually raises expected return but can lower your protection score's stability and doesn't by itself improve diversification if it crowds out other buckets."
        howCalculated="Your blended return is the weighted average of every bucket's return; the inflation protection score scales with how far your real return sits above or below zero; the diversification score falls as any one bucket's weight grows toward 100%."
        sources={["SBP EasyData — Policy Rate, 3Y PIB Yield, USD/PKR", "Yahoo Finance — Gold, PAK ETF (Pakistan equity proxy)", "Pakistan Bureau of Statistics — National CPI Index"]}
      />

      <DecisionSupportPanel
        whatHappened={`You explored an allocation with a blended return of ${portfolioResult.portfolioNominalReturnPct.toFixed(1)}% and a diversification score of ${diversificationScore.toFixed(0)}/100.`}
        whyItHappened="Every asset bucket trades off differently between return, inflation protection and concentration — there's no single allocation that maximizes all three at once."
        whatToUnderstand="Apply what you learn here to your actual named assets and amounts in Portfolio Purchasing Power for a precise, rupee-denominated version of the same analysis."
        relatedTools={[{ title: "Portfolio Purchasing Power", href: "/decision-support-lab/portfolio-purchasing-power" }, { title: "Investment Scenario Simulator", href: "/decision-support-lab/investment-scenario-simulator" }]}
        suggestedNext={{
          title: "Stress-test this allocation against a scenario",
          href: "/decision-support-lab/investment-scenario-simulator",
          reason: "See how a market crash, inflation spike or rate change would affect a portfolio like this one.",
        }}
      />
    </div>
  );
}
