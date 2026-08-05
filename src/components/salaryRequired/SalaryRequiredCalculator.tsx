"use client";

import { useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import SalaryRequiredForm from "@/components/salaryRequired/SalaryRequiredForm";
import SalaryRequiredResults from "@/components/salaryRequired/SalaryRequiredResults";
import WhatIfToggle from "@/components/decisionSupportLab/WhatIfToggle";
import ConfidenceBadge from "@/components/decisionSupportLab/ConfidenceBadge";
import DataFreshnessBadge from "@/components/decisionSupportLab/DataFreshnessBadge";
import ToolShareCard from "@/components/decisionSupportLab/ToolShareCard";
import PersonalInsightsPanel from "@/components/decisionSupportLab/PersonalInsightsPanel";
import DecisionSupportPanel from "@/components/decisionSupportLab/DecisionSupportPanel";
import ExplainTheMath from "@/components/decisionSupportLab/ExplainTheMath";
import EducationalPanel from "@/components/decisionSupportLab/EducationalPanel";
import ReportDownloadButton from "@/components/decisionSupportLab/ReportDownloadButton";
import { computeSalaryRequired, type InflationSource } from "@/lib/decisionSupportLab/salaryEngine";
import { computeOfficialCpiPct, computePersonalInflation } from "@/lib/personalInflation/engine";
import { calculateConfidenceScore } from "@/lib/decisionSupportLab/confidenceEngine";
import { generatePersonalInsights } from "@/lib/decisionSupportLab/insightEngine";
import { getOverallCompletionPct } from "@/lib/decisionSupportLab/profileCompletion";
import { useEconomicProfile, setEconomicProfile, getEffectiveSalary } from "@/lib/decisionSupportLab/economicProfile";
import type { ReportDefinition } from "@/lib/decisionSupportLab/reportFramework";
import type { CpiCategoryBreakdown } from "@/lib/data/cpiCategoryBreakdown";

interface Props {
  breakdown: CpiCategoryBreakdown | null;
}

export default function SalaryRequiredCalculator({ breakdown }: Props) {
  const { t } = useLanguage();
  const { profile } = useEconomicProfile();
  const allocation = profile.householdAllocation;

  const officialCpiPct = useMemo(() => (breakdown ? computeOfficialCpiPct(breakdown.groups) : 0), [breakdown]);
  const personalCpiAvailable = useMemo(() => Object.values(allocation.allocation).some((v) => v > 0), [allocation]);
  const personalCpiPct = useMemo(() => {
    if (!breakdown || !personalCpiAvailable) return null;
    return computePersonalInflation(allocation.allocation, breakdown.groups).personalCpiPct;
  }, [breakdown, personalCpiAvailable, allocation]);

  const salaryFromProfile = getEffectiveSalary(profile);
  const [isWhatIfSalary, setIsWhatIfSalary] = useState(false);
  const [whatIfSalary, setWhatIfSalary] = useState(0);
  const currentSalary = isWhatIfSalary ? whatIfSalary : salaryFromProfile;

  const [years, setYears] = useState(1);
  const [assumedRaisePct, setAssumedRaisePctState] = useState(() => profile.expectedAnnualRaisePct);
  const [inflationSource, setInflationSource] = useState<InflationSource>("official");

  function setAssumedRaisePct(value: number) {
    setAssumedRaisePctState(value);
    setEconomicProfile({ expectedAnnualRaisePct: value });
  }

  const effectiveInflationSource: InflationSource = inflationSource === "personal" && personalCpiAvailable ? "personal" : "official";
  const inflationPct = effectiveInflationSource === "personal" && personalCpiPct !== null ? personalCpiPct : officialCpiPct;

  const result = useMemo(() => {
    if (currentSalary <= 0) return null;
    return computeSalaryRequired(currentSalary, inflationPct, effectiveInflationSource, years, assumedRaisePct);
  }, [currentSalary, inflationPct, effectiveInflationSource, years, assumedRaisePct]);

  const insights = useMemo(() => (result ? generatePersonalInsights({ realRaiseChangePct: result.realIncomeGapPct }) : []), [result]);

  const confidence = useMemo(
    () =>
      calculateConfidenceScore({
        profileCompletenessPct: getOverallCompletionPct(profile),
        usesOfficialData: effectiveInflationSource === "official",
        hasHistoricalCoverage: breakdown !== null,
        manualEstimateCount: isWhatIfSalary ? 1 : 0,
        assumptionCount: 1,
      }),
    [profile, effectiveInflationSource, breakdown, isWhatIfSalary],
  );

  function buildReport(): ReportDefinition {
    if (!result) {
      return { toolName: "Salary Required Calculator", generatedAt: new Date().toISOString().slice(0, 10), sourceNote: "Source: Pakistan Bureau of Statistics", sections: [] };
    }
    return {
      toolName: "Salary Required Calculator",
      subtitle: "Pakistan Economic Intelligence Center — Decision Support Lab",
      generatedAt: new Date().toISOString().slice(0, 10),
      sourceNote: "Source: Pakistan Bureau of Statistics — National CPI Index",
      sections: [
        {
          heading: "Summary",
          paragraphs: [
            `To maintain your current lifestyle ${result.years} year(s) from now at ${result.inflationPct.toFixed(1)}% inflation (${result.inflationSource === "personal" ? "your personal rate" : "official CPI"}), you would need a salary of Rs ${Math.round(result.requiredSalary).toLocaleString("en-US")}.`,
          ],
          facts: [
            { label: "Current Salary", value: `Rs ${Math.round(result.currentSalary).toLocaleString("en-US")}` },
            { label: "Inflation Rate", value: `${result.inflationPct.toFixed(1)}% (${result.inflationSource === "personal" ? "Personal" : "Official"})` },
            { label: "Years Ahead", value: `${result.years}` },
            { label: "Required Salary", value: `Rs ${Math.round(result.requiredSalary).toLocaleString("en-US")}` },
            { label: "Difference", value: `Rs ${Math.round(result.difference).toLocaleString("en-US")}` },
            { label: "Real Income Gap", value: `${result.realIncomeGapPct >= 0 ? "+" : ""}${result.realIncomeGapPct.toFixed(1)}%` },
          ],
        },
      ],
    };
  }

  if (salaryFromProfile <= 0 && !isWhatIfSalary) {
    return (
      <div id="calculator-input" className="flex flex-col gap-6">
        <div className="glass-card rounded-xl border border-neon-blue/20 p-4 sm:p-5">
          <p className="text-sm font-semibold text-white light:text-slate-900">We need one more value.</p>
          <p className="mt-1 text-xs text-white/50 light:text-slate-500">This saves to your Economic Profile, so you won&apos;t be asked again.</p>
          <div className="mt-3 max-w-xs">
            <label htmlFor="sr-salary-gate" className="text-label text-white/40 light:text-slate-400">
              Current Salary
            </label>
            <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5">
              <span className="text-sm text-white/40 light:text-slate-400">Rs</span>
              <input
                id="sr-salary-gate"
                type="number"
                inputMode="decimal"
                step={1000}
                placeholder="Enter current salary"
                onChange={(e) => {
                  const parsed = parseFloat(e.target.value);
                  if (!isNaN(parsed) && parsed > 0) setEconomicProfile({ currentSalary: parsed });
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
        label="Current Salary"
        currentValue={salaryFromProfile}
        whatIfValue={whatIfSalary}
        onWhatIfValueChange={setWhatIfSalary}
        isWhatIf={isWhatIfSalary}
        onToggle={setIsWhatIfSalary}
        formatValue={(v) => `Rs ${Math.round(v).toLocaleString("en-US")}`}
        step={1000}
      />

      <SalaryRequiredForm
        years={years}
        onYearsChange={setYears}
        assumedRaisePct={assumedRaisePct}
        onAssumedRaisePctChange={setAssumedRaisePct}
        inflationSource={effectiveInflationSource}
        onInflationSourceChange={setInflationSource}
        personalCpiAvailable={personalCpiAvailable}
      />

      {result && <ConfidenceBadge result={confidence} toolId="salary-required" />}
      {result && <DataFreshnessBadge sourceName="Pakistan Bureau of Statistics" lastUpdated={breakdown?.observationDate ?? ""} dataFrequency="Monthly" />}

      {result && <SalaryRequiredResults result={result} />}

      {result && (
        <ToolShareCard
          title="My Required Salary"
          headlineValue={`Rs ${Math.round(result.requiredSalary).toLocaleString("en-US")}`}
          headlineTone="neutral"
          comparisonLine={`Needed in ${result.years} year(s) to maintain today's lifestyle`}
          deltaLine={`+Rs ${Math.round(result.difference).toLocaleString("en-US")} vs. today`}
          bars={[
            { label: "Current Salary", value: result.currentSalary, color: "#4d8df7" },
            { label: "Required Salary", value: result.requiredSalary, color: "#9b8afb" },
          ]}
          badgeLines={["Pakistan Bureau of Statistics", result.inflationSource === "personal" ? "Personal Inflation Rate" : "Official CPI"]}
          shareUrl="https://www.pakeconintel.com/decision-support-lab/salary-required"
          shareSummary={`To maintain my lifestyle ${result.years} year(s) from now, I'd need a salary of Rs ${Math.round(result.requiredSalary).toLocaleString("en-US")} — Rs ${Math.round(result.difference).toLocaleString("en-US")} more than today.`}
          filenameBase="my-required-salary"
        />
      )}

      {result && (
        <ReportDownloadButton buildDefinition={buildReport} filename="salary-required-report.pdf" label={t("decisionSupportLab.downloadReport")} generatingLabel={t("decisionSupportLab.generatingReport")} />
      )}

      <PersonalInsightsPanel insights={insights} />

      <ExplainTheMath
        formula="Required Salary = Current Salary × (1 + Inflation ÷ 100)^Years; Real Income Gap = ((1 + Planned Raise ÷ 100) ÷ (1 + Inflation ÷ 100) − 1) × 100"
        variables={[
          { symbol: "Current Salary", description: "Your salary today" },
          { symbol: "Inflation", description: "Your personal inflation rate (if you've used Personal Inflation) or the official CPI rate" },
          { symbol: "Planned Raise", description: "The raise you expect to actually receive" },
        ]}
        methodology="The required salary compounds your current salary forward by the inflation rate; the real income gap reuses the same compounding real-rate formula as Raise Reality Check, applied to your planned raise instead of a raise you've already received."
        sourceName="Pakistan Bureau of Statistics — National CPI Index"
        sourceUrl="https://www.pbs.gov.pk/cpi"
        lastUpdated={breakdown?.observationDate ?? ""}
        dataFrequency="Monthly"
        assumptions={["Assumes a constant inflation rate across the whole horizon."]}
        limitations={[
          personalCpiAvailable
            ? "Using your personal inflation rate, weighted to your own spending pattern from Budget Allocation."
            : "Using the official CPI rate — set up your household allocation in the Personal Inflation Calculator for a rate weighted to your own spending.",
        ]}
      />

      <EducationalPanel
        whatDoesThisMean="This shows the salary you would need at a future date just to keep buying what you can buy today — no more, no less."
        whyDifferent="A raise that only matches this number keeps you exactly where you are in real terms; anything less is a real pay cut, and anything more is genuine progress."
        howCalculated="Your current salary is compounded forward at the inflation rate that matches your actual spending pattern (if available) or the official CPI otherwise."
        sources={["Pakistan Bureau of Statistics — National CPI Index (Base 2015-16 = 100)", "Personal Inflation Calculator (when a household allocation is set)"]}
      />

      <DecisionSupportPanel
        whatHappened={result ? `You calculated the salary needed in ${result.years} year(s) to maintain today's lifestyle at ${result.inflationPct.toFixed(1)}% inflation.` : "Enter your salary and a time horizon to see what you'd need."}
        whyItHappened="Inflation raises the cost of maintaining the same lifestyle every year — standing still requires your salary to rise at least as fast."
        whatToUnderstand="Compare this required figure against your actual expected raise (Raise Reality Check) to know well in advance whether you're on track or falling behind."
        relatedTools={[{ title: "Raise Reality Check", href: "/decision-support-lab/raise-reality-check" }, { title: "Personal Inflation Calculator", href: "/decision-support-lab/personal-inflation" }]}
        suggestedNext={{
          title: "See your full Personal Economic Health Score",
          href: "/decision-support-lab/health-score",
          reason: "Combine this with your budget, inflation and savings results for one composite picture of your financial health.",
        }}
      />
    </div>
  );
}
