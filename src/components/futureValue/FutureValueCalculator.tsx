"use client";

import { useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import FutureValueForm from "@/components/futureValue/FutureValueForm";
import InflationRateField from "@/components/decisionSupportLab/InflationRateField";
import FutureValueResults from "@/components/futureValue/FutureValueResults";
import FutureValueCharts from "@/components/futureValue/FutureValueCharts";
import ToolShareCard from "@/components/decisionSupportLab/ToolShareCard";
import PersonalInsightsPanel from "@/components/decisionSupportLab/PersonalInsightsPanel";
import DecisionSupportPanel from "@/components/decisionSupportLab/DecisionSupportPanel";
import ExplainTheMath from "@/components/decisionSupportLab/ExplainTheMath";
import EducationalPanel from "@/components/decisionSupportLab/EducationalPanel";
import ReportDownloadButton from "@/components/decisionSupportLab/ReportDownloadButton";
import RequiredInputsGate from "@/components/decisionSupportLab/RequiredInputsGate";
import { futureValueWithFrequency, type CompoundingFrequency } from "@/lib/decisionSupportLab/timeValueEngine";
import { deflateCompounding } from "@/lib/decisionSupportLab/purchasingPowerEngine";
import { computeOfficialCpiPct } from "@/lib/personalInflation/engine";
import { generatePersonalInsights } from "@/lib/decisionSupportLab/insightEngine";
import { useEconomicProfile } from "@/lib/decisionSupportLab/economicProfile";
import type { ReportDefinition } from "@/lib/decisionSupportLab/reportFramework";
import type { CalculationSnapshotPayload } from "@/lib/supabase/calculationSnapshots";
import type { CpiCategoryBreakdown } from "@/lib/data/cpiCategoryBreakdown";

interface Props {
  breakdown: CpiCategoryBreakdown | null;
}

export default function FutureValueCalculator({ breakdown }: Props) {
  const { t } = useLanguage();
  const { profile } = useEconomicProfile();
  const officialInflationPct = useMemo(() => (breakdown ? computeOfficialCpiPct(breakdown.groups) : 0), [breakdown]);

  // Prefilled (not synced) from the profile's current savings — same
  // light-touch pattern as the Present Value Calculator.
  const [presentValueAmount, setPresentValueAmount] = useState(() => profile.currentSavings);
  const [annualReturnPct, setAnnualReturnPct] = useState(0);
  const [years, setYears] = useState(10);
  const [frequency, setFrequency] = useState<CompoundingFrequency>("annual");
  const [useCustomInflation, setUseCustomInflation] = useState(false);
  const [customInflationPct, setCustomInflationPct] = useState(0);
  const realValueInflationPct = useCustomInflation ? customInflationPct : officialInflationPct;

  const hasAnnualReturn = annualReturnPct !== 0;
  const canCompute = presentValueAmount > 0 && hasAnnualReturn;
  const futureValueAmount = useMemo(
    () => (canCompute ? futureValueWithFrequency(presentValueAmount, annualReturnPct, years, frequency) : 0),
    [canCompute, presentValueAmount, annualReturnPct, years, frequency],
  );
  const realFutureValueAmount = useMemo(() => (canCompute ? deflateCompounding(futureValueAmount, realValueInflationPct, years) : 0), [canCompute, futureValueAmount, realValueInflationPct, years]);

  const insights = useMemo(() => {
    if (!canCompute) return [];
    const half = Math.max(1, Math.floor(years / 2));
    const halfYearValue = futureValueWithFrequency(presentValueAmount, annualReturnPct, half, frequency);
    return generatePersonalInsights({
      compoundingAcceleration: { firstHalfGrowth: halfYearValue - presentValueAmount, secondHalfGrowth: futureValueAmount - halfYearValue },
    });
  }, [canCompute, presentValueAmount, annualReturnPct, years, frequency, futureValueAmount]);

  function buildReport(): ReportDefinition {
    return {
      toolName: "Future Value Calculator",
      subtitle: "Pakistan Economic Intelligence Center — Decision Support Lab",
      generatedAt: new Date().toISOString().slice(0, 10),
      sourceNote: "Source: PEIC Time Value of Money Engine",
      sections: [
        {
          heading: "Summary",
          paragraphs: [
            `Rs ${Math.round(presentValueAmount).toLocaleString("en-US")} growing at ${annualReturnPct.toFixed(1)}% for ${years} years (${frequency} compounding) reaches Rs ${Math.round(futureValueAmount).toLocaleString("en-US")}.`,
          ],
          facts: [
            { label: "Present Value", value: `Rs ${Math.round(presentValueAmount).toLocaleString("en-US")}` },
            { label: "Annual Return", value: `${annualReturnPct.toFixed(1)}%` },
            { label: "Years", value: `${years}` },
            { label: "Compounding", value: frequency },
            { label: "Future Value", value: `Rs ${Math.round(futureValueAmount).toLocaleString("en-US")}` },
            { label: "Growth Multiple", value: `${(presentValueAmount > 0 ? futureValueAmount / presentValueAmount : 0).toFixed(2)}×` },
            { label: "Real Future Value (Inflation-Adjusted)", value: `Rs ${Math.round(realFutureValueAmount).toLocaleString("en-US")}` },
          ],
        },
      ],
    };
  }

  return (
    <div id="calculator-input" className="flex flex-col gap-6">
      <FutureValueForm
        presentValueAmount={presentValueAmount}
        onPresentValueChange={setPresentValueAmount}
        annualReturnPct={annualReturnPct}
        onAnnualReturnPctChange={setAnnualReturnPct}
        years={years}
        onYearsChange={setYears}
        frequency={frequency}
        onFrequencyChange={setFrequency}
      />

      <div className="glass-card rounded-xl p-4 sm:p-5">
        <InflationRateField
          autoValuePct={officialInflationPct}
          autoLabel="Official Inflation (Latest)"
          tooltipText="Used only for the Real Future Value (Inflation-Adjusted) figure below — calculated automatically from the latest official CPI data."
          useCustom={useCustomInflation}
          onUseCustomChange={setUseCustomInflation}
          customValuePct={customInflationPct}
          onCustomValuePctChange={setCustomInflationPct}
        />
      </div>

      <RequiredInputsGate
        requiredInputs={[
          { id: "fv-pv", label: "Present Value", filled: presentValueAmount > 0 },
          { id: "fv-return", label: "Annual Return", filled: hasAnnualReturn },
        ]}
      >
        <FutureValueResults futureValueAmount={futureValueAmount} presentValueAmount={presentValueAmount} realFutureValueAmount={realFutureValueAmount} />

        <ToolShareCard
          title="My Future Value"
          headlineValue={`Rs ${Math.round(futureValueAmount).toLocaleString("en-US")}`}
          headlineTone="down"
          comparisonLine={`Rs ${Math.round(presentValueAmount).toLocaleString("en-US")} today, growing at ${annualReturnPct.toFixed(1)}% for ${years} years`}
          bars={[
            { label: "Present Value", value: presentValueAmount, color: "#4d8df7" },
            { label: "Future Value", value: futureValueAmount, color: "#34d399" },
          ]}
          badgeLines={["PEIC Time Value Engine", `${frequency} compounding`]}
          shareUrl="https://www.pakeconintel.com/decision-support-lab/future-value"
          shareSummary={`Rs ${Math.round(presentValueAmount).toLocaleString("en-US")} growing at ${annualReturnPct.toFixed(1)}% for ${years} years reaches Rs ${Math.round(futureValueAmount).toLocaleString("en-US")}.`}
          filenameBase="my-future-value"
        />

        <ReportDownloadButton buildDefinition={buildReport} filename="future-value-report.pdf" label={t("decisionSupportLab.downloadReport")} generatingLabel={t("decisionSupportLab.generatingReport")} />

        <PersonalInsightsPanel insights={insights} />

        <FutureValueCharts presentValueAmount={presentValueAmount} annualReturnPct={annualReturnPct} years={years} frequency={frequency} />
      </RequiredInputsGate>

      <ExplainTheMath
        formula="Future Value = Present Value × (1 + Rate ÷ m)^(m × Years)  [continuous: PV × e^(Rate × Years)]"
        variables={[
          { symbol: "Present Value", description: "The amount you're starting with today" },
          { symbol: "Rate", description: "Your expected annual return" },
          { symbol: "m", description: "Compounding periods per year (12 for monthly, 4 for quarterly, etc.)" },
        ]}
        methodology="This compounds your starting amount forward — the exact inverse of the Present Value Calculator's discounting, and the same formula behind every 'how much will my money grow to' projection in this Lab (Future Salary Projection reuses it directly)."
        sourceName="PEIC Time Value of Money Engine"
        lastUpdated=""
        assumptions={["Assumes a constant annual return for the entire horizon — real returns vary year to year."]}
        limitations={["Real Future Value uses the current official inflation rate held constant — actual future inflation will differ."]}
      />

      <EducationalPanel
        whatDoesThisMean="This projects what a sum of money today will grow into at a future date, and shows both the nominal (rupee) growth and what that amount is really worth after inflation."
        whyDifferent="The nominal Future Value can look impressive on its own, but the Real Future Value shows what it can actually buy — the same distinction Future Salary Projection and Savings Erosion make for income and savings."
        howCalculated="Your present value compounds forward at your chosen rate and frequency; the same figure is separately discounted by inflation to express it in today's purchasing power."
        sources={["PEIC Time Value of Money Engine — deterministic, no AI or estimation involved.", "Pakistan Bureau of Statistics — National CPI Index (for the Real Future Value figure)"]}
      />

      <DecisionSupportPanel
        whatHappened={
          presentValueAmount > 0
            ? `You projected Rs ${Math.round(presentValueAmount).toLocaleString("en-US")} growing at ${annualReturnPct.toFixed(1)}% for ${years} years.`
            : "Enter a present value, an expected return, and a time horizon to see your projection."
        }
        whyItHappened="Compounding means growth accelerates over time — later years typically contribute more to the final total than earlier years, even at a constant rate."
        whatToUnderstand="Compare your growth multiple here against the discount factor in the Present Value Calculator — they're mathematical inverses of each other at the same rate and horizon."
        relatedTools={[{ title: "Present Value Calculator", href: "/decision-support-lab/present-value" }, { title: "Compound Interest Calculator", href: "/decision-support-lab/compound-interest" }]}
        suggestedNext={{
          title: "See interest earned vs. principal, broken down",
          href: "/decision-support-lab/compound-interest",
          reason: "See exactly how much of your growth comes from interest earning interest, not just the total ending value.",
        }}
        snapshotPayload={
          canCompute
            ? (): CalculationSnapshotPayload => ({
                toolId: "future-value",
                inputs: { presentValueAmount, annualReturnPct, years, frequency },
                assumptions: {},
                outputs: { futureValueAmount, realFutureValueAmount },
              })
            : undefined
        }
      />
    </div>
  );
}
