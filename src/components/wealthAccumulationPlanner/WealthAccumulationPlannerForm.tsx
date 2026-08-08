"use client";

import { useState } from "react";

export interface WealthAccumulationFormValues {
  goalName: string;
  targetAmountToday: number;
  targetYears: number;
  currentSavingsForGoal: number;
  monthlyContribution: number;
}

interface Props {
  defaultCurrentSavings: number;
  onCreate: (values: WealthAccumulationFormValues) => void;
}

/** Wealth Accumulation's "create the goal" form — unlike Emergency Fund, this asks for a direct target amount and horizon, since a general wealth goal (a down payment fund, a business seed fund, "Rs 10M by 45") doesn't reduce to a months-of-expenses formula the way an emergency fund does. */
export default function WealthAccumulationPlannerForm({ defaultCurrentSavings, onCreate }: Props) {
  const [goalName, setGoalName] = useState("Wealth Accumulation Goal");
  const [targetAmountToday, setTargetAmountToday] = useState(0);
  const [targetYears, setTargetYears] = useState(10);
  const [currentSavingsForGoal, setCurrentSavingsForGoal] = useState(defaultCurrentSavings);
  const [monthlyContribution, setMonthlyContribution] = useState(0);

  return (
    <div className="glass-card rounded-xl p-5 sm:p-6">
      <h2 className="text-base font-semibold text-white light:text-slate-900">Set up your Wealth Accumulation goal</h2>
      <p className="mt-1 text-sm text-white/55 light:text-slate-500">This saves to your Economic Profile as a tracked goal — you can edit it any time.</p>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="wa-name" className="text-label text-white/40 light:text-slate-400">
            Goal Name
          </label>
          <input
            id="wa-name"
            type="text"
            value={goalName}
            onChange={(e) => setGoalName(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-[var(--border-subtle)] bg-transparent px-3 py-2.5 text-sm font-medium text-white outline-none focus:border-neon-blue light:text-slate-900"
          />
        </div>

        <div>
          <label htmlFor="wa-years" className="text-label text-white/40 light:text-slate-400">
            Years to Target
          </label>
          <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5">
            <input
              id="wa-years"
              type="number"
              inputMode="numeric"
              min={1}
              max={50}
              step={1}
              value={targetYears}
              onChange={(e) => {
                const parsed = parseInt(e.target.value, 10);
                setTargetYears(isNaN(parsed) ? 1 : Math.min(50, Math.max(1, parsed)));
              }}
              className="text-mono-num w-full bg-transparent text-lg font-semibold tabular-nums text-white outline-none light:text-slate-900"
            />
            <span className="text-sm text-white/40 light:text-slate-400">years</span>
          </div>
        </div>

        <div>
          <label htmlFor="wa-target" className="text-label text-white/40 light:text-slate-400">
            Target Amount (Today&apos;s Money)
          </label>
          <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5">
            <span className="text-sm text-white/40 light:text-slate-400">Rs</span>
            <input
              id="wa-target"
              type="number"
              inputMode="decimal"
              min={0}
              step={10000}
              value={targetAmountToday === 0 ? "" : targetAmountToday}
              placeholder="0"
              onChange={(e) => {
                const parsed = parseFloat(e.target.value);
                setTargetAmountToday(isNaN(parsed) ? 0 : Math.max(0, parsed));
              }}
              className="text-mono-num w-full bg-transparent text-lg font-semibold tabular-nums text-white outline-none light:text-slate-900"
            />
          </div>
        </div>

        <div>
          <label htmlFor="wa-savings" className="text-label text-white/40 light:text-slate-400">
            Savings Already Set Aside
          </label>
          <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5">
            <span className="text-sm text-white/40 light:text-slate-400">Rs</span>
            <input
              id="wa-savings"
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
          <label htmlFor="wa-contribution" className="text-label text-white/40 light:text-slate-400">
            Planned Monthly Contribution
          </label>
          <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5">
            <span className="text-sm text-white/40 light:text-slate-400">Rs</span>
            <input
              id="wa-contribution"
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
        onClick={() => onCreate({ goalName, targetAmountToday, targetYears, currentSavingsForGoal, monthlyContribution })}
        disabled={targetAmountToday <= 0}
        className="mt-5 rounded-lg bg-neon-blue px-4 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Create Wealth Accumulation Goal
      </button>
    </div>
  );
}
