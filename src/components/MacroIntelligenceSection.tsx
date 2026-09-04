// Presentation layer for the Phase 9.1 Macro Intelligence Engine. This file
// renders — it never computes: every field read below already exists on
// IntelligenceSignal/IndicatorObservationEvidence (src/lib/intelligence/
// types.ts). No state, direction, confidence, or evidence value is derived,
// rounded away from, or reinterpreted here.
//
// Phase 10 UI refinement: sole consumer is now /macro-intelligence (the
// dedicated page) — /overview carries its own compact teaser instead (see
// overview/page.tsx), so this component no longer needs to double as an
// Overview section; it renders its own "MACRO REGIME" framing rather than a
// generic DashboardSection wrapper. Card hierarchy inverts the original
// draft's: the dimension name is now a quiet label, the STATE is the
// dominant, large element (the actual analytical finding), confidence is a
// quiet metadata badge, and a colored top hairline encodes confidence
// severity — reusing FRESHNESS_SEVERITY_BADGE's existing emerald/amber/rose
// family, never a new palette. Direction is deliberately NOT color-coded:
// the engine itself never judges whether "Rising" is good or bad news (see
// signalDefinitions.ts's own header), so this file must not invent that
// judgment either — direction stays a neutral glyph + word, confidence is
// the only thing colored, because confidence is the only severity the
// engine actually computes.

import type { IndicatorObservationEvidence, IntelligenceDimension, IntelligenceSignal, MacroIntelligenceReport, SignalConfidence } from "@/lib/intelligence/types";
import { FRESHNESS_STATE_LABEL } from "@/lib/freshness/readModel";
import type { DimensionHistory } from "@/lib/macroIntelligenceHistory";

const CONFIDENCE_BADGE_CLASS: Record<SignalConfidence, string> = {
  High: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Moderate: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  Low: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  Insufficient: "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

/** The card's top accent hairline — same severity family as the badge, one shade more saturated so it reads at 2px height. */
const CONFIDENCE_ACCENT_CLASS: Record<SignalConfidence, string> = {
  High: "bg-emerald-400/70",
  Moderate: "bg-amber-400/70",
  Low: "bg-amber-400/70",
  Insufficient: "bg-rose-400/70",
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
      <span className="text-right text-[11px] tabular-nums text-neutral-500 light:text-neutral-500">
        {evidence.value !== null ? `${evidence.value}${evidence.unit}` : "—"}
        {evidence.observationPeriod && <> · {evidence.observationPeriod}</>}
        {" · "}
        {freshnessLabel(evidence.freshnessState)}
      </span>
    </li>
  );
}

/**
 * Phase 10.1 — small, subordinate history strip. Purely mechanical: every
 * value here is read straight from DimensionHistory (already-computed by
 * macroIntelligenceHistory.ts from persisted snapshots) — no chart, no
 * graph, no color-coded trend, nothing decorative. A single muted text row
 * plus a one-line status caption, deliberately smaller/quieter than the
 * current-state headline above it, so history never competes with the
 * live signal for attention.
 */
function HistoryStrip({ history }: { history: DimensionHistory | null }) {
  if (!history) {
    return (
      <p className="mt-3 border-t border-white/5 pt-3 text-[11px] text-white/30 light:border-black/5 light:text-slate-400">History will appear after additional snapshots.</p>
    );
  }

  if (history.points.length === 1) {
    return (
      <div className="mt-3 border-t border-white/5 pt-3 light:border-black/5">
        <span className="text-label text-white/30 light:text-slate-400">History</span>
        <p className="mt-1 text-[11px] text-white/40 light:text-slate-500">1 snapshot</p>
      </div>
    );
  }

  const countLabel = `${history.truncated ? `${history.consecutiveCount}+` : history.consecutiveCount} consecutive snapshot${history.consecutiveCount === 1 ? "" : "s"}`;

  return (
    <div className="mt-3 border-t border-white/5 pt-3 light:border-black/5">
      <span className="text-label text-white/30 light:text-slate-400">History</span>
      <p className="mt-1 text-[11px] leading-relaxed text-white/50 light:text-slate-500">
        {history.points.map((p, i) => (
          <span key={`${p.computedAt}-${i}`}>
            {i > 0 && <span aria-hidden="true" className="mx-1 text-white/20 light:text-slate-300">→</span>}
            {p.state.replace(/-/g, " ")}
          </span>
        ))}
      </p>
      <p className="mt-1 text-[11px] text-white/40 light:text-slate-500">
        {history.currentState.replace(/-/g, " ")} · {countLabel}
        {history.previousState && <> · Changed from {history.previousState.replace(/-/g, " ")}</>}
      </p>
    </div>
  );
}

function SignalCard({ signal, history }: { signal: IntelligenceSignal; history: DimensionHistory | null }) {
  const usableCount = signal.evidence.length - signal.missingInputs.length;
  return (
    <div className="relative overflow-hidden rounded-lg border border-white/10 bg-white/[0.025] p-5 light:border-black/10 light:bg-black/[0.015]">
      <div aria-hidden="true" className={`absolute inset-x-0 top-0 h-[2px] ${CONFIDENCE_ACCENT_CLASS[signal.confidence]}`} />

      <div className="flex items-start justify-between gap-3">
        <span className="text-label text-white/45 light:text-slate-400">{signal.label}</span>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide ${CONFIDENCE_BADGE_CLASS[signal.confidence]}`}>
          {signal.confidence === "Insufficient" ? "INSUFFICIENT" : signal.confidence.toUpperCase()}
        </span>
      </div>

      <p className="mt-2.5 text-2xl font-semibold leading-tight text-white light:text-slate-900">
        <span aria-hidden="true" className="mr-2 text-white/30 light:text-slate-400">
          {DIRECTION_GLYPH[signal.direction]}
        </span>
        {signal.state.replace(/-/g, " ")}
      </p>

      <p className="mt-3 text-[13px] leading-relaxed text-white/65 light:text-slate-600">{signal.summary}</p>

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/5 pt-3 text-[11px] text-white/35 light:border-black/5 light:text-slate-400">
        <span className="tabular-nums">
          {usableCount} of {signal.evidence.length} indicator{signal.evidence.length === 1 ? "" : "s"}
        </span>
        {signal.missingInputs.length > 0 && (
          <>
            <span aria-hidden="true">·</span>
            <span className="text-amber-400/80">
              {signal.missingInputs.length} unavailable: {signal.missingInputs.join(", ")}
            </span>
          </>
        )}
      </div>

      <HistoryStrip history={history} />

      {signal.evidence.length > 0 && (
        <details className="group mt-3">
          <summary className="w-fit cursor-pointer list-none text-[11px] font-medium text-neutral-400 hover:text-neutral-300 light:text-neutral-500 light:hover:text-neutral-700">
            <span className="inline-flex items-center gap-1">
              View supporting evidence
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

export default function MacroIntelligenceSection({
  report,
  historyByDimension = {},
}: {
  report: MacroIntelligenceReport;
  /** Phase 10.1 — optional; omitted entirely on any page that hasn't fetched history (defaults to empty, which HistoryStrip renders as "will appear after additional snapshots" for every card, never a crash). */
  historyByDimension?: Partial<Record<IntelligenceDimension, DimensionHistory>>;
}) {
  return (
    <div className="glass-card scroll-mt-[60px] p-6 sm:scroll-mt-[120px] sm:p-8" id="macro-intelligence">
      <span className="text-label text-neon-blue">Macro Regime</span>
      <p className="mt-2 max-w-2xl text-sm text-white/60 light:text-slate-500">
        Seven dimensions of Pakistan&rsquo;s current macroeconomic regime — each classified independently, never blended into one score.
      </p>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {report.signals.map((signal) => (
          <SignalCard key={signal.id} signal={signal} history={historyByDimension[signal.dimension] ?? null} />
        ))}
      </div>
    </div>
  );
}
