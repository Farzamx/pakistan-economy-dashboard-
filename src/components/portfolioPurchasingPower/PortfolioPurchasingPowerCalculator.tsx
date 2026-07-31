"use client";

import { useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import PortfolioPurchasingPowerTable from "@/components/portfolioPurchasingPower/PortfolioPurchasingPowerTable";
import InflationRateField from "@/components/decisionSupportLab/InflationRateField";
import PortfolioPurchasingPowerResults from "@/components/portfolioPurchasingPower/PortfolioPurchasingPowerResults";
import PortfolioPurchasingPowerCharts from "@/components/portfolioPurchasingPower/PortfolioPurchasingPowerCharts";
import PersonalInsightsPanel from "@/components/decisionSupportLab/PersonalInsightsPanel";
import DecisionSupportPanel from "@/components/decisionSupportLab/DecisionSupportPanel";
import ExplainTheMath from "@/components/decisionSupportLab/ExplainTheMath";
import EducationalPanel from "@/components/decisionSupportLab/EducationalPanel";
import ReportDownloadButton from "@/components/decisionSupportLab/ReportDownloadButton";
import { calculatePortfolioReturn, compareAssets } from "@/lib/decisionSupportLab/investmentEngine";
import { computeOfficialCpiPct } from "@/lib/personalInflation/engine";
import { generatePersonalInsights } from "@/lib/decisionSupportLab/insightEngine";
import type { ReportDefinition } from "@/lib/decisionSupportLab/reportFramework";
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
  const officialInflationPct = useMemo(() => (breakdown ? computeOfficialCpiPct(breakdown.groups) : 0), [breakdown]);

  const [portfolioValue, setPortfolioValue] = useState(0);
  const [useCustomInflation, setUseCustomInflation] = useState(false);
  const [customInflationPct, setCustomInflationPct] = useState(0);
  const inflationPct = useCustomInflation ? customInflationPct : officialInflationPct;

  const initialRows: PortfolioAssetRow[] = useMemo(
    () => [
      { id: "gold", name: t("decisionSupportLab.assetGold"), weightPct: DEFAULT_WEIGHTS.gold, nominalReturnPct: liveData.gold.nominalReturnPct ?? 0, isEstimate: liveData.gold.nominalReturnPct === null, color: ASSET_COLORS.gold },
      { id: "usd", name: t("decisionSupportLab.assetUsd"), weightPct: DEFAULT_WEIGHTS.usd, nominalReturnPct: liveData.usd.nominalReturnPct ?? 0, isEstimate: liveData.usd.nominalReturnPct === null, color: ASSET_COLORS.usd },
      { id: "savings", name: t("decisionSupportLab.assetSavingsAccount"), weightPct: DEFAULT_WEIGHTS.savings, nominalReturnPct: liveData.savings.nominalReturnPct ?? 0, isEstimate: liveData.savings.nominalReturnPct === null, color: ASSET_COLORS.savings },
      { id: "moneyMarket", name: t("decisionSupportLab.assetMoneyMarketFund"), weightPct: DEFAULT_WEIGHTS.moneyMarket, nominalReturnPct: 0, isEstimate: true, color: ASSET_COLORS.moneyMarket },
      { id: "tbill", name: t("decisionSupportLab.assetTreasuryBills"), weightPct: DEFAULT_WEIGHTS.tbill, nominalReturnPct: liveData.tbill.nominalReturnPct ?? 0, isEstimate: liveData.tbill.nominalReturnPct === null, color: ASSET_COLORS.tbill },
      { id: "pib", name: t("decisionSupportLab.assetPib"), weightPct: DEFAULT_WEIGHTS.pib, nominalReturnPct: liveData.pib.nominalReturnPct ?? 0, isEstimate: liveData.pib.nominalReturnPct === null, color: ASSET_COLORS.pib },
      { id: "psx", name: t("decisionSupportLab.assetPsxIndex"), weightPct: DEFAULT_WEIGHTS.psx, nominalReturnPct: liveData.psx.nominalReturnPct ?? 0, isEstimate: liveData.psx.nominalReturnPct === null, color: ASSET_COLORS.psx },
      { id: "property", name: t("decisionSupportLab.assetProperty"), weightPct: DEFAULT_WEIGHTS.property, nominalReturnPct: 0, isEstimate: true, color: ASSET_COLORS.property },
    ],
    [liveData, t],
  );

  const [rows, setRows] = useState(initialRows);

  function handleWeightChange(id: string, value: number) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, weightPct: value } : r)));
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

  return (
    <div id="calculator-input" className="flex flex-col gap-6">
      <div className="glass-card grid grid-cols-1 gap-4 rounded-xl p-4 sm:grid-cols-2 sm:p-5">
        <div>
          <label htmlFor="ppp-value" className="text-label text-white/40 light:text-slate-400">
            Portfolio Value (PKR)
          </label>
          <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5">
            <span className="text-sm text-white/40 light:text-slate-400">Rs</span>
            <input
              id="ppp-value"
              type="number"
              inputMode="decimal"
              min={0}
              step={10000}
              value={portfolioValue === 0 ? "" : portfolioValue}
              placeholder={t("decisionSupportLab.placeholderPortfolioValue")}
              onChange={(e) => {
                const parsed = parseFloat(e.target.value);
                setPortfolioValue(isNaN(parsed) ? 0 : Math.max(0, parsed));
              }}
              className="text-mono-num w-full bg-transparent text-lg font-semibold tabular-nums text-white outline-none light:text-slate-900"
            />
          </div>
        </div>
      </div>

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

      {portfolioValue <= 0 && (
        <div className="rounded-lg border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">{t("decisionSupportLab.validationEnterAmount")}</div>
      )}

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
        limitations={["Money Market Fund and Property returns are visitor-entered estimates — no official PEIC data source exists for either."]}
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
      />
    </div>
  );
}
