"use client";

import { useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import AssetComparisonLabTable from "@/components/assetComparisonLab/AssetComparisonLabTable";
import InflationRateField from "@/components/decisionSupportLab/InflationRateField";
import ConfidenceBadge from "@/components/decisionSupportLab/ConfidenceBadge";
import DataFreshnessBadge from "@/components/decisionSupportLab/DataFreshnessBadge";
import AssetComparisonLabCharts from "@/components/assetComparisonLab/AssetComparisonLabCharts";
import PersonalInsightsPanel from "@/components/decisionSupportLab/PersonalInsightsPanel";
import DecisionSupportPanel from "@/components/decisionSupportLab/DecisionSupportPanel";
import ExplainTheMath from "@/components/decisionSupportLab/ExplainTheMath";
import EducationalPanel from "@/components/decisionSupportLab/EducationalPanel";
import ReportDownloadButton from "@/components/decisionSupportLab/ReportDownloadButton";
import { compareAssets, type AssetInput } from "@/lib/decisionSupportLab/investmentEngine";
import { computeOfficialCpiPct } from "@/lib/personalInflation/engine";
import { calculateConfidenceScore } from "@/lib/decisionSupportLab/confidenceEngine";
import { generatePersonalInsights } from "@/lib/decisionSupportLab/insightEngine";
import { getOverallCompletionPct } from "@/lib/decisionSupportLab/profileCompletion";
import { useEconomicProfile } from "@/lib/decisionSupportLab/economicProfile";
import type { ReportDefinition } from "@/lib/decisionSupportLab/reportFramework";
import type { CpiCategoryBreakdown } from "@/lib/data/cpiCategoryBreakdown";
import type { LiveAssetData } from "@/lib/decisionSupportLab/liveAssetData";

export interface ComparisonAssetRow {
  id: string;
  name: string;
  nominalReturnPct: number;
  volatilityPct: number | null;
  isEstimate: boolean;
}

interface Props {
  breakdown: CpiCategoryBreakdown | null;
  liveData: LiveAssetData;
}

export default function AssetComparisonLabCalculator({ breakdown, liveData }: Props) {
  const { t } = useLanguage();
  const { profile } = useEconomicProfile();
  const officialInflationPct = useMemo(() => (breakdown ? computeOfficialCpiPct(breakdown.groups) : 0), [breakdown]);

  const [useCustomInflation, setUseCustomInflation] = useState(false);
  const [customInflationPct, setCustomInflationPct] = useState(0);
  const inflationPct = useCustomInflation ? customInflationPct : officialInflationPct;

  const initialRows: ComparisonAssetRow[] = useMemo(
    () => [
      { id: "gold", name: t("decisionSupportLab.assetGold"), nominalReturnPct: liveData.gold.nominalReturnPct ?? 0, volatilityPct: liveData.gold.volatilityPct, isEstimate: liveData.gold.nominalReturnPct === null },
      { id: "usd", name: t("decisionSupportLab.assetUsd"), nominalReturnPct: liveData.usd.nominalReturnPct ?? 0, volatilityPct: liveData.usd.volatilityPct, isEstimate: liveData.usd.nominalReturnPct === null },
      { id: "savings", name: t("decisionSupportLab.assetSavingsAccount"), nominalReturnPct: liveData.savings.nominalReturnPct ?? 0, volatilityPct: liveData.savings.volatilityPct, isEstimate: liveData.savings.nominalReturnPct === null },
      { id: "moneyMarket", name: t("decisionSupportLab.assetMoneyMarketFund"), nominalReturnPct: 0, volatilityPct: null, isEstimate: true },
      { id: "tbill", name: t("decisionSupportLab.assetTreasuryBills"), nominalReturnPct: liveData.tbill.nominalReturnPct ?? 0, volatilityPct: liveData.tbill.volatilityPct, isEstimate: liveData.tbill.nominalReturnPct === null },
      { id: "pib", name: t("decisionSupportLab.assetPib"), nominalReturnPct: liveData.pib.nominalReturnPct ?? 0, volatilityPct: liveData.pib.volatilityPct, isEstimate: liveData.pib.nominalReturnPct === null },
      { id: "psx", name: t("decisionSupportLab.assetPsxIndex"), nominalReturnPct: liveData.psx.nominalReturnPct ?? 0, volatilityPct: liveData.psx.volatilityPct, isEstimate: liveData.psx.nominalReturnPct === null },
      { id: "property", name: t("decisionSupportLab.assetProperty"), nominalReturnPct: 0, volatilityPct: null, isEstimate: true },
    ],
    [liveData, t],
  );

  const [rows, setRows] = useState(initialRows);

  function handleNominalReturnChange(id: string, value: number) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, nominalReturnPct: value } : r)));
  }

  const assetInputs: AssetInput[] = rows.map((r) => ({ id: r.id, name: r.name, nominalReturnPct: r.nominalReturnPct, volatilityPct: r.volatilityPct ?? undefined, isEstimate: r.isEstimate }));
  const results = useMemo(() => compareAssets(assetInputs, inflationPct), [assetInputs, inflationPct]);

  const insights = useMemo(() => {
    const pib = results.find((r) => r.id === "pib");
    const savings = results.find((r) => r.id === "savings");
    if (!pib || !savings) return [];
    const [stronger, weaker] = pib.realReturnPct >= savings.realReturnPct ? [pib, savings] : [savings, pib];
    return generatePersonalInsights({
      assetProtection: { strongerAssetName: stronger.name, strongerRealReturnPct: stronger.realReturnPct, weakerAssetName: weaker.name, weakerRealReturnPct: weaker.realReturnPct },
    });
  }, [results]);

  const confidence = useMemo(
    () =>
      calculateConfidenceScore({
        profileCompletenessPct: getOverallCompletionPct(profile),
        usesOfficialData: !useCustomInflation,
        hasHistoricalCoverage: breakdown !== null,
        manualEstimateCount: rows.filter((r) => r.isEstimate).length,
        assumptionCount: useCustomInflation ? 1 : 0,
      }),
    [profile, useCustomInflation, breakdown, rows],
  );

  function buildReport(): ReportDefinition {
    return {
      toolName: "Asset Comparison Lab",
      subtitle: "Pakistan Economic Intelligence Center — Decision Support Lab",
      generatedAt: new Date().toISOString().slice(0, 10),
      sourceNote: `Source: PEIC Investment Intelligence Engine, live data as of ${liveData.asOfDate}`,
      sections: [
        {
          heading: "Asset Ranking (by Real Return)",
          facts: [...results].sort((a, b) => a.rank - b.rank).map((r) => ({ label: `#${r.rank} ${r.name}`, value: `Nominal ${r.nominalReturnPct.toFixed(1)}% · Real ${r.realReturnPct >= 0 ? "+" : ""}${r.realReturnPct.toFixed(1)}%` })),
        },
      ],
    };
  }

  return (
    <div id="calculator-input" className="flex flex-col gap-6">
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

      <ConfidenceBadge result={confidence} toolId="asset-comparison-lab" />
      <DataFreshnessBadge sourceName="SBP EasyData, Yahoo Finance" lastUpdated={liveData.asOfDate} dataFrequency="Daily (market data) / As published (SBP rates)" />

      <AssetComparisonLabTable rows={rows} results={results} onNominalReturnChange={handleNominalReturnChange} />

      <ReportDownloadButton buildDefinition={buildReport} filename="asset-comparison-report.pdf" label={t("decisionSupportLab.downloadReport")} generatingLabel={t("decisionSupportLab.generatingReport")} />

      <PersonalInsightsPanel insights={insights} />

      <AssetComparisonLabCharts results={results} />

      <ExplainTheMath
        formula="Real Return = ((1 + Nominal Return ÷ 100) ÷ (1 + Inflation ÷ 100) − 1) × 100"
        variables={[
          { symbol: "Nominal Return", description: "Each asset's trailing 12-month return (live data) or currently quoted yield (T-Bills, PIBs, Policy Rate), or your own estimate" },
          { symbol: "Inflation", description: "The inflation rate you enter above — defaults to the latest official CPI" },
        ]}
        methodology="Every asset is ranked by compareAssets() from the Investment Intelligence engine, using the exact same real-return formula as every other tool in this Lab. Gold, USD/PKR and the PSX proxy use a real trailing-12-month return computed from raw historical data; T-Bills, PIBs and the Policy Rate (Savings Account proxy) use their currently quoted annualized yield, since those are rates, not price series."
        sourceName="SBP EasyData, Yahoo Finance (Gold, PAK ETF)"
        sourceUrl="https://easydata.sbp.org.pk"
        lastUpdated={liveData.asOfDate}
        dataFrequency="Daily (market data) / As published (SBP rates)"
        assumptions={["Trailing 12-month returns are historical and not a guarantee of future performance.", "PSX Index uses the PAK ETF (NYSE) as a proxy — no direct PEIC data source for the KSE-100 exists."]}
        limitations={["Historical return data isn't yet available for Money Market Fund and Property — enter your own realised annual return for these, clearly marked as a manual estimate rather than official data.", "Risk (volatility) is shown only for assets with a real price history; quoted-rate assets (T-Bills, PIBs, Savings) show no volatility figure since a single rate has no return distribution."]}
      />

      <EducationalPanel
        whatDoesThisMean="This ranks a set of common Pakistani investment options by what they actually earned after inflation, not just their headline nominal figure."
        whyDifferent="A high nominal return can still lose to a lower one once inflation is applied evenly — this table makes that comparison explicit rather than leaving you to compare headline rates alone."
        howCalculated="Each asset's own nominal return (from live data where available) is converted to a real return using the same compounding real-rate formula used throughout this Lab, then all assets are ranked by that real figure."
        sources={["SBP EasyData — Policy Rate, 3M T-Bill Yield, 3Y PIB Yield, USD/PKR", "Yahoo Finance — Gold, PAK ETF (Pakistan equity proxy)", "Pakistan Bureau of Statistics — National CPI Index"]}
      />

      <DecisionSupportPanel
        whatHappened={`You compared ${results.length} assets at ${inflationPct.toFixed(1)}% inflation, ranked by real return.`}
        whyItHappened="Assets with returns close to or below the inflation rate rank lowest regardless of how attractive their nominal number looks — real return, not nominal return, determines whether an asset actually grew your wealth."
        whatToUnderstand="Apply this same ranking logic to your actual portfolio weights, not just single assets, using Portfolio Purchasing Power next."
        relatedTools={[{ title: "Portfolio Purchasing Power", href: "/decision-support-lab/portfolio-purchasing-power" }, { title: "Investment Growth Explorer", href: "/decision-support-lab/investment-growth-explorer" }]}
        suggestedNext={{
          title: "Apply this to your actual portfolio",
          href: "/decision-support-lab/portfolio-purchasing-power",
          reason: "Weight these same assets by your real allocation to see your whole portfolio's real return.",
        }}
      />
    </div>
  );
}
