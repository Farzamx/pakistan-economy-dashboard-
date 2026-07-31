"use client";

import { useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import RealReturnCalculatorForm from "@/components/realReturnCalculator/RealReturnCalculatorForm";
import RealReturnCalculatorResults from "@/components/realReturnCalculator/RealReturnCalculatorResults";
import RealReturnCalculatorCharts from "@/components/realReturnCalculator/RealReturnCalculatorCharts";
import ToolShareCard from "@/components/decisionSupportLab/ToolShareCard";
import PersonalInsightsPanel from "@/components/decisionSupportLab/PersonalInsightsPanel";
import DecisionSupportPanel from "@/components/decisionSupportLab/DecisionSupportPanel";
import ExplainTheMath from "@/components/decisionSupportLab/ExplainTheMath";
import EducationalPanel from "@/components/decisionSupportLab/EducationalPanel";
import ReportDownloadButton from "@/components/decisionSupportLab/ReportDownloadButton";
import InflationRateField from "@/components/decisionSupportLab/InflationRateField";
import { calculateInflationAdjustedGrowth, calculatePurchasingPowerPreservation, buildRealReturnSeries } from "@/lib/decisionSupportLab/investmentEngine";
import { calculateAverageAnnualInflation, getAvailableYears } from "@/lib/decisionSupportLab/purchasingPowerEngine";
import { computeOfficialCpiPct } from "@/lib/personalInflation/engine";
import { generatePersonalInsights } from "@/lib/decisionSupportLab/insightEngine";
import type { ReportDefinition } from "@/lib/decisionSupportLab/reportFramework";
import type { CpiCategoryBreakdown } from "@/lib/data/cpiCategoryBreakdown";
import type { CpiIndexPoint } from "@/lib/data/cpiMonthlyIndex";

interface Props {
  breakdown: CpiCategoryBreakdown | null;
  cpiSeries: CpiIndexPoint[] | null;
}

const CURRENT_YEAR = new Date().getFullYear();

export default function RealReturnCalculatorCalculator({ breakdown, cpiSeries }: Props) {
  const { t } = useLanguage();
  const officialInflationPct = useMemo(() => (breakdown ? computeOfficialCpiPct(breakdown.groups) : 0), [breakdown]);
  const availableYears = useMemo(() => (cpiSeries ? getAvailableYears(cpiSeries) : []), [cpiSeries]);

  const [investmentAmount, setInvestmentAmount] = useState(0);
  const [entryYear, setEntryYear] = useState(CURRENT_YEAR - 5);
  const [exitYear, setExitYear] = useState(CURRENT_YEAR);
  const [nominalReturnPct, setNominalReturnPct] = useState(0);
  const [useCustomInflation, setUseCustomInflation] = useState(false);
  const [customInflationPct, setCustomInflationPct] = useState(0);

  const years = Math.max(1, exitYear - entryYear);

  // Automatic inflation: the average annual rate implied by the real CPI
  // index between the entry and exit year's actual observations — not a
  // manual entry. Falls back to the latest official CPI rate when the
  // selected years fall outside the historical series (e.g. a future exit
  // year), per the "use latest official inflation when historical data
  // doesn't exist" rule.
  const entryPoint = availableYears.find((y) => y.year === entryYear)?.point ?? null;
  const exitPoint = availableYears.find((y) => y.year === exitYear)?.point ?? null;
  const historicalInflationPct = useMemo(() => {
    if (!cpiSeries || !entryPoint || !exitPoint) return null;
    return calculateAverageAnnualInflation(cpiSeries, entryPoint.observationDate, exitPoint.observationDate);
  }, [cpiSeries, entryPoint, exitPoint]);
  const autoInflationPct = historicalInflationPct ?? officialInflationPct;
  const inflationPct = useCustomInflation ? customInflationPct : autoInflationPct;

  const result = useMemo(
    () => (investmentAmount > 0 ? calculateInflationAdjustedGrowth(investmentAmount, nominalReturnPct, inflationPct, years) : null),
    [investmentAmount, nominalReturnPct, inflationPct, years],
  );

  const series = useMemo(() => (investmentAmount > 0 ? buildRealReturnSeries(investmentAmount, nominalReturnPct, inflationPct, years) : []), [investmentAmount, nominalReturnPct, inflationPct, years]);

  const nominalGain = result ? result.nominalEndValue - investmentAmount : 0;
  const realGain = result ? result.realEndValue - investmentAmount : 0;
  const inflationCost = nominalGain - realGain;
  const purchasingPowerChangePct = result ? calculatePurchasingPowerPreservation(investmentAmount, result.realEndValue) - 100 : 0;

  const insights = useMemo(() => (result ? generatePersonalInsights({ inflationGainElimination: { nominalGainAmount: nominalGain, realGainAmount: realGain } }) : []), [result, nominalGain, realGain]);

  function buildReport(): ReportDefinition {
    if (!result) {
      return { toolName: "Real Return Calculator", generatedAt: new Date().toISOString().slice(0, 10), sourceNote: "Source: PEIC Investment Intelligence Engine", sections: [] };
    }
    return {
      toolName: "Real Return Calculator",
      subtitle: "Pakistan Economic Intelligence Center — Decision Support Lab",
      generatedAt: new Date().toISOString().slice(0, 10),
      sourceNote: "Source: PEIC Investment Intelligence Engine",
      sections: [
        {
          heading: "Summary",
          paragraphs: [
            `Rs ${Math.round(investmentAmount).toLocaleString("en-US")} invested from ${entryYear} to ${exitYear} at ${nominalReturnPct.toFixed(1)}% nominal return, against ${inflationPct.toFixed(1)}% inflation, produced a real gain of Rs ${Math.round(realGain).toLocaleString("en-US")}.`,
          ],
          facts: [
            { label: "Investment Amount", value: `Rs ${Math.round(investmentAmount).toLocaleString("en-US")}` },
            { label: "Entry Year", value: `${entryYear}` },
            { label: "Exit Year", value: `${exitYear}` },
            { label: "Nominal Return", value: `${nominalReturnPct.toFixed(1)}%` },
            { label: "Inflation Rate", value: `${inflationPct.toFixed(1)}% ${useCustomInflation ? "(custom)" : historicalInflationPct !== null ? "(historical average)" : "(latest official)"}` },
            { label: "Nominal Gain", value: `Rs ${Math.round(nominalGain).toLocaleString("en-US")}` },
            { label: "Real Gain", value: `Rs ${Math.round(realGain).toLocaleString("en-US")}` },
            { label: "Inflation Cost", value: `Rs ${Math.round(inflationCost).toLocaleString("en-US")}` },
            { label: "Purchasing Power Change", value: `${purchasingPowerChangePct >= 0 ? "+" : ""}${purchasingPowerChangePct.toFixed(1)}%` },
          ],
        },
      ],
    };
  }

  return (
    <div id="calculator-input" className="flex flex-col gap-6">
      <RealReturnCalculatorForm
        investmentAmount={investmentAmount}
        onInvestmentAmountChange={setInvestmentAmount}
        entryYear={entryYear}
        onEntryYearChange={setEntryYear}
        exitYear={exitYear}
        onExitYearChange={setExitYear}
        nominalReturnPct={nominalReturnPct}
        onNominalReturnPctChange={setNominalReturnPct}
      />

      <div className="glass-card rounded-xl p-4 sm:p-5">
        <InflationRateField
          autoValuePct={autoInflationPct}
          autoLabel={historicalInflationPct !== null ? `Average Inflation (${entryYear}–${exitYear})` : "Official Inflation (Latest)"}
          tooltipText={
            historicalInflationPct !== null
              ? "Calculated automatically from official historical CPI data."
              : "No historical CPI data covers this exact period — using the latest official inflation rate instead."
          }
          useCustom={useCustomInflation}
          onUseCustomChange={setUseCustomInflation}
          customValuePct={customInflationPct}
          onCustomValuePctChange={setCustomInflationPct}
        />
      </div>

      {investmentAmount <= 0 && (
        <div className="rounded-lg border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">{t("decisionSupportLab.validationEnterAmount")}</div>
      )}

      {result && <RealReturnCalculatorResults nominalGain={nominalGain} realGain={realGain} purchasingPowerChangePct={purchasingPowerChangePct} inflationCost={inflationCost} />}

      {result && (
        <ToolShareCard
          title="My Real Return"
          headlineValue={`Rs ${Math.round(realGain).toLocaleString("en-US")}`}
          headlineTone={realGain >= 0 ? "down" : "up"}
          comparisonLine={`Rs ${Math.round(investmentAmount).toLocaleString("en-US")} invested ${entryYear}–${exitYear} at ${nominalReturnPct.toFixed(1)}% nominal`}
          deltaLine={`vs. Rs ${Math.round(nominalGain).toLocaleString("en-US")} nominal gain`}
          bars={[
            { label: "Nominal Gain", value: Math.max(0, nominalGain), color: "#4d8df7" },
            { label: "Real Gain", value: Math.max(0, realGain), color: "#fb7185" },
          ]}
          badgeLines={["PEIC Investment Intelligence", `${entryYear}–${exitYear}`]}
          shareUrl="https://www.pakeconintel.com/decision-support-lab/real-return-calculator"
          shareSummary={`My Rs ${Math.round(investmentAmount).toLocaleString("en-US")} investment's nominal gain was Rs ${Math.round(nominalGain).toLocaleString("en-US")}, but after ${inflationPct.toFixed(1)}% inflation my real gain was only Rs ${Math.round(realGain).toLocaleString("en-US")}.`}
          filenameBase="my-real-return"
        />
      )}

      {result && (
        <ReportDownloadButton buildDefinition={buildReport} filename="real-return-report.pdf" label={t("decisionSupportLab.downloadReport")} generatingLabel={t("decisionSupportLab.generatingReport")} />
      )}

      <PersonalInsightsPanel insights={insights} />

      {series.length > 0 && <RealReturnCalculatorCharts series={series} />}

      <ExplainTheMath
        formula="Nominal Value = Amount × (1 + Nominal Return ÷ 100)^Years; Real Value = Nominal Value ÷ (1 + Inflation ÷ 100)^Years"
        variables={[
          { symbol: "Amount", description: "Your investment amount" },
          { symbol: "Nominal Return", description: "Your investment's stated annual return" },
          { symbol: "Inflation", description: "The average annual inflation rate between your entry and exit year, from official historical CPI data" },
        ]}
        methodology="This reuses the Investment Intelligence engine's calculateInflationAdjustedGrowth() — the same nominal-compounding (Time Value engine) and inflation-stripping (Purchasing Power engine) math every tool in this Lab already uses, composed for an investment holding period. The inflation rate itself is calculateAverageAnnualInflation() from the Purchasing Power engine — the compound annual growth rate of the real CPI index between your two selected years, not a typed-in assumption."
        sourceName="PEIC Investment Intelligence Engine"
        lastUpdated=""
        assumptions={["Assumes a constant nominal return for the entire holding period.", "Ignores taxes, fees, and transaction costs."]}
        limitations={["Real-world returns vary year to year — this models a constant-rate idealization, useful for comparison, not a guarantee.", "If your exit year is in the future, historical CPI data can't cover it — the latest official inflation rate is used instead."]}
      />

      <EducationalPanel
        whatDoesThisMean="This shows what your investment actually earned once inflation is accounted for — the difference between the number on your statement and what that number can really buy."
        whyDifferent="A 12% nominal return sounds strong, but at 12% inflation your real gain is close to zero — the 'Inflation Cost' figure makes that gap concrete in rupees, not just percentage points."
        howCalculated="Your investment compounds forward at the nominal return, then that ending value is discounted back by the average inflation rate actually observed between your entry and exit year — the same two-step calculation used throughout this Lab's Income & Wealth and Time Value tools."
        sources={["PEIC Investment Intelligence Engine — deterministic, no AI or estimation involved.", "Pakistan Bureau of Statistics — National CPI Index (for the automatic inflation rate)"]}
      />

      <DecisionSupportPanel
        whatHappened={
          result
            ? `You calculated the real return on Rs ${Math.round(investmentAmount).toLocaleString("en-US")} invested from ${entryYear} to ${exitYear} at ${nominalReturnPct.toFixed(1)}% nominal return.`
            : "Enter an investment amount, entry and exit year, and a nominal return to see your real return."
        }
        whyItHappened="The longer the holding period and the closer inflation runs to your nominal return, the more of your gain gets eaten — this compounds every year, not just at the end."
        whatToUnderstand="Comparing real return, not nominal return, across different assets is the entire point of the Asset Comparison Lab — the same real-return math, applied to several investments side by side."
        relatedTools={[{ title: "Asset Comparison Lab", href: "/decision-support-lab/asset-comparison-lab" }, { title: "Real Return Intelligence Dashboard", href: "/decision-support-lab/real-return-dashboard" }]}
        suggestedNext={{
          title: "See the full picture in the flagship dashboard",
          href: "/decision-support-lab/real-return-dashboard",
          reason: "See nominal wealth, inflation, taxes and real wealth together in one professional dashboard.",
        }}
      />
    </div>
  );
}
