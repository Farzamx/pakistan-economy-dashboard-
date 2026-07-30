"use client";

import { useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import ExplainTheMath from "@/components/decisionSupportLab/ExplainTheMath";

export interface FormulaExampleInput {
  label: string;
  defaultValue: number;
  step?: number;
  suffix?: string;
}

export interface FormulaDefinition {
  id: string;
  title: string;
  formula: string;
  variables: { symbol: string; description: string }[];
  interpretation: string;
  assumptions: string[];
  limitations: string[];
  exampleInputs: FormulaExampleInput[];
  /** Reads the SAME live inputs a visitor edits and returns a formatted result string — always calls the real timeValueEngine function, never a re-derived approximation. */
  computeExample: (values: number[]) => string;
}

interface Props {
  definition: FormulaDefinition;
}

/**
 * One formula's full reference card — the ExplainTheMath panel (formula,
 * variables, economic interpretation, assumptions, limitations) plus a
 * small live "Try It" mini-calculator underneath, driven by the exact
 * same timeValueEngine function every full tool uses. This single
 * generic component, fed by a data array, is what makes the Formula
 * Explorer "institutional reference page" out of one component instead
 * of ten bespoke ones.
 */
export default function FormulaCard({ definition }: Props) {
  const { t } = useLanguage();
  const [values, setValues] = useState<number[]>(definition.exampleInputs.map((i) => i.defaultValue));

  const result = useMemo(() => definition.computeExample(values), [definition, values]);

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-headline text-white light:text-slate-900">{definition.title}</h2>

      <ExplainTheMath
        formula={definition.formula}
        variables={definition.variables}
        methodology={definition.interpretation}
        sourceName="PEIC Time Value of Money Engine"
        lastUpdated=""
        assumptions={definition.assumptions}
        limitations={definition.limitations}
      />

      <div className="glass-card rounded-xl p-4 sm:p-5">
        <h3 className="mb-3 text-sm font-semibold text-neon-blue">{t("formulaExplorer.exampleLabel")}</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {definition.exampleInputs.map((input, i) => (
            <div key={input.label}>
              <label htmlFor={`${definition.id}-input-${i}`} className="text-label text-white/40 light:text-slate-400">
                {input.label}
              </label>
              <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2">
                <input
                  id={`${definition.id}-input-${i}`}
                  type="number"
                  inputMode="decimal"
                  step={input.step ?? 1}
                  value={values[i]}
                  onChange={(e) => {
                    const parsed = parseFloat(e.target.value);
                    setValues((prev) => prev.map((v, idx) => (idx === i ? (isNaN(parsed) ? 0 : parsed) : v)));
                  }}
                  className="text-mono-num w-full bg-transparent text-sm font-semibold tabular-nums text-white outline-none light:text-slate-900"
                />
                {input.suffix && <span className="text-xs text-white/40 light:text-slate-400">{input.suffix}</span>}
              </div>
            </div>
          ))}
        </div>
        <p className="text-mono-num mt-4 rounded-lg bg-[var(--surface-2)] px-4 py-3 text-sm font-semibold text-emerald-400">{result}</p>
      </div>
    </section>
  );
}
