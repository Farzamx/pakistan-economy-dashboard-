"use client";

import InflationRateField from "@/components/decisionSupportLab/InflationRateField";

interface Props {
  officialInflationPct: number;
  useCustomInflation: boolean;
  onUseCustomInflationChange: (value: boolean) => void;
  customInflationPct: number;
  onCustomInflationPctChange: (value: number) => void;
  expectedReturnPct: number;
  onExpectedReturnPctChange: (value: number) => void;
  volatilityPct: number;
  onVolatilityPctChange: (value: number) => void;
  monthlyContribution: number;
  onMonthlyContributionChange: (value: number) => void;
}

/**
 * The shared "Assumptions" editor every goal planner opens with — one place
 * a visitor sees and can adjust every input the funding-gap, probability,
 * and sensitivity calculations below actually use. Reuses InflationRateField
 * verbatim for the inflation half (the auto-derived-vs-manual pattern
 * already established across the Lab); return/volatility/contribution are
 * direct numeric inputs, since (unlike inflation) there's no single official
 * series to auto-derive an expected investment return from.
 */
export default function GoalAssumptionsPanel({
  officialInflationPct,
  useCustomInflation,
  onUseCustomInflationChange,
  customInflationPct,
  onCustomInflationPctChange,
  expectedReturnPct,
  onExpectedReturnPctChange,
  volatilityPct,
  onVolatilityPctChange,
  monthlyContribution,
  onMonthlyContributionChange,
}: Props) {
  return (
    <div className="glass-card rounded-xl p-4 sm:p-5">
      <h3 className="mb-3 text-sm font-semibold text-white light:text-slate-900">Assumptions</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <InflationRateField
          autoValuePct={officialInflationPct}
          autoLabel="Official Inflation (Latest)"
          tooltipText="Calculated automatically from the latest official CPI data — your target amount inflates at this rate unless you override it below."
          useCustom={useCustomInflation}
          onUseCustomChange={onUseCustomInflationChange}
          customValuePct={customInflationPct}
          onCustomValuePctChange={onCustomInflationPctChange}
        />

        <div>
          <label htmlFor="goal-monthly-contribution" className="text-label text-white/40 light:text-slate-400">
            Monthly Contribution
          </label>
          <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5">
            <span className="text-sm text-white/40 light:text-slate-400">Rs</span>
            <input
              id="goal-monthly-contribution"
              type="number"
              inputMode="decimal"
              min={0}
              step={500}
              value={monthlyContribution === 0 ? "" : monthlyContribution}
              placeholder="0"
              onChange={(e) => {
                const parsed = parseFloat(e.target.value);
                onMonthlyContributionChange(isNaN(parsed) ? 0 : Math.max(0, parsed));
              }}
              className="text-mono-num w-full bg-transparent text-lg font-semibold tabular-nums text-white outline-none light:text-slate-900"
            />
          </div>
        </div>

        <div>
          <label htmlFor="goal-expected-return" className="text-label text-white/40 light:text-slate-400">
            Expected Annual Return
          </label>
          <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5">
            <input
              id="goal-expected-return"
              type="number"
              inputMode="decimal"
              step={0.5}
              value={expectedReturnPct === 0 ? "" : expectedReturnPct}
              placeholder="0.0"
              onChange={(e) => {
                const parsed = parseFloat(e.target.value);
                onExpectedReturnPctChange(isNaN(parsed) ? 0 : parsed);
              }}
              className="text-mono-num w-full bg-transparent text-lg font-semibold tabular-nums text-white outline-none light:text-slate-900"
            />
            <span className="text-sm text-white/40 light:text-slate-400">%</span>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-1.5">
            <label htmlFor="goal-volatility" className="text-label text-white/40 light:text-slate-400">
              Return Volatility
            </label>
            <span
              role="img"
              aria-label="How much your actual annual return might swing around the expected return — used only by the probability simulation, not the deterministic funding-gap number above."
              title="How much your actual annual return might swing around the expected return — used only by the probability simulation, not the deterministic funding-gap number above."
              className="flex h-3.5 w-3.5 shrink-0 cursor-help items-center justify-center rounded-full border border-white/25 text-[9px] font-semibold text-white/50 light:border-slate-300 light:text-slate-400"
            >
              i
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5">
            <input
              id="goal-volatility"
              type="number"
              inputMode="decimal"
              min={0}
              step={0.5}
              value={volatilityPct === 0 ? "" : volatilityPct}
              placeholder="0.0"
              onChange={(e) => {
                const parsed = parseFloat(e.target.value);
                onVolatilityPctChange(isNaN(parsed) ? 0 : Math.max(0, parsed));
              }}
              className="text-mono-num w-full bg-transparent text-lg font-semibold tabular-nums text-white outline-none light:text-slate-900"
            />
            <span className="text-sm text-white/40 light:text-slate-400">%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
