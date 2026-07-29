"use client";

import { useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import AllocationSummaryPanel from "@/components/personalInflation/AllocationSummaryPanel";
import CategoryAllocationInput, { type InputMode } from "@/components/personalInflation/CategoryAllocationInput";
import ScenarioPicker from "@/components/personalInflation/ScenarioPicker";
import PersonalInflationResults from "@/components/personalInflation/PersonalInflationResults";
import ContributionTable from "@/components/personalInflation/ContributionTable";
import PersonalInflationCharts from "@/components/personalInflation/PersonalInflationCharts";
import ShareCard from "@/components/personalInflation/ShareCard";
import { CPI_GROUPS } from "@/lib/personalInflation/cpiGroups";
import { SCENARIO_PRESETS } from "@/lib/personalInflation/scenarios";
import { computePersonalInflation } from "@/lib/personalInflation/engine";
import { useSavedScenarios, saveScenario, deleteScenario, type SavedScenario } from "@/lib/personalInflation/localScenarios";
import type { CpiCategoryBreakdown } from "@/lib/data/cpiCategoryBreakdown";

interface Props {
  breakdown: CpiCategoryBreakdown | null;
}

const DEFAULT_ALLOCATION_PCT = SCENARIO_PRESETS.find((s) => s.id === "family")?.allocationPct ?? {};
const DEFAULT_MONTHLY_BUDGET = 60_000;

function percentToSpending(pct: Record<number, number>, total: number): Record<number, number> {
  const out: Record<number, number> = {};
  for (const g of CPI_GROUPS) out[g.groupNo] = Math.round(((pct[g.groupNo] || 0) / 100) * total);
  return out;
}

export default function PersonalInflationCalculator({ breakdown }: Props) {
  const { t } = useLanguage();
  const [mode, setMode] = useState<InputMode>("percent");
  const [monthlyBudget, setMonthlyBudget] = useState(DEFAULT_MONTHLY_BUDGET);
  const [percentValues, setPercentValues] = useState<Record<number, number>>(DEFAULT_ALLOCATION_PCT);
  const [spendingValues, setSpendingValues] = useState<Record<number, number>>(() => percentToSpending(DEFAULT_ALLOCATION_PCT, DEFAULT_MONTHLY_BUDGET));
  const savedScenarios = useSavedScenarios();

  const allocation = mode === "percent" ? percentValues : spendingValues;
  const totalAllocated = useMemo(() => CPI_GROUPS.reduce((s, g) => s + (allocation[g.groupNo] || 0), 0), [allocation]);

  function handleAllocationChange(groupNo: number, value: number) {
    if (mode === "percent") setPercentValues((prev) => ({ ...prev, [groupNo]: value }));
    else setSpendingValues((prev) => ({ ...prev, [groupNo]: value }));
  }

  function handleLoadPreset(allocationPct: Record<number, number>) {
    setPercentValues(allocationPct);
    setSpendingValues(percentToSpending(allocationPct, monthlyBudget || DEFAULT_MONTHLY_BUDGET));
  }

  function handleLoadSaved(scenario: SavedScenario) {
    setMode(scenario.mode);
    if (scenario.mode === "percent") {
      setPercentValues(scenario.allocation);
    } else {
      setSpendingValues(scenario.allocation);
      const total = Object.values(scenario.allocation).reduce((s, v) => s + v, 0);
      if (total > 0) setMonthlyBudget(total);
    }
  }

  function handleDeleteSaved(id: string) {
    deleteScenario(id);
  }

  function handleSaveCurrent(name: string) {
    saveScenario(name, mode, allocation);
  }

  function handleReset() {
    setPercentValues(DEFAULT_ALLOCATION_PCT);
    setMonthlyBudget(DEFAULT_MONTHLY_BUDGET);
    setSpendingValues(percentToSpending(DEFAULT_ALLOCATION_PCT, DEFAULT_MONTHLY_BUDGET));
  }

  // Memoized so typing in one input doesn't re-run the weighted-average
  // engine unless the allocation it actually depends on changed — instant
  // recalculation without redundant work as the brief requires.
  const result = useMemo(() => {
    if (!breakdown) return null;
    return computePersonalInflation(allocation, breakdown.groups);
  }, [allocation, breakdown]);

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
        <AllocationSummaryPanel mode={mode} onModeChange={setMode} totalAllocated={totalAllocated} monthlyBudget={monthlyBudget} onBudgetChange={setMonthlyBudget} />
        <ScenarioPicker
          onLoadPreset={handleLoadPreset}
          savedScenarios={savedScenarios}
          onLoadSaved={handleLoadSaved}
          onDeleteSaved={handleDeleteSaved}
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
      {result && <ContributionTable contributions={result.contributions} monthlyBudget={monthlyBudget} />}
      {result && <PersonalInflationCharts result={result} />}

      <div className="section-divider pt-4 text-xs text-white/40 light:text-slate-400">
        <p>{t("personalInflation.dataQualityNote")}</p>
        <p className="mt-1">
          {t("personalInflation.dataAsOf")} {breakdown.observationDate} · {t("personalInflation.sourceLabel")} ·{" "}
          <span className="font-medium text-emerald-400">{t("personalInflation.verifiedBadge")}</span>
        </p>
      </div>
    </div>
  );
}
