"use client";

// Engine confidence by dimension (Macro Intelligence, Phase C).
//
// WHY A CHART IS LEGITIMATE HERE
// confidenceScore is produced BY the engine on a 0-100 scale. Plotting it
// invents nothing. The categorical `state` is shown as text beside each bar,
// never mapped to a position on the value axis — there is no valid ordering
// of "tightening" against "deteriorating", so none is drawn.
//
// UNSCORED DIMENSIONS
// A dimension the engine could not classify has a null score. It is listed
// with an explicit "not scored" marker and NO bar. A zero-length bar would
// read as "zero confidence" when the engine's meaning is "confidence was not
// computed because the evidence was inadequate" — a different claim.
//
// WHY NOT RECHARTS
// The axis is a fixed, known 0-100 and there are at most seven rows, so a
// CSS meter per dimension is more legible than a rendered chart, keeps the
// dimension labels readable at phone width, and needs no client JS to draw.
// Colour follows MacroIntelligenceSection's rule: confidence is the only
// severity the engine computes, so confidence is the only thing coloured.

import type { ConfidencePoint } from "@/lib/macroIntelligenceViews";

export default function ConfidenceBarChart({ data }: { data: ConfidencePoint[] }) {
  if (data.length === 0) {
    return <p className="text-[13px] text-white/40 light:text-slate-500">No signals are available.</p>;
  }

  const scored = data.filter((d) => d.score !== null);
  const unscored = data.filter((d) => d.score === null);

  return (
    <div className="flex flex-col gap-4">
      {scored.length > 0 && (
        <ul className="flex flex-col gap-2.5">
          {scored.map((d) => (
            <li key={d.dimension} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[150px_minmax(0,1fr)_auto]">
              <span className="truncate text-[13px] text-white/70 light:text-slate-700">
                {d.label}
                {/* A dimension can score high on input quality and still be
                    unclassifiable. Flagged inline so the bar is never read
                    as confidence in a classification that does not exist. */}
                {!d.rated && <span className="ml-1.5 text-[10px] text-white/35 light:text-slate-400">(unclassified)</span>}
              </span>
              <div
                className="order-3 h-2 w-full overflow-hidden rounded-full bg-white/10 sm:order-none light:bg-black/10"
                role="img"
                aria-label={`${d.label}: engine confidence ${d.score} of 100, state ${d.state.replace(/-/g, " ")}`}
              >
                <div className="h-full rounded-full bg-sky-400/70" style={{ width: `${d.score}%` }} />
              </div>
              <span className="text-mono-num text-[12px] tabular-nums text-white/55 light:text-slate-600">{d.score}</span>
            </li>
          ))}
        </ul>
      )}

      {unscored.length > 0 && (
        <div className="border-t border-white/5 pt-3 light:border-black/5">
          <p className="text-[11px] leading-relaxed text-white/35 light:text-slate-400">
            Not scored — the engine reported no confidence value for these dimensions because the available evidence was inadequate
            to classify them. They are not drawn as zero, which would be a different statement.
          </p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {unscored.map((d) => (
              <li
                key={d.dimension}
                className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-px text-[11px] text-white/40 light:border-black/10 light:bg-black/[0.02] light:text-slate-500"
              >
                {d.label}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="border-t border-white/5 pt-3 text-[11px] leading-relaxed text-white/30 light:border-black/5 light:text-slate-400">
        This is the engine&rsquo;s own 0&ndash;100 score for the freshness and availability of each dimension&rsquo;s input data. It
        measures evidence quality &mdash; not the severity or desirability of the condition described, and not the reliability of the
        classification itself. A dimension marked <span className="text-white/45 light:text-slate-500">(unclassified)</span> has
        usable inputs but no verdict: the engine&rsquo;s rule could not reach one from them.
      </p>
    </div>
  );
}
