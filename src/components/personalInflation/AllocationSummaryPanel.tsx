"use client";

import { useLanguage } from "@/components/LanguageProvider";
import type { InputMode } from "@/components/personalInflation/CategoryAllocationInput";

interface Props {
  mode: InputMode;
  onModeChange: (mode: InputMode) => void;
  totalAllocated: number;
  monthlyBudget: number;
  onBudgetChange: (value: number) => void;
  /** Shown as a small "use your saved profile" suggestion when the Decision Support Lab's shared Economic Identity has a different Monthly Spending figure on file — applying it is an explicit click, never a silent overwrite. */
  identitySuggestion?: { amount: number; onApply: () => void };
}

const STATUS_TOLERANCE_PCT = 0.5;

type Status = "on-track" | "under" | "over";

function getStatus(remainingPct: number): Status {
  if (Math.abs(remainingPct) <= STATUS_TOLERANCE_PCT) return "on-track";
  return remainingPct > 0 ? "under" : "over";
}

const STATUS_STYLE: Record<Status, string> = {
  "on-track": "bg-emerald-500/10 text-emerald-400 border-emerald-400/30",
  under: "bg-amber-500/10 text-amber-400 border-amber-400/30",
  over: "bg-rose-500/10 text-rose-400 border-rose-400/30",
};

export default function AllocationSummaryPanel({ mode, onModeChange, totalAllocated, monthlyBudget, onBudgetChange, identitySuggestion }: Props) {
  const { t } = useLanguage();
  const isPercent = mode === "percent";

  const remainingPct = isPercent ? 100 - totalAllocated : monthlyBudget > 0 ? ((monthlyBudget - totalAllocated) / monthlyBudget) * 100 : 0;
  const remainingAmount = isPercent ? (remainingPct / 100) * monthlyBudget : monthlyBudget - totalAllocated;
  const status = getStatus(remainingPct);

  const statusLabel =
    status === "on-track" ? t("personalInflation.statusOnTrack") : status === "under" ? t("personalInflation.statusUnder") : t("personalInflation.statusOver");

  return (
    <div className="glass-card flex flex-col gap-4 rounded-xl p-4 sm:p-5">
      <div>
        <label htmlFor="monthly-budget" className="text-label text-white/40 light:text-slate-400">
          {t("personalInflation.monthlyBudgetLabel")}
        </label>
        <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5">
          <span className="text-sm text-white/40 light:text-slate-400">Rs</span>
          <input
            id="monthly-budget"
            type="number"
            inputMode="decimal"
            min={0}
            step={1000}
            value={monthlyBudget === 0 ? "" : monthlyBudget}
            placeholder="0"
            onChange={(e) => {
              const parsed = parseFloat(e.target.value);
              onBudgetChange(isNaN(parsed) ? 0 : Math.max(0, parsed));
            }}
            className="text-mono-num w-full bg-transparent text-lg font-semibold tabular-nums text-white outline-none light:text-slate-900"
          />
        </div>
        {identitySuggestion && (
          <button
            type="button"
            onClick={identitySuggestion.onApply}
            className="mt-1.5 text-xs font-medium text-neon-blue hover:underline"
          >
            {t("decisionSupportLab.useIdentitySuggestion")} (Rs {identitySuggestion.amount.toLocaleString("en-US")})
          </button>
        )}
      </div>

      <div role="tablist" aria-label={t("personalInflation.inputModePercent")} className="inline-flex w-fit rounded-lg border border-[var(--border-subtle)] p-0.5">
        {(["percent", "spending"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => onModeChange(m)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              mode === m ? "bg-neon-blue text-white" : "text-white/50 hover:text-white/80 light:text-slate-500 light:hover:text-slate-800"
            }`}
          >
            {m === "percent" ? t("personalInflation.inputModePercent") : t("personalInflation.inputModeSpending")}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="rounded-lg bg-[var(--surface-2)] px-3 py-2.5">
          <p className="text-[10px] font-medium uppercase tracking-wider text-white/40 light:text-slate-400">{t("personalInflation.totalAllocated")}</p>
          <p className="text-mono-num mt-0.5 text-sm font-semibold tabular-nums text-white light:text-slate-900">
            {isPercent ? `${totalAllocated.toFixed(1)}%` : `Rs ${Math.round(totalAllocated).toLocaleString("en-US")}`}
          </p>
        </div>
        <div className="rounded-lg bg-[var(--surface-2)] px-3 py-2.5">
          <p className="text-[10px] font-medium uppercase tracking-wider text-white/40 light:text-slate-400">{t("personalInflation.remaining")}</p>
          <p className="text-mono-num mt-0.5 text-sm font-semibold tabular-nums text-white light:text-slate-900">
            {isPercent ? `${remainingPct.toFixed(1)}%` : `Rs ${Math.round(remainingAmount).toLocaleString("en-US")}`}
          </p>
        </div>
        <div className={`flex items-center justify-center rounded-lg border px-2 py-2.5 text-center text-xs font-semibold ${STATUS_STYLE[status]}`} role="status">
          {statusLabel}
        </div>
      </div>
    </div>
  );
}
