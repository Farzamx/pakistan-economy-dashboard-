"use client";

import { useMemo } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import AllocationSummaryPanel from "@/components/personalInflation/AllocationSummaryPanel";
import CategoryAllocationInput, { type InputMode } from "@/components/personalInflation/CategoryAllocationInput";
import ScenarioPicker from "@/components/personalInflation/ScenarioPicker";
import PersonalInflationResults from "@/components/personalInflation/PersonalInflationResults";
import ContributionTable from "@/components/personalInflation/ContributionTable";
import PersonalInflationCharts from "@/components/personalInflation/PersonalInflationCharts";
import ShareCard from "@/components/personalInflation/ShareCard";
import ReportDownloadButton from "@/components/decisionSupportLab/ReportDownloadButton";
import PersonalInsightsPanel from "@/components/decisionSupportLab/PersonalInsightsPanel";
import DecisionSupportPanel from "@/components/decisionSupportLab/DecisionSupportPanel";
import ExplainTheMath from "@/components/decisionSupportLab/ExplainTheMath";
import EducationalPanel from "@/components/decisionSupportLab/EducationalPanel";
import { CPI_GROUPS } from "@/lib/personalInflation/cpiGroups";
import { SCENARIO_PRESETS } from "@/lib/personalInflation/scenarios";
import { computePersonalInflation, type PersonalInflationResult } from "@/lib/personalInflation/engine";
import { useSavedScenarios, saveScenario, deleteScenario, type SavedScenario } from "@/lib/personalInflation/localScenarios";
import { useEconomicProfile, setEconomicProfile } from "@/lib/decisionSupportLab/economicProfile";
import { generatePersonalInsights } from "@/lib/decisionSupportLab/insightEngine";
import type { ReportDefinition } from "@/lib/decisionSupportLab/reportFramework";
import type { CalculationSnapshotPayload } from "@/lib/supabase/calculationSnapshots";
import type { CpiCategoryBreakdown } from "@/lib/data/cpiCategoryBreakdown";

function buildPersonalInflationReport(result: PersonalInflationResult, observationDate: string): ReportDefinition {
  const diffSign = result.differencePct > 0 ? "+" : "";
  return {
    toolName: "Personal Inflation Calculator",
    subtitle: "Pakistan Economic Intelligence Center — Decision Support Lab",
    generatedAt: new Date().toISOString().slice(0, 10),
    sourceNote: "Source: Pakistan Bureau of Statistics — Monthly Inflation Report",
    sections: [
      {
        heading: "Summary",
        paragraphs: [
          `Your personal inflation rate is ${result.personalCpiPct.toFixed(1)}%, compared with an official CPI of ${result.officialCpiPct.toFixed(1)}% (${diffSign}${result.differencePct.toFixed(1)} percentage points), based on the PBS release dated ${observationDate}.`,
        ],
        facts: [
          { label: "Official CPI", value: `${result.officialCpiPct.toFixed(1)}%` },
          { label: "Your Personal Inflation", value: `${result.personalCpiPct.toFixed(1)}%` },
          { label: "Difference", value: `${diffSign}${result.differencePct.toFixed(1)} pp` },
        ],
      },
      {
        heading: "Category Breakdown",
        facts: result.contributions.map((c) => ({
          label: c.groupName,
          value: `${c.yourWeightPct.toFixed(1)}% weight · ${c.categoryInflationPct.toFixed(1)}% inflation · ${c.yourContributionPct.toFixed(2)}pp contribution`,
        })),
      },
    ],
  };
}

interface Props {
  breakdown: CpiCategoryBreakdown | null;
}

const DEFAULT_ALLOCATION_PCT = SCENARIO_PRESETS.find((s) => s.id === "family")?.allocationPct ?? {};
const DEFAULT_MONTHLY_BUDGET = 60_000;

export default function PersonalInflationCalculator({ breakdown }: Props) {
  const { t } = useLanguage();
  const savedScenarios = useSavedScenarios();
  const { profile } = useEconomicProfile();

  // Reads/writes the Lab's shared Economic Profile instead of its own
  // local state — this is the "no duplicate inputs" fix: whatever you
  // entered in the Budget Allocation Calculator shows up here
  // automatically, and vice versa.
  const shared = profile.householdAllocation;
  const hasStoredAllocation = Object.keys(shared.allocation).length > 0;
  const mode: InputMode = hasStoredAllocation ? shared.mode : "percent";
  const monthlyBudget = shared.monthlyBudget > 0 ? shared.monthlyBudget : DEFAULT_MONTHLY_BUDGET;
  const allocation = hasStoredAllocation ? shared.allocation : DEFAULT_ALLOCATION_PCT;

  const hasIdentitySpending = profile.monthlySpending > 0 && profile.monthlySpending !== monthlyBudget;

  const totalAllocated = useMemo(() => CPI_GROUPS.reduce((s, g) => s + (allocation[g.groupNo] || 0), 0), [allocation]);

  function handleAllocationChange(groupNo: number, value: number) {
    setEconomicProfile({ householdAllocation: { mode, monthlyBudget, allocation: { ...allocation, [groupNo]: value } } });
  }

  function handleModeChange(nextMode: InputMode) {
    setEconomicProfile({ householdAllocation: { mode: nextMode, monthlyBudget, allocation } });
  }

  function handleBudgetChange(nextBudget: number) {
    setEconomicProfile({ householdAllocation: { mode, monthlyBudget: nextBudget, allocation } });
  }

  function handleLoadPreset(allocationPct: Record<number, number>) {
    setEconomicProfile({ householdAllocation: { mode: "percent", monthlyBudget: monthlyBudget || DEFAULT_MONTHLY_BUDGET, allocation: allocationPct } });
  }

  function handleLoadSaved(scenario: SavedScenario) {
    const total = scenario.mode === "spending" ? Object.values(scenario.allocation).reduce((s, v) => s + v, 0) : 0;
    setEconomicProfile({ householdAllocation: { mode: scenario.mode, monthlyBudget: total > 0 ? total : monthlyBudget, allocation: scenario.allocation } });
  }

  function handleSaveCurrent(name: string) {
    saveScenario(name, mode, allocation);
  }

  function handleReset() {
    setEconomicProfile({ householdAllocation: { mode: "percent", monthlyBudget: DEFAULT_MONTHLY_BUDGET, allocation: DEFAULT_ALLOCATION_PCT } });
  }

  // Memoized so typing in one input doesn't re-run the weighted-average
  // engine unless the allocation it actually depends on changed — instant
  // recalculation without redundant work as the brief requires.
  const result = useMemo(() => {
    if (!breakdown) return null;
    return computePersonalInflation(allocation, breakdown.groups);
  }, [allocation, breakdown]);

  const insights = useMemo(
    () => (result ? generatePersonalInsights({ contributions: result.contributions, personalCpiPct: result.personalCpiPct, officialCpiPct: result.officialCpiPct }) : []),
    [result],
  );

  if (!breakdown) {
    return (
      <div id="calculator-input" className="glass-card rounded-xl p-8 text-center">
        <h2 className="text-lg font-semibold text-white light:text-slate-900">{t("personalInflation.notYetAvailableTitle")}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-white/60 light:text-slate-500">{t("personalInflation.notYetAvailableDesc")}</p>
      </div>
    );
  }

  return (
    <div id="calculator-input" className="flex flex-col gap-6">
      {/* Top: budget + mode + live status, then Save Profile */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        <AllocationSummaryPanel
          mode={mode}
          onModeChange={handleModeChange}
          totalAllocated={totalAllocated}
          monthlyBudget={monthlyBudget}
          onBudgetChange={handleBudgetChange}
          identitySuggestion={hasIdentitySpending ? { amount: profile.monthlySpending, onApply: () => handleBudgetChange(profile.monthlySpending) } : undefined}
        />
        <ScenarioPicker
          onLoadPreset={handleLoadPreset}
          savedScenarios={savedScenarios}
          onLoadSaved={handleLoadSaved}
          onDeleteSaved={deleteScenario}
          onSaveCurrent={handleSaveCurrent}
        />
      </div>

      {/* Middle: category cards */}
      <CategoryAllocationInput mode={mode} monthlyBudget={monthlyBudget} allocation={allocation} onAllocationChange={handleAllocationChange} />

      <button
        type="button"
        onClick={handleReset}
        className="self-start text-xs font-medium text-white/40 transition-colors hover:text-white/70 light:text-slate-400 light:hover:text-slate-700"
      >
        {t("personalInflation.resetBtn")}
      </button>

      {result && <PersonalInflationResults result={result} />}
      {result && <ShareCard result={result} observationDate={breakdown.observationDate} />}
      {result && (
        <ReportDownloadButton
          buildDefinition={() => buildPersonalInflationReport(result, breakdown.observationDate)}
          filename="personal-inflation-report.pdf"
          label={t("decisionSupportLab.downloadReport")}
          generatingLabel={t("decisionSupportLab.generatingReport")}
        />
      )}

      <PersonalInsightsPanel insights={insights} />

      {result && <ContributionTable contributions={result.contributions} monthlyBudget={monthlyBudget} />}
      {result && <PersonalInflationCharts result={result} />}

      <div className="section-divider pt-4 text-xs text-white/40 light:text-slate-400">
        <p>{t("personalInflation.dataQualityNote")}</p>
        <p className="mt-1">
          {t("personalInflation.dataAsOf")} {breakdown.observationDate} · {t("personalInflation.sourceLabel")} ·{" "}
          <span className="font-medium text-emerald-400">{t("personalInflation.verifiedBadge")}</span>
        </p>
      </div>

      <ExplainTheMath
        formula="Personal Rate = Σ (your weight_i × official inflation_i), for each of PBS's 12 groups"
        variables={[
          { symbol: "your weight_i", description: "The share of your monthly spending allocated to group i" },
          { symbol: "official inflation_i", description: "PBS's published year-on-year inflation rate for group i" },
          { symbol: "Σ", description: "Sum across all 12 official CPI groups" },
        ]}
        methodology="This is the same weighted-average method the Pakistan Bureau of Statistics uses to compute the national CPI — the only difference is whose spending weights are used: the average household's (official CPI) or yours (personal rate)."
        sourceName="Pakistan Bureau of Statistics — Monthly Inflation Report"
        sourceUrl="https://www.pbs.gov.pk/"
        lastUpdated={breakdown.observationDate}
        dataFrequency="Monthly"
        assumptions={["Assumes your reported spending share stays roughly constant across the year.", "Uses National (not provincial or city-level) category inflation rates."]}
        limitations={["Category inflation rates are National averages — actual prices you personally pay may differ by city or retailer.", "Does not account for one-off or irregular expenses (e.g. annual insurance premiums)."]}
      />

      <EducationalPanel
        whatDoesThisMean="Your personal inflation rate is the year-on-year price increase your own household actually experiences, based on how you split your spending across food, housing, transport, and PBS's other official categories — as opposed to the official CPI, which reflects the spending pattern of an average Pakistani household."
        whyDifferent="Every household spends differently. If you spend more than average on a category where prices rose sharply (like Transport in a fuel-price spike), your personal rate runs higher than the headline figure — and lower if you spend less on it."
        howCalculated="For each of PBS's 12 official groups, your reported spending share is multiplied by that group's official year-on-year inflation rate, and the results are summed — see Explain the Math above for the full formula."
        sources={["Pakistan Bureau of Statistics — Monthly Inflation Report (category-level group weights and YoY inflation)", "Same PBS release already used for PEIC's headline CPI/Core inflation figures"]}
      />

      <DecisionSupportPanel
        whatHappened={result ? `You calculated a personal inflation rate of ${result.personalCpiPct.toFixed(1)}%, ${result.differencePct >= 0 ? "above" : "below"} the official CPI of ${result.officialCpiPct.toFixed(1)}%.` : "Enter your spending allocation to see your personal inflation rate."}
        whyItHappened="Your spending mix — not just the national average — determines how much inflation you personally feel, since some categories rise faster than others."
        whatToUnderstand="This same spending allocation carries over automatically to the Purchasing Power and Budget Allocation calculators — you won't need to re-enter it."
        relatedTools={[{ title: "Budget Allocation Calculator", href: "/decision-support-lab/budget-allocation" }]}
        suggestedNext={{
          title: "See how this affects your Purchasing Power",
          href: "/decision-support-lab/purchasing-power",
          reason: "Now that you know your personal inflation rate, see what it means for the real value of your money over time.",
        }}
        snapshotPayload={
          result
            ? (): CalculationSnapshotPayload => ({
                toolId: "personal-inflation",
                inputs: { allocation, monthlyBudget, mode },
                assumptions: {},
                outputs: { personalCpiPct: result.personalCpiPct, officialCpiPct: result.officialCpiPct, differencePct: result.differencePct },
              })
            : undefined
        }
      />
    </div>
  );
}
