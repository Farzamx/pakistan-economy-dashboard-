"use client";

import { useEffect, useMemo, useRef } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import HealthScoreResults from "@/components/healthScore/HealthScoreResults";
import ToolShareCard from "@/components/decisionSupportLab/ToolShareCard";
import ExplainTheMath from "@/components/decisionSupportLab/ExplainTheMath";
import EducationalPanel from "@/components/decisionSupportLab/EducationalPanel";
import ReportDownloadButton from "@/components/decisionSupportLab/ReportDownloadButton";
import { computeHealthScore } from "@/lib/decisionSupportLab/healthScoreEngine";
import { computeOfficialCpiPct, computePersonalInflation } from "@/lib/personalInflation/engine";
import { computePurchasingPower, findNearestIndexPoint } from "@/lib/decisionSupportLab/purchasingPowerEngine";
import { useEconomicProfile } from "@/lib/decisionSupportLab/economicProfile";
import { useAuth } from "@/components/AuthProvider";
import { hasSnapshotToday, saveCalculationSnapshot } from "@/lib/supabase/calculationSnapshots";
import type { ReportDefinition } from "@/lib/decisionSupportLab/reportFramework";
import type { CpiCategoryBreakdown } from "@/lib/data/cpiCategoryBreakdown";
import type { CpiIndexPoint } from "@/lib/data/cpiMonthlyIndex";

interface Props {
  breakdown: CpiCategoryBreakdown | null;
  series: CpiIndexPoint[] | null;
}

export default function HealthScoreCalculator({ breakdown, series }: Props) {
  const { t } = useLanguage();
  const { profile } = useEconomicProfile();
  const allocation = profile.householdAllocation;
  const wealth = profile;

  const officialCpiPct = useMemo(() => (breakdown ? computeOfficialCpiPct(breakdown.groups) : undefined), [breakdown]);

  const hasPersonalAllocation = useMemo(() => Object.values(allocation.allocation).some((v) => v > 0), [allocation]);
  const personalCpiPct = useMemo(() => {
    if (!breakdown) return officialCpiPct;
    if (!hasPersonalAllocation) return officialCpiPct;
    return computePersonalInflation(allocation.allocation, breakdown.groups).personalCpiPct;
  }, [breakdown, hasPersonalAllocation, allocation, officialCpiPct]);

  // Reuses the exact same "trailing ~12 months" income-erosion calculation
  // PurchasingPowerCalculator.tsx uses for its own income-erosion insight —
  // anchored to the profile's monthly income instead of a scenario amount.
  const incomeErosionPct = useMemo(() => {
    if (!series || series.length < 2 || profile.monthlyIncome <= 0) return undefined;
    const latest = series[series.length - 1];
    const yearAgoDate = `${parseInt(latest.observationDate.slice(0, 4), 10) - 1}${latest.observationDate.slice(4)}`;
    const anchor = findNearestIndexPoint(series, yearAgoDate);
    if (!anchor || anchor.observationDate === latest.observationDate) return undefined;
    return computePurchasingPower(profile.monthlyIncome, anchor, latest).purchasingPowerLostPct;
  }, [series, profile.monthlyIncome]);

  const result = useMemo(
    () =>
      computeHealthScore({
        personalCpiPct,
        hasPersonalAllocation,
        officialCpiPct,
        monthlyIncome: profile.monthlyIncome > 0 ? profile.monthlyIncome : undefined,
        monthlySpending: profile.monthlySpending > 0 ? profile.monthlySpending : undefined,
        incomeErosionPct,
        lastRaisePct: wealth.lastRaisePct > 0 ? wealth.lastRaisePct : undefined,
        savingsAmount: wealth.currentSavings > 0 ? wealth.currentSavings : undefined,
      }),
    [personalCpiPct, hasPersonalAllocation, officialCpiPct, profile.monthlyIncome, profile.monthlySpending, incomeErosionPct, wealth.lastRaisePct, wealth.currentSavings],
  );

  // Automatic daily history capture (Phase 5.5, plan §1b) — a genuine side
  // effect (a network write), not React state derivation, so this is a
  // legitimate useEffect use, unlike deriving component state from a prop.
  // Throttled to at most once per UTC calendar day via hasSnapshotToday(),
  // and guarded by a ref so a re-render mid-check can't fire it twice.
  const { user } = useAuth();
  const snapshotAttempted = useRef(false);
  useEffect(() => {
    if (!user || snapshotAttempted.current || result.categories.filter((c) => c.available).length === 0) return;
    snapshotAttempted.current = true;
    hasSnapshotToday("health-score").then((already) => {
      if (already) return;
      saveCalculationSnapshot(user.id, {
        toolId: "health-score",
        inputs: { monthlyIncome: profile.monthlyIncome, monthlySpending: profile.monthlySpending, lastRaisePct: profile.lastRaisePct, currentSavings: profile.currentSavings },
        assumptions: {},
        outputs: { overallScore: result.overallScore, categories: result.categories },
      }).catch(() => {
        // best-effort — a missed daily snapshot just means one fewer history point, not a functional failure
      });
    });
  }, [user, result, profile]);

  // The Lab's one "full Personal Economic Report" — per the brief, this
  // combines every domain the visitor has actually used (Inflation,
  // Budget, Salary, Savings) alongside the composite Health Score into a
  // single downloadable document, rather than each tool only exporting
  // its own narrow report. Sections are added conditionally: a domain the
  // visitor hasn't touched yet is omitted rather than padded with zeros,
  // consistent with the Health Score itself only averaging available data.
  function buildReport(): ReportDefinition {
    const sections: ReportDefinition["sections"] = [
      {
        heading: "Personal Economic Health Score",
        paragraphs: [`Your overall Health Score is ${result.overallScore}/100, based on ${result.categories.filter((c) => c.available).length} of 6 available categories.`],
        facts: result.categories.map((c) => ({ label: c.id, value: c.available ? `${c.score}/100` : "Not yet available" })),
      },
    ];

    if (hasPersonalAllocation && personalCpiPct !== undefined && officialCpiPct !== undefined) {
      sections.push({
        heading: "Personal Inflation",
        paragraphs: [`Your personal inflation rate is ${personalCpiPct.toFixed(1)}%, compared with the official CPI of ${officialCpiPct.toFixed(1)}%.`],
        facts: [
          { label: "Your Personal Rate", value: `${personalCpiPct.toFixed(1)}%` },
          { label: "Official CPI", value: `${officialCpiPct.toFixed(1)}%` },
        ],
      });
    }

    if (profile.monthlyIncome > 0 && profile.monthlySpending > 0) {
      const savingsRatePct = ((profile.monthlyIncome - profile.monthlySpending) / profile.monthlyIncome) * 100;
      sections.push({
        heading: "Budget",
        paragraphs: [`You save ${savingsRatePct.toFixed(1)}% of your monthly income.`],
        facts: [
          { label: "Monthly Income", value: `Rs ${Math.round(profile.monthlyIncome).toLocaleString("en-US")}` },
          { label: "Monthly Spending", value: `Rs ${Math.round(profile.monthlySpending).toLocaleString("en-US")}` },
          { label: "Savings Rate", value: `${savingsRatePct.toFixed(1)}%` },
        ],
      });
    }

    if (incomeErosionPct !== undefined) {
      sections.push({
        heading: "Purchasing Power",
        paragraphs: [`Your monthly income's real value has fallen ${incomeErosionPct.toFixed(1)}% over the past year.`],
        facts: [{ label: "Income Erosion (trailing 12 months)", value: `${incomeErosionPct.toFixed(1)}%` }],
      });
    }

    if (wealth.lastRaisePct > 0 && officialCpiPct !== undefined) {
      sections.push({
        heading: "Salary Growth",
        paragraphs: [`Your last recorded raise was ${wealth.lastRaisePct.toFixed(1)}% against ${officialCpiPct.toFixed(1)}% official inflation.`],
        facts: [
          { label: "Last Raise", value: `${wealth.lastRaisePct.toFixed(1)}%` },
          { label: "Official Inflation", value: `${officialCpiPct.toFixed(1)}%` },
        ],
      });
    }

    if (wealth.currentSavings > 0) {
      sections.push({
        heading: "Savings",
        paragraphs: [`You have Rs ${Math.round(wealth.currentSavings).toLocaleString("en-US")} in recorded savings.`],
        facts: [{ label: "Savings Amount", value: `Rs ${Math.round(wealth.currentSavings).toLocaleString("en-US")}` }],
      });
    }

    sections.push({
      heading: "Methodology",
      paragraphs: [
        "Every figure above comes from an official PBS data series (National CPI index and category breakdown) combined with the numbers you entered into the Decision Support Lab's tools. The Health Score is a deterministic, rule-based composite — no AI or estimation is involved anywhere in this report.",
      ],
    });

    return {
      toolName: "Personal Economic Report",
      subtitle: "Pakistan Economic Intelligence Center — Decision Support Lab",
      generatedAt: new Date().toISOString().slice(0, 10),
      sourceNote: "Source: Pakistan Bureau of Statistics — National CPI Index & Category Breakdown",
      sections,
    };
  }

  return (
    <div id="calculator-input" className="flex flex-col gap-6">
      <HealthScoreResults result={result} />

      <ToolShareCard
        title="My Personal Economic Health Score"
        headlineValue={`${result.overallScore}/100`}
        headlineTone={result.overallScore >= 70 ? "down" : result.overallScore >= 50 ? "neutral" : "up"}
        comparisonLine={`Based on ${result.categories.filter((c) => c.available).length} of 6 Decision Support Lab tools`}
        badgeLines={["Pakistan Bureau of Statistics", "Deterministic Composite Score"]}
        shareUrl="https://www.pakeconintel.com/decision-support-lab/health-score"
        shareSummary={`My Personal Economic Health Score is ${result.overallScore}/100, based on my inflation exposure, budget, salary growth and savings.`}
        filenameBase="my-health-score"
      />

      <ReportDownloadButton buildDefinition={buildReport} filename="personal-economic-report.pdf" label={t("decisionSupportLab.downloadReport")} generatingLabel={t("decisionSupportLab.generatingReport")} />

      <ExplainTheMath
        formula="Overall Score = average of all AVAILABLE category scores (0-100 each)"
        variables={[
          { symbol: "Personal Inflation", description: "How high your own inflation rate is, in absolute terms" },
          { symbol: "Inflation Exposure", description: "How your rate compares to the official/average household" },
          { symbol: "Budget Balance", description: "Your income vs. spending ratio" },
          { symbol: "Purchasing Power", description: "Recent real-income erosion on your monthly income" },
          { symbol: "Salary Growth", description: "Whether your last raise beat inflation in real terms" },
          { symbol: "Savings Protection", description: "Emergency-fund coverage, discounted by projected erosion" },
        ]}
        methodology="Every category score is a plain, documented formula over numbers computed by the Lab's other tools — never an AI estimate. A category only counts toward your overall score once you've provided the data it needs (e.g. Salary Growth needs a recorded raise from Raise Reality Check)."
        sourceName="Pakistan Bureau of Statistics"
        sourceUrl="https://www.pbs.gov.pk/cpi"
        lastUpdated={breakdown?.observationDate ?? ""}
        dataFrequency="Monthly"
        assumptions={["Assumes the figures you've entered in each tool (income, spending, salary, raises, savings) are current."]}
        limitations={["Categories with no data yet are excluded from the average rather than scored as zero — your score becomes more accurate as you use more tools."]}
      />

      <EducationalPanel
        whatDoesThisMean="This is one composite number summarizing your overall financial resilience against inflation, built entirely from the other Decision Support Lab tools you've used."
        whyDifferent="No single number can capture your full financial picture — this score is deliberately transparent about which categories it could and couldn't measure, rather than guessing at missing ones."
        howCalculated="Each of six categories gets a 0-100 score from a fixed formula; the overall score is the average of whichever categories have real data behind them."
        sources={["Pakistan Bureau of Statistics — National CPI Index and Category Breakdown", "Your own inputs across the Decision Support Lab's tools"]}
      />
    </div>
  );
}
