"use client";

import { useMemo, useState } from "react";
import DiscountFactorExplorerForm from "@/components/discountFactorExplorer/DiscountFactorExplorerForm";
import DiscountFactorExplorerResults from "@/components/discountFactorExplorer/DiscountFactorExplorerResults";
import DiscountFactorExplorerCharts from "@/components/discountFactorExplorer/DiscountFactorExplorerCharts";
import PersonalInsightsPanel from "@/components/decisionSupportLab/PersonalInsightsPanel";
import DecisionSupportPanel from "@/components/decisionSupportLab/DecisionSupportPanel";
import ExplainTheMath from "@/components/decisionSupportLab/ExplainTheMath";
import EducationalPanel from "@/components/decisionSupportLab/EducationalPanel";
import { discountFactor, buildDiscountSeries } from "@/lib/decisionSupportLab/timeValueEngine";
import { generatePersonalInsights } from "@/lib/decisionSupportLab/insightEngine";

export default function DiscountFactorExplorerCalculator() {
  const [ratePct, setRatePct] = useState(10);
  const [years, setYears] = useState(20);

  const discountFactorValue = useMemo(() => discountFactor(ratePct, years), [ratePct, years]);
  const series = useMemo(() => buildDiscountSeries(ratePct, years), [ratePct, years]);
  const insights = useMemo(() => generatePersonalInsights({ discountRateImpact: { discountRatePct: ratePct, years } }), [ratePct, years]);

  return (
    <div id="calculator-input" className="flex flex-col gap-6">
      <DiscountFactorExplorerForm ratePct={ratePct} onRatePctChange={setRatePct} years={years} onYearsChange={setYears} />

      <DiscountFactorExplorerResults discountFactorValue={discountFactorValue} ratePct={ratePct} years={years} />

      <PersonalInsightsPanel insights={insights} />

      <DiscountFactorExplorerCharts series={series} selectedYears={years} />

      <ExplainTheMath
        formula="Discount Factor = 1 ÷ (1 + Rate)^Years"
        variables={[
          { symbol: "Rate", description: "The discount rate per period, as a percentage" },
          { symbol: "Years", description: "How many periods in the future the cash flow is received" },
        ]}
        methodology="The discount factor is the multiplier that converts a future amount into today's equivalent value — every present-value calculation in this Lab (Present Value, Salary Required, Loan valuation) is this same multiplier applied to a specific future amount."
        sourceName="PEIC Time Value of Money Engine"
        lastUpdated=""
        assumptions={["Assumes a constant discount rate for the entire horizon.", "Assumes annual compounding periods (a 'year' and a 'period' are treated as the same length here)."]}
        limitations={["A single constant rate is a simplification — real discount rates (interest rates, required returns) vary over time and by risk."]}
      />

      <EducationalPanel
        whatDoesThisMean="This shows the exact multiplier that converts a future rupee into today's equivalent value, at any rate and horizon you choose."
        whyDifferent="A rupee promised in the future is worth less than a rupee in hand today — the discount factor makes that gap precise and visual rather than abstract."
        howCalculated="The rate compounds against itself for the chosen number of years, then the result is inverted — the same formula used to calculate present value, isolated from any specific amount."
        sources={["PEIC Time Value of Money Engine — deterministic, no AI or estimation involved."]}
      />

      <DecisionSupportPanel
        whatHappened={`You explored a ${ratePct.toFixed(1)}% discount rate over ${years} years, where the discount factor is ${discountFactorValue.toFixed(4)}.`}
        whyItHappened="Higher rates and longer horizons both push the discount factor toward zero — rate and time compound against each other, not just against the amount."
        whatToUnderstand="This exact multiplier is what every Present Value, Salary Required, and future DCF or Bond Valuation calculation in this Lab applies to a real amount — understanding it here makes every other tool's output easier to reason about."
        relatedTools={[{ title: "Present Value Calculator", href: "/decision-support-lab/present-value" }, { title: "Financial Formula Explorer", href: "/decision-support-lab/formula-explorer" }]}
        suggestedNext={{
          title: "Apply this to a real amount",
          href: "/decision-support-lab/present-value",
          reason: "See what a specific future sum of money is worth today, using the exact rate and horizon you just explored.",
        }}
      />
    </div>
  );
}
