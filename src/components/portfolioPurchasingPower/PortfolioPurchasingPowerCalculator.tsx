"use client";

import { useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import PortfolioPurchasingPowerTable from "@/components/portfolioPurchasingPower/PortfolioPurchasingPowerTable";
import InflationRateField from "@/components/decisionSupportLab/InflationRateField";
import WhatIfToggle from "@/components/decisionSupportLab/WhatIfToggle";
import ConfidenceBadge from "@/components/decisionSupportLab/ConfidenceBadge";
import DataFreshnessBadge from "@/components/decisionSupportLab/DataFreshnessBadge";
import PortfolioPurchasingPowerResults from "@/components/portfolioPurchasingPower/PortfolioPurchasingPowerResults";
import PortfolioPurchasingPowerCharts from "@/components/portfolioPurchasingPower/PortfolioPurchasingPowerCharts";
import PersonalInsightsPanel from "@/components/decisionSupportLab/PersonalInsightsPanel";
import DecisionSupportPanel from "@/components/decisionSupportLab/DecisionSupportPanel";
import ExplainTheMath from "@/components/decisionSupportLab/ExplainTheMath";
import EducationalPanel from "@/components/decisionSupportLab/EducationalPanel";
import ReportDownloadButton from "@/components/decisionSupportLab/ReportDownloadButton";
import { calculatePortfolioReturn, compareAssets } from "@/lib/decisionSupportLab/investmentEngine";
import { computeOfficialCpiPct } from "@/lib/personalInflation/engine";
import { calculateConfidenceScore } from "@/lib/decisionSupportLab/confidenceEngine";
import { generatePersonalInsights } from "@/lib/decisionSupportLab/insightEngine";
import { getOverallCompletionPct } from "@/lib/decisionSupportLab/profileCompletion";
import { useEconomicProfile, setEconomicProfile, setInvestmentAllocationValue } from "@/lib/decisionSupportLab/economicProfile";
import type { ReportDefinition } from "@/lib/decisionSupportLab/reportFramework";
import type { CalculationSnapshotPayload } from "@/lib/supabase/calculationSnapshots";
import type { CpiCategoryBreakdown } from "@/lib/data/cpiCategoryBreakdown";
import type { LiveAssetData } from "@/lib/decisionSupportLab/liveAssetData";

export interface PortfolioAssetRow {
  id: string;
  name: string;
  weightPct: number;
  nominalReturnPct: number;
  isEstimate: boolean;
  color: string;
}

interface Props {
  breakdown: CpiCategoryBreakdown | null;
  liveData: LiveAssetData;
}

const ASSET_COLORS: Record<string, string> = {
  gold: "#fbbf24",
  usd: "#34d399",
  savings: "#4d8df7",
  moneyMarket: "#9b8afb",
  tbill: "#22d3ee",
  pib: "#f472b6",
  psx: "#a3e635",
  property: "#fb923c",
};

const DEFAULT_WEIGHTS: Record<string, number> = { gold: 15, usd: 10, savings: 20, moneyMarket: 10, tbill: 15, pib: 15, psx: 10, property: 5 };

export default function PortfolioPurchasingPowerCalculator({ breakdown, liveData }: Props) {
  const { t } = useLanguage();
  const { profile } = useEconomicProfile();
  const officialInflationPct = useMemo(() => (breakdown ? computeOfficialCpiPct(breakdown.groups) : 0), [breakdown]);

  const [isWhatIfValue, setIsWhatIfValue] = useState(false);
  const [whatIfValue, setWhatIfValue] = useState(0);
  const portfolioValue = isWhatIfValue ? whatIfValue : profile.currentInvestmentAmount;
  const [useCustomInflation, setUseCustomInflation] = useState(false);
  const [customInflationPct, setCustomInflationPct] = useState(0);
  const inflationPct = useCustomInflation ? customInflationPct : officialInflationPct;

  // Weights seed from the profile's saved investment_allocation (once the
  // visitor has set one, e.g. from Asset Allocation Explorer) and fall back
  // to a balanced starter split otherwise — never a second, un-synced copy.
  const allocation = profile.investmentAllocation;
  const initialRows: PortfolioAssetRow[] = useMemo(
    () => [
      { id: "gold", name: t("decisionSupportLab.assetGold"), weightPct: allocation.gold ?? DEFAULT_WEIGHTS.gold, nominalReturnPct: liveData.gold.nominalReturnPct ?? 0, isEstimate: liveData.gold.nominalReturnPct === null, color: ASSET_COLORS.gold },
      { id: "usd", name: t("decisionSupportLab.assetUsd"), weightPct: allocation.usd ?? DEFAULT_WEIGHTS.usd, nominalReturnPct: liveData.usd.nominalReturnPct ?? 0, isEstimate: liveData.usd.nominalReturnPct === null, color: ASSET_COLORS.usd },
      { id: "savings", name: t("decisionSupportLab.assetSavingsAccount"), weightPct: allocation.savings ?? DEFAULT_WEIGHTS.savings, nominalReturnPct: liveData.savings.nominalReturnPct ?? 0, isEstimate: liveData.savings.nominalReturnPct === null, color: ASSET_COLORS.savings },
      { id: "moneyMarket", name: t("decisionSupportLab.assetMoneyMarketFund"), weightPct: allocation.moneyMarket ?? DEFAULT_WEIGHTS.moneyMarket, nominalReturnPct: 0, isEstimate: true, color: ASSET_COLORS.moneyMarket },
      { id: "tbill", name: t("decisionSupportLab.assetTreasuryBills"), weightPct: allocation.tbill ?? DEFAULT_WEIGHTS.tbill, nominalReturnPct: liveData.tbill.nominalReturnPct ?? 0, isEstimate: liveData.tbill.nominalReturnPct === null, color: ASSET_COLORS.tbill },
      { id: "pib", name: t("decisionSupportLab.assetPib"), weightPct: allocation.pib ?? DEFAULT_WEIGHTS.pib, nominalReturnPct: liveData.pib.nominalReturnPct ?? 0, isEstimate: liveData.pib.nominalReturnPct === null, color: ASSET_COLORS.pib },
      { id: "psx", name: t("decisionSupportLab.assetPsxIndex"), weightPct: allocation.psx ?? DEFAULT_WEIGHTS.psx, nominalReturnPct: liveData.psx.nominalReturnPct ?? 0, isEstimate: liveData.psx.nominalReturnPct === null, color: ASSET_COLORS.psx },
      { id: "property", name: t("decisionSupportLab.assetProperty"), weightPct: allocation.property ?? DEFAULT_WEIGHTS.property, nominalReturnPct: 0, isEstimate: true, color: ASSET_COLORS.property },
    ],
    [liveData, t, allocation],
  );

  const [rows, setRows] = useState(initialRows);

  function handleWeightChange(id: string, value: number) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, weightPct: value } : r)));
    setInvestmentAllocationValue(id, value);
  }
  function handleNominalReturnChange(id: string, value: number) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, nominalReturnPct: value } : r)));
  }

  const portfolioResult = useMemo(
    () => calculatePortfolioReturn(rows.map((r) => ({ assetId: r.id, assetName: r.name, weightPct: r.weightPct, nominalReturnPct: r.nominalReturnPct })), inflationPct),
    [rows, inflationPct],
  );

  const realValue = portfolioValue * (1 + portfolioResult.portfolioRealReturnPct / 100);
  const inflationDragPct = portfolioResult.portfolioNominalReturnPct - portfolioResult.portfolioRealReturnPct;

  const insights = useMemo(() => {
    const activeRows = rows.filter((r) => r.weightPct > 0);
    if (activeRows.length < 2) return [];
    const comparison = compareAssets(activeRows.map((r) => ({ id: r.id, name: r.name, nominalReturnPct: r.nominalReturnPct })), inflationPct);
    const sorted = [...comparison].sort((a, b) => b.realReturnPct - a.realReturnPct);
    const strongest = sorted[0];
    const weakest = sorted[sorted.length - 1];
    if (!strongest || !weakest || strongest.id === weakest.id) return [];
    return generatePersonalInsights({
      assetProtection: { strongerAssetName: strongest.name, strongerRealReturnPct: strongest.realReturnPct, weakerAssetName: weakest.name, weakerRealReturnPct: weakest.realReturnPct },
    });
  }, [rows, inflationPct]);

  const confidence = useMemo(
    () =>
      calculateConfidenceScore({
        profileCompletenessPct: getOverallCompletionPct(profile),
        usesOfficialData: !useCustomInflation,
        hasHistoricalCoverage: breakdown !== null,
        manualEstimateCount: (isWhatIfValue ? 1 : 0) + rows.filter((r) => r.isEstimate).length,
        assumptionCount: useCustomInflation ? 1 : 0,
      }),
    [profile, useCustomInflation, breakdown, isWhatIfValue, rows],
  );

  function buildReport(): ReportDefinition {
    return {
      toolName: "Portfolio Purchasing Power",
      subtitle: "Pakistan Economic Intelligence Center — Decision Support Lab",
      generatedAt: new Date().toISOString().slice(0, 10),
      sourceNote: `Source: PEIC Investment Intelligence Engine, live data as of ${liveData.asOfDate}`,
      sections: [
        {
          heading: "Portfolio Summary",
          paragraphs: [`Your portfolio's nominal return is ${portfolioResult.portfolioNominalReturnPct.toFixed(1)}%, real return is ${portfolioResult.portfolioRealReturnPct.toFixed(1)}% at ${inflationPct.toFixed(1)}% inflation.`],
          facts: [
            { label: "Portfolio Value", value: `Rs ${Math.round(portfolioValue).toLocaleString("en-US")}` },
            { label: "Nominal Return", value: `${portfolioResult.portfolioNominalReturnPct.toFixed(1)}%` },
            { label: "Real Return", value: `${portfolioResult.portfolioRealReturnPct >= 0 ? "+" : ""}${portfolioResult.portfolioRealReturnPct.toFixed(1)}%` },
            { label: "Real Value", value: `Rs ${Math.round(realValue).toLocaleString("en-US")}` },
            { label: "Inflation Drag", value: `${inflationDragPct.toFixed(1)}pp` },
          ],
        },
        {
          heading: "Asset Contribution",
          facts: portfolioResult.contributions.map((c) => ({ label: `${c.assetName} (${c.weightPct.toFixed(0)}%)`, value: `${c.contributionPct.toFixed(1)}pp` })),
        },
      ],
    };
  }

  if (profile.currentInvestmentAmount <= 0 && !isWhatIfValue) {
    return (
      <div id="calculator-input" className="flex flex-col gap-6">
        <div className="glass-card rounded-xl border border-neon-blue/20 p-4 sm:p-5">
          <p className="text-sm font-semibold text-white light:text-slate-900">We need one more value.</p>
          <p className="mt-1 text-xs text-white/50 light:text-slate-500">This saves to your Economic Profile, so you won&apos;t be asked again.</p>
          <div className="mt-3 max-w-xs">
            <label htmlFor="ppp-value-gate" className="text-label text-white/40 light:text-slate-400">
              Portfolio Value
            </label>
            <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5">
              <span className="text-sm text-white/40 light:text-slate-400">Rs</span>
              <input
                id="ppp-value-gate"
                type="number"
                inputMode="decimal"
                step={10000}
                placeholder="Enter portfolio value"
                onChange={(e) => {
                  const parsed = parseFloat(e.target.value);
                  if (!isNaN(parsed) && parsed > 0) setEconomicProfile({ currentInvestmentAmount: parsed });
                }}
                className="text-mono-num w-full bg-transparent text-sm font-semibold tabular-nums text-white outline-none light:text-slate-900"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="calculator-input" className="flex flex-col gap-6">
      <WhatIfToggle
        label="Portfolio Value"
        currentValue={profile.currentInvestmentAmount}
        whatIfValue={whatIfValue}
        onWhatIfValueChange={setWhatIfValue}
        isWhatIf={isWhatIfValue}
        onToggle={setIsWhatIfValue}
        formatValue={(v) => `Rs ${Math.round(v).toLocaleString("en-US")}`}
        step={10000}
      />

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

      <ConfidenceBadge result={confidence} toolId="portfolio-purchasing-power" />
      <DataFreshnessBadge sourceName="PEIC Investment Intelligence Engine" lastUpdated={liveData.asOfDate} dataFrequency="Daily (market data) / As published (SBP rates)" />

      <PortfolioPurchasingPowerTable rows={rows} contributions={portfolioResult.contributions} onWeightChange={handleWeightChange} onNominalReturnChange={handleNominalReturnChange} />

      <PortfolioPurchasingPowerResults
        portfolioNominalReturnPct={portfolioResult.portfolioNominalReturnPct}
        portfolioRealReturnPct={portfolioResult.portfolioRealReturnPct}
        realValue={realValue}
        inflationDragPct={inflationDragPct}
      />

      <ReportDownloadButton buildDefinition={buildReport} filename="portfolio-purchasing-power-report.pdf" label={t("decisionSupportLab.downloadReport")} generatingLabel={t("decisionSupportLab.generatingReport")} />

      <PersonalInsightsPanel insights={insights} />

      <PortfolioPurchasingPowerCharts rows={rows} contributions={portfolioResult.contributions} />

      <ExplainTheMath
        formula="Portfolio Nominal Return = Σ (Weight × Asset Return); Portfolio Real Return = ((1 + Portfolio Nominal ÷ 100) ÷ (1 + Inflation ÷ 100) − 1) × 100"
        variables={[
          { symbol: "Weight", description: "Each asset's share of your portfolio, as a percentage" },
          { symbol: "Asset Return", description: "Each asset's nominal return — live data where available, or your own estimate" },
        ]}
        methodology="Uses calculatePortfolioReturn() from the Investment Intelligence engine — the same weighted-sum pattern personalInflation/engine.ts's computeWeightedRate() uses for CPI categories, applied to asset returns instead."
        sourceName="PEIC Investment Intelligence Engine"
        lastUpdated={liveData.asOfDate}
        assumptions={["Assumes each asset's return applies for the whole period at your stated weight — no rebalancing modeled.", "Weights should sum to 100% for the return figures to represent your actual portfolio; the table shows your current total."]}
        limitations={["Historical return data isn't yet available for Money Market Fund and Property — enter your own realised annual return for these, clearly marked as a manual estimate rather than official data."]}
      />

      <EducationalPanel
        whatDoesThisMean="This weights each asset's return by how much of your money is actually in it, giving you one real return figure for your whole portfolio instead of assessing each asset in isolation."
        whyDifferent="A portfolio can look fine on a nominal basis while still losing real value if too much weight sits in assets barely keeping pace with inflation — the Asset Contribution breakdown shows exactly which holdings help and which drag."
        howCalculated="Each asset's return is weighted by its allocation percentage and summed to get your portfolio's nominal return; that figure is then converted to a real return using the same formula used throughout this Lab."
        sources={["SBP EasyData — Policy Rate, 3M T-Bill Yield, 3Y PIB Yield, USD/PKR", "Yahoo Finance — Gold, PAK ETF (Pakistan equity proxy)", "Pakistan Bureau of Statistics — National CPI Index"]}
      />

      <DecisionSupportPanel
        whatHappened={`You analyzed a Rs ${Math.round(portfolioValue).toLocaleString("en-US")} portfolio at ${inflationPct.toFixed(1)}% inflation — a real return of ${portfolioResult.portfolioRealReturnPct >= 0 ? "+" : ""}${portfolioResult.portfolioRealReturnPct.toFixed(1)}%.`}
        whyItHappened="Assets with low nominal returns (cash-like holdings) can quietly drag down your whole portfolio's real return even at a modest allocation, since their real return is often already negative on its own."
        whatToUnderstand="Reducing weight in assets with negative real return, or increasing weight in assets that outpace inflation, is the mechanical lever this tool makes visible — try it in the Asset Allocation Explorer next."
        relatedTools={[{ title: "Asset Comparison Lab", href: "/decision-support-lab/asset-comparison-lab" }, { title: "Asset Allocation Explorer", href: "/decision-support-lab/asset-allocation-explorer" }]}
        suggestedNext={{
          title: "Experiment with a different allocation",
          href: "/decision-support-lab/asset-allocation-explorer",
          reason: "See how shifting weight between cash, gold, equities and government securities changes your protection and diversification.",
        }}
        snapshotPayload={(): CalculationSnapshotPayload => ({
          toolId: "portfolio-purchasing-power",
          inputs: { portfolioValue, inflationPct, rows },
          assumptions: {},
          outputs: { portfolioNominalReturnPct: portfolioResult.portfolioNominalReturnPct, portfolioRealReturnPct: portfolioResult.portfolioRealReturnPct, realValue },
        })}
      />
    </div>
  );
}
