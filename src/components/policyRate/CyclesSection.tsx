// Section 4: tightening, easing and holding.
//
// A "cycle" is a maximal run of consecutive rate changes in the same direction (definition in analytics.ts). Because meetings that held
// the rate are not in SBP's series, a cycle's length is the span from its first change to its last: it says nothing about pauses
// inside the run. This section shows the same history four ways, each answering one question:
//   - the timeline: WHEN was the rate being raised, cut or left alone, and where did each run turn?
//   - the dumbbell: how far did each run move the rate (read from position on a shared axis, which is why it may start above zero)?
//   - the running totals: how much has been added and taken off in all, and what is the net?
//   - the bars: how long did the rate stay at each level (every pause, including those inside a run)?
//
// Server component (the charts themselves are client components).

import { Callout, ChartFrame } from "@/components/analytics/ChartFrame";
import { Key } from "@/components/analytics/controls";
import { DateLines, DetailBars, type DateLineSeries, type DetailBar } from "@/components/analytics/DateCharts";
import RegimeTimeline from "@/components/analytics/RegimeTimeline";
import { DumbbellPlot } from "@/components/analytics/RowCharts";
import StatStrip from "@/components/policyRate/StatStrip";
import { longestKnownHold } from "@/lib/policyRate/analytics";
import { monthKeyOf, monthLabel, shortMonthLabel } from "@/lib/inflation/periods";
import { daysText, formatDate, pct, signedPp, spanText } from "@/lib/policyRate/format";
import type { PolicyRateViewModel } from "@/lib/policyRate/viewModel";

const label = (c: PolicyRateViewModel["cycles"][number]) => `${c.direction === "tightening" ? "Tightening" : "Easing"}, ${monthLabel(monthKeyOf(c.startDate))} – ${monthLabel(monthKeyOf(c.endDate))}`;
const MONTH_DAYS = 30.4375;

export default function CyclesSection({ model }: { model: PolicyRateViewModel }) {
  const s = model.stats;
  if (!s || model.cycles.length === 0) {
    return <Callout tone="limit" title="No cycles to show">Cycles need at least one rate change; the policy-rate history is unavailable or holds a single level.</Callout>;
  }

  const tightening = model.cycles.filter((c) => c.direction === "tightening");
  const easing = model.cycles.filter((c) => c.direction === "easing");
  const sum = (xs: typeof model.cycles) => xs.reduce((t, c) => t + c.totalChange, 0);
  const longest = longestKnownHold(model.levels);

  const cumulativeSeries: DateLineSeries[] = [
    { key: "increases", label: "Cumulative increases", color: "orange", kind: "step", points: model.cumulative.map((p) => ({ date: p.date, value: p.increases })) },
    { key: "cuts", label: "Cumulative cuts", color: "teal", kind: "step", points: model.cumulative.map((p) => ({ date: p.date, value: p.cuts })) },
    { key: "net", label: "Net change", color: "purple", kind: "step", points: model.cumulative.map((p) => ({ date: p.date, value: p.net })) },
  ];

  const holdBars: DetailBar[] = model.levels.map((l) => {
    const how = l.enteredBy === "start" ? "start of the series" : l.enteredBy === "hike" ? "reached by an increase" : "reached by a cut";
    return {
      id: l.from,
      label: shortMonthLabel(monthKeyOf(l.from)),
      value: l.days / MONTH_DAYS,
      color: l.enteredBy === "hike" ? "orange" : l.enteredBy === "cut" ? "teal" : "slate",
      title: `${pct(l.rate)} from ${formatDate(l.from)}`,
      lines: [
        `${how}; ${l.current ? `still in effect, ${daysText(l.days)} so far` : `lasted ${daysText(l.days)} (to ${formatDate(l.until as string)})`}.`,
        ...(l.enteredBy === "start" ? ["The series begins here: the rate may have been at this level before, so this is a lower bound."] : []),
      ],
      emphasis: longest !== null && l.from === longest.from,
    };
  });

  return (
    <div className="flex flex-col gap-7">
      <StatStrip
        label="Cycle summary"
        items={[
          { label: "Highest rate", value: pct(s.highest.value), detail: `from ${formatDate(s.highest.from)}${s.highest.until ? ` until ${formatDate(s.highest.until)}` : ", still current"}` },
          { label: "Lowest rate", value: pct(s.lowest.value), detail: `from ${formatDate(s.lowest.from)}${s.lowest.until ? ` until ${formatDate(s.lowest.until)}` : ", still current"}` },
          { label: "Range", value: `${s.range.toFixed(2)} pp`, detail: "highest minus lowest" },
          { label: "Time-weighted average", value: pct(s.timeWeightedMean), detail: `${formatDate(s.firstDate)} to ${formatDate(s.asOf)}` },
          { label: "Tightening runs", value: String(tightening.length), detail: `${signedPp(sum(tightening))} pp in all` },
          { label: "Easing runs", value: String(easing.length), detail: `${signedPp(sum(easing))} pp in all` },
          ...(longest ? [{ label: "Longest known hold", value: daysText(longest.days), detail: `${pct(longest.rate)}, ${formatDate(longest.from)} to ${formatDate(longest.until as string)}` }] : []),
        ]}
      />

      <ChartFrame
        title="Tightening, easing and holding"
        howToRead="The purple line is the policy rate. Orange shading and strip: the rate was being raised. Teal: it was being cut. Grey: no change recorded and no run in progress. Dots are where a run ended and the next change went the other way; the last one is open because nothing has followed it. Small ticks in the strip are the recorded changes."
        legend={<Key items={[{ label: "Tightening (increases)", color: "var(--pe-viz-orange)" }, { label: "Easing (cuts)", color: "var(--pe-viz-teal)" }, { label: "Holding (no change recorded)", color: "var(--pe-border-strong)" }]} />}
        source={`Source: derived from the SBP policy-rate history · ${model.cycles.length} runs of same-direction changes · ${formatDate(s.firstDate)} to ${formatDate(model.asOf)}`}
        table={{
          caption: "Tightening, easing and holding periods",
          head: ["Period", "From", "To", "Length", "Changes", "Rate"],
          rows: model.regimes.map((r) => [r.kind === "hold" ? "Holding" : r.kind === "tightening" ? "Tightening" : "Easing", formatDate(r.from), r.open ? `${formatDate(r.to)} (open)` : formatDate(r.to), daysText(r.days), r.kind === "hold" ? "none" : String(r.changes), r.kind === "hold" ? pct(r.startRate) : `${pct(r.startRate)} to ${pct(r.endRate)}`]),
        }}
      >
        <RegimeTimeline decisions={model.decisions} regimes={model.regimes} levels={model.levels} turningPoints={model.turningPoints} asOf={model.asOf} animate ariaLabel={`Policy rate from ${formatDate(s.firstDate)} to ${formatDate(model.asOf)} with ${tightening.length} tightening and ${easing.length} easing runs and the holding periods between them`} />
      </ChartFrame>

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

      <ChartFrame
        title="Cumulative increases and cuts"
        howToRead="Orange is the running total of every increase; teal is the running total of every cut (below zero); purple is the net of the two, which equals today's rate minus the first rate in the series. The two gross lines show how much more has been added and taken off than the net suggests."
        legend={<Key items={cumulativeSeries.map((x) => ({ label: x.label, color: `var(--pe-viz-${x.color})` }))} />}
        source={`Source: derived from the SBP policy-rate history · percentage points, from ${formatDate(s.firstDate)} · each line steps on the date of a recorded change`}
        table={{ caption: "Cumulative changes in the policy rate", head: ["Date", "Increases (pp)", "Cuts (pp)", "Net (pp)"], rows: model.cumulative.map((p) => [formatDate(p.date), signedPp(p.increases), signedPp(p.cuts), signedPp(p.net)]) }}
      >
        <DateLines series={cumulativeSeries} from={null} to={model.asOf} unit=" pp" decimals={2} height={300} animate ariaLabel={`Cumulative increases, cumulative cuts and net change in the policy rate since ${formatDate(s.firstDate)}`} />
      </ChartFrame>

      <ChartFrame
        title="How long the rate stayed at each level"
        howToRead={`One bar per level, in months. Orange: the level was reached by an increase. Teal: by a cut. Grey: the first level, whose true start is before the series begins. The outlined bar is the longest hold whose start is known${longest ? ` (${pct(longest.rate)}, ${daysText(longest.days)})` : ""}. This counts every pause, including those inside a run of changes. The last bar is the level in effect now, so it is still growing.`}
        legend={<Key items={[{ label: "After an increase", color: "var(--pe-viz-orange)" }, { label: "After a cut", color: "var(--pe-viz-teal)" }, { label: "First level (start unknown)", color: "var(--pe-viz-slate)" }]} />}
        source={`Source: derived from the SBP policy-rate history · ${model.levels.length} levels · months of 30.44 days · a repeated value does not start a new level`}
        table={{ caption: "How long each policy-rate level lasted", head: ["Rate", "From", "Until", "Length"], rows: model.levels.map((l) => [pct(l.rate), formatDate(l.from), l.until ? formatDate(l.until) : "still in effect", daysText(l.days)]) }}
      >
        <DetailBars data={holdBars} unit=" mo" decimals={1} height={280} animate ariaLabel={`Bar chart of how many months each of ${model.levels.length} policy-rate levels lasted`} />
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
        A cycle ends only when the next change goes the other way, so a long pause between two increases does not split a run. Because meetings that held the rate are not in the series, &ldquo;span&rdquo; runs from the first change to the last and says nothing about pauses inside it. &ldquo;Holding&rdquo; on the timeline means no change was recorded and no run was under way; it is not a count of meetings.
      </p>
    </div>
  );
}
