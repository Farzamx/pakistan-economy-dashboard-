"use client";

import { BUDGET_FIELD_META } from "@/lib/budget/budgetRegistry";
import type { BudgetTrendField, TrendValueMode } from "@/lib/budget/budgetData";

interface BudgetControlsProps {
  selectedFields: BudgetTrendField[];
  onFieldsChange: (fields: BudgetTrendField[]) => void;
  mode: TrendValueMode;
  onModeChange: (mode: TrendValueMode) => void;
}

const ALL_FIELDS: BudgetTrendField[] = [
  "totalOutlay", "fbrTaxRevenue", "nonTaxRevenue", "provincialTransfer",
  "grantsAndTransfersOther", "federalPsdp", "defence", "debtServicing",
  "pension", "subsidies", "federalEducation", "federalHealth", "fiscalDeficitRs",
];

export default function BudgetControls({
  selectedFields,
  onFieldsChange,
  mode,
  onModeChange,
}: BudgetControlsProps) {
  function toggleField(field: BudgetTrendField) {
    if (selectedFields.includes(field)) {
      if (selectedFields.length === 1) return; // keep at least one selected
      onFieldsChange(selectedFields.filter((f) => f !== field));
    } else {
      onFieldsChange([...selectedFields, field]);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1">
          {(["nominal", "pctGdp"] as TrendValueMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onModeChange(m)}
              aria-pressed={mode === m}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                mode === m
                  ? "bg-neon-blue/15 text-neon-blue"
                  : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
              }`}
            >
              {m === "nominal" ? "Nominal Rs" : "% of GDP"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {ALL_FIELDS.map((field) => {
          const meta = BUDGET_FIELD_META[field];
          const active = selectedFields.includes(field);
          return (
            <button
              key={field}
              type="button"
              onClick={() => toggleField(field)}
              aria-pressed={active}
              className={`rounded-full border px-3 py-1 text-[11px] font-medium transition-colors ${
                active
                  ? "border-transparent text-white"
                  : "border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
              style={active ? { backgroundColor: meta.color } : undefined}
            >
              {meta.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
