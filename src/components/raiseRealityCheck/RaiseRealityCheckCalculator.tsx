"use client";

import { useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import RaiseRealityCheckForm from "@/components/raiseRealityCheck/RaiseRealityCheckForm";
import RaiseRealityCheckResults from "@/components/raiseRealityCheck/RaiseRealityCheckResults";
import RaiseRealityCheckCharts from "@/components/raiseRealityCheck/RaiseRealityCheckCharts";
import ToolShareCard from "@/components/decisionSupportLab/ToolShareCard";
import PersonalInsightsPanel from "@/components/decisionSupportLab/PersonalInsightsPanel";
import DecisionSupportPanel from "@/components/decisionSupportLab/DecisionSupportPanel";
import ExplainTheMath from "@/components/decisionSupportLab/ExplainTheMath";
import EducationalPanel from "@/components/decisionSupportLab/EducationalPanel";
import ReportDownloadButton from "@/components/decisionSupportLab/ReportDownloadButton";
import { computeRaiseRealityCheck } from "@/lib/decisionSupportLab/salaryEngine";
import { computeOfficialCpiPct } from "@/lib/personalInflation/engine";
import { generatePersonalInsights } from "@/lib/decisionSupportLab/insightEngine";
import { useIncomeWealthState, setIncomeWealthState } from "@/lib/decisionSupportLab/incomeWealthState";
import type { ReportDefinition } from "@/lib/decisionSupportLab/reportFramework";
import type { CpiCategoryBreakdown } from "@/lib/data/cpiCategoryBreakdown";

interface Props {
  breakdown: CpiCategoryBreakdown | null;
}

export default function RaiseRealityCheckCalculator({ breakdown }: Props) {
  const { t } = useLanguage();
  const shared = useIncomeWealthState();

  const officialInflationPct = useMemo(() => (breakdown ? computeOfficialCpiPct(breakdown.groups) : null), [breakdown]);

  // officialInflationPct comes from a server-fetched prop (already resolved
  // before this component's first render), so it's safe to use directly as
  // a lazy initial value rather than seeding it via a useEffect — the
  // latter is exactly the set-state-in-effect anti-pattern this repo's
  // lint rule flags (see economicIdentity.ts's header comment).
  const [currentSalary, setCurrentSalaryState] = useState(() => shared.currentSalary);
  const [nominalRaisePct, setNominalRaisePctState] = useState(() => shared.lastRaisePct);
  const [inflationPct, setInflationPct] = useState(() => officialInflationPct ?? 0);

  function setCurrentSalary(value: number) {
    setCurrentSalaryState(value);
    setIncomeWealthState({ currentSalary: value });
  }
  function setNominalRaisePct(value: number) {
    setNominalRaisePctState(value);
    setIncomeWealthState({ lastRaisePct: value });
  }

  const result = useMemo(() => {
    if (currentSalary <= 0) return null;
    return computeRaiseRealityCheck(currentSalary, nominalRaisePct, inflationPct);
  }, [currentSalary, nominalRaisePct, inflationPct]);

  const insights = useMemo(() => (result ? generatePersonalInsights({ realRaiseChangePct: result.realChangePct }) : []), [result]);

  function buildReport(): ReportDefinition {
    if (!result) {
      return { toolName: "Raise Reality Check", generatedAt: new Date().toISOString().slice(0, 10), sourceNote: "Source: Pakistan Bureau of Statistics", sections: [] };
    }
    return {
      toolName: "Raise Reality Check",
      subtitle: "Pakistan Economic Intelligence Center — Decision Support Lab",
      generatedAt: new Date().toISOString().slice(0, 10),
      sourceNote: "Source: Pakistan Bureau of Statistics — National CPI Index",
      sections: [
        {
          heading: "Summary",
          paragraphs: [
            `A ${result.nominalRaisePct.toFixed(1)}% raise against ${result.inflationPct.toFixed(1)}% inflation is a real income change of ${result.realChangePct >= 0 ? "+" : ""}${result.realChangePct.toFixed(1)}%.`,
          ],
          facts: [
            { label: "Current Salary", value: `Rs ${Math.round(result.currentSalary).toLocaleString("en-US")}` },
            { label: "Nominal Raise", value: `${result.nominalRaisePct.toFixed(1)}%` },
            { label: "Inflation Rate", value: `${result.inflationPct.toFixed(1)}%` },
            { label: "Real Income Change", value: `${result.realChangePct >= 0 ? "+" : ""}${result.realChangePct.toFixed(1)}%` },
            { label: "New Nominal Salary", value: `Rs ${Math.round(result.newNominalSalary).toLocaleString("en-US")}` },
            { label: "Real Equivalent Salary", value: `Rs ${Math.round(result.realEquivalentSalary).toLocaleString("en-US")}` },
          ],
        },
      ],
    };
  }

  return (
    <div id="calculator-input" className="flex flex-col gap-6">
      <RaiseRealityCheckForm
        currentSalary={currentSalary}
        onCurrentSalaryChange={setCurrentSalary}
        nominalRaisePct={nominalRaisePct}
        onNominalRaisePctChange={setNominalRaisePct}
        inflationPct={inflationPct}
        onInflationPctChange={setInflationPct}
        officialInflationPct={officialInflationPct}
      />

      {result && <RaiseRealityCheckResults result={result} />}

      {result && (
        <ToolShareCard
          title="My Raise Reality Check"
          headlineValue={`${result.realChangePct >= 0 ? "+" : ""}${result.realChangePct.toFixed(1)}%`}
          headlineTone={result.realChangePct >= 0 ? "down" : "up"}
          comparisonLine={`${result.nominalRaisePct.toFixed(1)}% raise vs. ${result.inflationPct.toFixed(1)}% inflation`}
          deltaLine={result.realChangePct >= 0 ? "Real income increase" : "Real income decrease"}
          bars={[
            { label: "Nominal Raise", value: result.nominalRaisePct, color: "#4d8df7" },
            { label: "Inflation", value: result.inflationPct, color: "#fbbf24" },
          ]}
          badgeLines={["Pakistan Bureau of Statistics", "Real Income Analysis"]}
          shareUrl="https://www.pakeconintel.com/decision-support-lab/raise-reality-check"
          shareSummary={`I got a ${result.nominalRaisePct.toFixed(1)}% raise, but with ${result.inflationPct.toFixed(1)}% inflation my real income ${result.realChangePct >= 0 ? "grew" : "fell"} ${Math.abs(result.realChangePct).toFixed(1)}%.`}
          filenameBase="my-raise-reality-check"
        />
      )}

      {result && (
        <ReportDownloadButton buildDefinition={buildReport} filename="raise-reality-check-report.pdf" label={t("decisionSupportLab.downloadReport")} generatingLabel={t("decisionSupportLab.generatingReport")} />
      )}

      <PersonalInsightsPanel insights={insights} />

      {result && <RaiseRealityCheckCharts result={result} />}

      <ExplainTheMath
        formula="Real Change % = ((1 + Nominal Raise ÷ 100) ÷ (1 + Inflation ÷ 100) − 1) × 100"
        variables={[
          { symbol: "Nominal Raise", description: "The salary increase you actually received, as a percentage" },
          { symbol: "Inflation", description: "The inflation rate over the same period" },
        ]}
        methodology="This uses precise compounding division, not the common shorthand of simply subtracting inflation from your raise — that shorthand slightly understates your real change."
        sourceName="Pakistan Bureau of Statistics — National CPI Index"
        sourceUrl="https://www.pbs.gov.pk/cpi"
        lastUpdated={breakdown?.observationDate ?? ""}
        dataFrequency="Monthly"
        assumptions={["Assumes the inflation rate you enter (or the latest official CPI) applies for the full period between your raises."]}
        limitations={["Uses the official National CPI by default — if your personal spending pattern differs, your real experience may differ from this figure. Try the Personal Inflation Calculator for a rate weighted to your own spending."]}
      />

      <EducationalPanel
        whatDoesThisMean="This shows whether your salary increase actually grew what you can buy, or whether inflation quietly cancelled it out."
        whyDifferent="A nominal raise is just a bigger number on your payslip. What matters is whether that bigger number can buy more than your old salary could — that's your real change."
        howCalculated="Your raise and the inflation rate are combined using compounding division (not simple subtraction) to find the precise real change in your purchasing power."
        sources={["Pakistan Bureau of Statistics — National CPI Index (Base 2015-16 = 100)"]}
      />

      <DecisionSupportPanel
        whatHappened={result ? `You compared a ${result.nominalRaisePct.toFixed(1)}% raise against ${result.inflationPct.toFixed(1)}% inflation.` : "Enter your raise and the inflation rate to see your real income change."}
        whyItHappened="Inflation silently erodes nominal raises — a raise below the inflation rate is a real pay cut, even though your payslip number went up."
        whatToUnderstand="Tracking your real (not nominal) income change every year is the only way to know if you're actually getting ahead financially."
        relatedTools={[{ title: "Salary Required Calculator", href: "/decision-support-lab/salary-required" }, { title: "Future Salary Projection", href: "/decision-support-lab/future-salary-projection" }]}
        suggestedNext={{
          title: "See what salary you'd need next year",
          href: "/decision-support-lab/salary-required",
          reason: "Now that you know your real change, see exactly what raise you'd need to stay ahead of inflation next year.",
        }}
      />
    </div>
  );
}
