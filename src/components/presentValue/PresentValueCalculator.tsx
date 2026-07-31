"use client";

import { useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import PresentValueForm from "@/components/presentValue/PresentValueForm";
import InflationRateField from "@/components/decisionSupportLab/InflationRateField";
import PresentValueResults from "@/components/presentValue/PresentValueResults";
import PresentValueCharts from "@/components/presentValue/PresentValueCharts";
import ToolShareCard from "@/components/decisionSupportLab/ToolShareCard";
import PersonalInsightsPanel from "@/components/decisionSupportLab/PersonalInsightsPanel";
import DecisionSupportPanel from "@/components/decisionSupportLab/DecisionSupportPanel";
import ExplainTheMath from "@/components/decisionSupportLab/ExplainTheMath";
import EducationalPanel from "@/components/decisionSupportLab/EducationalPanel";
import ReportDownloadButton from "@/components/decisionSupportLab/ReportDownloadButton";
import { presentValueWithFrequency, type CompoundingFrequency } from "@/lib/decisionSupportLab/timeValueEngine";
import { deflateCompounding } from "@/lib/decisionSupportLab/purchasingPowerEngine";
import { computeOfficialCpiPct } from "@/lib/personalInflation/engine";
import { generatePersonalInsights } from "@/lib/decisionSupportLab/insightEngine";
import type { ReportDefinition } from "@/lib/decisionSupportLab/reportFramework";
import type { CpiCategoryBreakdown } from "@/lib/data/cpiCategoryBreakdown";

interface Props {
  breakdown: CpiCategoryBreakdown | null;
}

export default function PresentValueCalculator({ breakdown }: Props) {
  const { t } = useLanguage();
  const officialInflationPct = useMemo(() => (breakdown ? computeOfficialCpiPct(breakdown.groups) : 0), [breakdown]);

  const [futureValueAmount, setFutureValueAmount] = useState(0);
  const [discountRatePct, setDiscountRatePct] = useState(0);
  const [years, setYears] = useState(10);
  const [frequency, setFrequency] = useState<CompoundingFrequency>("annual");
  const [useCustomInflation, setUseCustomInflation] = useState(false);
  const [customInflationPct, setCustomInflationPct] = useState(0);
  const realValueInflationPct = useCustomInflation ? customInflationPct : officialInflationPct;

  const presentValueAmount = useMemo(
    () => (futureValueAmount > 0 ? presentValueWithFrequency(futureValueAmount, discountRatePct, years, frequency) : 0),
    [futureValueAmount, discountRatePct, years, frequency],
  );
  const discountFactorValue = futureValueAmount > 0 ? presentValueAmount / futureValueAmount : 0;
  const realValueAmount = useMemo(() => (futureValueAmount > 0 ? deflateCompounding(futureValueAmount, realValueInflationPct, years) : 0), [futureValueAmount, realValueInflationPct, years]);

  const insights = useMemo(() => generatePersonalInsights({ discountRateImpact: { discountRatePct, years } }), [discountRatePct, years]);

  function buildReport(): ReportDefinition {
    return {
      toolName: "Present Value Calculator",
      subtitle: "Pakistan Economic Intelligence Center — Decision Support Lab",
      generatedAt: new Date().toISOString().slice(0, 10),
      sourceNote: "Source: PEIC Time Value of Money Engine",
      sections: [
        {
          heading: "Summary",
          paragraphs: [
            `Rs ${Math.round(futureValueAmount).toLocaleString("en-US")} received in ${years} years is worth Rs ${Math.round(presentValueAmount).toLocaleString("en-US")} today, at a ${discountRatePct.toFixed(1)}% discount rate (${frequency} compounding).`,
          ],
          facts: [
            { label: "Future Value", value: `Rs ${Math.round(futureValueAmount).toLocaleString("en-US")}` },
            { label: "Discount Rate", value: `${discountRatePct.toFixed(1)}%` },
            { label: "Years", value: `${years}` },
            { label: "Compounding", value: frequency },
            { label: "Present Value", value: `Rs ${Math.round(presentValueAmount).toLocaleString("en-US")}` },
            { label: "Discount Factor", value: discountFactorValue.toFixed(4) },
            { label: "Real Value (Inflation-Adjusted)", value: `Rs ${Math.round(realValueAmount).toLocaleString("en-US")}` },
          ],
        },
      ],
    };
  }

  return (
    <div id="calculator-input" className="flex flex-col gap-6">
      <PresentValueForm
        futureValueAmount={futureValueAmount}
        onFutureValueChange={setFutureValueAmount}
        discountRatePct={discountRatePct}
        onDiscountRatePctChange={setDiscountRatePct}
        years={years}
        onYearsChange={setYears}
        frequency={frequency}
        onFrequencyChange={setFrequency}
      />

      <div className="glass-card rounded-xl p-4 sm:p-5">
        <InflationRateField
          autoValuePct={officialInflationPct}
          autoLabel="Official Inflation (Latest)"
          tooltipText="Used only for the Real Value (Inflation-Adjusted) figure below — calculated automatically from the latest official CPI data."
          useCustom={useCustomInflation}
          onUseCustomChange={setUseCustomInflation}
          customValuePct={customInflationPct}
          onCustomValuePctChange={setCustomInflationPct}
        />
      </div>

      {futureValueAmount <= 0 && (
        <div className="rounded-lg border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">{t("decisionSupportLab.validationEnterAmount")}</div>
      )}

      {futureValueAmount > 0 && (
        <PresentValueResults
          presentValueAmount={presentValueAmount}
          discountFactorValue={discountFactorValue}
          realValueAmount={realValueAmount}
          futureValueAmount={futureValueAmount}
          discountRatePct={discountRatePct}
          years={years}
          frequency={frequency}
        />
      )}

      {futureValueAmount > 0 && (
        <ToolShareCard
          title="My Present Value"
          headlineValue={`Rs ${Math.round(presentValueAmount).toLocaleString("en-US")}`}
          headlineTone="neutral"
          comparisonLine={`Rs ${Math.round(futureValueAmount).toLocaleString("en-US")} in ${years} years, discounted at ${discountRatePct.toFixed(1)}%`}
          bars={[
            { label: "Future Value", value: futureValueAmount, color: "#9b8afb" },
            { label: "Present Value", value: presentValueAmount, color: "#4d8df7" },
          ]}
          badgeLines={["PEIC Time Value Engine", `${frequency} compounding`]}
          shareUrl="https://www.pakeconintel.com/decision-support-lab/present-value"
          shareSummary={`Rs ${Math.round(futureValueAmount).toLocaleString("en-US")} in ${years} years is worth Rs ${Math.round(presentValueAmount).toLocaleString("en-US")} today at a ${discountRatePct.toFixed(1)}% discount rate.`}
          filenameBase="my-present-value"
        />
      )}

      {futureValueAmount > 0 && (
        <ReportDownloadButton buildDefinition={buildReport} filename="present-value-report.pdf" label={t("decisionSupportLab.downloadReport")} generatingLabel={t("decisionSupportLab.generatingReport")} />
      )}

      <PersonalInsightsPanel insights={insights} />

      {futureValueAmount > 0 && <PresentValueCharts presentValueAmount={presentValueAmount} discountRatePct={discountRatePct} years={years} frequency={frequency} />}

      <ExplainTheMath
        formula="Present Value = Future Value ÷ (1 + Rate ÷ m)^(m × Years)  [continuous: FV × e^(−Rate × Years)]"
        variables={[
          { symbol: "Future Value", description: "The amount you'll receive at a future date" },
          { symbol: "Rate", description: "Your discount rate — your required return or cost of capital" },
          { symbol: "m", description: "Compounding periods per year (12 for monthly, 4 for quarterly, etc.)" },
        ]}
        methodology="This is the foundational time-value-of-money calculation — every other 'what is X worth today' question in this Lab and future investment tools (DCF, Bond Valuation, Retirement Planning) reduces to this same discounting formula applied to different cash flows."
        sourceName="PEIC Time Value of Money Engine"
        lastUpdated=""
        assumptions={["Assumes a constant discount rate for the entire horizon.", "Assumes the future amount is certain — no risk adjustment beyond the rate you choose."]}
        limitations={["Real-world discount rates should reflect the actual risk and opportunity cost of the specific cash flow — this tool doesn't choose a rate for you."]}
      />

      <EducationalPanel
        whatDoesThisMean="This shows what a future sum of money is worth in today's rupees, given a rate that reflects what your money could otherwise earn."
        whyDifferent="Rs 100,000 in 10 years is not the same as Rs 100,000 today — the 'Real Value' figure additionally strips out inflation, so you can see both the financial-discounting view and the pure purchasing-power view side by side."
        howCalculated="Your future value is divided by the compounding factor built from your discount rate, compounding frequency, and time horizon — the exact inverse of the Future Value Calculator's math."
        sources={["PEIC Time Value of Money Engine — deterministic, no AI or estimation involved.", "Pakistan Bureau of Statistics — National CPI Index (for the Real Value figure)"]}
      />

      <DecisionSupportPanel
        whatHappened={
          futureValueAmount > 0
            ? `You calculated the present value of Rs ${Math.round(futureValueAmount).toLocaleString("en-US")} received in ${years} years at a ${discountRatePct.toFixed(1)}% discount rate.`
            : "Enter a future amount, a discount rate, and a time horizon to see what it's worth today."
        }
        whyItHappened="A higher discount rate or a longer horizon both shrink the present value — the sensitivity table above shows exactly how much your choice of rate matters."
        whatToUnderstand="This same math, applied to a series of cash flows instead of one, is the foundation of Discounted Cash Flow (DCF) analysis and bond valuation — tools that will build directly on this engine."
        relatedTools={[{ title: "Future Value Calculator", href: "/decision-support-lab/future-value" }, { title: "Discount Factor Explorer", href: "/decision-support-lab/discount-factor-explorer" }]}
        suggestedNext={{
          title: "See the discount factor curve on its own",
          href: "/decision-support-lab/discount-factor-explorer",
          reason: "Explore how the discount factor changes across rates and horizons, independent of any specific amount.",
        }}
      />
    </div>
  );
}
