"use client";

import { useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import InflationRateField from "@/components/decisionSupportLab/InflationRateField";
import WhatIfToggle from "@/components/decisionSupportLab/WhatIfToggle";
import MissingFieldPrompt from "@/components/decisionSupportLab/MissingFieldPrompt";
import ConfidenceBadge from "@/components/decisionSupportLab/ConfidenceBadge";
import DataFreshnessBadge from "@/components/decisionSupportLab/DataFreshnessBadge";
import SavingsErosionResults from "@/components/savingsErosion/SavingsErosionResults";
import SavingsErosionCharts from "@/components/savingsErosion/SavingsErosionCharts";
import ToolShareCard from "@/components/decisionSupportLab/ToolShareCard";
import PersonalInsightsPanel from "@/components/decisionSupportLab/PersonalInsightsPanel";
import DecisionSupportPanel from "@/components/decisionSupportLab/DecisionSupportPanel";
import ExplainTheMath from "@/components/decisionSupportLab/ExplainTheMath";
import EducationalPanel from "@/components/decisionSupportLab/EducationalPanel";
import ReportDownloadButton from "@/components/decisionSupportLab/ReportDownloadButton";
import { buildProjectionSeries, deflateCompounding } from "@/lib/decisionSupportLab/purchasingPowerEngine";
import { computeOfficialCpiPct } from "@/lib/personalInflation/engine";
import { calculateConfidenceScore } from "@/lib/decisionSupportLab/confidenceEngine";
import { generatePersonalInsights } from "@/lib/decisionSupportLab/insightEngine";
import { getOverallCompletionPct } from "@/lib/decisionSupportLab/profileCompletion";
import { useEconomicProfile, setEconomicProfile } from "@/lib/decisionSupportLab/economicProfile";
import type { ReportDefinition } from "@/lib/decisionSupportLab/reportFramework";
import type { CalculationSnapshotPayload } from "@/lib/supabase/calculationSnapshots";
import type { CpiCategoryBreakdown } from "@/lib/data/cpiCategoryBreakdown";

export interface SavingsErosionResult {
  savingsAmount: number;
  inflationPct: number;
  years: number;
  nominalValue: number;
  realValue: number;
  purchasingPowerLost: number;
  percentErosion: number;
}

interface Props {
  breakdown: CpiCategoryBreakdown | null;
}

export default function SavingsErosionCalculator({ breakdown }: Props) {
  const { t } = useLanguage();
  const { profile } = useEconomicProfile();
  const officialInflationPct = useMemo(() => (breakdown ? computeOfficialCpiPct(breakdown.groups) : 0), [breakdown]);

  const [isWhatIfSavings, setIsWhatIfSavings] = useState(false);
  const [whatIfSavings, setWhatIfSavings] = useState(0);
  const savingsAmount = isWhatIfSavings ? whatIfSavings : profile.currentSavings;

  const [useCustomInflation, setUseCustomInflation] = useState(false);
  const [customInflationPct, setCustomInflationPct] = useState(0);
  const inflationPct = useCustomInflation ? customInflationPct : officialInflationPct;
  const [years, setYears] = useState(5);

  const result = useMemo<SavingsErosionResult | null>(() => {
    if (savingsAmount <= 0) return null;
    const realValue = deflateCompounding(savingsAmount, inflationPct, years);
    const purchasingPowerLost = savingsAmount - realValue;
    return {
      savingsAmount,
      inflationPct,
      years,
      nominalValue: savingsAmount,
      realValue,
      purchasingPowerLost,
      percentErosion: savingsAmount > 0 ? (purchasingPowerLost / savingsAmount) * 100 : 0,
    };
  }, [savingsAmount, inflationPct, years]);

  const series = useMemo(() => (savingsAmount > 0 ? buildProjectionSeries(savingsAmount, 0, inflationPct, years) : []), [savingsAmount, inflationPct, years]);

  const insights = useMemo(
    () => (result ? generatePersonalInsights({ savingsErosion: { erosionPct: result.percentErosion, years: result.years } }) : []),
    [result],
  );

  const confidence = useMemo(
    () =>
      calculateConfidenceScore({
        profileCompletenessPct: getOverallCompletionPct(profile),
        usesOfficialData: !useCustomInflation,
        hasHistoricalCoverage: breakdown !== null,
        manualEstimateCount: isWhatIfSavings ? 1 : 0,
        assumptionCount: useCustomInflation ? 1 : 0,
      }),
    [profile, useCustomInflation, breakdown, isWhatIfSavings],
  );

  function buildReport(): ReportDefinition {
    if (!result) {
      return { toolName: "Savings Inflation Erosion", generatedAt: new Date().toISOString().slice(0, 10), sourceNote: "Source: Pakistan Bureau of Statistics", sections: [] };
    }
    return {
      toolName: "Savings Inflation Erosion",
      subtitle: "Pakistan Economic Intelligence Center — Decision Support Lab",
      generatedAt: new Date().toISOString().slice(0, 10),
      sourceNote: "Source: Pakistan Bureau of Statistics — National CPI Index",
      sections: [
        {
          heading: "Summary",
          paragraphs: [
            `Rs ${Math.round(result.savingsAmount).toLocaleString("en-US")} left idle for ${result.years} years at ${result.inflationPct.toFixed(1)}% inflation would have the real purchasing power of only Rs ${Math.round(result.realValue).toLocaleString("en-US")} today.`,
          ],
          facts: [
            { label: "Savings Amount", value: `Rs ${Math.round(result.savingsAmount).toLocaleString("en-US")}` },
            { label: "Inflation Rate", value: `${result.inflationPct.toFixed(1)}%` },
            { label: "Years", value: `${result.years}` },
            { label: "Real Value", value: `Rs ${Math.round(result.realValue).toLocaleString("en-US")}` },
            { label: "Purchasing Power Lost", value: `Rs ${Math.round(result.purchasingPowerLost).toLocaleString("en-US")} (${result.percentErosion.toFixed(1)}%)` },
          ],
        },
      ],
    };
  }

  if (profile.currentSavings <= 0 && !isWhatIfSavings) {
    return (
      <div id="calculator-input" className="flex flex-col gap-6">
        <MissingFieldPrompt
          toolId="savings-erosion"
          profile={profile}
          fieldDescriptors={[{ field: "currentSavings", label: "Current Savings", placeholder: "Enter current savings", prefix: "Rs", step: 1000 }]}
          onSave={(patch) => setEconomicProfile(patch)}
        />
      </div>
    );
  }

  return (
    <div id="calculator-input" className="flex flex-col gap-6">
      <WhatIfToggle
        label="Current Savings"
        currentValue={profile.currentSavings}
        whatIfValue={whatIfSavings}
        onWhatIfValueChange={setWhatIfSavings}
        isWhatIf={isWhatIfSavings}
        onToggle={setIsWhatIfSavings}
        formatValue={(v) => `Rs ${Math.round(v).toLocaleString("en-US")}`}
        step={1000}
      />

      <div className="glass-card rounded-xl p-4 sm:p-5">
        <label htmlFor="se-years" className="text-label text-white/40 light:text-slate-400">
          Years
        </label>
        <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5">
          <input
            id="se-years"
            type="number"
            inputMode="numeric"
            min={1}
            max={40}
            step={1}
            value={years}
            onChange={(e) => {
              const parsed = parseInt(e.target.value, 10);
              setYears(isNaN(parsed) ? 1 : Math.min(40, Math.max(1, parsed)));
            }}
            className="text-mono-num w-full bg-transparent text-lg font-semibold tabular-nums text-white outline-none light:text-slate-900"
          />
        </div>
      </div>

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

      {result && <ConfidenceBadge result={confidence} toolId="savings-erosion" />}
      {result && <DataFreshnessBadge sourceName="Pakistan Bureau of Statistics" lastUpdated={breakdown?.observationDate ?? ""} dataFrequency="Monthly" />}

      {result && <SavingsErosionResults result={result} />}

      {result && (
        <ToolShareCard
          title="My Savings Erosion"
          headlineValue={`-${result.percentErosion.toFixed(1)}%`}
          headlineTone="up"
          comparisonLine={`Rs ${Math.round(result.savingsAmount).toLocaleString("en-US")} idle for ${result.years} years at ${result.inflationPct.toFixed(1)}% inflation`}
          deltaLine={`Real value: Rs ${Math.round(result.realValue).toLocaleString("en-US")}`}
          bars={[
            { label: "Nominal Value", value: result.nominalValue, color: "#4d8df7" },
            { label: "Real Value", value: result.realValue, color: "#fb7185" },
          ]}
          badgeLines={["Pakistan Bureau of Statistics", `${result.years}-year projection`]}
          shareUrl="https://www.pakeconintel.com/decision-support-lab/savings-erosion"
          shareSummary={`Rs ${Math.round(result.savingsAmount).toLocaleString("en-US")} left idle for ${result.years} years at ${result.inflationPct.toFixed(1)}% inflation would lose ${result.percentErosion.toFixed(1)}% of its real value.`}
          filenameBase="my-savings-erosion"
        />
      )}

      {result && (
        <ReportDownloadButton buildDefinition={buildReport} filename="savings-erosion-report.pdf" label={t("decisionSupportLab.downloadReport")} generatingLabel={t("decisionSupportLab.generatingReport")} />
      )}

      <PersonalInsightsPanel insights={insights} />

      {result && series.length > 0 && <SavingsErosionCharts series={series} savingsAmount={result.savingsAmount} />}

      <ExplainTheMath
        formula="Real Value = Savings ÷ (1 + Inflation ÷ 100)^Years"
        variables={[
          { symbol: "Savings", description: "The amount you're holding as cash or in a zero/low-return account" },
          { symbol: "Inflation", description: "The assumed annual inflation rate over the horizon" },
          { symbol: "Years", description: "How many years the savings sit idle" },
        ]}
        methodology="This compounds the inflation rate over the full horizon, the same way prices themselves compound year over year — a linear (Savings × Inflation × Years) estimate would understate the true erosion for anything beyond a year or two."
        sourceName="Pakistan Bureau of Statistics — National CPI Index"
        sourceUrl="https://www.pbs.gov.pk/cpi"
        lastUpdated={breakdown?.observationDate ?? ""}
        dataFrequency="Monthly"
        assumptions={["Assumes a constant annual inflation rate for the entire horizon.", "Assumes the savings earn no interest or investment return — purely idle cash."]}
        limitations={["If your savings earn interest or are invested, use the Future Salary Projection tool's compounding logic with your actual return rate instead — this tool intentionally models the worst case of zero return."]}
      />

      <EducationalPanel
        whatDoesThisMean="This shows how much real buying power idle savings lose over time, even though the rupee amount in the account never changes."
        whyDifferent="The number on your bank statement stays the same, but what it can buy shrinks every year prices rise — that's the gap this tool makes concrete."
        howCalculated="Your savings amount is discounted by the compounding inflation rate over your chosen number of years, the same index-based method used across every Decision Support Lab tool."
        sources={["Pakistan Bureau of Statistics — National CPI Index (Base 2015-16 = 100)"]}
      />

      <DecisionSupportPanel
        whatHappened={result ? `You modeled Rs ${Math.round(result.savingsAmount).toLocaleString("en-US")} left idle for ${result.years} years at ${result.inflationPct.toFixed(1)}% inflation.` : "Enter your savings, an inflation rate, and a time horizon to see the erosion."}
        whyItHappened="Cash that isn't earning a return above inflation loses real value every single year, compounding the longer it sits idle."
        whatToUnderstand="Comparing this erosion against any return you could earn instead (a savings account, investment, or paying down debt) is the real decision this number should inform."
        relatedTools={[{ title: "Future Salary Projection", href: "/decision-support-lab/future-salary-projection" }, { title: "Personal Economic Health Score", href: "/decision-support-lab/health-score" }]}
        suggestedNext={{
          title: "See your full Personal Economic Health Score",
          href: "/decision-support-lab/health-score",
          reason: "Combine this with your budget, salary and inflation results for one composite picture of your financial health.",
        }}
        snapshotPayload={
          result
            ? (): CalculationSnapshotPayload => ({
                toolId: "savings-erosion",
                inputs: { savingsAmount: result.savingsAmount, inflationPct: result.inflationPct, years: result.years },
                assumptions: {},
                outputs: { realValue: result.realValue, purchasingPowerLost: result.purchasingPowerLost, percentErosion: result.percentErosion },
              })
            : undefined
        }
      />
    </div>
  );
}
