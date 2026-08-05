"use client";

import { useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import SalaryPurchasingPowerForm from "@/components/salaryPurchasingPower/SalaryPurchasingPowerForm";
import SalaryPurchasingPowerResults from "@/components/salaryPurchasingPower/SalaryPurchasingPowerResults";
import PurchasingPowerCharts from "@/components/purchasingPower/PurchasingPowerCharts";
import ConfidenceBadge from "@/components/decisionSupportLab/ConfidenceBadge";
import DataFreshnessBadge from "@/components/decisionSupportLab/DataFreshnessBadge";
import { calculateConfidenceScore } from "@/lib/decisionSupportLab/confidenceEngine";
import { getOverallCompletionPct } from "@/lib/decisionSupportLab/profileCompletion";
import ToolShareCard from "@/components/decisionSupportLab/ToolShareCard";
import PersonalInsightsPanel from "@/components/decisionSupportLab/PersonalInsightsPanel";
import DecisionSupportPanel from "@/components/decisionSupportLab/DecisionSupportPanel";
import ExplainTheMath from "@/components/decisionSupportLab/ExplainTheMath";
import EducationalPanel from "@/components/decisionSupportLab/EducationalPanel";
import ReportDownloadButton from "@/components/decisionSupportLab/ReportDownloadButton";
import { computePurchasingPower, buildPurchasingPowerTimeline, getAvailableYears } from "@/lib/decisionSupportLab/purchasingPowerEngine";
import { generatePersonalInsights } from "@/lib/decisionSupportLab/insightEngine";
import { useEconomicProfile, setEconomicProfile, getEffectiveSalary } from "@/lib/decisionSupportLab/economicProfile";
import type { ReportDefinition } from "@/lib/decisionSupportLab/reportFramework";
import type { CpiIndexPoint } from "@/lib/data/cpiMonthlyIndex";

interface Props {
  series: CpiIndexPoint[] | null;
}

export default function SalaryPurchasingPowerCalculator({ series }: Props) {
  const { t } = useLanguage();
  const { profile } = useEconomicProfile();
  const years = useMemo(() => (series ? getAvailableYears(series) : []), [series]);

  const [salary, setSalaryState] = useState(() => getEffectiveSalary(profile));
  const [baseYear, setBaseYear] = useState<number | null>(null);
  const [targetYear, setTargetYear] = useState<number | null>(null);

  function setSalary(value: number) {
    setSalaryState(value);
    setEconomicProfile({ currentSalary: value });
  }

  const effectiveBaseYear = baseYear ?? years[0]?.year ?? 0;
  const effectiveTargetYear = targetYear ?? years[years.length - 1]?.year ?? 0;

  const basePoint = years.find((y) => y.year === effectiveBaseYear)?.point ?? null;
  const targetPoint = years.find((y) => y.year === effectiveTargetYear)?.point ?? null;

  const result = useMemo(() => {
    if (!basePoint || !targetPoint || salary <= 0) return null;
    const [base, target] = basePoint.observationDate <= targetPoint.observationDate ? [basePoint, targetPoint] : [targetPoint, basePoint];
    return computePurchasingPower(salary, base, target);
  }, [salary, basePoint, targetPoint]);

  const timeline = useMemo(() => {
    if (!result || !series) return [];
    const base = { observationDate: result.baseDate, indexValue: result.baseIndex };
    const target = { observationDate: result.targetDate, indexValue: result.targetIndex };
    return buildPurchasingPowerTimeline(result.amount, base, target, series);
  }, [result, series]);

  const insights = useMemo(() => {
    if (!result) return [];
    return generatePersonalInsights({});
  }, [result]);

  const confidence = useMemo(
    () =>
      calculateConfidenceScore({
        profileCompletenessPct: getOverallCompletionPct(profile),
        usesOfficialData: true,
        hasHistoricalCoverage: series !== null,
        manualEstimateCount: 0,
        assumptionCount: 1,
      }),
    [profile, series],
  );

  function buildReport(): ReportDefinition {
    if (!result) {
      return { toolName: "Salary Purchasing Power", generatedAt: new Date().toISOString().slice(0, 10), sourceNote: "Source: Pakistan Bureau of Statistics", sections: [] };
    }
    return {
      toolName: "Salary Purchasing Power",
      subtitle: "Pakistan Economic Intelligence Center — Decision Support Lab",
      generatedAt: new Date().toISOString().slice(0, 10),
      sourceNote: "Source: Pakistan Bureau of Statistics — National CPI Index",
      sections: [
        {
          heading: "Summary",
          paragraphs: [
            `A salary of Rs ${Math.round(result.amount).toLocaleString("en-US")} from ${result.baseDate.slice(0, 7)} is worth Rs ${Math.round(result.realValueToday).toLocaleString("en-US")} in ${result.targetDate.slice(0, 7)} purchasing power — a loss of ${result.purchasingPowerLostPct.toFixed(1)}%.`,
          ],
          facts: [
            { label: "Salary", value: `Rs ${Math.round(result.amount).toLocaleString("en-US")}` },
            { label: "Real Salary Today", value: `Rs ${Math.round(result.realValueToday).toLocaleString("en-US")}` },
            { label: "Purchasing Power Lost", value: `Rs ${Math.round(result.purchasingPowerLost).toLocaleString("en-US")} (${result.purchasingPowerLostPct.toFixed(1)}%)` },
            { label: "Inflation-Adjusted Salary", value: `Rs ${Math.round(result.inflationAdjustedValue).toLocaleString("en-US")}` },
            { label: "Total Inflation", value: `${result.totalInflationPct.toFixed(1)}%` },
          ],
        },
      ],
    };
  }

  if (!series || years.length === 0) {
    return (
      <div id="calculator-input" className="glass-card rounded-xl p-8 text-center">
        <h2 className="text-lg font-semibold text-white light:text-slate-900">{t("decisionSupportLab.dataNotYetAvailableTitle")}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-white/60 light:text-slate-500">{t("decisionSupportLab.dataNotYetAvailableDesc")}</p>
      </div>
    );
  }

  return (
    <div id="calculator-input" className="flex flex-col gap-6">
      <SalaryPurchasingPowerForm
        salary={salary}
        onSalaryChange={setSalary}
        years={years}
        baseYear={effectiveBaseYear}
        onBaseYearChange={setBaseYear}
        targetYear={effectiveTargetYear}
        onTargetYearChange={setTargetYear}
        city={profile.city}
      />

      {result && <ConfidenceBadge result={confidence} toolId="salary-purchasing-power" />}
      {result && <DataFreshnessBadge sourceName="Pakistan Bureau of Statistics" lastUpdated={series[series.length - 1]?.observationDate ?? ""} dataFrequency="Monthly" />}

      {result && <SalaryPurchasingPowerResults result={result} />}

      {result && (
        <ToolShareCard
          title="My Salary Purchasing Power"
          headlineValue={`Rs ${Math.round(result.realValueToday).toLocaleString("en-US")}`}
          headlineTone="down"
          comparisonLine={`Rs ${Math.round(result.amount).toLocaleString("en-US")} salary from ${result.baseDate.slice(0, 7)} is now worth this in ${result.targetDate.slice(0, 7)} terms`}
          deltaLine={`-${result.purchasingPowerLostPct.toFixed(1)}% purchasing power lost`}
          bars={[
            { label: "Original Salary", value: result.amount, color: "#4d8df7" },
            { label: "Real Salary Today", value: result.realValueToday, color: "#fb7185" },
          ]}
          badgeLines={["Pakistan Bureau of Statistics", `${result.baseDate.slice(0, 7)} → ${result.targetDate.slice(0, 7)}`]}
          shareUrl="https://www.pakeconintel.com/decision-support-lab/salary-purchasing-power"
          shareSummary={`My Rs ${Math.round(result.amount).toLocaleString("en-US")} salary from ${result.baseDate.slice(0, 7)} is worth only Rs ${Math.round(result.realValueToday).toLocaleString("en-US")} today — a ${result.purchasingPowerLostPct.toFixed(1)}% loss in purchasing power.`}
          filenameBase="my-salary-purchasing-power"
        />
      )}

      {result && (
        <ReportDownloadButton buildDefinition={buildReport} filename="salary-purchasing-power-report.pdf" label={t("decisionSupportLab.downloadReport")} generatingLabel={t("decisionSupportLab.generatingReport")} />
      )}

      <PersonalInsightsPanel insights={insights} />

      {result && timeline.length > 0 && <PurchasingPowerCharts result={result} timeline={timeline} />}

      <ExplainTheMath
        formula="Real Salary Today = Salary × (Base Index ÷ Target Index); Inflation-Adjusted Salary = Salary × (Target Index ÷ Base Index)"
        variables={[
          { symbol: "Salary", description: "The salary amount you entered" },
          { symbol: "Base Index", description: "The National CPI index level at your chosen Base Year" },
          { symbol: "Target Index", description: "The National CPI index level at your chosen Target Year" },
        ]}
        methodology="Identical index-based deflation to the Purchasing Power Calculator, applied specifically to a salary figure — the same method economists use to compare money across years."
        sourceName="Pakistan Bureau of Statistics — National CPI Index"
        sourceUrl="https://www.pbs.gov.pk/cpi"
        lastUpdated={series[series.length - 1]?.observationDate ?? ""}
        dataFrequency="Monthly"
        assumptions={["Assumes the salary stayed exactly at this level across the whole period (no raises factored in — use Raise Reality Check or Future Salary Projection for that)."]}
        limitations={[
          "Uses the National CPI index only — no official city-level index exists, so a city input (if provided) is for reference only and does not change the calculation.",
          `This index series begins ${series[0]?.observationDate.slice(0, 7)} — earlier years cannot be selected.`,
        ]}
      />

      <EducationalPanel
        whatDoesThisMean="This shows how much of your salary's real buying power has been eroded by inflation between two points in time, using the same official index PBS uses for the national CPI."
        whyDifferent="Your salary number on paper doesn't change unless you get a raise, but what it can actually buy shrinks every time prices rise — this converts that into a concrete rupee figure."
        howCalculated="The ratio of the National CPI index at your two chosen years tells you exactly how much less (or more) your fixed salary can buy."
        sources={["Pakistan Bureau of Statistics — National CPI Index (Base 2015-16 = 100)"]}
      />

      <DecisionSupportPanel
        whatHappened={result ? `You calculated the purchasing power of a Rs ${Math.round(result.amount).toLocaleString("en-US")} salary between ${result.baseDate.slice(0, 7)} and ${result.targetDate.slice(0, 7)}.` : "Enter your salary and two years to see how inflation has changed its real value."}
        whyItHappened="Unless your salary is raised at least as fast as inflation, its real purchasing power falls every year, even while the nominal number stays the same or grows slowly."
        whatToUnderstand="This is exactly why tracking your last raise against inflation (Raise Reality Check) matters as much as tracking the salary number itself."
        relatedTools={[{ title: "Raise Reality Check", href: "/decision-support-lab/raise-reality-check" }, { title: "Future Salary Projection", href: "/decision-support-lab/future-salary-projection" }]}
        suggestedNext={{
          title: "Check whether your last raise kept up with inflation",
          href: "/decision-support-lab/raise-reality-check",
          reason: "See whether your most recent salary increase actually grew your real income or was cancelled out by inflation.",
        }}
      />
    </div>
  );
}
