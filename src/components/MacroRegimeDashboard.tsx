// Macro Intelligence — regime dashboard, transparency and comparison (Phase C).
//
// PRESENTATION ONLY. Every number, state, score, date and count rendered
// below is read directly off the engine's IntelligenceSignal or the existing
// analytics layer's TimelinePoint / HistoricalTransition. Nothing here
// classifies, scores, thresholds, ranks, weights or forecasts, and
// src/lib/intelligence/ is neither modified nor re-entered to recompute a
// past value. The view-models in lib/macroIntelligenceViews.ts are pure
// re-shapings of those same outputs.
//
// THREE CLAIMS THIS SECTION IS CAREFUL NOT TO MAKE
//  1. That a categorical state has a magnitude. States are shown as words
//     and discrete cells; only genuinely numeric quantities (a count of
//     classified dimensions, the engine's own 0-100 confidence) are plotted.
//  2. That a snapshot date is an economic event date. A snapshot date is
//     when PEIC computed and stored a classification; SNAPSHOT_DATE_CAVEAT
//     is rendered wherever those dates are shown.
//  3. That a gap in evidence is an economic change. Coverage changes are
//     separated from economic transitions and labelled as data events.
//
// It complements rather than duplicates MacroHistoricalAnalytics: that
// section reports transitions, persistence and configuration matching in
// tables; this one adds the current-regime overview, the evidence-quality
// view, and the links from each cited indicator back to its own page and
// downloadable dataset.

import Link from "next/link";
import type { IntelligenceSignal, MacroIntelligenceReport } from "@/lib/intelligence/types";
import type { HistoricalAnalyticsReport } from "@/lib/macroIntelligenceHistoricalAnalytics";
import { FRESHNESS_STATE_LABEL } from "@/lib/freshness/readModel";
import {
  SNAPSHOT_DATE_CAVEAT,
  buildConfidenceSeries,
  buildCoverageSeries,
  buildDimensionCards,
  datasetIdForSeries,
  indicatorHrefForSeries,
  separateTransitions,
  type DimensionCardView,
} from "@/lib/macroIntelligenceViews";
import CoverageBarChart from "@/components/macro/CoverageBarChart";
import ConfidenceBarChart from "@/components/macro/ConfidenceBarChart";
import { LeadMore } from "@/components/shell/Disclosure";

// Reuses MacroIntelligenceSection's palette decision verbatim: confidence is
// the only severity the engine computes, so confidence is the only thing
// coloured. Direction and state are never colour-coded — the engine itself
// does not judge whether "Rising" is good news.
const CONFIDENCE_BADGE: Record<IntelligenceSignal["confidence"], string> = {
  High: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Moderate: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  Low: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  Insufficient: "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

const DIRECTION_GLYPH: Record<IntelligenceSignal["direction"], string> = {
  Rising: "↑",
  Falling: "↓",
  Flat: "→",
  Unknown: "?",
};

function Panel({ title, caption, children }: { title: string; caption?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.025] p-5 light:border-black/10 light:bg-black/[0.015]">
      <span className="text-label text-white/45 light:text-slate-400">{title}</span>
      {caption && <LeadMore className="mt-1" leadClassName="text-[11px] leading-relaxed text-white/35 light:text-slate-400">{caption}</LeadMore>}
      <div className="mt-3">{children}</div>
    </div>
  );
}

/** A run reaching the oldest stored snapshot renders "N+" — its true start is unknown. */
function heldLabel(card: DimensionCardView): string {
  if (card.persistedSnapshots === null) return "not yet observed in stored history";
  const n = `${card.runReachesOldest ? `${card.persistedSnapshots}+` : card.persistedSnapshots}`;
  return `held ${n} snapshot${card.persistedSnapshots === 1 ? "" : "s"}`;
}

function freshnessLabel(state: IntelligenceSignal["evidence"][number]["freshnessState"]): string {
  return state === "not-registered" ? "Not tracked" : FRESHNESS_STATE_LABEL[state];
}

/**
 * One evidence row, with links back to the indicator's own page and its
 * downloadable dataset where those exist. The value, unit, period and
 * freshness are the engine's; only the links are added.
 */
function EvidenceRow({ evidence }: { evidence: IntelligenceSignal["evidence"][number] }) {
  const href = indicatorHrefForSeries(evidence.seriesId);
  const datasetId = datasetIdForSeries(evidence.seriesId);

  return (
    <li className="border-t border-white/5 py-2 first:border-t-0 first:pt-0 light:border-black/5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <span className="text-[12px] text-white/60 light:text-slate-600">
          {href ? (
            <Link href={href} className="underline decoration-white/20 underline-offset-2 hover:text-white light:decoration-black/20 light:hover:text-slate-900">
              {evidence.label}
            </Link>
          ) : (
            evidence.label
          )}
        </span>
        <span className="text-mono-num text-right text-[12px] tabular-nums text-white/50 light:text-slate-500">
          {evidence.value !== null ? `${evidence.value}${evidence.unit}` : "—"}
        </span>
      </div>
      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-white/30 light:text-slate-400">
        {/* Observation period, not a fetch time — the distinction the
            engine's own evidence model makes, preserved here. */}
        <span className="tabular-nums">{evidence.observationPeriod ? `observed ${evidence.observationPeriod}` : "period not reported"}</span>
        <span aria-hidden="true">·</span>
        <span>{freshnessLabel(evidence.freshnessState)}</span>
        {evidence.isFallback && (
          <>
            <span aria-hidden="true">·</span>
            <span className="text-amber-400/70">fallback value</span>
          </>
        )}
        {datasetId && (
          <>
            <span aria-hidden="true">·</span>
            <a href={`/api/datasets/${datasetId}`} download className="underline decoration-white/20 underline-offset-2 hover:text-white/60 light:decoration-black/20 light:hover:text-slate-600">
              download series
            </a>
          </>
        )}
      </div>
    </li>
  );
}

function DimensionCard({ card }: { card: DimensionCardView }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.025] p-4 light:border-black/10 light:bg-black/[0.015]">
      <div className="flex items-start justify-between gap-3">
        <span className="text-label text-white/45 light:text-slate-400">{card.label}</span>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide ${CONFIDENCE_BADGE[card.confidence]}`}
          title={
            card.rated
              ? "The engine's confidence score for the input data behind this classification."
              : "Input-data quality score. It is high because the inputs are fresh; the engine still could not classify this dimension — the two measure different things."
          }
        >
          {card.confidenceScore === null ? "NOT SCORED" : `${card.confidenceScore}/100 data`}
        </span>
      </div>

      {card.rated ? (
        <p className="mt-2 text-lg font-semibold leading-tight text-white light:text-slate-900">
          <span aria-hidden="true" className="mr-1.5 text-white/30 light:text-slate-400">
            {DIRECTION_GLYPH[card.direction]}
          </span>
          {card.stateLabel}
        </p>
      ) : (
        // Never dressed up as a finding: the engine could not classify this.
        <p className="mt-2 text-[14px] font-medium leading-tight text-white/45 light:text-slate-500">Not classifiable — insufficient evidence</p>
      )}

      {/* The engine scores INPUT DATA QUALITY separately from whether its
          rule could reach a classification, so a dimension can carry a high
          data score and still be unclassifiable (fresh inputs, but the rule
          needs something they do not provide). Left unexplained that pair
          reads as a contradiction, so it is named explicitly rather than
          hidden — and neither number is altered to make them agree. */}
      {!card.rated && card.confidenceScore !== null && (
        <p className="mt-1.5 text-[11px] leading-relaxed text-white/35 light:text-slate-400">
          The {card.confidenceScore}/100 score above rates the freshness and availability of this dimension&rsquo;s input data, not
          the classification. The inputs are present; the engine&rsquo;s rule still could not reach a verdict from them.
        </p>
      )}

      {/* displaySummary() passes the engine's own sentence through
          untouched, and substitutes a neutral explanation only when that
          sentence would restate the raw "insufficient-data" sentinel. See
          its rationale in macroIntelligenceViews.ts. */}
      <p className="mt-2 text-[12px] leading-relaxed text-white/60 light:text-slate-600">{card.displaySummary}</p>

      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-white/5 pt-2.5 text-[11px] text-white/35 light:border-black/5 light:text-slate-400">
        <span className="tabular-nums">
          {card.usableCount} of {card.totalInputs} indicator{card.totalInputs === 1 ? "" : "s"} usable
        </span>
        <span aria-hidden="true">·</span>
        <span className="tabular-nums">{heldLabel(card)}</span>
      </div>

      {card.missingInputs.length > 0 && (
        <p className="mt-1.5 text-[11px] leading-relaxed text-amber-400/70">
          Unavailable: {card.missingInputs.join(", ")}
        </p>
      )}

      {card.evidence.length > 0 && (
        <details className="group mt-2.5">
          <summary className="w-fit cursor-pointer list-none text-[11px] font-medium text-white/40 hover:text-white/70 light:text-slate-500 light:hover:text-slate-700">
            <span className="inline-flex items-center gap-1">
              Evidence and sources
              <span aria-hidden="true" className="transition-transform group-open:rotate-90">›</span>
            </span>
          </summary>
          <ul className="mt-2">
            {card.evidence.map((e) => (
              <EvidenceRow key={e.seriesId} evidence={e} />
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

export default function MacroRegimeDashboard({
  report,
  analytics,
}: {
  report: MacroIntelligenceReport;
  analytics: HistoricalAnalyticsReport;
}) {
  const cards = buildDimensionCards(report.signals, analytics.timeline);
  const coverage = buildCoverageSeries(analytics.timeline);
  const confidence = buildConfidenceSeries(report.signals);
  const { turningPoints, economic, coverage: coverageEvents } = separateTransitions(analytics.transitions);

  const ratedCount = cards.filter((c) => c.rated).length;
  const newest = analytics.timeline.length > 0 ? analytics.timeline[analytics.timeline.length - 1] : null;

  return (
    <section className="glass-card scroll-mt-[60px] p-6 sm:scroll-mt-[120px] sm:p-8" id="macro-regime">
      <span className="text-label text-neon-blue">Regime Dashboard</span>
      <p className="mt-2 max-w-2xl text-sm text-white/60 light:text-slate-500">
        The current classification of each dimension, how well-evidenced it is, and what the stored record shows about how it got
        here. Every figure is an observation the system persisted — none is reconstructed, interpolated or forecast.
      </p>

      {/* Headline counts, all of them plain tallies of the engine's output. */}
      <div className="section-divider mt-4 grid grid-cols-2 divide-x divide-[var(--border-subtle)] pt-4 sm:grid-cols-4">
        {[
          { label: "Dimensions classified", value: `${ratedCount} of ${cards.length}` },
          { label: "Stored snapshots", value: `${analytics.sufficiency.snapshotCount}` },
          { label: "Observed reversals", value: `${turningPoints.length}` },
          { label: "Coverage changes", value: `${coverageEvents.length}` },
        ].map((s) => (
          <div key={s.label} className="px-3 py-1 first:pl-0">
            <p className="text-label text-white/45 light:text-slate-400">{s.label}</p>
            <p className="text-mono-num mt-1 text-sm font-semibold tabular-nums text-white light:text-slate-900">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <DimensionCard key={card.id} card={card} />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel
            title="Input Data Quality by Dimension"
            caption="The engine's own score for the freshness and availability of each dimension's input data. A higher score means better-evidenced inputs — not better news, and not a more reliable classification."
          >
            <ConfidenceBarChart data={confidence} />
          </Panel>

          <Panel
            title="Data Coverage per Snapshot"
            caption="How many dimensions the engine could classify on each stored snapshot. This is a measure of data availability, not of economic conditions — a taller bar means more of the picture was visible that day."
          >
            <CoverageBarChart data={coverage} />
            {newest && (
              <p className="mt-3 border-t border-white/5 pt-3 text-[11px] leading-relaxed text-white/30 light:border-black/5 light:text-slate-400">
                Most recent snapshot {newest.snapshotDate}: {newest.coverage.classified} of {newest.coverage.recorded} dimensions
                classified.
              </p>
            )}
          </Panel>
        </div>

        {/* The caveat is stated once, prominently, in the section that
            introduces snapshot-dated charts and events. */}
        <p className="rounded-lg border border-white/10 bg-white/[0.02] p-4 text-[11px] leading-relaxed text-white/40 light:border-black/10 light:bg-black/[0.015] light:text-slate-500">
          <span className="font-semibold text-white/60 light:text-slate-600">Reading the dates above. </span>
          {SNAPSHOT_DATE_CAVEAT}{" "}
          {economic.length > 0 || turningPoints.length > 0
            ? `Of the ${analytics.transitions.length} recorded state changes, ${coverageEvents.length} reflect a change in what could be measured rather than a change in conditions.`
            : "No state changes have been recorded across the stored snapshots."}
        </p>

        <p className="text-[11px] leading-relaxed text-white/30 light:text-slate-400">{analytics.sufficiency.note}</p>
      </div>
    </section>
  );
}
