"use client";

import { useState } from "react";

export interface EmergencyFundFormValues {
  monthsOfCoverage: number;
  currentSavingsForGoal: number;
  monthlyContribution: number;
}

interface Props {
  defaultCurrentSavings: number;
  defaultMonthlyExpenses: number;
  onCreate: (values: EmergencyFundFormValues) => void;
}

const COVERAGE_OPTIONS = [3, 6, 9, 12];

/** Emergency Fund's own "create the goal" form — deliberately asks for months of coverage, not a raw target amount, since that's how people actually think about an emergency fund and it lets goalEngine derive the real target from the profile's own spending figure rather than a second manually-typed number. */
export default function EmergencyFundPlannerForm({ defaultCurrentSavings, defaultMonthlyExpenses, onCreate }: Props) {
  const [monthsOfCoverage, setMonthsOfCoverage] = useState(6);
  const [currentSavingsForGoal, setCurrentSavingsForGoal] = useState(defaultCurrentSavings);
  const [monthlyContribution, setMonthlyContribution] = useState(0);

  const targetPreview = monthsOfCoverage * defaultMonthlyExpenses;

  return (
    <div className="glass-card rounded-xl p-5 sm:p-6">
      <h2 className="text-base font-semibold text-white light:text-slate-900">Set up your Emergency Fund goal</h2>
      <p className="mt-1 text-sm text-white/55 light:text-slate-500">This saves to your Economic Profile as a tracked goal — you can edit it any time.</p>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="ef-months" className="text-label text-white/40 light:text-slate-400">
            Months of Coverage
          </label>
          <div className="mt-1.5 flex gap-1.5">
            {COVERAGE_OPTIONS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMonthsOfCoverage(m)}
                className={`flex-1 rounded-lg border px-3 py-2.5 text-sm font-semibold tabular-nums transition-colors ${
                  monthsOfCoverage === m ? "border-neon-blue bg-neon-blue/10 text-neon-blue" : "border-[var(--border-subtle)] text-white/60 hover:border-white/30 light:text-slate-500"
                }`}
              >
                {m}mo
              </button>
            ))}
          </div>
          {defaultMonthlyExpenses > 0 && (
            <p className="mt-1.5 text-xs text-white/40 light:text-slate-400">
              ≈ Rs {Math.round(targetPreview).toLocaleString("en-US")} target, based on your recorded monthly spending.
            </p>
          )}
        </div>

        <div>
          <label htmlFor="ef-savings" className="text-label text-white/40 light:text-slate-400">
            Savings Already Set Aside
          </label>
          <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5">
            <span className="text-sm text-white/40 light:text-slate-400">Rs</span>
            <input
              id="ef-savings"
              type="number"
              inputMode="decimal"
              min={0}
              step={1000}
              value={currentSavingsForGoal === 0 ? "" : currentSavingsForGoal}
              placeholder="0"
              onChange={(e) => {
                const parsed = parseFloat(e.target.value);
                setCurrentSavingsForGoal(isNaN(parsed) ? 0 : Math.max(0, parsed));
              }}
              className="text-mono-num w-full bg-transparent text-lg font-semibold tabular-nums text-white outline-none light:text-slate-900"
            />
          </div>
        </div>

        <div>
          <label htmlFor="ef-contribution" className="text-label text-white/40 light:text-slate-400">
            Planned Monthly Contribution
          </label>
          <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5">
            <span className="text-sm text-white/40 light:text-slate-400">Rs</span>
            <input
              id="ef-contribution"
              type="number"
              inputMode="decimal"
              min={0}
              step={500}
              value={monthlyContribution === 0 ? "" : monthlyContribution}
              placeholder="0"
              onChange={(e) => {
                const parsed = parseFloat(e.target.value);
                setMonthlyContribution(isNaN(parsed) ? 0 : Math.max(0, parsed));
              }}
              className="text-mono-num w-full bg-transparent text-lg font-semibold tabular-nums text-white outline-none light:text-slate-900"
            />
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onCreate({ monthsOfCoverage, currentSavingsForGoal, monthlyContribution })}
        className="mt-5 rounded-lg bg-neon-blue px-4 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
      >
        Create Emergency Fund Goal
      </button>
    </div>
  );
}
