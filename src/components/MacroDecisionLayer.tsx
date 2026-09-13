// Macro Intelligence Decision Layer — presentation (Phase 12).
//
// Renders only; it never computes. Every value below comes straight off
// MacroDecisionReport (src/lib/macroIntelligenceDecision.ts), which is a
// pure function of the engine's existing signals plus the existing
// persisted snapshot history. No state, count, breadth, or persistence
// figure is derived, re-ordered, or reinterpreted here.
//
// Visual language is deliberately the one already established on this page:
// glass-card shell, text-label eyebrows, hairline dividers, tabular figures,
// and the same emerald/amber/rose severity family MacroIntelligenceSection
// already uses for confidence. No new palette, no gauges, no scorecards, no
// score — posture is a word, not a number.
//
// One deliberate departure from MacroIntelligenceSection's rule that
// direction is never colour-coded: that rule exists because the ENGINE
// never judges whether "Rising" is good or bad. This layer does not colour
// direction either — it colours `assessment`, a separate, explicitly
// documented judgment that exists only for the five dimensions whose
// polarity this repository already evidences (see macroIntelligenceDecision
// .ts's header). The two dimensions with no evidenced polarity render as
// "not rated" in neutral type, and say so.

import type {
  AttentionSignal,
  Breadth,
  ChangeStatement,
  DimensionAssessment,
  DimensionDecision,
  MacroDecisionReport,
  MacroPosture,
} from "@/lib/macroIntelligenceDecision";

const POSTURE_ACCENT: Record<MacroPosture, string> = {
  Improving: "bg-emerald-400/70",
  Stable: "bg-sky-400/60",
  Deteriorating: "bg-rose-400/70",
  Mixed: "bg-amber-400/70",
  "Insufficient Data": "bg-white/20 light:bg-black/20",
};

const POSTURE_TEXT: Record<MacroPosture, string> = {
  Improving: "text-emerald-400",
  Stable: "text-sky-400",
  Deteriorating: "text-rose-400",
  Mixed: "text-amber-400",
  "Insufficient Data": "text-white/50 light:text-slate-400",
};

const ASSESSMENT_LABEL: Record<DimensionAssessment, string> = {
  improving: "Improving",
  deteriorating: "Deteriorating",
  steady: "Steady",
  "not-rated": "Not rated",
  "insufficient-data": "No data",
};

const ASSESSMENT_CLASS: Record<DimensionAssessment, string> = {
  improving: "text-emerald-400",
  deteriorating: "text-rose-400",
  steady: "text-sky-400/80",
  "not-rated": "text-white/35 light:text-slate-400",
  "insufficient-data": "text-white/35 light:text-slate-400",
};

const BREADTH_LABEL: Record<Breadth, string> = {
  none: "None",
  isolated: "Isolated",
  moderate: "Moderate",
  "broad-based": "Broad-based",
  "insufficient-coverage": "Not assessed",
};

/** Plain-English explanation of the posture rule, shown inline so the classification is never a black box. */
const POSTURE_EXPLANATION: Record<MacroPosture, string> = {
  Improving: "Every rated dimension that is moving is moving favourably.",
  Deteriorating: "Every rated dimension that is moving is moving adversely.",
  Mixed: "Rated dimensions are moving in both directions at once.",
  Stable: "No rated dimension changed direction this period.",
  "Insufficient Data": "Too few dimensions with an evidenced polarity currently have usable data.",
};

function tidy(state: string): string {
  return state.replace(/-/g, " ");
}

function runText(d: DimensionDecision): string {
  if (d.consecutiveSnapshots === null) return d.changeNotYetPersisted ? "not yet in a snapshot" : "—";
  const n = d.consecutiveSnapshots;
  return `${d.runTruncated ? `${n}+` : n} snapshot${n === 1 ? "" : "s"}`;
}

function Bullets({ items }: { items: readonly string[] }) {
  return (
    <ul className="mt-2 flex flex-col gap-1.5">
      {items.map((text, i) => (
        <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-white/65 light:text-slate-600">
          <span aria-hidden="true" className="mt-[2px] shrink-0 text-white/25 light:text-slate-300">
            ·
          </span>
          <span>{text}</span>
        </li>
      ))}
    </ul>
  );
}

function PostureBlock({ report }: { report: MacroDecisionReport }) {
  const { posture, counts } = report;
  return (
    <div className="relative overflow-hidden rounded-lg border border-white/10 bg-white/[0.025] p-5 light:border-black/10 light:bg-black/[0.015]">
      <div aria-hidden="true" className={`absolute inset-x-0 top-0 h-[2px] ${POSTURE_ACCENT[posture]}`} />
      <span className="text-label text-white/45 light:text-slate-400">Current Macro Posture</span>
      <p className={`mt-2.5 text-3xl font-semibold leading-tight ${POSTURE_TEXT[posture]}`}>{posture}</p>
      <p className="mt-2.5 text-[13px] leading-relaxed text-white/65 light:text-slate-600">{POSTURE_EXPLANATION[posture]}</p>

      <div className="mt-4 grid grid-cols-3 gap-x-3 border-t border-white/5 pt-3 light:border-black/5">
        {[
          { label: "Improving", value: counts.improving, className: "text-emerald-400" },
          { label: "Deteriorating", value: counts.deteriorating, className: "text-rose-400" },
          { label: "Steady", value: counts.steady, className: "text-sky-400/80" },
        ].map((cell) => (
          <div key={cell.label}>
            <p className="text-label text-white/35 light:text-slate-400">{cell.label}</p>
            <p className={`text-mono-num mt-1 text-sm font-semibold tabular-nums ${cell.className}`}>{cell.value}</p>
          </div>
        ))}
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-white/35 light:text-slate-400">
        Counted across {counts.ratedWithData} of {report.dimensions.length} dimensions. {counts.notRated > 0 && <>{counts.notRated} carry no evidenced polarity and are reported without one. </>}
        {counts.insufficientData > 0 && <>{counts.insufficientData} could not be classified this run.</>}
      </p>
    </div>
  );
}

function BreadthBlock({ report }: { report: MacroDecisionReport }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.025] p-5 light:border-black/10 light:bg-black/[0.015]">
      <span className="text-label text-white/45 light:text-slate-400">Breadth of Movement</span>
      <dl className="mt-3 flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between gap-3 border-b border-white/5 pb-2.5 light:border-black/5">
          <dt className="text-[13px] text-white/55 light:text-slate-500">Deterioration</dt>
          <dd className="text-sm font-semibold text-white light:text-slate-900">{BREADTH_LABEL[report.deteriorationBreadth]}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-[13px] text-white/55 light:text-slate-500">Improvement</dt>
          <dd className="text-sm font-semibold text-white light:text-slate-900">{BREADTH_LABEL[report.improvementBreadth]}</dd>
        </div>
      </dl>
      <p className="mt-3 border-t border-white/5 pt-3 text-[11px] leading-relaxed text-white/35 light:border-black/5 light:text-slate-400">
        Broad-based means at least half of the rated dimensions with usable data are moving that way; moderate, at least a third. Breadth is not assessed below three rated dimensions.
      </p>
    </div>
  );
}

function ListSection({ title, caption, empty, items }: { title: string; caption: string; empty: string; items: readonly { text: string }[] }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.025] p-5 light:border-black/10 light:bg-black/[0.015]">
      <span className="text-label text-white/45 light:text-slate-400">{title}</span>
      <p className="mt-1 text-[11px] text-white/35 light:text-slate-400">{caption}</p>
      {items.length === 0 ? (
        <p className="mt-3 text-[13px] text-white/40 light:text-slate-500">{empty}</p>
      ) : (
        <Bullets items={items.map((i) => i.text)} />
      )}
    </div>
  );
}

function DimensionTable({ dimensions }: { dimensions: readonly DimensionDecision[] }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.025] p-5 light:border-black/10 light:bg-black/[0.015]">
      <span className="text-label text-white/45 light:text-slate-400">Dimension Changes</span>
      <p className="mt-1 text-[11px] text-white/35 light:text-slate-400">
        Current condition, the state it followed, and how many consecutive stored snapshots share it. A dash means no earlier state has been recorded yet.
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[540px] border-collapse text-left">
          <thead>
            <tr className="border-b border-white/10 light:border-black/10">
              {["Dimension", "Current", "Previous", "Persisted", "Assessment"].map((h) => (
                <th key={h} className="text-label whitespace-nowrap py-2 pr-4 font-medium text-white/35 light:text-slate-400">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dimensions.map((d) => (
              <tr key={d.dimension} className="border-b border-white/5 last:border-b-0 light:border-black/5">
                <td className="whitespace-nowrap py-2.5 pr-4 text-[13px] text-white/75 light:text-slate-700">{d.label}</td>
                <td className="py-2.5 pr-4 text-[13px] font-medium text-white light:text-slate-900">{tidy(d.currentState)}</td>
                <td className="py-2.5 pr-4 text-[13px] text-white/45 light:text-slate-500">
                  {d.previousState ? tidy(d.previousState) : <span aria-hidden="true">—</span>}
                </td>
                <td className="text-mono-num whitespace-nowrap py-2.5 pr-4 text-[13px] tabular-nums text-white/45 light:text-slate-500">{runText(d)}</td>
                <td className={`whitespace-nowrap py-2.5 text-[13px] font-medium ${ASSESSMENT_CLASS[d.assessment]}`}>{ASSESSMENT_LABEL[d.assessment]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KnowledgeBlock({ report }: { report: MacroDecisionReport }) {
  const groups: { title: string; caption: string; items: readonly string[] }[] = [
    { title: "Observed", caption: "Read directly from the engine's output and stored snapshots.", items: report.knowledge.observed },
    { title: "Interpreted", caption: "Derived from those facts by the documented rules on this page.", items: report.knowledge.interpreted },
    { title: "Unknown", caption: "What the available data cannot support.", items: report.knowledge.unknown },
  ];
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.025] p-5 light:border-black/10 light:bg-black/[0.015]">
      <span className="text-label text-white/45 light:text-slate-400">What This Layer Knows</span>
      <p className="mt-1 text-[11px] text-white/35 light:text-slate-400">Observation, interpretation and limitation are kept separate rather than blended into one narrative.</p>
      <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-3">
        {groups.map((g) => (
          <div key={g.title}>
            <p className="text-label text-white/45 light:text-slate-400">{g.title}</p>
            <p className="mt-1 text-[11px] text-white/30 light:text-slate-400">{g.caption}</p>
            <Bullets items={g.items} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MacroDecisionLayer({ report }: { report: MacroDecisionReport }) {
  const historyNote =
    report.historyDepth === "none"
      ? "Not enough historical data yet — no snapshots are stored, so change and persistence analysis is unavailable."
      : report.historyDepth === "single"
        ? "Current state available; change and persistence analysis requires additional snapshots."
        : report.historyDepth === "minimal"
          ? "Recent change available; longer persistence analysis remains limited."
          : null;

  return (
    <section className="glass-card scroll-mt-[60px] p-6 sm:scroll-mt-[120px] sm:p-8" id="macro-decision">
      <span className="text-label text-neon-blue">Decision Layer</span>
      <p className="mt-2 max-w-2xl text-sm text-white/60 light:text-slate-500">
        What the seven dimensions say together — what changed, how widespread it is, and how long it has held. Descriptive only: no forecast, no score, no recommendation.
      </p>

      {historyNote && (
        <p className="mt-4 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-[13px] leading-relaxed text-white/55 light:border-black/10 light:bg-black/[0.015] light:text-slate-500">
          {historyNote}
        </p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PostureBlock report={report} />
        <BreadthBlock report={report} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ListSection
          title="What Changed?"
          caption="Transitions first, then current conditions and persistent runs."
          empty="No changes to report from the stored snapshots."
          items={report.whatChanged}
        />
        <ListSection
          title="What Matters Now"
          caption="Ordered by a fixed severity rank, not by any score."
          empty="No attention signals raised from the available data."
          items={report.attention}
        />
      </div>

      <div className="mt-4 flex flex-col gap-4">
        <DimensionTable dimensions={report.dimensions} />
        <KnowledgeBlock report={report} />
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-white/30 light:text-slate-400">
        Built from {report.snapshotCount} stored snapshot{report.snapshotCount === 1 ? "" : "s"} (most recent {report.historyWindow} requested). Persistence is counted in snapshots, never in days, because a
        missed scheduled run must never become a claimed calendar duration.
      </p>
    </section>
  );
}

export type { AttentionSignal, ChangeStatement };
