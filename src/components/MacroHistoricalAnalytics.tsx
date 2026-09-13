// Macro Intelligence Historical Regime Analytics — presentation (Phase 13).
//
// Renders only; it never computes. Every figure comes off
// HistoricalAnalyticsReport (src/lib/macroIntelligenceHistoricalAnalytics.ts),
// a pure function of the snapshots the page already read once. No second
// query, no client-side recomputation, no chart library — the repository has
// recharts, but a plotted line here would imply a continuous, evenly-spaced
// series that daily snapshots with possible gaps do not support. A discrete
// cell per stored snapshot is the honest visual.
//
// Severity colours reuse the same emerald/sky/rose/amber family as
// MacroDecisionLayer so posture reads identically in both sections.

import type {
  DimensionHistoryProfile,
  HistoricalAnalyticsReport,
  HistoricalTransition,
  TimelinePoint,
  TransitionKind,
} from "@/lib/macroIntelligenceHistoricalAnalytics";
import type { MacroPosture } from "@/lib/macroIntelligenceDecision";
import type { IntelligenceDimension } from "@/lib/intelligence/types";

/**
 * Display names, matching the `label` each dimension's own rule assigns in
 * signalDefinitions.ts, so this section reads identically to the regime
 * cards and the decision layer's table. A snapshot persists state,
 * direction and confidence but not the label, so the mapping has to live
 * here in the presentation layer rather than being read back off the row.
 */
const DIMENSION_LABEL: Record<IntelligenceDimension, string> = {
  Inflation: "Inflation",
  MonetaryPolicy: "Monetary Policy",
  ExternalSector: "External Sector",
  LiquidityCredit: "Liquidity & Credit",
  FiscalConditions: "Fiscal Conditions",
  Growth: "Growth",
  MarketStress: "Market Stress",
};

const POSTURE_CELL: Record<MacroPosture, string> = {
  Improving: "bg-emerald-400/70",
  Stable: "bg-sky-400/60",
  Deteriorating: "bg-rose-400/70",
  Mixed: "bg-amber-400/70",
  "Insufficient Data": "bg-white/15 light:bg-black/15",
};

const POSTURE_TEXT: Record<MacroPosture, string> = {
  Improving: "text-emerald-400",
  Stable: "text-sky-400",
  Deteriorating: "text-rose-400",
  Mixed: "text-amber-400",
  "Insufficient Data": "text-white/50 light:text-slate-400",
};

const TRANSITION_LABEL: Record<TransitionKind, string> = {
  improvement: "Improvement",
  deterioration: "Deterioration",
  stabilisation: "Stabilised",
  "coverage-lost": "Coverage lost",
  "coverage-gained": "Coverage gained",
  "unrated-change": "State change",
};

const TRANSITION_CLASS: Record<TransitionKind, string> = {
  improvement: "text-emerald-400",
  deterioration: "text-rose-400",
  stabilisation: "text-sky-400/80",
  "coverage-lost": "text-white/40 light:text-slate-400",
  "coverage-gained": "text-white/40 light:text-slate-400",
  "unrated-change": "text-white/45 light:text-slate-500",
};

function tidy(state: string): string {
  return state.replace(/-/g, " ");
}

/** A run length that reaches the oldest stored snapshot is rendered "N+" — its true start is unknown. */
function runLabel(length: number, truncated: boolean): string {
  return `${truncated ? `${length}+` : length} snapshot${length === 1 ? "" : "s"}`;
}

function Panel({ title, caption, children }: { title: string; caption?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.025] p-5 light:border-black/10 light:bg-black/[0.015]">
      <span className="text-label text-white/45 light:text-slate-400">{title}</span>
      {caption && <p className="mt-1 text-[11px] leading-relaxed text-white/35 light:text-slate-400">{caption}</p>}
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-[13px] leading-relaxed text-white/40 light:text-slate-500">{children}</p>;
}

function Timeline({ timeline }: { timeline: readonly TimelinePoint[] }) {
  const first = timeline[0];
  const last = timeline[timeline.length - 1];

  return (
    <div>
      {/* Scrolls inside its own container so the page body never scrolls sideways. */}
      <div className="overflow-x-auto pb-1">
        <div className="flex min-w-fit items-end gap-[3px]">
          {timeline.map((point, i) => (
            <div key={`${point.snapshotDate}-${i}`} className="flex flex-col items-center gap-1">
              <span
                title={`${point.snapshotDate} — ${point.posture}`}
                className={`h-9 w-[14px] rounded-sm ${POSTURE_CELL[point.posture]} ${i === timeline.length - 1 ? "ring-1 ring-white/50 light:ring-black/30" : ""}`}
              />
              <span className="text-mono-num text-[9px] tabular-nums text-white/25 light:text-slate-400">{point.snapshotDate.slice(8)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-white/5 pt-3 text-[11px] text-white/35 light:border-black/5 light:text-slate-400">
        <span className="tabular-nums">
          {first.snapshotDate} → {last.snapshotDate}
        </span>
        <span aria-hidden="true">·</span>
        <span className="tabular-nums">{timeline.length} stored snapshots</span>
        <span aria-hidden="true">·</span>
        <span>
          Most recent: <span className={`font-semibold ${POSTURE_TEXT[last.posture]}`}>{last.posture}</span>
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-white/30 light:text-slate-400">
        {(["Improving", "Stable", "Mixed", "Deteriorating", "Insufficient Data"] as MacroPosture[]).map((p) => (
          <span key={p} className="inline-flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-sm ${POSTURE_CELL[p]}`} aria-hidden="true" />
            {p}
          </span>
        ))}
      </div>
    </div>
  );
}

function TransitionRows({ transitions }: { transitions: readonly HistoricalTransition[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-left">
        <thead>
          <tr className="border-b border-white/10 light:border-black/10">
            {["Date", "Dimension", "Change", "Type", "Held"].map((h) => (
              <th key={h} className="text-label whitespace-nowrap py-2 pr-4 font-medium text-white/35 light:text-slate-400">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {transitions.map((t, i) => (
            <tr key={`${t.snapshotDate}-${t.dimension}-${i}`} className="border-b border-white/5 last:border-b-0 light:border-black/5">
              <td className="text-mono-num whitespace-nowrap py-2.5 pr-4 text-[12px] tabular-nums text-white/45 light:text-slate-500">
                {t.snapshotDate}
                {t.ongoing && <span className="ml-1.5 rounded-full border border-neon-blue/30 px-1.5 py-px text-[9px] font-semibold text-neon-blue">CURRENT</span>}
              </td>
              <td className="whitespace-nowrap py-2.5 pr-4 text-[13px] text-white/75 light:text-slate-700">{DIMENSION_LABEL[t.dimension]}</td>
              <td className="py-2.5 pr-4 text-[13px] text-white/60 light:text-slate-600">
                {tidy(t.fromState)} <span aria-hidden="true" className="mx-1 text-white/25 light:text-slate-300">→</span>{" "}
                <span className="font-medium text-white light:text-slate-900">{tidy(t.toState)}</span>
              </td>
              <td className={`whitespace-nowrap py-2.5 pr-4 text-[12px] font-medium ${TRANSITION_CLASS[t.kind]}`}>
                {TRANSITION_LABEL[t.kind]}
                {t.isTurningPoint && <span className="ml-1.5 text-[10px] font-semibold text-amber-400">REVERSAL</span>}
              </td>
              <td className="text-mono-num whitespace-nowrap py-2.5 text-[12px] tabular-nums text-white/45 light:text-slate-500">
                {t.persistedSnapshots} snapshot{t.persistedSnapshots === 1 ? "" : "s"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PersistenceRows({ profiles }: { profiles: readonly DimensionHistoryProfile[] }) {
  const observed = profiles.filter((p) => p.currentState !== null);
  if (observed.length === 0) return <Empty>No dimension has been recorded in the available snapshots yet.</Empty>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-left">
        <thead>
          <tr className="border-b border-white/10 light:border-black/10">
            {["Dimension", "Current state", "Held for", "Longest observed", "Standing"].map((h) => (
              <th key={h} className="text-label whitespace-nowrap py-2 pr-4 font-medium text-white/35 light:text-slate-400">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {observed.map((p) => (
            <tr key={p.dimension} className="border-b border-white/5 last:border-b-0 light:border-black/5">
              <td className="whitespace-nowrap py-2.5 pr-4 text-[13px] text-white/75 light:text-slate-700">
                {DIMENSION_LABEL[p.dimension]}
                {!p.polarityRated && <span className="ml-1.5 text-[10px] text-white/25 light:text-slate-400">not rated</span>}
              </td>
              <td className="py-2.5 pr-4 text-[13px] font-medium text-white light:text-slate-900">
                {p.currentAssessment === "insufficient-data" ? <span className="font-normal text-white/45 light:text-slate-500">not classifiable</span> : tidy(p.currentState!)}
              </td>
              <td className="text-mono-num whitespace-nowrap py-2.5 pr-4 text-[12px] tabular-nums text-white/55 light:text-slate-600">
                {runLabel(p.currentRunLength, p.currentRunTruncated)}
              </td>
              <td className="text-mono-num whitespace-nowrap py-2.5 pr-4 text-[12px] tabular-nums text-white/45 light:text-slate-500">
                {p.longestRunForCurrentState ? runLabel(p.longestRunForCurrentState.length, p.longestRunForCurrentState.truncatedStart) : "—"}
              </td>
              <td className="whitespace-nowrap py-2.5 text-[12px] text-white/45 light:text-slate-500">{p.standing.replace(/-/g, " ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ConfigurationBlock({ report }: { report: HistoricalAnalyticsReport }) {
  const c = report.configuration;

  if (!c.comparable) {
    return <Empty>{c.reason ?? "Historical comparison is not available."}</Empty>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {c.currentPattern.map((p) => (
          <span key={p.dimension} className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] text-white/60 light:border-black/10 light:bg-black/[0.02] light:text-slate-600">
            {DIMENSION_LABEL[p.dimension]} <span className="text-white/40 light:text-slate-400">·</span> {tidy(p.state)}
          </span>
        ))}
      </div>

      <p className="text-[13px] leading-relaxed text-white/65 light:text-slate-600">
        {c.priorExactMatches === 0 ? (
          <>This exact configuration of {c.currentPattern.length} rated dimension{c.currentPattern.length === 1 ? "" : "s"} does not appear anywhere else in the {c.searched} available snapshots.</>
        ) : (
          <>
            This exact configuration appears in {c.exactMatches} of the {c.searched} available snapshots — {c.priorExactMatches} of them before the current one.
          </>
        )}
      </p>

      {c.partialMatches.length > 0 && (
        <div className="border-t border-white/5 pt-3 light:border-black/5">
          <p className="text-[11px] text-white/35 light:text-slate-400">
            {c.partialMatches.length} earlier snapshot{c.partialMatches.length === 1 ? "" : "s"} matched some but not all rated dimensions:
          </p>
          <ul className="mt-1.5 flex flex-col gap-1">
            {c.partialMatches.slice(0, 5).map((m) => (
              <li key={m.snapshotDate} className="text-[12px] text-white/50 light:text-slate-500">
                <span className="text-mono-num tabular-nums">{m.snapshotDate}</span> — matched {m.matchingDimensions.length} of {m.comparedDimensions.length}: {m.matchingDimensions.join(", ")}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="border-t border-white/5 pt-3 text-[11px] leading-relaxed text-white/30 light:border-black/5 light:text-slate-400">
        Matching compares persisted state strings for rated dimensions only, across the snapshots stored so far. It describes what has been recorded — it implies nothing about what follows a match.
      </p>
    </div>
  );
}

export default function MacroHistoricalAnalytics({ report }: { report: HistoricalAnalyticsReport }) {
  const { sufficiency, timeline, transitions, turningPoints } = report;

  // Nothing meaningful to show yet — say so plainly rather than rendering
  // empty scaffolding that implies the feature is broken.
  if (timeline.length === 0) {
    return (
      <section className="glass-card scroll-mt-[60px] p-6 sm:scroll-mt-[120px] sm:p-8" id="macro-history">
        <span className="text-label text-neon-blue">Historical Regime Analytics</span>
        <p className="mt-3 text-[13px] leading-relaxed text-white/55 light:text-slate-500">{sufficiency.note}</p>
      </section>
    );
  }

  const economicTransitions = transitions.filter((t) => !t.involvesDataGap);

  return (
    <section className="glass-card scroll-mt-[60px] p-6 sm:scroll-mt-[120px] sm:p-8" id="macro-history">
      <span className="text-label text-neon-blue">Historical Regime Analytics</span>
      <p className="mt-2 max-w-2xl text-sm text-white/60 light:text-slate-500">
        How the recorded macro regime has evolved across stored snapshots. Every point below is an observation the system actually persisted — nothing is reconstructed from current values.
      </p>
      <p className="mt-2 text-[11px] leading-relaxed text-white/35 light:text-slate-400">{sufficiency.note}</p>

      <div className="mt-6 flex flex-col gap-4">
        <Panel title="Historical Regime Timeline" caption="One cell per stored snapshot, oldest first. The outlined cell is the most recent.">
          <Timeline timeline={timeline} />
        </Panel>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel title="Key Historical Transitions" caption="Every observed state change between consecutive snapshots, newest first.">
            {transitions.length === 0 ? (
              <Empty>
                {sufficiency.canDetectTransitions
                  ? "No dimension changed state across the available snapshots."
                  : "At least two snapshots are needed before a transition can be identified."}
              </Empty>
            ) : (
              <TransitionRows transitions={transitions} />
            )}
          </Panel>

          <Panel title="Observed Turning Points" caption="State reversals only — a dimension moving directly between improving and deteriorating. Observed, never predicted.">
            {turningPoints.length === 0 ? (
              <Empty>
                No state reversals are present in the available snapshot history.
                {economicTransitions.length > 0 && " Changes were recorded, but none moved a dimension directly between improving and deteriorating."}
              </Empty>
            ) : (
              <ul className="flex flex-col gap-2">
                {turningPoints.map((t, i) => (
                  <li key={`${t.snapshotDate}-${t.dimension}-${i}`} className="flex flex-wrap items-baseline gap-x-2 text-[13px] text-white/65 light:text-slate-600">
                    <span className="text-mono-num tabular-nums text-white/40 light:text-slate-400">{t.snapshotDate}</span>
                    <span className="font-medium text-white light:text-slate-900">{DIMENSION_LABEL[t.dimension]}</span>
                    <span>
                      {tidy(t.fromState)} <span aria-hidden="true" className="text-white/25">→</span> {tidy(t.toState)}
                    </span>
                    <span className="text-[11px] text-white/35 light:text-slate-400">held {t.persistedSnapshots} snapshot{t.persistedSnapshots === 1 ? "" : "s"}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <Panel
          title="State Persistence"
          caption={`How long each dimension's current state has held, measured in stored snapshots — never in calendar days, since a missed scheduled run would otherwise become a claimed duration. "N+" means the run reaches the oldest stored snapshot, so it may have begun earlier.`}
        >
          <PersistenceRows profiles={report.profiles} />
        </Panel>

        <Panel title="Current Configuration in Historical Context" caption="Whether today's rated-dimension pattern has been recorded before.">
          <ConfigurationBlock report={report} />
        </Panel>

        {report.coverageChanges.length > 0 && (
          <Panel
            title="Data Coverage Changes"
            caption="Dimensions that became, or stopped being, classifiable. Listed separately because a gap in evidence is not an economic event."
          >
            <ul className="flex flex-col gap-1.5">
              {report.coverageChanges.map((t, i) => (
                <li key={`${t.snapshotDate}-${t.dimension}-${i}`} className="flex flex-wrap items-baseline gap-x-2 text-[12px] text-white/50 light:text-slate-500">
                  <span className="text-mono-num tabular-nums text-white/35 light:text-slate-400">{t.snapshotDate}</span>
                  <span className="text-white/70 light:text-slate-700">{DIMENSION_LABEL[t.dimension]}</span>
                  <span>{t.kind === "coverage-lost" ? `became unclassifiable (was ${tidy(t.fromState)})` : `became classifiable as ${tidy(t.toState)}`}</span>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>
    </section>
  );
}
