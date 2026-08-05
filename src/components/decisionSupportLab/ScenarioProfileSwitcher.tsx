"use client";

// Dashboard-header control for Scenario Profiles (scenarioProfiles.ts) —
// deliberately a separate component from WhatIfToggle, which is tool-local
// and single-field. This switches a session-wide overlay across the WHOLE
// profile at once. Purely presentational; all state lives in the store.
import { useScenarioProfiles, setActiveScenario } from "@/lib/decisionSupportLab/scenarioProfiles";

export default function ScenarioProfileSwitcher() {
  const { activeScenarioId, scenarios } = useScenarioProfiles();

  return (
    <div role="group" aria-label="Active scenario" className="flex flex-wrap items-center gap-1.5">
      {scenarios.map((scenario) => {
        const isActive = activeScenarioId === scenario.id || (activeScenarioId === null && scenario.id === "current-reality");
        return (
          <button
            key={scenario.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => setActiveScenario(scenario.id === "current-reality" ? null : scenario.id)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              isActive
                ? "border-neon-blue/40 bg-neon-blue/15 text-neon-blue"
                : "border-[var(--border-subtle)] text-white/50 hover:text-white/80 light:text-slate-500"
            }`}
          >
            {scenario.name}
          </button>
        );
      })}
    </div>
  );
}
