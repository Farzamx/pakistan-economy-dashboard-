"use client";

import { useMemo } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import AllocationSummaryPanel from "@/components/personalInflation/AllocationSummaryPanel";
import CategoryAllocationInput, { type InputMode } from "@/components/personalInflation/CategoryAllocationInput";
import ScenarioPicker from "@/components/personalInflation/ScenarioPicker";
import ContributionTable from "@/components/personalInflation/ContributionTable";
import ToolShareCard from "@/components/decisionSupportLab/ToolShareCard";
import SpendingCompositionDonut from "@/components/decisionSupportLab/SpendingCompositionDonut";
import PersonalInsightsPanel from "@/components/decisionSupportLab/PersonalInsightsPanel";
import DecisionSupportPanel from "@/components/decisionSupportLab/DecisionSupportPanel";
import ExplainTheMath from "@/components/decisionSupportLab/ExplainTheMath";
import EducationalPanel from "@/components/decisionSupportLab/EducationalPanel";
import { CPI_GROUPS, CPI_GROUP_BY_NO } from "@/lib/personalInflation/cpiGroups";
import { SCENARIO_PRESETS } from "@/lib/personalInflation/scenarios";
// Reuses the Personal Inflation Calculator's weighted-rate engine purely
// for its `contributions` array (your weight vs. official household
// weight per category) — Budget Allocation never displays the resulting
// personalCpiPct/officialCpiPct itself. Building a second "compare my
// allocation to official weights" function would duplicate exactly the
// math computePersonalInflation already does.
import { computePersonalInflation } from "@/lib/personalInflation/engine";
import { useSavedScenarios, saveScenario, deleteScenario, type SavedScenario } from "@/lib/personalInflation/localScenarios";
import { useEconomicIdentity } from "@/lib/decisionSupportLab/economicIdentity";
import { useHouseholdAllocation, setHouseholdAllocation, setAllocationValue, replaceAllocation } from "@/lib/decisionSupportLab/householdAllocation";
import { generatePersonalInsights } from "@/lib/decisionSupportLab/insightEngine";
import type { CpiCategoryBreakdown } from "@/lib/data/cpiCategoryBreakdown";

interface Props {
  breakdown: CpiCategoryBreakdown | null;
}

const DEFAULT_ALLOCATION_PCT = SCENARIO_PRESETS.find((s) => s.id === "family")?.allocationPct ?? {};
const DEFAULT_MONTHLY_BUDGET = 60_000;

export default function BudgetAllocationCalculator({ breakdown }: Props) {
  const { t } = useLanguage();
  const shared = useHouseholdAllocation();
  const savedScenarios = useSavedScenarios();
  const identity = useEconomicIdentity();

  // First-ever visit: the shared store is empty (allocation = {}). Seed it
  // from the Family preset + Economic Identity's income (if set) so the
  // tool never opens on a blank grid — but only as a fallback for
  // *reading*, never by writing to the store during render.
  const hasStoredAllocation = Object.keys(shared.allocation).length > 0;
  const mode: InputMode = hasStoredAllocation ? shared.mode : "percent";
  const monthlyBudget = shared.monthlyBudget > 0 ? shared.monthlyBudget : identity.monthlyIncome > 0 ? identity.monthlyIncome : DEFAULT_MONTHLY_BUDGET;
  const allocation = hasStoredAllocation ? shared.allocation : DEFAULT_ALLOCATION_PCT;

  const totalAllocated = useMemo(() => CPI_GROUPS.reduce((s, g) => s + (allocation[g.groupNo] || 0), 0), [allocation]);

  function handleAllocationChange(groupNo: number, value: number) {
    if (!hasStoredAllocation) setHouseholdAllocation({ mode, monthlyBudget, allocation: { ...allocation, [groupNo]: value } });
    else setAllocationValue(groupNo, value);
  }

  function handleModeChange(nextMode: InputMode) {
    setHouseholdAllocation({ mode: nextMode, monthlyBudget, allocation });
  }

  function handleBudgetChange(nextBudget: number) {
    setHouseholdAllocation({ mode, monthlyBudget: nextBudget, allocation });
  }

  function handleLoadPreset(allocationPct: Record<number, number>) {
    replaceAllocation(allocationPct, "percent");
    setHouseholdAllocation({ monthlyBudget: monthlyBudget || DEFAULT_MONTHLY_BUDGET });
  }

  function handleLoadSaved(scenario: SavedScenario) {
    replaceAllocation(scenario.allocation, scenario.mode);
    if (scenario.mode === "spending") {
      const total = Object.values(scenario.allocation).reduce((s, v) => s + v, 0);
      if (total > 0) setHouseholdAllocation({ monthlyBudget: total });
    }
  }

  function handleSaveCurrent(name: string) {
    saveScenario(name, mode, allocation);
  }

  function handleReset() {
    setHouseholdAllocation({ mode: "percent", monthlyBudget: DEFAULT_MONTHLY_BUDGET, allocation: DEFAULT_ALLOCATION_PCT });
  }

  const result = useMemo(() => {
    if (!breakdown) return null;
    return computePersonalInflation(allocation, breakdown.groups);
  }, [allocation, breakdown]);

  const insights = useMemo(() => (result ? generatePersonalInsights({ contributions: result.contributions }) : []), [result]);

  if (!breakdown) {
    return (
      <div id="calculator-input" className="glass-card rounded-xl p-8 text-center">
        <h2 className="text-lg font-semibold text-white light:text-slate-900">{t("personalInflation.notYetAvailableTitle")}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-white/60 light:text-slate-500">{t("personalInflation.notYetAvailableDesc")}</p>
      </div>
    );
  }

  const topCategory = result ? [...result.contributions].sort((a, b) => b.yourWeightPct - a.yourWeightPct)[0] : null;

  return (
    <div id="calculator-input" className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        <AllocationSummaryPanel mode={mode} onModeChange={handleModeChange} totalAllocated={totalAllocated} monthlyBudget={monthlyBudget} onBudgetChange={handleBudgetChange} />
        <ScenarioPicker
          onLoadPreset={handleLoadPreset}
          savedScenarios={savedScenarios}
          onLoadSaved={handleLoadSaved}
          onDeleteSaved={deleteScenario}
          onSaveCurrent={handleSaveCurrent}
        />
      </div>

      <CategoryAllocationInput mode={mode} monthlyBudget={monthlyBudget} allocation={allocation} onAllocationChange={handleAllocationChange} />

      <button
        type="button"
        onClick={handleReset}
        className="self-start text-xs font-medium text-white/40 transition-colors hover:text-white/70 light:text-slate-400 light:hover:text-slate-700"
      >
        {t("personalInflation.resetBtn")}
      </button>

      {result && (
        <div className="glass-card rounded-xl p-4 sm:p-5">
          <h3 className="mb-2 text-sm font-semibold text-white light:text-slate-900">{t("budgetAllocation.compositionTitle")}</h3>
          <SpendingCompositionDonut
            data={result.contributions.filter((c) => c.yourWeightPct > 0.05).map((c) => ({ label: c.groupName, value: c.yourWeightPct, color: CPI_GROUP_BY_NO.get(c.groupNo)?.color ?? "#828282" }))}
          />
        </div>
      )}

      {result && topCategory && (
        <ToolShareCard
          title="My Monthly Budget Plan"
          headlineValue={`Rs ${Math.round(monthlyBudget).toLocaleString("en-US")}`}
          headlineTone="neutral"
          comparisonLine={`Largest category: ${topCategory.groupName} (${topCategory.yourWeightPct.toFixed(1)}%)`}
          bars={result.contributions
            .filter((c) => c.yourWeightPct > 0.05)
            .sort((a, b) => b.yourWeightPct - a.yourWeightPct)
            .slice(0, 2)
            .map((c) => ({ label: c.groupName, value: c.yourWeightPct, color: CPI_GROUP_BY_NO.get(c.groupNo)?.color ?? "#828282" }))}
          badgeLines={["Pakistan Bureau of Statistics", `Weights as of ${breakdown.observationDate}`]}
          shareUrl="https://www.pakeconintel.com/decision-support-lab/budget-allocation"
          shareSummary={`I planned a monthly budget of Rs ${Math.round(monthlyBudget).toLocaleString("en-US")}, with ${topCategory.groupName} as my largest category (${topCategory.yourWeightPct.toFixed(1)}%).`}
          filenameBase="my-monthly-budget-plan"
        />
      )}

      {result && <PersonalInsightsPanel insights={insights} />}

      {result && <ContributionTable contributions={result.contributions} monthlyBudget={monthlyBudget} />}

      <ExplainTheMath
        formula="Remaining = Monthly Budget − Σ (category allocations); Comparison Weight = your allocation share vs. official PBS household weight"
        variables={[
          { symbol: "Monthly Budget", description: "The total you plan to spend or allocate this month" },
          { symbol: "category allocations", description: "The amount or percentage you assign to each of PBS's 12 official spending categories" },
          { symbol: "official PBS household weight", description: "The average Pakistani household's actual spending share for that category" },
        ]}
        methodology="Your allocation across the 12 official CPI categories is compared directly against PBS's own published household weights, so you can see at a glance which categories you spend relatively more or less on than the average household."
        sourceName="Pakistan Bureau of Statistics — Monthly Inflation Report"
        sourceUrl="https://www.pbs.gov.pk/"
        lastUpdated={breakdown.observationDate}
        dataFrequency="Monthly"
        assumptions={["Assumes your entered allocation reflects a typical month, not a one-off unusual month.", "Category weights for comparison are National averages, not specific to your province or city."]}
        limitations={["This tool does not track actual spending — it only compares a planned allocation against the official average.", "It does not account for irregular or annual expenses (e.g. school fees paid once a year)."]}
      />

      <EducationalPanel
        whatDoesThisMean="This shows how you plan to divide your monthly budget across essential spending categories, and how that plan compares to the average Pakistani household's actual spending pattern."
        whyDifferent="Every household's needs differ — a larger family spends more on food and education, while a smaller household might spend proportionally more on housing. Neither is 'wrong'; the comparison is meant to inform, not judge."
        howCalculated="Your entered amount or percentage per category is totalled against your Monthly Budget, and each category's share is compared to PBS's own published household weight for that category."
        sources={["Pakistan Bureau of Statistics — Monthly Inflation Report (official household spending weights)"]}
      />

      <DecisionSupportPanel
        whatHappened="You've planned a monthly budget across 12 spending categories."
        whyItHappened="Comparing your allocation to the official household weights shows where your spending pattern is heaviest relative to the average Pakistani household."
        whatToUnderstand="This allocation is the same spending pattern the Personal Inflation Calculator uses — it will automatically reuse what you just entered."
        relatedTools={[{ title: "Purchasing Power Calculator", href: "/decision-support-lab/purchasing-power" }]}
        suggestedNext={{
          title: "See how this spending pattern affects your Personal Inflation",
          href: "/decision-support-lab/personal-inflation",
          reason: "Your budget allocation is already saved — Personal Inflation will use it automatically.",
        }}
      />
    </div>
  );
}
