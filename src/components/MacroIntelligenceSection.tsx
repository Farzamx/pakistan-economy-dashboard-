// Minimal integration point for the Phase 9.1 Macro Intelligence Engine.
//
// Deliberately plain: dimension state + direction + confidence + a one-line
// evidence-grounded summary per signal, reusing the existing
// FRESHNESS_SEVERITY_BADGE color vocabulary (readModel.ts) rather than
// inventing a new palette. No animation beyond what DashboardSection's
// standard section wrapper already applies to every other section on this
// page — nothing added here for its own sake. This does not replace any
// existing KPI card; it is an additional section.

import DashboardSection from "@/components/DashboardSection";
import { FRESHNESS_SEVERITY_BADGE } from "@/lib/freshness/readModel";
import type { IntelligenceSignal, MacroIntelligenceReport, SignalConfidence } from "@/lib/intelligence/types";

const CONFIDENCE_BADGE_CLASS: Record<SignalConfidence, string> = {
  High: FRESHNESS_SEVERITY_BADGE.healthy,
  Moderate: FRESHNESS_SEVERITY_BADGE.caution,
  Low: FRESHNESS_SEVERITY_BADGE.caution,
  Insufficient: FRESHNESS_SEVERITY_BADGE.problem,
};

const DIRECTION_GLYPH: Record<IntelligenceSignal["direction"], string> = {
  Rising: "↑",
  Falling: "↓",
  Flat: "→",
  Unknown: "?",
};

function SignalCard({ signal }: { signal: IntelligenceSignal }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 light:border-black/10 light:bg-black/[0.02]">
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-semibold text-white light:text-neutral-900">{signal.label}</h4>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium ${CONFIDENCE_BADGE_CLASS[signal.confidence]}`}>
          {signal.confidence === "Insufficient" ? "Insufficient evidence" : `${signal.confidence} confidence`}
        </span>
      </div>
      <p className="mt-1 text-lg font-semibold text-white light:text-neutral-900">
        <span aria-hidden="true" className="mr-1.5 text-neutral-400">{DIRECTION_GLYPH[signal.direction]}</span>
        {signal.state.replace(/-/g, " ")}
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-neutral-400 light:text-neutral-600">{signal.summary}</p>
      {signal.missingInputs.length > 0 && (
        <p className="mt-2 text-[11px] text-neutral-500">
          Not available this period: {signal.missingInputs.join(", ")}
        </p>
      )}
    </div>
  );
}

export default function MacroIntelligenceSection({ report }: { report: MacroIntelligenceReport }) {
  return (
    <DashboardSection
      id="macro-intelligence"
      title="Macro Intelligence"
      description="Deterministic, rule-based classification of the current economic picture across seven dimensions — direction and confidence, traceable to the same authoritative observations shown elsewhere on this dashboard. Not a forecast, not a model prediction, and not a single aggregate score."
      stats={[]}
    >
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {report.signals.map((signal) => (
          <SignalCard key={signal.id} signal={signal} />
        ))}
      </div>
    </DashboardSection>
  );
}
