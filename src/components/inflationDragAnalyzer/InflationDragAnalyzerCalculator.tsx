"use client";

import { useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import InflationDragAnalyzerForm from "@/components/inflationDragAnalyzer/InflationDragAnalyzerForm";
import InflationRateField from "@/components/decisionSupportLab/InflationRateField";
import WhatIfToggle from "@/components/decisionSupportLab/WhatIfToggle";
import ConfidenceBadge from "@/components/decisionSupportLab/ConfidenceBadge";
import DataFreshnessBadge from "@/components/decisionSupportLab/DataFreshnessBadge";
import RequiredInputsGate from "@/components/decisionSupportLab/RequiredInputsGate";
import InflationDragAnalyzerResults from "@/components/inflationDragAnalyzer/InflationDragAnalyzerResults";
import InflationDragAnalyzerCharts from "@/components/inflationDragAnalyzer/InflationDragAnalyzerCharts";
import ToolShareCard from "@/components/decisionSupportLab/ToolShareCard";
import PersonalInsightsPanel from "@/components/decisionSupportLab/PersonalInsightsPanel";
import DecisionSupportPanel from "@/components/decisionSupportLab/DecisionSupportPanel";
import ExplainTheMath from "@/components/decisionSupportLab/ExplainTheMath";
import EducationalPanel from "@/components/decisionSupportLab/EducationalPanel";
import ReportDownloadButton from "@/components/decisionSupportLab/ReportDownloadButton";
import { calculateInflationAdjustedGrowth } from "@/lib/decisionSupportLab/investmentEngine";
import { computeOfficialCpiPct } from "@/lib/personalInflation/engine";
import { calculateConfidenceScore } from "@/lib/decisionSupportLab/confidenceEngine";
import { generatePersonalInsights } from "@/lib/decisionSupportLab/insightEngine";
import { getOverallCompletionPct } from "@/lib/decisionSupportLab/profileCompletion";
import { useEconomicProfile, setEconomicProfile } from "@/lib/decisionSupportLab/economicProfile";
import type { ReportDefinition } from "@/lib/decisionSupportLab/reportFramework";
import type { CpiCategoryBreakdown } from "@/lib/data/cpiCategoryBreakdown";

interface Props {
  breakdown: CpiCategoryBreakdown | null;
}

export default function InflationDragAnalyzerCalculator({ breakdown }: Props) {
  const { t } = useLanguage();
  const { profile } = useEconomicProfile();
  const officialInflationPct = useMemo(() => (breakdown ? computeOfficialCpiPct(breakdown.groups) : 0), [breakdown]);

  const [isWhatIfWealth, setIsWhatIfWealth] = useState(false);
  const [whatIfWealth, setWhatIfWealth] = useState(0);
  const startingWealth = isWhatIfWealth ? whatIfWealth : profile.currentInvestmentAmount;
  const [nominalReturnPct, setNominalReturnPct] = useState(0);
  const [useCustomInflation, setUseCustomInflation] = useState(false);
  const [customInflationPct, setCustomInflationPct] = useState(0);
  const inflationPct = useCustomInflation ? customInflationPct : officialInflationPct;
  const [years, setYears] = useState(10);

  const hasNominalReturn = nominalReturnPct !== 0;
  const result = useMemo(() => (startingWealth > 0 && hasNominalReturn ? calculateInflationAdjustedGrowth(startingWealth, nominalReturnPct, inflationPct, years) : null), [
    startingWealth,
    hasNominalReturn,
    nominalReturnPct,
    inflationPct,
    years,
  ]);

  const endingWealth = result?.nominalEndValue ?? 0;
  const realValue = result?.realEndValue ?? 0;
  const inflationLoss = endingWealth - realValue;

  const insights = useMemo(
    () => (result ? generatePersonalInsights({ inflationGainElimination: { nominalGainAmount: endingWealth - startingWealth, realGainAmount: realValue - startingWealth } }) : []),
    [result, endingWealth, startingWealth, realValue],
  );

  const confidence = useMemo(
    () =>
      calculateConfidenceScore({
        profileCompletenessPct: getOverallCompletionPct(profile),
        usesOfficialData: !useCustomInflation,
        hasHistoricalCoverage: breakdown !== null,
        manualEstimateCount: (isWhatIfWealth ? 1 : 0) + 1,
        assumptionCount: useCustomInflation ? 1 : 0,
      }),
    [profile, useCustomInflation, breakdown, isWhatIfWealth],
  );

  function buildReport(): ReportDefinition {
    return {
      toolName: "Inflation Drag Analyzer",
      subtitle: "Pakistan Economic Intelligence Center — Decision Support Lab",
      generatedAt: new Date().toISOString().slice(0, 10),
      sourceNote: "Source: PEIC Investment Intelligence Engine",
      sections: [
        {
          heading: "Summary",
          paragraphs: [
            `Rs ${Math.round(startingWealth).toLocaleString("en-US")} growing at ${nominalReturnPct.toFixed(1)}% for ${years} years against ${inflationPct.toFixed(1)}% inflation loses Rs ${Math.round(inflationLoss).toLocaleString("en-US")} of nominal growth to inflation.`,
          ],
          facts: [
            { label: "Starting Wealth", value: `Rs ${Math.round(startingWealth).toLocaleString("en-US")}` },
            { label: "Nominal Return", value: `${nominalReturnPct.toFixed(1)}%` },
            { label: "Inflation Rate", value: `${inflationPct.toFixed(1)}%` },
            { label: "Years", value: `${years}` },
            { label: "Ending Wealth (Nominal)", value: `Rs ${Math.round(endingWealth).toLocaleString("en-US")}` },
            { label: "Inflation Loss", value: `Rs ${Math.round(inflationLoss).toLocaleString("en-US")}` },
            { label: "Real Value", value: `Rs ${Math.round(realValue).toLocaleString("en-US")}` },
          ],
        },
      ],
    };
  }

  if (profile.currentInvestmentAmount <= 0 && !isWhatIfWealth) {
    return (
      <div id="calculator-input" className="flex flex-col gap-6">
        <div className="glass-card rounded-xl border border-neon-blue/20 p-4 sm:p-5">
          <p className="text-sm font-semibold text-white light:text-slate-900">We need one more value.</p>
          <p className="mt-1 text-xs text-white/50 light:text-slate-500">This saves to your Economic Profile, so you won&apos;t be asked again.</p>
          <div className="mt-3 max-w-xs">
            <label htmlFor="ida-wealth-gate" className="text-label text-white/40 light:text-slate-400">
              {t("inflationDragAnalyzer.startingWealthLabel")}
            </label>
            <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5">
              <span className="text-sm text-white/40 light:text-slate-400">Rs</span>
              <input
                id="ida-wealth-gate"
                type="number"
                inputMode="decimal"
                step={1000}
                placeholder="Enter starting wealth"
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
        label={t("inflationDragAnalyzer.startingWealthLabel")}
        currentValue={profile.currentInvestmentAmount}
        whatIfValue={whatIfWealth}
        onWhatIfValueChange={setWhatIfWealth}
        isWhatIf={isWhatIfWealth}
        onToggle={setIsWhatIfWealth}
        formatValue={(v) => `Rs ${Math.round(v).toLocaleString("en-US")}`}
        step={1000}
      />

      <InflationDragAnalyzerForm nominalReturnPct={nominalReturnPct} onNominalReturnPctChange={setNominalReturnPct} years={years} onYearsChange={setYears} />

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

      <RequiredInputsGate requiredInputs={[{ id: "ida-return", label: "Nominal Return", filled: hasNominalReturn }]}>
        {result && <ConfidenceBadge result={confidence} toolId="inflation-drag-analyzer" />}
        {result && <DataFreshnessBadge sourceName="PEIC Investment Intelligence Engine" lastUpdated={breakdown?.observationDate ?? ""} dataFrequency="Monthly" />}

        {result && <InflationDragAnalyzerResults startingWealth={startingWealth} endingWealth={endingWealth} inflationLoss={inflationLoss} realValue={realValue} />}

        {result && (
          <ToolShareCard
            title="My Inflation Drag"
            headlineValue={`Rs ${Math.round(inflationLoss).toLocaleString("en-US")}`}
            headlineTone="up"
            comparisonLine={`Rs ${Math.round(startingWealth).toLocaleString("en-US")} over ${years} years at ${nominalReturnPct.toFixed(1)}% nominal, ${inflationPct.toFixed(1)}% inflation`}
            deltaLine={`Real value: Rs ${Math.round(realValue).toLocaleString("en-US")}`}
            bars={[
              { label: "Ending Wealth (Nominal)", value: endingWealth, color: "#34d399" },
              { label: "Real Value", value: realValue, color: "#9b8afb" },
            ]}
            badgeLines={["PEIC Investment Intelligence", `${years}-year horizon`]}
            shareUrl="https://www.pakeconintel.com/decision-support-lab/inflation-drag-analyzer"
            shareSummary={`Rs ${Math.round(startingWealth).toLocaleString("en-US")} growing at ${nominalReturnPct.toFixed(1)}% over ${years} years lost Rs ${Math.round(inflationLoss).toLocaleString("en-US")} of its growth to ${inflationPct.toFixed(1)}% inflation.`}
            filenameBase="my-inflation-drag"
          />
        )}

        {result && (
          <ReportDownloadButton buildDefinition={buildReport} filename="inflation-drag-report.pdf" label={t("decisionSupportLab.downloadReport")} generatingLabel={t("decisionSupportLab.generatingReport")} />
        )}

        <PersonalInsightsPanel insights={insights} />

        {result && <InflationDragAnalyzerCharts startingWealth={startingWealth} endingWealth={endingWealth} realValue={realValue} />}
      </RequiredInputsGate>

      <ExplainTheMath
        formula="Ending Wealth = Starting Wealth × (1 + Return ÷ 100)^Years; Real Value = Ending Wealth ÷ (1 + Inflation ÷ 100)^Years; Inflation Loss = Ending Wealth − Real Value"
        variables={[
          { symbol: "Starting Wealth", description: "Your wealth at the start of the period" },
          { symbol: "Return", description: "Your nominal annual return" },
          { symbol: "Inflation", description: "The annual inflation rate over the same period" },
        ]}
        methodology="Reuses calculateInflationAdjustedGrowth() from the Investment Intelligence engine — the same math as the Real Return Calculator, decomposed visually into starting wealth, nominal growth, inflation loss and real value rather than framed around a gain/loss headline."
        sourceName="PEIC Investment Intelligence Engine"
        lastUpdated=""
        assumptions={["Assumes a constant nominal return and constant inflation rate for the entire period."]}
        limitations={["Real-world returns and inflation vary year to year — this models a constant-rate idealization."]}
      />

      <EducationalPanel
        whatDoesThisMean="This decomposes your wealth's growth into what you actually gained nominally, how much of that growth inflation consumed, and what's left in real terms."
        whyDifferent="The waterfall makes the erosion visible step by step — starting wealth grows to nominal ending wealth, then inflation takes a visible bite on the way down to real value, rather than just showing a final number."
        howCalculated="Your starting wealth compounds forward at your nominal return; the same ending value is then discounted by inflation to find its real value — the difference between the two is the inflation loss."
        sources={["PEIC Investment Intelligence Engine — deterministic, no AI or estimation involved."]}
      />

      <DecisionSupportPanel
        whatHappened={
          result
            ? `You decomposed Rs ${Math.round(startingWealth).toLocaleString("en-US")} growing at ${nominalReturnPct.toFixed(1)}% over ${years} years against ${inflationPct.toFixed(1)}% inflation.`
            : "Enter a starting wealth, nominal return, inflation rate and time horizon to see the decomposition."
        }
        whyItHappened="Inflation loss grows with both the time horizon and the gap between your nominal return and the inflation rate — a return barely above inflation loses almost as much of its growth as a much higher return would at higher inflation."
        whatToUnderstand="This same decomposition, applied across several assets rather than one, is exactly what the Asset Comparison Lab and Portfolio Purchasing Power tools do next."
        relatedTools={[{ title: "Real Return Calculator", href: "/decision-support-lab/real-return-calculator" }, { title: "Portfolio Purchasing Power", href: "/decision-support-lab/portfolio-purchasing-power" }]}
        suggestedNext={{
          title: "See this decomposition across your whole portfolio",
          href: "/decision-support-lab/portfolio-purchasing-power",
          reason: "Apply the same nominal-to-real decomposition across multiple assets weighted by your actual allocation.",
        }}
        snapshotPayload={
          result
            ? () => ({
                toolId: "inflation-drag-analyzer",
                inputs: { startingWealth, nominalReturnPct, years },
                assumptions: { inflationPct, useCustomInflation, isWhatIfWealth },
                outputs: { endingWealth, inflationLoss, realValue },
              })
            : undefined
        }
      />
    </div>
  );
}
