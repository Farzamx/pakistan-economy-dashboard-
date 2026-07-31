"use client";

import { useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import InvestmentGrowthExplorerForm, { type GrowthInvestmentSlot } from "@/components/investmentGrowthExplorer/InvestmentGrowthExplorerForm";
import InflationRateField from "@/components/decisionSupportLab/InflationRateField";
import InvestmentGrowthExplorerResults, { type InvestmentGrowthResult } from "@/components/investmentGrowthExplorer/InvestmentGrowthExplorerResults";
import InvestmentGrowthExplorerCharts from "@/components/investmentGrowthExplorer/InvestmentGrowthExplorerCharts";
import DecisionSupportPanel from "@/components/decisionSupportLab/DecisionSupportPanel";
import ExplainTheMath from "@/components/decisionSupportLab/ExplainTheMath";
import EducationalPanel from "@/components/decisionSupportLab/EducationalPanel";
import ReportDownloadButton from "@/components/decisionSupportLab/ReportDownloadButton";
import { calculateInflationAdjustedGrowth } from "@/lib/decisionSupportLab/investmentEngine";
import { computeOfficialCpiPct } from "@/lib/personalInflation/engine";
import type { ReportDefinition } from "@/lib/decisionSupportLab/reportFramework";
import type { CpiCategoryBreakdown } from "@/lib/data/cpiCategoryBreakdown";

interface Props {
  breakdown: CpiCategoryBreakdown | null;
}

const DEFAULT_INVESTMENTS: GrowthInvestmentSlot[] = [
  { id: "a", name: "Savings Account", nominalReturnPct: 10, color: "#4d8df7" },
  { id: "b", name: "Gold", nominalReturnPct: 15, color: "#fbbf24" },
  { id: "c", name: "PSX Index", nominalReturnPct: 20, color: "#34d399" },
];

export default function InvestmentGrowthExplorerCalculator({ breakdown }: Props) {
  const { t } = useLanguage();
  const officialInflationPct = useMemo(() => (breakdown ? computeOfficialCpiPct(breakdown.groups) : 0), [breakdown]);

  const [startingAmount, setStartingAmount] = useState(0);
  const [years, setYears] = useState(10);
  const [useCustomInflation, setUseCustomInflation] = useState(false);
  const [customInflationPct, setCustomInflationPct] = useState(0);
  const inflationPct = useCustomInflation ? customInflationPct : officialInflationPct;
  const [investments, setInvestments] = useState(DEFAULT_INVESTMENTS);

  function handleInvestmentChange(id: string, patch: Partial<GrowthInvestmentSlot>) {
    setInvestments((prev) => prev.map((inv) => (inv.id === id ? { ...inv, ...patch } : inv)));
  }

  const results = useMemo<InvestmentGrowthResult[]>(() => {
    if (startingAmount <= 0) return [];
    return investments.map((inv) => {
      const growth = calculateInflationAdjustedGrowth(startingAmount, inv.nominalReturnPct, inflationPct, years);
      return { ...inv, nominalEndValue: growth.nominalEndValue, realEndValue: growth.realEndValue, inflationEaten: growth.nominalEndValue - growth.realEndValue };
    });
  }, [investments, startingAmount, inflationPct, years]);

  function buildReport(): ReportDefinition {
    return {
      toolName: "Investment Growth Explorer",
      subtitle: "Pakistan Economic Intelligence Center — Decision Support Lab",
      generatedAt: new Date().toISOString().slice(0, 10),
      sourceNote: "Source: PEIC Investment Intelligence Engine",
      sections: results.map((r) => ({
        heading: r.name,
        paragraphs: [`Rs ${Math.round(startingAmount).toLocaleString("en-US")} at ${r.nominalReturnPct.toFixed(1)}% nominal over ${years} years reaches Rs ${Math.round(r.nominalEndValue).toLocaleString("en-US")} nominal, Rs ${Math.round(r.realEndValue).toLocaleString("en-US")} real.`],
        facts: [
          { label: "Nominal Return", value: `${r.nominalReturnPct.toFixed(1)}%` },
          { label: "Nominal End Value", value: `Rs ${Math.round(r.nominalEndValue).toLocaleString("en-US")}` },
          { label: "Real End Value", value: `Rs ${Math.round(r.realEndValue).toLocaleString("en-US")}` },
          { label: "Lost to Inflation", value: `Rs ${Math.round(r.inflationEaten).toLocaleString("en-US")}` },
        ],
      })),
    };
  }

  return (
    <div id="calculator-input" className="flex flex-col gap-6">
      <InvestmentGrowthExplorerForm
        startingAmount={startingAmount}
        onStartingAmountChange={setStartingAmount}
        years={years}
        onYearsChange={setYears}
        investments={investments}
        onInvestmentChange={handleInvestmentChange}
      />

      <div className="glass-card rounded-xl p-4 sm:p-5">
        <InflationRateField
          autoValuePct={officialInflationPct}
          autoLabel="Official Inflation (Latest)"
          tooltipText="Calculated automatically from the latest official CPI data. Since this projects into a future period, you can adjust this assumption below."
          useCustom={useCustomInflation}
          onUseCustomChange={setUseCustomInflation}
          customValuePct={customInflationPct}
          onCustomValuePctChange={setCustomInflationPct}
        />
      </div>

      {startingAmount <= 0 && (
        <div className="rounded-lg border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">{t("decisionSupportLab.validationEnterAmount")}</div>
      )}

      {results.length > 0 && <InvestmentGrowthExplorerResults results={results} />}

      {results.length > 0 && (
        <ReportDownloadButton buildDefinition={buildReport} filename="investment-growth-report.pdf" label={t("decisionSupportLab.downloadReport")} generatingLabel={t("decisionSupportLab.generatingReport")} />
      )}

      {results.length > 0 && <InvestmentGrowthExplorerCharts results={results} startingAmount={startingAmount} inflationPct={inflationPct} years={years} />}

      <ExplainTheMath
        formula="For each investment: Nominal Value(t) = Amount × (1 + Return ÷ 100)^t; Real Value(t) = Nominal Value(t) ÷ (1 + Inflation ÷ 100)^t"
        variables={[
          { symbol: "Amount", description: "The same starting amount applied to every investment, for a fair comparison" },
          { symbol: "Return", description: "Each investment's own nominal annual return" },
          { symbol: "Inflation", description: "The shared inflation rate applied to all investments" },
        ]}
        methodology="Runs the same calculateInflationAdjustedGrowth() call once per investment, holding the starting amount, horizon and inflation rate constant — so any difference in outcome is purely the effect of each investment's own return."
        sourceName="PEIC Investment Intelligence Engine"
        lastUpdated=""
        assumptions={["Assumes each investment's nominal return stays constant for the entire horizon.", "Assumes the same starting amount and start date for every investment, for a like-for-like comparison."]}
        limitations={["Real returns vary year to year and by asset — this models constant-rate idealizations to isolate the effect of the return rate itself."]}
      />

      <EducationalPanel
        whatDoesThisMean="This puts several investments side by side, starting from the same amount, so you can see how differences in return compound into very different outcomes — both nominal and after inflation."
        whyDifferent="A gap of a few percentage points in annual return looks small year to year, but compounds into a large gap in ending wealth over a decade or more — this tool makes that visible."
        howCalculated="Each investment's line is its own compounding path at its own return rate; the same inflation rate is then applied to every line to produce the real (inflation-adjusted) comparison below it."
        sources={["PEIC Investment Intelligence Engine — deterministic, no AI or estimation involved."]}
      />

      <DecisionSupportPanel
        whatHappened={results.length > 0 ? `You compared ${results.length} investments starting from Rs ${Math.round(startingAmount).toLocaleString("en-US")} over ${years} years.` : "Enter a starting amount, horizon, inflation rate, and edit the investments to compare."}
        whyItHappened="Small differences in return compound dramatically over long horizons — the ranking by nominal value and by real value can even differ once inflation is applied evenly across all three."
        whatToUnderstand="For a more rigorous, ranked comparison with risk and live official data where available, use the Asset Comparison Lab next."
        relatedTools={[{ title: "Asset Comparison Lab", href: "/decision-support-lab/asset-comparison-lab" }, { title: "Real Return Calculator", href: "/decision-support-lab/real-return-calculator" }]}
        suggestedNext={{
          title: "See a ranked, data-backed asset comparison",
          href: "/decision-support-lab/asset-comparison-lab",
          reason: "Compare real assets — gold, T-Bills, PIBs, PSX and more — ranked by real return, using live official data where available.",
        }}
      />
    </div>
  );
}
