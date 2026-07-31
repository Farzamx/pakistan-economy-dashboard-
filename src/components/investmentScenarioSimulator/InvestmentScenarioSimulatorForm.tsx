"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { SCENARIOS, type ScenarioId } from "@/components/investmentScenarioSimulator/scenarios";

interface Props {
  portfolioValue: number;
  onPortfolioValueChange: (value: number) => void;
  scenarioId: ScenarioId;
  onScenarioIdChange: (value: ScenarioId) => void;
}

export default function InvestmentScenarioSimulatorForm({ portfolioValue, onPortfolioValueChange, scenarioId, onScenarioIdChange }: Props) {
  const { t } = useLanguage();

  return (
    <div className="glass-card grid grid-cols-1 gap-4 rounded-xl p-4 sm:grid-cols-2 sm:p-5">
      <div>
        <label htmlFor="iss-value" className="text-label text-white/40 light:text-slate-400">
          {t("investmentScenarioSimulator.portfolioValueLabel")}
        </label>
        <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5">
          <span className="text-sm text-white/40 light:text-slate-400">Rs</span>
          <input
            id="iss-value"
            type="number"
            inputMode="decimal"
            min={0}
            step={10000}
            value={portfolioValue === 0 ? "" : portfolioValue}
            placeholder={t("decisionSupportLab.placeholderPortfolioValue")}
            onChange={(e) => {
              const parsed = parseFloat(e.target.value);
              onPortfolioValueChange(isNaN(parsed) ? 0 : Math.max(0, parsed));
            }}
            className="text-mono-num w-full bg-transparent text-lg font-semibold tabular-nums text-white outline-none light:text-slate-900"
          />
        </div>
      </div>

      <div>
        <label htmlFor="iss-scenario" className="text-label text-white/40 light:text-slate-400">
          {t("investmentScenarioSimulator.scenarioLabel")}
        </label>
        <select
          id="iss-scenario"
          value={scenarioId}
          onChange={(e) => onScenarioIdChange(e.target.value as ScenarioId)}
          className="mt-1.5 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-2)] px-3 py-2.5 text-sm text-white outline-none focus:border-neon-blue light:text-slate-900"
        >
          {SCENARIOS.map((s) => (
            <option key={s.id} value={s.id}>
              {t(s.labelKey)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
