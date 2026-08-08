"use client";

import { useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import CompoundInterestForm from "@/components/compoundInterest/CompoundInterestForm";
import CompoundInterestResults from "@/components/compoundInterest/CompoundInterestResults";
import CompoundInterestCharts from "@/components/compoundInterest/CompoundInterestCharts";
import ToolShareCard from "@/components/decisionSupportLab/ToolShareCard";
import PersonalInsightsPanel from "@/components/decisionSupportLab/PersonalInsightsPanel";
import DecisionSupportPanel from "@/components/decisionSupportLab/DecisionSupportPanel";
import ExplainTheMath from "@/components/decisionSupportLab/ExplainTheMath";
import EducationalPanel from "@/components/decisionSupportLab/EducationalPanel";
import ReportDownloadButton from "@/components/decisionSupportLab/ReportDownloadButton";
import RequiredInputsGate from "@/components/decisionSupportLab/RequiredInputsGate";
import {
  compoundInterest,
  continuousCompounding,
  effectiveAnnualRate,
  simpleInterest,
  COMPOUNDING_PERIODS_PER_YEAR,
  type CompoundingFrequency,
} from "@/lib/decisionSupportLab/timeValueEngine";
import { generatePersonalInsights } from "@/lib/decisionSupportLab/insightEngine";
import type { ReportDefinition } from "@/lib/decisionSupportLab/reportFramework";
import type { CalculationSnapshotPayload } from "@/lib/supabase/calculationSnapshots";

export default function CompoundInterestCalculator() {
  const { t } = useLanguage();

  const [principal, setPrincipal] = useState(0);
  const [ratePct, setRatePct] = useState(0);
  const [years, setYears] = useState(10);
  const [frequency, setFrequency] = useState<CompoundingFrequency>("annual");

  const hasRate = ratePct !== 0;
  const canCompute = principal > 0 && hasRate;
  const { endingValue, interestEarned } = useMemo(() => {
    if (!canCompute) return { endingValue: 0, interestEarned: 0 };
    if (frequency === "continuous") {
      const ev = continuousCompounding(principal, ratePct, years);
      return { endingValue: ev, interestEarned: ev - principal };
    }
    const result = compoundInterest(principal, ratePct, years, COMPOUNDING_PERIODS_PER_YEAR[frequency]);
    return { endingValue: result.endingValue, interestEarned: result.interestEarned };
  }, [canCompute, principal, ratePct, years, frequency]);

  // Continuous compounding's EAR is the limit of effectiveAnnualRate() as
  // compoundingsPerYear → ∞ — approximated by reusing continuousCompounding()
  // itself on a Rs 100 base for exactly 1 year, rather than adding a
  // dedicated formula: the result IS the effective annual rate as a percentage.
  const effectiveAnnualRatePct = frequency === "continuous" ? continuousCompounding(100, ratePct, 1) - 100 : effectiveAnnualRate(ratePct, COMPOUNDING_PERIODS_PER_YEAR[frequency]);
  const monthlyEffectiveAnnualRatePct = effectiveAnnualRate(ratePct, COMPOUNDING_PERIODS_PER_YEAR.monthly);

  const simple = useMemo(() => simpleInterest(principal, ratePct, years), [principal, ratePct, years]);

  const insights = useMemo(() => {
    if (!canCompute) return [];
    return generatePersonalInsights({
      contributionFrequency: { currentEffectiveAnnualRatePct: effectiveAnnualRatePct, monthlyEffectiveAnnualRatePct },
    });
  }, [canCompute, effectiveAnnualRatePct, monthlyEffectiveAnnualRatePct]);

  function buildReport(): ReportDefinition {
    return {
      toolName: "Compound Interest Calculator",
      subtitle: "Pakistan Economic Intelligence Center — Decision Support Lab",
      generatedAt: new Date().toISOString().slice(0, 10),
      sourceNote: "Source: PEIC Time Value of Money Engine",
      sections: [
        {
          heading: "Summary",
          paragraphs: [
            `Rs ${Math.round(principal).toLocaleString("en-US")} at ${ratePct.toFixed(1)}% (${frequency} compounding) for ${years} years earns Rs ${Math.round(interestEarned).toLocaleString("en-US")} in interest, ending at Rs ${Math.round(endingValue).toLocaleString("en-US")} — Rs ${Math.round(interestEarned - simple.interestEarned).toLocaleString("en-US")} more than simple interest would have earned.`,
          ],
          facts: [
            { label: "Principal", value: `Rs ${Math.round(principal).toLocaleString("en-US")}` },
            { label: "Annual Rate", value: `${ratePct.toFixed(1)}%` },
            { label: "Years", value: `${years}` },
            { label: "Compounding", value: frequency },
            { label: "Interest Earned", value: `Rs ${Math.round(interestEarned).toLocaleString("en-US")}` },
            { label: "Ending Value", value: `Rs ${Math.round(endingValue).toLocaleString("en-US")}` },
            { label: "Effective Annual Rate", value: `${effectiveAnnualRatePct.toFixed(2)}%` },
            { label: "Simple Interest Would Have Earned", value: `Rs ${Math.round(simple.interestEarned).toLocaleString("en-US")}` },
          ],
        },
      ],
    };
  }

  return (
    <div id="calculator-input" className="flex flex-col gap-6">
      <CompoundInterestForm
        principal={principal}
        onPrincipalChange={setPrincipal}
        ratePct={ratePct}
        onRatePctChange={setRatePct}
        years={years}
        onYearsChange={setYears}
        frequency={frequency}
        onFrequencyChange={setFrequency}
      />

      <RequiredInputsGate
        requiredInputs={[
          { id: "ci-principal", label: "Principal", filled: principal > 0 },
          { id: "ci-rate", label: "Annual Rate", filled: hasRate },
        ]}
      >
        <CompoundInterestResults principal={principal} interestEarned={interestEarned} endingValue={endingValue} effectiveAnnualRatePct={effectiveAnnualRatePct} />

        <div className="glass-card rounded-xl p-4 text-sm leading-relaxed text-white/70 sm:p-5 light:text-slate-600">
          <p>
            Compounding earned you Rs {Math.round(interestEarned - simple.interestEarned).toLocaleString("en-US")} more than simple interest would have over the same {years} years — the gap grows every additional year you stay invested.
          </p>
        </div>

        <ToolShareCard
          title="My Compound Interest"
          headlineValue={`Rs ${Math.round(interestEarned).toLocaleString("en-US")}`}
          headlineTone="down"
          comparisonLine={`Interest earned on Rs ${Math.round(principal).toLocaleString("en-US")} at ${ratePct.toFixed(1)}% for ${years} years`}
          bars={[
            { label: "Principal", value: principal, color: "#4d8df7" },
            { label: "Interest Earned", value: interestEarned, color: "#34d399" },
          ]}
          badgeLines={["PEIC Time Value Engine", `${frequency} compounding`]}
          shareUrl="https://www.pakeconintel.com/decision-support-lab/compound-interest"
          shareSummary={`Rs ${Math.round(principal).toLocaleString("en-US")} at ${ratePct.toFixed(1)}% compounded ${frequency} for ${years} years grows to Rs ${Math.round(endingValue).toLocaleString("en-US")}.`}
          filenameBase="my-compound-interest"
        />

        <ReportDownloadButton buildDefinition={buildReport} filename="compound-interest-report.pdf" label={t("decisionSupportLab.downloadReport")} generatingLabel={t("decisionSupportLab.generatingReport")} />

        <PersonalInsightsPanel insights={insights} />

        <CompoundInterestCharts principal={principal} ratePct={ratePct} years={years} frequency={frequency} />
      </RequiredInputsGate>

      <ExplainTheMath
        formula="Ending Value = Principal × (1 + Rate ÷ m)^(m × Years)  [continuous: P × e^(Rate × Years)]"
        variables={[
          { symbol: "Principal", description: "The amount you start with" },
          { symbol: "Rate", description: "The stated (nominal) annual interest rate" },
          { symbol: "m", description: "Compounding periods per year" },
        ]}
        methodology="This is compoundInterest() from the Time Value of Money engine, the same primitive powering Future Value and Savings projections — interest is calculated on the running balance (principal plus any interest already earned), not just the original principal, which is why more frequent compounding earns more even at the same stated rate."
        sourceName="PEIC Time Value of Money Engine"
        lastUpdated=""
        assumptions={["Assumes the stated rate and compounding frequency stay constant for the entire horizon.", "Assumes no withdrawals or additional contributions during the period."]}
        limitations={["Real accounts may compound differently than advertised, or apply fees that reduce the effective rate — always check the actual terms."]}
      />

      <EducationalPanel
        whatDoesThisMean="This shows how 'interest on interest' — compounding — makes your money grow faster than a fixed interest payment every year would."
        whyDifferent="Simple interest pays the same rupee amount every year, always calculated on the original principal. Compound interest recalculates on the growing balance, so each year's interest is larger than the last."
        howCalculated="Your rate is divided into per-period chunks based on the compounding frequency, then applied repeatedly to the running balance — more frequent compounding (daily vs. annual) means more chances for interest to earn its own interest."
        sources={["PEIC Time Value of Money Engine — deterministic, no AI or estimation involved."]}
      />

      <DecisionSupportPanel
        whatHappened={
          principal > 0
            ? `You compounded Rs ${Math.round(principal).toLocaleString("en-US")} at ${ratePct.toFixed(1)}% (${frequency}) for ${years} years, earning Rs ${Math.round(interestEarned).toLocaleString("en-US")} in interest.`
            : "Enter a principal, a rate, a time horizon, and a compounding frequency to see your growth."
        }
        whyItHappened="More frequent compounding (daily vs. annual) at the same stated rate produces a higher effective annual rate — the interest itself starts earning interest sooner."
        whatToUnderstand="The effective annual rate is the fair way to compare two accounts or loans with different compounding frequencies — the stated rate alone can be misleading."
        relatedTools={[{ title: "Future Value Calculator", href: "/decision-support-lab/future-value" }, { title: "Loan & EMI Calculator", href: "/decision-support-lab/loan-emi" }]}
        suggestedNext={{
          title: "See the same compounding math applied to a loan",
          href: "/decision-support-lab/loan-emi",
          reason: "The same interest-on-balance logic determines how much of every loan payment goes to interest versus principal.",
        }}
        snapshotPayload={
          canCompute
            ? (): CalculationSnapshotPayload => ({
                toolId: "compound-interest",
                inputs: { principal, ratePct, years, frequency },
                assumptions: {},
                outputs: { endingValue, interestEarned, effectiveAnnualRatePct },
              })
            : undefined
        }
      />
    </div>
  );
}
