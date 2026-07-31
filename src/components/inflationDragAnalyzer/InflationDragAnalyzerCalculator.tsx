"use client";

import { useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import InflationDragAnalyzerForm from "@/components/inflationDragAnalyzer/InflationDragAnalyzerForm";
import InflationRateField from "@/components/decisionSupportLab/InflationRateField";
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
import { generatePersonalInsights } from "@/lib/decisionSupportLab/insightEngine";
import type { ReportDefinition } from "@/lib/decisionSupportLab/reportFramework";
import type { CpiCategoryBreakdown } from "@/lib/data/cpiCategoryBreakdown";

interface Props {
  breakdown: CpiCategoryBreakdown | null;
}

export default function InflationDragAnalyzerCalculator({ breakdown }: Props) {
  const { t } = useLanguage();
  const officialInflationPct = useMemo(() => (breakdown ? computeOfficialCpiPct(breakdown.groups) : 0), [breakdown]);

  const [startingWealth, setStartingWealth] = useState(0);
  const [nominalReturnPct, setNominalReturnPct] = useState(0);
  const [useCustomInflation, setUseCustomInflation] = useState(false);
  const [customInflationPct, setCustomInflationPct] = useState(0);
  const inflationPct = useCustomInflation ? customInflationPct : officialInflationPct;
  const [years, setYears] = useState(10);

  const result = useMemo(() => (startingWealth > 0 ? calculateInflationAdjustedGrowth(startingWealth, nominalReturnPct, inflationPct, years) : null), [
    startingWealth,
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

  return (
    <div id="calculator-input" className="flex flex-col gap-6">
      <InflationDragAnalyzerForm
        startingWealth={startingWealth}
        onStartingWealthChange={setStartingWealth}
        nominalReturnPct={nominalReturnPct}
        onNominalReturnPctChange={setNominalReturnPct}
        years={years}
        onYearsChange={setYears}
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

      {startingWealth <= 0 && (
        <div className="rounded-lg border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">{t("decisionSupportLab.validationEnterAmount")}</div>
      )}

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
      />
    </div>
  );
}
