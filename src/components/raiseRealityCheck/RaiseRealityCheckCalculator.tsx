"use client";

import { useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import InflationRateField from "@/components/decisionSupportLab/InflationRateField";
import WhatIfToggle from "@/components/decisionSupportLab/WhatIfToggle";
import ConfidenceBadge from "@/components/decisionSupportLab/ConfidenceBadge";
import DataFreshnessBadge from "@/components/decisionSupportLab/DataFreshnessBadge";
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
import { calculateConfidenceScore } from "@/lib/decisionSupportLab/confidenceEngine";
import { generatePersonalInsights } from "@/lib/decisionSupportLab/insightEngine";
import { getOverallCompletionPct } from "@/lib/decisionSupportLab/profileCompletion";
import { useEconomicProfile, setEconomicProfile, getEffectiveSalary } from "@/lib/decisionSupportLab/economicProfile";
import type { ReportDefinition } from "@/lib/decisionSupportLab/reportFramework";
import type { CalculationSnapshotPayload } from "@/lib/supabase/calculationSnapshots";
import type { CpiCategoryBreakdown } from "@/lib/data/cpiCategoryBreakdown";

interface Props {
  breakdown: CpiCategoryBreakdown | null;
}

export default function RaiseRealityCheckCalculator({ breakdown }: Props) {
  const { t } = useLanguage();
  const { profile } = useEconomicProfile();

  const officialInflationPct = useMemo(() => (breakdown ? computeOfficialCpiPct(breakdown.groups) : null), [breakdown]);

  const salaryFromProfile = getEffectiveSalary(profile);
  const [isWhatIfSalary, setIsWhatIfSalary] = useState(false);
  const [whatIfSalary, setWhatIfSalary] = useState(0);
  const currentSalary = isWhatIfSalary ? whatIfSalary : salaryFromProfile;

  const [nominalRaisePct, setNominalRaisePctState] = useState(() => profile.lastRaisePct);
  const [useCustomInflation, setUseCustomInflation] = useState(false);
  const [customInflationPct, setCustomInflationPct] = useState(0);
  const inflationPct = useCustomInflation ? customInflationPct : (officialInflationPct ?? 0);

  function setNominalRaisePct(value: number) {
    setNominalRaisePctState(value);
    setEconomicProfile({ lastRaisePct: value });
  }

  const result = useMemo(() => {
    if (currentSalary <= 0) return null;
    return computeRaiseRealityCheck(currentSalary, nominalRaisePct, inflationPct);
  }, [currentSalary, nominalRaisePct, inflationPct]);

  const insights = useMemo(() => (result ? generatePersonalInsights({ realRaiseChangePct: result.realChangePct }) : []), [result]);

  const confidence = useMemo(
    () =>
      calculateConfidenceScore({
        profileCompletenessPct: getOverallCompletionPct(profile),
        usesOfficialData: !useCustomInflation,
        hasHistoricalCoverage: breakdown !== null,
        manualEstimateCount: isWhatIfSalary ? 1 : 0,
        assumptionCount: useCustomInflation ? 1 : 0,
      }),
    [profile, useCustomInflation, breakdown, isWhatIfSalary],
  );

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

  // Part 3 of the Phase 5.5 brief: if the profile already has a salary
  // figure, skip straight to results with a WhatIfToggle for testing a
  // hypothetical one — no form first. Only when neither currentSalary nor
  // monthlyIncome exists yet does this tool ask for anything.
  if (salaryFromProfile <= 0 && !isWhatIfSalary) {
    return (
      <div id="calculator-input" className="flex flex-col gap-6">
        <div className="glass-card rounded-xl border border-neon-blue/20 p-4 sm:p-5">
          <p className="text-sm font-semibold text-white light:text-slate-900">We need one more value.</p>
          <p className="mt-1 text-xs text-white/50 light:text-slate-500">This saves to your Economic Profile, so you won&apos;t be asked again.</p>
          <div className="mt-3 max-w-xs">
            <label htmlFor="rrc-salary-gate" className="text-label text-white/40 light:text-slate-400">
              Current Salary
            </label>
            <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5">
              <span className="text-sm text-white/40 light:text-slate-400">Rs</span>
              <input
                id="rrc-salary-gate"
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

      <div className="glass-card rounded-xl p-4 sm:p-5">
        <label htmlFor="rrc-raise" className="text-label text-white/40 light:text-slate-400">
          Nominal Raise
        </label>
        <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5">
          <input
            id="rrc-raise"
            type="number"
            inputMode="decimal"
            step={0.5}
            value={nominalRaisePct === 0 ? "" : nominalRaisePct}
            placeholder="Enter percentage"
            onChange={(e) => {
              const parsed = parseFloat(e.target.value);
              setNominalRaisePct(isNaN(parsed) ? 0 : parsed);
            }}
            className="text-mono-num w-full bg-transparent text-lg font-semibold tabular-nums text-white outline-none light:text-slate-900"
          />
          <span className="text-sm text-white/40 light:text-slate-400">%</span>
        </div>
      </div>

      <div className="glass-card rounded-xl p-4 sm:p-5">
        <InflationRateField
          autoValuePct={officialInflationPct}
          autoLabel="Official Inflation (Latest)"
          tooltipText="Calculated automatically from the latest official CPI data."
          useCustom={useCustomInflation}
          onUseCustomChange={setUseCustomInflation}
          customValuePct={customInflationPct}
          onCustomValuePctChange={setCustomInflationPct}
        />
      </div>

      {result && <ConfidenceBadge result={confidence} toolId="raise-reality-check" />}
      {result && <DataFreshnessBadge sourceName="Pakistan Bureau of Statistics" lastUpdated={breakdown?.observationDate ?? ""} dataFrequency="Monthly" />}

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
        snapshotPayload={
          result
            ? (): CalculationSnapshotPayload => ({
                toolId: "raise-reality-check",
                inputs: { currentSalary, nominalRaisePct, inflationPct },
                assumptions: {},
                outputs: { realChangePct: result.realChangePct, newNominalSalary: result.newNominalSalary, realEquivalentSalary: result.realEquivalentSalary },
              })
            : undefined
        }
      />
    </div>
  );
}
