"use client";

// The Current-vs-hypothetical pattern (Phase 5.5, brief Part 8). Deliberately
// NOT named "Scenario" — Personal Inflation already has a distinct "Scenario"
// concept (named saved allocation presets, ScenarioPicker.tsx) and Investment
// Scenario Simulator has its own (crash/inflation-spike presets) — a third,
// differently-scoped concept sharing that name would be a real confusion
// risk. This is tool-local, single-value, fully ephemeral: switching back to
// "Current" discards the hypothetical value without persisting anything.
import { useId } from "react";

interface Props {
  label: string;
  currentValue: number;
  whatIfValue: number;
  onWhatIfValueChange: (value: number) => void;
  isWhatIf: boolean;
  onToggle: (isWhatIf: boolean) => void;
  formatValue?: (value: number) => string;
  suffix?: string;
  step?: number;
}

export default function WhatIfToggle({ label, currentValue, whatIfValue, onWhatIfValueChange, isWhatIf, onToggle, formatValue, suffix, step = 1 }: Props) {
  const inputId = useId();
  const format = formatValue ?? ((v: number) => v.toLocaleString("en-US"));
  const delta = whatIfValue - currentValue;
  const deltaPct = currentValue !== 0 ? (delta / Math.abs(currentValue)) * 100 : 0;

  return (
    <div className="glass-card rounded-xl p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-label text-white/40 light:text-slate-400">{label}</span>
        <div role="group" aria-label={`${label} mode`} className="flex rounded-lg border border-[var(--border-subtle)] p-0.5 text-xs">
          <button
            type="button"
            aria-pressed={!isWhatIf}
            onClick={() => onToggle(false)}
            className={`rounded-md px-2.5 py-1 font-medium transition-colors ${!isWhatIf ? "bg-neon-blue/20 text-neon-blue" : "text-white/50 hover:text-white/80 light:text-slate-500"}`}
          >
            Current
          </button>
          <button
            type="button"
            aria-pressed={isWhatIf}
            onClick={() => onToggle(true)}
            className={`rounded-md px-2.5 py-1 font-medium transition-colors ${isWhatIf ? "bg-neon-blue/20 text-neon-blue" : "text-white/50 hover:text-white/80 light:text-slate-500"}`}
          >
            What-If
          </button>
        </div>
      </div>

      {!isWhatIf ? (
        <p className="text-mono-num mt-2 text-lg font-semibold tabular-nums text-white light:text-slate-900">
          {format(currentValue)}
          {suffix}
        </p>
      ) : (
        <div className="mt-2 flex flex-col gap-2">
          <label htmlFor={inputId} className="sr-only">
            Hypothetical {label}
          </label>
          <div className="flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5">
            <input
              id={inputId}
              type="number"
              inputMode="decimal"
              step={step}
              value={whatIfValue === 0 ? "" : whatIfValue}
              onChange={(e) => {
                const parsed = parseFloat(e.target.value);
                onWhatIfValueChange(isNaN(parsed) ? 0 : parsed);
              }}
              className="text-mono-num w-full bg-transparent text-lg font-semibold tabular-nums text-white outline-none light:text-slate-900"
            />
            {suffix && <span className="text-sm text-white/40 light:text-slate-400">{suffix}</span>}
          </div>
          <p aria-live="polite" className="text-xs text-white/50 light:text-slate-500">
            {delta === 0 ? "Same as current" : `${delta > 0 ? "+" : ""}${format(delta)}${suffix ?? ""} (${deltaPct >= 0 ? "+" : ""}${deltaPct.toFixed(1)}%) vs. current`}
          </p>
        </div>
      )}
    </div>
  );
}
