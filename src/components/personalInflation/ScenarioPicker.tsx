"use client";

import { useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { SCENARIO_PRESETS } from "@/lib/personalInflation/scenarios";
import type { SavedScenario } from "@/lib/personalInflation/localScenarios";

const PRESET_LABEL_KEYS: Record<string, { label: string; desc: string }> = {
  student: { label: "personalInflation.scenarioStudentLabel", desc: "personalInflation.scenarioStudentDesc" },
  family: { label: "personalInflation.scenarioFamilyLabel", desc: "personalInflation.scenarioFamilyDesc" },
  retired: { label: "personalInflation.scenarioRetiredLabel", desc: "personalInflation.scenarioRetiredDesc" },
  "small-business": { label: "personalInflation.scenarioSmallBusinessLabel", desc: "personalInflation.scenarioSmallBusinessDesc" },
};

interface ScenarioPickerProps {
  onLoadPreset: (allocationPct: Record<number, number>) => void;
  savedScenarios: SavedScenario[];
  onLoadSaved: (scenario: SavedScenario) => void;
  onDeleteSaved: (id: string) => void;
  onSaveCurrent: (name: string) => void;
}

export default function ScenarioPicker({ onLoadPreset, savedScenarios, onLoadSaved, onDeleteSaved, onSaveCurrent }: ScenarioPickerProps) {
  const { t } = useLanguage();
  const [newName, setNewName] = useState("");
  const [selectedId, setSelectedId] = useState("");

  const selected = savedScenarios.find((s) => s.id === selectedId);
  // Derived during render rather than reset via an effect: once a selected
  // scenario is deleted, `selected` is simply undefined and the <select>
  // below falls back to the placeholder — no separate "clear stale
  // selection" effect/state needed.
  const selectValue = selected ? selectedId : "";

  return (
    <div className="glass-card flex flex-col gap-5 rounded-xl p-4 sm:p-5">
      <div>
        <h3 className="text-sm font-semibold text-white light:text-slate-900">{t("personalInflation.scenariosTitle")}</h3>
        <p className="mt-0.5 text-xs text-white/50 light:text-slate-500">{t("personalInflation.scenariosDesc")}</p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {SCENARIO_PRESETS.map((s) => {
            const meta = PRESET_LABEL_KEYS[s.id];
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onLoadPreset(s.allocationPct)}
                className="panel-flat flex flex-col items-start gap-0.5 rounded-lg p-3 text-left transition-all hover:-translate-y-0.5 hover:border-neon-blue"
              >
                <span className="text-sm font-medium text-white light:text-slate-900">{t(meta.label)}</span>
                <span className="text-xs text-white/50 light:text-slate-500">{t(meta.desc)}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="section-divider flex flex-col gap-3 pt-4">
        <h3 className="text-sm font-semibold text-white light:text-slate-900">{t("personalInflation.saveScenario")}</h3>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!newName.trim()) return;
            onSaveCurrent(newName);
            setNewName("");
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t("personalInflation.scenarioNamePlaceholder")}
            className="min-w-0 flex-1 rounded-lg border border-[var(--border-subtle)] bg-transparent px-3 py-2.5 text-sm text-white outline-none focus:border-neon-blue light:text-slate-900"
          />
          <button
            type="submit"
            disabled={!newName.trim()}
            className="shrink-0 rounded-lg bg-neon-blue px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {t("personalInflation.saveCurrentAsScenario")}
          </button>
        </form>

        {savedScenarios.length === 0 ? (
          <p className="text-xs text-white/40 light:text-slate-400">{t("personalInflation.noSavedScenarios")}</p>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label htmlFor="saved-profile-select" className="sr-only">
              {t("personalInflation.existingProfilesLabel")}
            </label>
            <select
              id="saved-profile-select"
              value={selectValue}
              onChange={(e) => setSelectedId(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-2)] px-3 py-2.5 text-sm text-white outline-none focus:border-neon-blue light:text-slate-900"
            >
              <option value="">{t("personalInflation.selectProfilePlaceholder")}</option>
              {savedScenarios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                disabled={!selected}
                onClick={() => selected && onLoadSaved(selected)}
                className="rounded-lg bg-neon-blue px-3 py-2.5 text-xs font-medium text-white disabled:opacity-40"
              >
                {t("personalInflation.loadScenario")}
              </button>
              <button
                type="button"
                disabled={!selected}
                onClick={() => selected && onDeleteSaved(selected.id)}
                className="rounded-lg border border-[var(--border-subtle)] px-3 py-2.5 text-xs font-medium text-white/60 hover:border-rose-400/50 hover:text-rose-400 disabled:opacity-40 light:text-slate-500"
              >
                {t("personalInflation.deleteScenario")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
