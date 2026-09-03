// Minimal integration point for the Phase 9.1 Macro Intelligence Engine.
//
// Deliberately plain: dimension state + direction + confidence + a one-line
// evidence-grounded summary per signal, reusing the existing
// FRESHNESS_SEVERITY_BADGE/FRESHNESS_STATE_LABEL color and label vocabulary
// (readModel.ts) rather than inventing a new palette. No animation beyond
// what DashboardSection's standard section wrapper already applies to every
// other section on this page — nothing added here for its own sake. This
// does not replace any existing KPI card; it is an additional section.
//
// Phase 9.5 production integration: added a per-signal evidence disclosure
// (native <details>/<summary> — zero JS, keyboard-operable, no ARIA needed;
// the same plain-CSS-toggle philosophy MobileCollapsibleGroup.tsx already
// established elsewhere on this page, just without that component's
// breakpoint-conditional complication, which doesn't apply here) so a user
// can see the underlying indicator-level observations — label, value,
// observation period, freshness — behind each dimension's one-line summary,
// without leaving the card or opening a new page. Only fields already on
// IndicatorObservationEvidence are shown; nothing is fabricated here.

import DashboardSection from "@/components/DashboardSection";
import { FRESHNESS_SEVERITY_BADGE, FRESHNESS_STATE_LABEL } from "@/lib/freshness/readModel";
import type { IndicatorObservationEvidence, IntelligenceSignal, MacroIntelligenceReport, SignalConfidence } from "@/lib/intelligence/types";

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

/** FRESHNESS_STATE_LABEL only names the 8 real FreshnessResult states — evidence.ts's own "not-registered" case (no freshness registry entry at all) is honestly labeled here rather than added to that shared map, which exists for actual freshness verdicts. */
function freshnessLabel(state: IndicatorObservationEvidence["freshnessState"]): string {
  return state === "not-registered" ? "Not tracked" : FRESHNESS_STATE_LABEL[state];
}

function EvidenceRow({ evidence }: { evidence: IndicatorObservationEvidence }) {
  return (
    <li className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-t border-white/5 py-1.5 first:border-t-0 first:pt-0 light:border-black/5">
      <span className="text-[11px] text-neutral-400 light:text-neutral-600">{evidence.label}</span>
      <span className="text-right text-[11px] text-neutral-500 light:text-neutral-500">
        {evidence.value !== null ? `${evidence.value}${evidence.unit}` : "—"}
        {evidence.observationPeriod && <> · {evidence.observationPeriod}</>}
        {" · "}
        {freshnessLabel(evidence.freshnessState)}
      </span>
    </li>
  );
}

function SignalCard({ signal }: { signal: IntelligenceSignal }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 light:border-black/10 light:bg-black/[0.02]">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-white light:text-neutral-900">{signal.label}</h3>
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
      {signal.evidence.length > 0 && (
        <details className="group mt-3">
          <summary className="w-fit cursor-pointer list-none text-[11px] font-medium text-neutral-400 hover:text-neutral-300 light:text-neutral-500 light:hover:text-neutral-700">
            <span className="inline-flex items-center gap-1">
              View supporting evidence ({signal.evidence.length})
              <span aria-hidden="true" className="transition-transform group-open:rotate-90">›</span>
            </span>
          </summary>
          <ul className="mt-2">
            {signal.evidence.map((e) => (
              <EvidenceRow key={e.seriesId} evidence={e} />
            ))}
          </ul>
        </details>
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
