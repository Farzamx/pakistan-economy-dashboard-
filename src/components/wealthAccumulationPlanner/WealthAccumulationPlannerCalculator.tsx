"use client";

import { useMemo, useState } from "react";
import ConfidenceBadge from "@/components/decisionSupportLab/ConfidenceBadge";
import DataFreshnessBadge from "@/components/decisionSupportLab/DataFreshnessBadge";
import GoalAssumptionsPanel from "@/components/decisionSupportLab/GoalAssumptionsPanel";
import GoalFundingGapChart from "@/components/decisionSupportLab/GoalFundingGapChart";
import GoalProbabilityGauge from "@/components/decisionSupportLab/GoalProbabilityGauge";
import SensitivityTable from "@/components/decisionSupportLab/SensitivityTable";
import ScenarioComparisonCards, { type ScenarioCardData } from "@/components/decisionSupportLab/ScenarioComparisonCards";
import GoalRecommendationCards from "@/components/decisionSupportLab/GoalRecommendationCards";
import PersonalInsightsPanel from "@/components/decisionSupportLab/PersonalInsightsPanel";
import ExplainTheMath from "@/components/decisionSupportLab/ExplainTheMath";
import EducationalPanel from "@/components/decisionSupportLab/EducationalPanel";
import DecisionSupportPanel from "@/components/decisionSupportLab/DecisionSupportPanel";
import ReportDownloadButton from "@/components/decisionSupportLab/ReportDownloadButton";
import WealthAccumulationPlannerForm, { type WealthAccumulationFormValues } from "@/components/wealthAccumulationPlanner/WealthAccumulationPlannerForm";
import WealthAccumulationPlannerResults from "@/components/wealthAccumulationPlanner/WealthAccumulationPlannerResults";
import { useEconomicProfile, setEconomicProfile } from "@/lib/decisionSupportLab/economicProfile";
import { addGoal, updateGoal, getPrimaryGoalOfType } from "@/lib/decisionSupportLab/goals";
import { projectGoalProgress, buildGoalTimelineSeries, type GoalAssumptions } from "@/lib/decisionSupportLab/goalEngine";
import { runGoalMonteCarlo, runSensitivityAnalysis } from "@/lib/decisionSupportLab/goalProbabilityEngine";
import { calculateConfidenceScore } from "@/lib/decisionSupportLab/confidenceEngine";
import { generateRecommendations } from "@/lib/decisionSupportLab/recommendationEngine";
import { generatePersonalInsights } from "@/lib/decisionSupportLab/insightEngine";
import { computeOfficialCpiPct } from "@/lib/personalInflation/engine";
import { getOverallCompletionPct } from "@/lib/decisionSupportLab/profileCompletion";
import type { ReportDefinition } from "@/lib/decisionSupportLab/reportFramework";
import type { CalculationSnapshotPayload } from "@/lib/supabase/calculationSnapshots";
import type { ProvenanceEntry } from "@/lib/decisionSupportLab/provenance";
import type { CpiCategoryBreakdown } from "@/lib/data/cpiCategoryBreakdown";

const DEFAULT_RETURN_PCT = 10; // growth-oriented default — a general wealth goal has a longer horizon and can absorb more volatility than an emergency fund
const DEFAULT_VOLATILITY_PCT = 12;

interface Props {
  breakdown: CpiCategoryBreakdown | null;
}

export default function WealthAccumulationPlannerCalculator({ breakdown }: Props) {
  const { profile } = useEconomicProfile();
  const officialInflationPct = useMemo(() => (breakdown ? computeOfficialCpiPct(breakdown.groups) : 0), [breakdown]);

  const [useCustomInflation, setUseCustomInflation] = useState(false);
  const [customInflationPct, setCustomInflationPct] = useState(0);
  const inflationPct = useCustomInflation ? customInflationPct : officialInflationPct;

  const [expectedReturnPct, setExpectedReturnPct] = useState(DEFAULT_RETURN_PCT);
  const [volatilityPct, setVolatilityPct] = useState(DEFAULT_VOLATILITY_PCT);
  const [monthlyContribution, setMonthlyContribution] = useState(0);

  const goal = getPrimaryGoalOfType(profile.goals, "wealth-accumulation");

  function handleCreate(values: WealthAccumulationFormValues) {
    const targetDate = new Date();
    targetDate.setFullYear(targetDate.getFullYear() + values.targetYears);
    const nextGoals = addGoal(profile.goals, {
      name: values.goalName,
      goalType: "wealth-accumulation",
      targetAmountToday: values.targetAmountToday,
      targetDate: targetDate.toISOString().slice(0, 10),
      currentSavingsForGoal: values.currentSavingsForGoal,
      monthlyContribution: values.monthlyContribution,
      expectedReturnPct: DEFAULT_RETURN_PCT,
      priority: "medium",
    });
    setEconomicProfile({ goals: nextGoals });
    setMonthlyContribution(values.monthlyContribution);
  }

  const assumptions: GoalAssumptions = useMemo(() => ({ inflationPct }), [inflationPct]);
  const effectiveGoal = useMemo(
    () => (goal ? { ...goal, expectedReturnPct, monthlyContribution: monthlyContribution || goal.monthlyContribution } : null),
    [goal, expectedReturnPct, monthlyContribution],
  );
  const progress = useMemo(() => (effectiveGoal ? projectGoalProgress(effectiveGoal, assumptions) : null), [effectiveGoal, assumptions]);

  const timelinePoints = useMemo(() => (effectiveGoal ? buildGoalTimelineSeries(effectiveGoal, assumptions) : []), [effectiveGoal, assumptions]);

  const monteCarloResult = useMemo(
    () => (effectiveGoal ? runGoalMonteCarlo(effectiveGoal, { ...assumptions, volatilityPct }) : null),
    [effectiveGoal, assumptions, volatilityPct],
  );

  const sensitivityRows = useMemo(
    () => (effectiveGoal ? runSensitivityAnalysis(effectiveGoal, assumptions, (g, a) => projectGoalProgress(g, a)) : []),
    [effectiveGoal, assumptions],
  );

  const scenarios: ScenarioCardData[] = useMemo(() => {
    if (!effectiveGoal) return [];
    return (
      [
        { label: "Pessimistic" as const, delta: -4 },
        { label: "Base Case" as const, delta: 0 },
        { label: "Optimistic" as const, delta: 4 },
      ] as const
    ).map(({ label, delta }) => {
      const scenarioGoal = { ...effectiveGoal, expectedReturnPct: effectiveGoal.expectedReturnPct + delta };
      const result = projectGoalProgress(scenarioGoal, assumptions);
      return { label, returnPct: scenarioGoal.expectedReturnPct, projectedFutureValue: result.projectedFutureValue, fundingGapPct: result.fundingGapPct, isOnTrack: result.isOnTrack };
    });
  }, [effectiveGoal, assumptions]);

  const confidence = useMemo(
    () =>
      calculateConfidenceScore({
        profileCompletenessPct: getOverallCompletionPct(profile),
        usesOfficialData: !useCustomInflation,
        hasHistoricalCoverage: breakdown !== null,
        manualEstimateCount: 1,
        assumptionCount: useCustomInflation ? 1 : 0,
      }),
    [profile, useCustomInflation, breakdown],
  );

  const recommendations = useMemo(
    () =>
      progress && effectiveGoal
        ? generateRecommendations(profile, {
            goals: [{ goal: effectiveGoal, fundingGapAmount: progress.fundingGapAmount, fundingGapPct: progress.fundingGapPct, requiredMonthlyContributionValue: progress.requiredMonthlyContributionValue }],
          })
        : [],
    [profile, progress, effectiveGoal],
  );

  const insights = useMemo(
    () => (progress && goal ? generatePersonalInsights({ goalProgress: { goalName: goal.name, fundingGapPct: progress.fundingGapPct } }) : []),
    [progress, goal],
  );

  const provenance: ProvenanceEntry[] = useMemo(() => {
    if (!goal || !effectiveGoal) return [];
    return [
      { label: "Current dedicated savings", value: `Rs ${Math.round(goal.currentSavingsForGoal).toLocaleString("en-US")}`, source: "profile" },
      { label: "Monthly contribution", value: `Rs ${Math.round(effectiveGoal.monthlyContribution).toLocaleString("en-US")}`, source: "profile" },
      { label: "Inflation assumption", value: `${inflationPct.toFixed(2)}%`, source: useCustomInflation ? "manual-estimate" : "official-cpi" },
      { label: "Expected return assumption", value: `${expectedReturnPct.toFixed(1)}%`, source: "manual-estimate" },
    ];
  }, [goal, effectiveGoal, inflationPct, useCustomInflation, expectedReturnPct]);

  function buildReport(): ReportDefinition {
    if (!progress || !goal || !monteCarloResult) {
      return { toolName: "Wealth Accumulation Planner", generatedAt: new Date().toISOString().slice(0, 10), sourceNote: "Source: Pakistan Economic Intelligence Center", sections: [] };
    }
    return {
      toolName: "Wealth Accumulation Planner",
      subtitle: "Pakistan Economic Intelligence Center — Decision Support Lab, Financial Planning Intelligence",
      generatedAt: new Date().toISOString().slice(0, 10),
      sourceNote: "Source: Pakistan Bureau of Statistics — National CPI Index, plus your Economic Profile",
      sections: [
        {
          heading: "Goal Overview",
          facts: [
            { label: "Goal", value: goal.name },
            { label: "Target Date", value: goal.targetDate },
            { label: "Inflation-Adjusted Target", value: `Rs ${Math.round(progress.inflatedTargetAmount).toLocaleString("en-US")}` },
            { label: "Projected Value", value: `Rs ${Math.round(progress.projectedFutureValue).toLocaleString("en-US")}` },
          ],
        },
        {
          heading: "Funding Gap",
          facts: [
            { label: progress.fundingGapAmount > 0 ? "Shortfall" : "Surplus", value: `Rs ${Math.round(Math.abs(progress.fundingGapAmount)).toLocaleString("en-US")} (${progress.fundingGapPct.toFixed(1)}%)` },
            { label: "Required Monthly Contribution", value: `Rs ${Math.round(progress.requiredMonthlyContributionValue).toLocaleString("en-US")}` },
          ],
        },
        {
          heading: "Probability of Success",
          paragraphs: [`Based on ${monteCarloResult.trials.toLocaleString("en-US")} simulated market paths at ${expectedReturnPct.toFixed(1)}% expected return and ${volatilityPct.toFixed(1)}% volatility.`],
          facts: [{ label: "Success Probability", value: `${monteCarloResult.successProbabilityPct.toFixed(0)}%` }],
        },
      ],
    };
  }

  function snapshotPayload(): CalculationSnapshotPayload {
    return {
      toolId: "wealth-accumulation-planner",
      inputs: goal ? { ...goal } : {},
      assumptions: { inflationPct, expectedReturnPct, volatilityPct },
      outputs: progress ? { ...progress } : {},
    };
  }

  if (!goal) {
    return (
      <div className="flex flex-col gap-6">
        <WealthAccumulationPlannerForm defaultCurrentSavings={profile.currentSavings} onCreate={handleCreate} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <GoalAssumptionsPanel
        officialInflationPct={officialInflationPct}
        useCustomInflation={useCustomInflation}
        onUseCustomInflationChange={setUseCustomInflation}
        customInflationPct={customInflationPct}
        onCustomInflationPctChange={setCustomInflationPct}
        expectedReturnPct={expectedReturnPct}
        onExpectedReturnPctChange={setExpectedReturnPct}
        volatilityPct={volatilityPct}
        onVolatilityPctChange={setVolatilityPct}
        monthlyContribution={monthlyContribution || goal.monthlyContribution}
        onMonthlyContributionChange={(v) => {
          setMonthlyContribution(v);
          setEconomicProfile({ goals: updateGoal(profile.goals, goal.id, { monthlyContribution: v }) });
        }}
      />

      <ConfidenceBadge result={confidence} toolId="wealth-accumulation-planner" />
      <DataFreshnessBadge sourceName="Pakistan Bureau of Statistics" lastUpdated={breakdown?.observationDate ?? ""} dataFrequency="Monthly" />

      {progress && <WealthAccumulationPlannerResults goalName={goal.name} progress={progress} />}

      {timelinePoints.length > 0 && <GoalFundingGapChart points={timelinePoints} />}

      {monteCarloResult && <GoalProbabilityGauge result={monteCarloResult} />}

      {sensitivityRows.length > 0 && <SensitivityTable rows={sensitivityRows} />}

      {scenarios.length > 0 && <ScenarioComparisonCards scenarios={scenarios} />}

      <GoalRecommendationCards recommendations={recommendations} />

      <PersonalInsightsPanel insights={insights} />

      {progress && (
        <ReportDownloadButton buildDefinition={buildReport} filename="wealth-accumulation-planner-report.pdf" label="Download Full Report (PDF)" generatingLabel="Generating…" snapshotPayload={snapshotPayload} />
      )}

      <ExplainTheMath
        formula="Required Monthly = (Inflated Target − FV(Current Savings)) ÷ [((1+r)^n − 1) ÷ r]"
        variables={[
          { symbol: "Inflated Target", description: "Your target amount, inflated to the target date" },
          { symbol: "r", description: "Your expected monthly return (annual ÷ 12)" },
          { symbol: "n", description: "Months remaining to your target date" },
        ]}
        methodology="Your dedicated savings and monthly contributions are projected forward using the same compounding math as every Time Value of Money and Investment Intelligence tool in this Lab, then compared against your target inflated by your chosen inflation assumption."
        sourceName="Pakistan Bureau of Statistics — National CPI Index"
        sourceUrl="https://www.pbs.gov.pk/cpi"
        lastUpdated={breakdown?.observationDate ?? ""}
        dataFrequency="Monthly"
        assumptions={["Assumes a constant expected return and inflation rate for the full horizon.", "Assumes monthly contributions are made consistently without interruption."]}
        limitations={["The probability simulation assumes annual returns are normally distributed around your expected return — real markets can behave differently, especially sequencing risk near the target date."]}
        provenance={provenance}
      />

      <EducationalPanel
        whatDoesThisMean="This shows whether your wealth goal, growing at your expected investment return, will be large enough — after inflation — to reach your target amount by your target date."
        whyDifferent="A wealth goal's real target rises every year prices do, since Rs 10M ten years from now buys less than Rs 10M today — the inflation adjustment keeps your target meaningful in future purchasing power, not just nominal rupees."
        howCalculated="Your current dedicated savings and monthly contributions are compounded forward at your expected return, then compared against your target amount inflated to your target date."
        sources={["Pakistan Bureau of Statistics — National CPI Index (Base 2015-16 = 100)", "Your Economic Profile (savings, contribution)"]}
      />

      <DecisionSupportPanel
        whatHappened={progress ? `Your "${goal.name}" goal is projected to be ${progress.isOnTrack ? "on track" : `${progress.fundingGapPct.toFixed(0)}% short of`} its inflation-adjusted target.` : "Set up your goal to see a projection."}
        whyItHappened="Your dedicated savings and monthly contribution, compounded at your expected return, either do or don't outpace your target's own inflation-driven growth."
        whatToUnderstand="A longer horizon and higher expected return both help close a funding gap, but a higher return also means more volatility — check the Sensitivity Analysis and Probability of Success above before assuming a higher return alone solves it."
        relatedTools={[{ title: "Emergency Fund Planner", href: "/decision-support-lab/emergency-fund-planner" }, { title: "Asset Allocation Explorer", href: "/decision-support-lab/asset-allocation-explorer" }]}
        snapshotPayload={progress ? snapshotPayload : undefined}
      />
    </div>
  );
}
