// Section 4: tightening and easing cycles, and summary statistics.
//
// A "cycle" is a maximal run of consecutive rate changes in the same direction (definition in analytics.ts). Because meetings that held
// the rate are not in SBP's series, a cycle's length is the span from its first change to its last: it says nothing about pauses
// inside the run. The dumbbell shows the rate at the start of each cycle and at its end, so the size of the move is read from POSITION
// on a shared axis (which is why the axis is allowed to start above zero), not from a length.
//
// Server component (the dumbbell chart itself is a client component).

import { Callout, ChartFrame } from "@/components/analytics/ChartFrame";
import { DumbbellPlot } from "@/components/analytics/RowCharts";
import { monthKeyOf, monthLabel } from "@/lib/inflation/periods";
import { formatDate, pct, signedPp, spanText } from "@/lib/policyRate/format";
import type { PolicyRateViewModel } from "@/lib/policyRate/viewModel";

const label = (c: PolicyRateViewModel["cycles"][number]) => `${c.direction === "tightening" ? "Tightening" : "Easing"}, ${monthLabel(monthKeyOf(c.startDate))} – ${monthLabel(monthKeyOf(c.endDate))}`;

export default function CyclesSection({ model }: { model: PolicyRateViewModel }) {
  const s = model.stats;
  if (!s || model.cycles.length === 0) {
    return <Callout tone="limit" title="No cycles to show">Cycles need at least one rate change; the policy-rate history is unavailable or holds a single level.</Callout>;
  }
  return (
    <div className="flex flex-col gap-7">
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Highest rate", `${pct(s.highest.value)}`, `from ${formatDate(s.highest.from)}${s.highest.until ? ` until ${formatDate(s.highest.until)}` : ", still current"}`],
          ["Lowest rate", `${pct(s.lowest.value)}`, `from ${formatDate(s.lowest.from)}${s.lowest.until ? ` until ${formatDate(s.lowest.until)}` : ", still current"}`],
          ["Range", `${s.range.toFixed(2)} pp`, "highest minus lowest"],
          ["Time-weighted average", pct(s.timeWeightedMean), `${formatDate(s.firstDate)} to ${formatDate(s.asOf)}`],
        ].map(([t, v, d]) => (
          <div key={t} className="rounded-[var(--pe-radius)] border border-pe-border bg-pe-surface px-3 py-2.5">
            <dt className="text-[12px] text-pe-text-2">{t}</dt>
            <dd className="mt-0.5 text-[18px] font-semibold tabular-nums text-pe-text">{v}</dd>
            <dd className="mt-0.5 text-[11.5px] leading-snug text-pe-text-2">{d}</dd>
          </div>
        ))}
      </dl>

      <ChartFrame
        title="Where each cycle started and ended"
        howToRead="Each line connects the policy rate just before a cycle's first change (open dot) to the rate after its last change (filled dot). The number at the right is the total move in percentage points."
        source={`Source: derived from the SBP policy-rate history · ${model.cycles.length} cycles (runs of same-direction changes)`}
        table={{
          caption: "Cycles",
          head: ["Cycle", "First change", "Last change", "Changes", "Start rate", "End rate", "Total (pp)", "Span"],
          rows: model.cycles.map((c) => [c.direction === "tightening" ? "Tightening" : "Easing", formatDate(c.startDate), formatDate(c.endDate), String(c.changes), pct(c.startRate), pct(c.endRate), signedPp(c.totalChange), spanText(c.spanMonths)]),
        }}
      >
        <DumbbellPlot
          rows={model.cycles.map((c) => ({ key: c.startDate, label: label(c), from: c.startRate, to: c.endRate }))}
          fromLabel="Rate before the first change"
          toLabel="Rate after the last change"
          decimals={2}
          zeroBaseline={false}
          ariaLabel={`Dumbbell chart of the start and end rate of ${model.cycles.length} tightening and easing cycles`}
        />
      </ChartFrame>

      <div className="relative overflow-x-auto rounded-[var(--pe-radius)] border border-pe-border" tabIndex={0} role="region" aria-label="Cycles table (scrolls sideways)">
        <table className="w-full min-w-[720px] border-collapse text-left text-[12.5px] tabular-nums">
          <caption className="sr-only">Tightening and easing cycles: first and last change, number of changes, start and end rate, total move and span</caption>
          <thead className="bg-pe-surface-2 text-pe-text-2">
            <tr>
              {["Cycle", "First change", "Last change", "Changes", "Start → end", "Total", "Span"].map((h) => (
                <th key={h} scope="col" className="px-3 py-2 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="text-pe-text">
            {model.cycles.map((c) => (
              <tr key={c.startDate} className="border-t border-pe-border">
                <th scope="row" className="whitespace-nowrap px-3 py-1.5 text-left font-normal text-pe-text">
                  {c.direction === "tightening" ? "Tightening" : "Easing"}
                  {c.latest ? <span className="ms-2 rounded-[var(--pe-radius-sm)] border border-pe-border bg-pe-surface-2 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.05em] text-pe-text-2">latest</span> : null}
                </th>
                <td className="whitespace-nowrap px-3 py-1.5">{formatDate(c.startDate)}</td>
                <td className="whitespace-nowrap px-3 py-1.5">{formatDate(c.endDate)}</td>
                <td className="px-3 py-1.5">{c.changes}</td>
                <td className="whitespace-nowrap px-3 py-1.5">{pct(c.startRate)} → {pct(c.endRate)}</td>
                <td className="whitespace-nowrap px-3 py-1.5 font-medium">{signedPp(c.totalChange)} pp</td>
                <td className="whitespace-nowrap px-3 py-1.5 text-pe-text-2">{spanText(c.spanMonths)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="-mt-3 max-w-3xl font-mono text-[11px] leading-relaxed text-pe-text-3">
        A cycle ends only when the next change goes the other way, so a long pause between two increases does not split a run. Because meetings that held the rate are not in the series, &ldquo;span&rdquo; runs from the first change to the last and says nothing about pauses inside it.
      </p>
    </div>
  );
}
