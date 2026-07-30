"use client";

import { useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import FutureSalaryProjectionForm from "@/components/futureSalaryProjection/FutureSalaryProjectionForm";
import FutureSalaryProjectionResults from "@/components/futureSalaryProjection/FutureSalaryProjectionResults";
import FutureSalaryProjectionCharts from "@/components/futureSalaryProjection/FutureSalaryProjectionCharts";
import ToolShareCard from "@/components/decisionSupportLab/ToolShareCard";
import PersonalInsightsPanel from "@/components/decisionSupportLab/PersonalInsightsPanel";
import DecisionSupportPanel from "@/components/decisionSupportLab/DecisionSupportPanel";
import ExplainTheMath from "@/components/decisionSupportLab/ExplainTheMath";
import EducationalPanel from "@/components/decisionSupportLab/EducationalPanel";
import ReportDownloadButton from "@/components/decisionSupportLab/ReportDownloadButton";
import { buildProjectionSeries } from "@/lib/decisionSupportLab/purchasingPowerEngine";
import { computeOfficialCpiPct } from "@/lib/personalInflation/engine";
import { generatePersonalInsights } from "@/lib/decisionSupportLab/insightEngine";
import { useIncomeWealthState, setIncomeWealthState } from "@/lib/decisionSupportLab/incomeWealthState";
import type { ReportDefinition } from "@/lib/decisionSupportLab/reportFramework";
import type { CpiCategoryBreakdown } from "@/lib/data/cpiCategoryBreakdown";

export interface FutureSalaryProjectionResult {
  currentSalary: number;
  annualRaisePct: number;
  inflationPct: number;
  years: number;
  nominalSalary: number;
  realSalary: number;
  /** Real salary as a % of today's salary — 100 means purchasing power held exactly flat. */
  purchasingPowerPct: number;
}

interface Props {
  breakdown: CpiCategoryBreakdown | null;
}

export default function FutureSalaryProjectionCalculator({ breakdown }: Props) {
  const { t } = useLanguage();
  const shared = useIncomeWealthState();
  const officialInflationPct = useMemo(() => (breakdown ? computeOfficialCpiPct(breakdown.groups) : 0), [breakdown]);

  const [currentSalary, setCurrentSalaryState] = useState(() => shared.currentSalary);
  const [annualRaisePct, setAnnualRaisePctState] = useState(() => shared.annualRaisePct);
  const [inflationPct, setInflationPct] = useState(() => officialInflationPct);
  const [years, setYearsState] = useState(() => shared.projectionYears);

  function setCurrentSalary(value: number) {
    setCurrentSalaryState(value);
    setIncomeWealthState({ currentSalary: value });
  }
  function setAnnualRaisePct(value: number) {
    setAnnualRaisePctState(value);
    setIncomeWealthState({ annualRaisePct: value });
  }
  function setYears(value: number) {
    setYearsState(value);
    setIncomeWealthState({ projectionYears: value });
  }

  const series = useMemo(() => (currentSalary > 0 ? buildProjectionSeries(currentSalary, annualRaisePct, inflationPct, years) : []), [currentSalary, annualRaisePct, inflationPct, years]);

  const result = useMemo<FutureSalaryProjectionResult | null>(() => {
    if (currentSalary <= 0 || series.length === 0) return null;
    const final = series[series.length - 1];
    return {
      currentSalary,
      annualRaisePct,
      inflationPct,
      years,
      nominalSalary: final.nominalValue,
      realSalary: final.realValue,
      purchasingPowerPct: currentSalary > 0 ? (final.realValue / currentSalary) * 100 : 0,
    };
  }, [currentSalary, annualRaisePct, inflationPct, years, series]);

  const insights = useMemo(() => {
    if (!result) return [];
    const realChangePct = result.purchasingPowerPct - 100;
    return generatePersonalInsights({ realRaiseChangePct: realChangePct });
  }, [result]);

  function buildReport(): ReportDefinition {
    if (!result) {
      return { toolName: "Future Salary Projection", generatedAt: new Date().toISOString().slice(0, 10), sourceNote: "Source: Pakistan Bureau of Statistics", sections: [] };
    }
    return {
      toolName: "Future Salary Projection",
      subtitle: "Pakistan Economic Intelligence Center — Decision Support Lab",
      generatedAt: new Date().toISOString().slice(0, 10),
      sourceNote: "Source: Pakistan Bureau of Statistics — National CPI Index",
      sections: [
        {
          heading: "Summary",
          paragraphs: [
            `Projecting a ${result.annualRaisePct.toFixed(1)}% annual raise against ${result.inflationPct.toFixed(1)}% inflation over ${result.years} years: nominal salary reaches Rs ${Math.round(result.nominalSalary).toLocaleString("en-US")}, worth Rs ${Math.round(result.realSalary).toLocaleString("en-US")} in today's purchasing power.`,
          ],
          facts: [
            { label: "Current Salary", value: `Rs ${Math.round(result.currentSalary).toLocaleString("en-US")}` },
            { label: "Annual Raise", value: `${result.annualRaisePct.toFixed(1)}%` },
            { label: "Inflation Rate", value: `${result.inflationPct.toFixed(1)}%` },
            { label: "Years", value: `${result.years}` },
            { label: "Nominal Salary", value: `Rs ${Math.round(result.nominalSalary).toLocaleString("en-US")}` },
            { label: "Real Salary", value: `Rs ${Math.round(result.realSalary).toLocaleString("en-US")}` },
            { label: "Purchasing Power", value: `${result.purchasingPowerPct.toFixed(0)}% of today's` },
          ],
        },
      ],
    };
  }

  return (
    <div id="calculator-input" className="flex flex-col gap-6">
      <FutureSalaryProjectionForm
        currentSalary={currentSalary}
        onCurrentSalaryChange={setCurrentSalary}
        annualRaisePct={annualRaisePct}
        onAnnualRaisePctChange={setAnnualRaisePct}
        inflationPct={inflationPct}
        onInflationPctChange={setInflationPct}
        years={years}
        onYearsChange={setYears}
      />

      {result && <FutureSalaryProjectionResults result={result} />}

      {result && (
        <ToolShareCard
          title="My Future Salary Projection"
          headlineValue={`Rs ${Math.round(result.realSalary).toLocaleString("en-US")}`}
          headlineTone={result.purchasingPowerPct >= 100 ? "down" : "up"}
          comparisonLine={`Real salary in ${result.years} years, in today's purchasing power`}
          deltaLine={`${result.purchasingPowerPct.toFixed(0)}% of today's purchasing power`}
          bars={[
            { label: "Nominal Salary", value: result.nominalSalary, color: "#4d8df7" },
            { label: "Real Salary", value: result.realSalary, color: "#fb7185" },
          ]}
          badgeLines={["Pakistan Bureau of Statistics", `${result.years}-year projection`]}
          shareUrl="https://www.pakeconintel.com/decision-support-lab/future-salary-projection"
          shareSummary={`At a ${result.annualRaisePct.toFixed(1)}% annual raise against ${result.inflationPct.toFixed(1)}% inflation, my salary in ${result.years} years will be worth ${result.purchasingPowerPct.toFixed(0)}% of what it's worth today.`}
          filenameBase="my-future-salary-projection"
        />
      )}

      {result && (
        <ReportDownloadButton buildDefinition={buildReport} filename="future-salary-projection-report.pdf" label={t("decisionSupportLab.downloadReport")} generatingLabel={t("decisionSupportLab.generatingReport")} />
      )}

      <PersonalInsightsPanel insights={insights} />

      {series.length > 0 && <FutureSalaryProjectionCharts series={series} />}

      <ExplainTheMath
        formula="Nominal Salary = Current Salary × (1 + Raise ÷ 100)^Years; Real Salary = Nominal Salary ÷ (1 + Inflation ÷ 100)^Years"
        variables={[
          { symbol: "Current Salary", description: "Your salary today" },
          { symbol: "Raise", description: "Your assumed constant annual raise, as a percentage" },
          { symbol: "Inflation", description: "Your assumed constant annual inflation rate" },
        ]}
        methodology="Both your raise and inflation compound annually — the same math used for compound interest — so results over several years differ meaningfully from a simple year × rate estimate."
        sourceName="Pakistan Bureau of Statistics — National CPI Index"
        sourceUrl="https://www.pbs.gov.pk/cpi"
        lastUpdated={breakdown?.observationDate ?? ""}
        dataFrequency="Monthly"
        assumptions={["Assumes a constant annual raise rate and a constant annual inflation rate for the entire horizon — real raises and real inflation vary year to year."]}
        limitations={["A long horizon compounds small input errors — treat results beyond 5-10 years as directional, not precise."]}
      />

      <EducationalPanel
        whatDoesThisMean="This projects your salary forward under a constant raise assumption, then shows what that projected salary is really worth once inflation is accounted for."
        whyDifferent="A nominal salary projection alone can look reassuring even when your real (inflation-adjusted) purchasing power is shrinking — this tool shows both side by side."
        howCalculated="Your salary compounds forward at your assumed raise rate; the same salary is then compounded backward (discounted) by inflation to express it in today's rupees."
        sources={["Pakistan Bureau of Statistics — National CPI Index (Base 2015-16 = 100)"]}
      />

      <DecisionSupportPanel
        whatHappened={result ? `You projected your salary ${result.years} years forward at a ${result.annualRaisePct.toFixed(1)}% raise against ${result.inflationPct.toFixed(1)}% inflation.` : "Enter your salary, raise, inflation and a horizon to see your projection."}
        whyItHappened="Whether your raise rate beats your inflation rate determines whether your real purchasing power grows or shrinks over the horizon, regardless of how large the nominal salary number looks."
        whatToUnderstand="If your raise rate is below your assumed inflation rate, your real salary is on a declining path even as the nominal number keeps rising every year."
        relatedTools={[{ title: "Raise Reality Check", href: "/decision-support-lab/raise-reality-check" }, { title: "Personal Economic Health Score", href: "/decision-support-lab/health-score" }]}
        suggestedNext={{
          title: "See your full Personal Economic Health Score",
          href: "/decision-support-lab/health-score",
          reason: "Combine this projection with your budget, inflation and savings results for one composite picture of your financial health.",
        }}
      />
    </div>
  );
}
