"use client";

import { CategoryIcon } from "@/components/personalInflation/categoryIcons";
import type { InputMode } from "@/components/personalInflation/CategoryAllocationInput";

interface Props {
  groupNo: number;
  name: string;
  color: string;
  mode: InputMode;
  value: number;
  monthlyBudget: number;
  onChange: (value: number) => void;
}

const PERCENT_STEP = 1;
const SPENDING_STEP = 500;

export default function CategoryCard({ groupNo, name, color, mode, value, monthlyBudget, onChange }: Props) {
  const isPercent = mode === "percent";
  const step = isPercent ? PERCENT_STEP : SPENDING_STEP;
  const sliderMax = isPercent ? 100 : Math.max(monthlyBudget, value * 1.2, 5000);
  const derived = isPercent ? (value / 100) * monthlyBudget : monthlyBudget > 0 ? (value / monthlyBudget) * 100 : 0;

  function clamp(next: number): number {
    const floored = Math.max(0, next);
    return isPercent ? Math.min(100, floored) : floored;
  }

  function handleStep(delta: number) {
    onChange(clamp(Math.round((value + delta) * 10) / 10));
  }

  return (
    <div className="category-card" style={{ "--card-accent": color } as React.CSSProperties}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: `${color}22`, color }}
            aria-hidden="true"
          >
            <CategoryIcon groupNo={groupNo} className="h-4 w-4" />
          </span>
          <span className="truncate text-sm font-medium text-white/85 light:text-slate-800">{name}</span>
        </div>
        <span className="text-mono-num shrink-0 rounded-full bg-[var(--surface-3)] px-2 py-0.5 text-xs font-semibold tabular-nums text-white/70 light:text-slate-600">
          {isPercent ? `${value.toFixed(1)}%` : `Rs ${Math.round(value).toLocaleString("en-US")}`}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => handleStep(-step)}
          aria-label={`Decrease ${name}`}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[var(--border-subtle)] text-base font-medium text-white/70 transition-colors hover:border-neon-blue hover:text-white active:scale-95 light:text-slate-600"
        >
          −
        </button>
        <div className="flex h-11 min-w-0 flex-1 items-center gap-1 rounded-lg border border-[var(--border-subtle)] px-2">
          {!isPercent && <span className="shrink-0 text-xs text-white/40 light:text-slate-400">Rs</span>}
          <input
            type="number"
            inputMode="decimal"
            min={0}
            max={isPercent ? 100 : undefined}
            step={isPercent ? 0.5 : 100}
            value={value === 0 ? "" : value}
            placeholder="0"
            onChange={(e) => {
              const parsed = parseFloat(e.target.value);
              onChange(clamp(isNaN(parsed) ? 0 : parsed));
            }}
            aria-label={`${name} — ${isPercent ? "percentage" : "amount in PKR"}`}
            className="text-mono-num min-w-0 flex-1 bg-transparent py-2 text-center text-sm tabular-nums text-white outline-none light:text-slate-900"
          />
          {isPercent && <span className="shrink-0 text-xs text-white/40 light:text-slate-400">%</span>}
        </div>
        <button
          type="button"
          onClick={() => handleStep(step)}
          aria-label={`Increase ${name}`}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[var(--border-subtle)] text-base font-medium text-white/70 transition-colors hover:border-neon-blue hover:text-white active:scale-95 light:text-slate-600"
        >
          +
        </button>
      </div>

      <input
        type="range"
        min={0}
        max={sliderMax}
        step={isPercent ? 0.5 : 100}
        value={value}
        onChange={(e) => onChange(clamp(parseFloat(e.target.value)))}
        aria-label={`${name} — adjust with slider`}
        className="range-slider mt-3"
        style={{ "--slider-accent": color } as React.CSSProperties}
      />

      <p className="mt-1.5 text-xs text-white/40 light:text-slate-400">
        {isPercent ? `≈ Rs ${Math.round(derived).toLocaleString("en-US")}` : `≈ ${derived.toFixed(1)}% of budget`}
      </p>
    </div>
  );
}
