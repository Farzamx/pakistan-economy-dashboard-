"use client";

// Section 6a: the CPI expenditure groups at a chosen month — which groups are
// rising fastest, which are doing the work in the headline, and how that moved.
//
// Three different numbers per group are shown and never mixed:
//   rate          the group's own year-on-year inflation   (dot plot, dumbbell, bars)
//   weight        its fixed share of the basket            (treemap area, table)
//   contribution  percentage points it adds to the headline (lollipop, table)
// One month selector drives every chart and the table, so they always describe
// the same month.

import { useMemo, useState } from "react";
import { Callout, ChartFrame } from "@/components/analytics/ChartFrame";
import { ControlBar, Key, Select } from "@/components/analytics/controls";
import { DotPlot, DumbbellPlot, LollipopChart } from "@/components/analytics/RowCharts";
import { ClusteredBars, type SeriesSpec } from "@/components/analytics/TimeCharts";
import { Treemap } from "@/components/analytics/Treemap";
import { rankDescending } from "@/lib/inflation/analytics";
import { componentTable, contributionRowAt, groupMonths, groupRatesAt, monthOptions, rankedByRate, valueAt } from "@/lib/inflation/groupViews";
import { groupLabel } from "@/lib/inflation/groups";
import { monthLabel, shiftMonth, type MonthKey } from "@/lib/inflation/periods";
import { formatPp, formatValue } from "@/lib/analytics/scales";
import type { GroupModel, InflationViewModel } from "@/lib/inflation/viewModel";

/** A value as text with `decimals`, or null (rendered as "no data") — never "NaN". */
const fmtOrNull = (v: number | null, decimals = 2): string | null => (v === null ? null : formatValue(v, decimals));

export default function GroupsSnapshotSection({ groups, snapshot }: { groups: GroupModel | null; snapshot: InflationViewModel["snapshot"] }) {
  const months = useMemo(() => (groups ? groupMonths(groups) : []), [groups]);
  const [month, setMonth] = useState<MonthKey>(months[months.length - 1] ?? "");

  // ── Degraded: the group history is unavailable, but the database may still hold the latest month's snapshot. ──
  if (!groups) {
    if (!snapshot) {
      return <Callout tone="limit" title="CPI group data is unavailable right now">PBS&rsquo;s group-level CPI data could not be loaded, and no stored snapshot exists. Nothing is drawn rather than estimated.</Callout>;
    }
    const rows = rankDescending(snapshot.rows, (r) => r.yoy);
    return (
      <div className="flex flex-col gap-6">
        <Callout tone="limit" title="Showing the latest month only">Full group history could not be loaded, so only PBS&rsquo;s latest monthly report ({monthLabel(snapshot.month)}) is shown. Contributions, history and comparisons are unavailable until the history loads.</Callout>
        <ChartFrame
          title={`Year-on-year inflation by CPI group, ${monthLabel(snapshot.month)}`}
          source={`Source: PBS monthly inflation report · ${monthLabel(snapshot.month)}`}
          table={{ caption: "Group inflation and weights", head: ["Group", "Weight (%)", "YoY (%)"], rows: rows.map((r) => [groupLabel(r.groupNo).name, formatValue(r.weight, 2), formatValue(r.yoy, 2)]) }}
        >
          <DotPlot rows={rows.map((r) => ({ key: String(r.groupNo), label: groupLabel(r.groupNo).short, value: r.yoy, detail: `Basket weight ${formatValue(r.weight, 2)}%` }))} ariaLabel={`Year-on-year inflation by CPI group, ${monthLabel(snapshot.month)}`} />
        </ChartFrame>
        <ChartFrame title="Basket weights and inflation" source={`Source: PBS monthly inflation report · ${monthLabel(snapshot.month)}`}>
          <Treemap items={snapshot.rows.map((r) => ({ id: String(r.groupNo), label: groupLabel(r.groupNo).short, weight: r.weight, yoy: r.yoy }))} ariaLabel="Treemap of CPI basket weights coloured by year-on-year inflation" />
        </ChartFrame>
      </div>
    );
  }

  const cur = month || months[months.length - 1];
  const prev = shiftMonth(cur, -1);
  const rates = groupRatesAt(groups, cur);
  const ranked = rankedByRate(rates);
  const crow = contributionRowAt(groups, cur);
  const table = componentTable(groups, cur);
  const hasPrev = months.includes(prev);

  const contribRows = crow
    ? rankDescending(Object.entries(crow.byGroup).map(([no, c]) => ({ no: Number(no), c })), (r) => r.c).map((r) => ({
        key: String(r.no),
        label: groupLabel(r.no).short,
        value: r.c,
        detail: `Weight ${formatValue(groups.weights[r.no], 1)}% · YoY ${fmtOrNull(valueAt(groups.yoy[r.no], cur), 1) ?? "no data"}${valueAt(groups.yoy[r.no], cur) === null ? "" : "%"}`,
      }))
    : [];

  // Clustered bars: this month vs 6 and 12 months earlier, where those exist.
  const periods = [
    { key: "m0", month: cur, color: "blue" as const },
    { key: "m6", month: shiftMonth(cur, -6), color: "orange" as const },
    { key: "m12", month: shiftMonth(cur, -12), color: "teal" as const },
  ].filter((p) => months.includes(p.month));
  const clusterSeries: SeriesSpec[] = periods.map((p) => ({ key: p.key, label: monthLabel(p.month), color: p.color }));
  const clusterData = ranked.map((g) => ({
    period: g.short,
    ...Object.fromEntries(periods.map((p) => [p.key, valueAt(groups.yoy[g.groupNo], p.month)])),
  }));

  return (
    <div className="flex flex-col gap-7">
      <ControlBar>
        <Select id="groups-month" label="Month" value={cur} onChange={setMonth} options={monthOptions(months)} />
        <p className="max-w-xl text-[12px] leading-relaxed text-pe-text-3">
          Every chart and the table below describe <strong className="font-medium text-pe-text-2">{monthLabel(cur)}</strong>. Rates are year on year (vs {monthLabel(shiftMonth(cur, -12))}).
        </p>
      </ControlBar>

      <div className="grid gap-7 lg:grid-cols-2">
        <ChartFrame
          title="Which groups are rising fastest"
          howToRead="Each dot is a group's own year-on-year inflation, highest first. The dashed line is the headline."
          source={`Source: PBS CPI group indices, derived year-on-year · ${monthLabel(cur)}`}
          table={{ caption: `Group year-on-year inflation, ${monthLabel(cur)}`, head: ["Group", "YoY (%)"], rows: ranked.map((g) => [g.name, g.value === null ? null : formatValue(g.value, 2)]) }}
        >
          <DotPlot
            rows={ranked.map((g) => ({ key: String(g.groupNo), label: g.short, value: g.value, detail: `Basket weight ${formatValue(g.weight, 1)}%` }))}
            reference={crow ? { value: crow.headlinePct, label: `Headline ${formatValue(crow.headlinePct, 1)}%` } : undefined}
            ariaLabel={`Dot plot of year-on-year inflation for the 12 CPI groups, ${monthLabel(cur)}`}
          />
        </ChartFrame>

        <ChartFrame
          title="Which groups drive the headline"
          howToRead={
            <>
              Each stem is how many <strong className="font-medium text-pe-text">percentage points</strong>{" "}
              a group adds to the headline rate. A group&rsquo;s contribution depends on both its weight and its rate, so it ranks differently from the chart on the left. The contributions add up to the headline.
            </>
          }
          source={`Source: derived — weight × change in group index ÷ headline index · ${crow ? `${monthLabel(crow.baseMonth)} → ${monthLabel(cur)}` : monthLabel(cur)}`}
          table={{ caption: `Contribution to the headline YoY change, ${monthLabel(cur)}`, head: ["Group", "Contribution (pp)"], rows: contribRows.map((r) => [groupLabel(Number(r.key)).name, formatValue(r.value, 2)]) }}
        >
          <LollipopChart rows={contribRows} unit="pp" ariaLabel={`Lollipop chart of each CPI group's contribution to the headline, ${monthLabel(cur)}`} />
          {crow && <p className="mt-1.5 text-[12px] tabular-nums text-pe-text-2">Total of the 12 contributions: <strong className="font-medium text-pe-text">{formatValue(crow.total, 2)} pp</strong> · headline year-on-year from the index: {formatValue(crow.headlinePct, 2)}%</p>}
        </ChartFrame>
      </div>

      {hasPrev ? (
        <ChartFrame
          title={`Change since ${monthLabel(prev)}`}
          howToRead="Open dot = the group's year-on-year rate last month; filled dot = this month. The figure at the right is the change in percentage points."
          source={`Source: PBS CPI group indices, derived year-on-year · ${monthLabel(prev)} → ${monthLabel(cur)}`}
          table={{ caption: "Group year-on-year rate, previous and selected month", head: ["Group", monthLabel(prev), monthLabel(cur)], rows: ranked.map((g) => [g.name, fmtOrNull(valueAt(groups.yoy[g.groupNo], prev)), fmtOrNull(g.value)]) }}
        >
          <DumbbellPlot
            rows={ranked.map((g) => ({ key: String(g.groupNo), label: g.short, from: valueAt(groups.yoy[g.groupNo], prev), to: g.value }))}
            fromLabel={monthLabel(prev)}
            toLabel={monthLabel(cur)}
            zeroBaseline={false}
            ariaLabel={`Dumbbell plot of each CPI group's year-on-year rate, ${monthLabel(prev)} to ${monthLabel(cur)}`}
          />
        </ChartFrame>
      ) : (
        <Callout tone="limit" title="No previous month">{monthLabel(cur)} is the first month with year-on-year group data, so there is no earlier month to compare it with.</Callout>
      )}

      <ChartFrame
        title="Group inflation now, six months ago and a year ago"
        howToRead="Bars compare each group's year-on-year rate at up to three dates. Groups are ordered by their rate in the selected month."
        legend={<Key items={clusterSeries.map((s) => ({ label: s.label, color: `var(--pe-viz-${s.color})` }))} />}
        source="Source: PBS CPI group indices, derived year-on-year"
        table={{ caption: "Group year-on-year rate at up to three dates", head: ["Group", ...clusterSeries.map((s) => s.label)], rows: ranked.map((g) => [g.name, ...periods.map((p) => fmtOrNull(valueAt(groups.yoy[g.groupNo], p.month)))]) }}
      >
        <ClusteredBars data={clusterData} series={clusterSeries} angled height={380} ariaLabel={`Clustered bars comparing each CPI group's year-on-year rate at ${clusterSeries.map((s) => s.label).join(", ")}`} />
      </ChartFrame>

      <ChartFrame
        title="The basket: size and inflation together"
        howToRead="A group's box is as large as its share of household spending in PBS's fixed 2015-16 basket; its colour is its latest year-on-year inflation. Big and dark means a large, fast-rising part of the basket."
        source={`Source: PBS basket weights (fixed, 2015-16 base) and CPI group indices · ${monthLabel(cur)}`}
      >
        <Treemap items={rates.map((g) => ({ id: String(g.groupNo), label: g.short, weight: g.weight, yoy: g.value }))} ariaLabel={`Treemap of CPI group basket weights coloured by year-on-year inflation, ${monthLabel(cur)}`} />
      </ChartFrame>

      <ChartFrame
        title="Component comparison"
        howToRead="Weight, rate and contribution side by side. Rows are ordered by contribution."
        source={`Source: PBS CPI group indices and fixed basket weights · ${monthLabel(cur)}${hasPrev ? ` vs ${monthLabel(prev)}` : ""}`}
      >
        <div className="relative overflow-x-auto rounded-[var(--pe-radius)] border border-pe-border" tabIndex={0} role="region" aria-label="Component comparison table (scrolls sideways)">
          <table className="w-full min-w-[640px] border-collapse text-left text-[13px] tabular-nums">
            <caption className="sr-only">CPI groups: basket weight, year-on-year rate, change from the previous month, and contribution to the headline, {monthLabel(cur)}</caption>
            <thead className="bg-pe-surface-2 text-[12px] text-pe-text-2">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">Group</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Basket weight</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">YoY rate</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Previous month</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Change</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Contribution</th>
              </tr>
            </thead>
            <tbody>
              {table.rows.map((r) => (
                <tr key={r.groupNo} className="border-t border-pe-border">
                  <th scope="row" className="px-3 py-1.5 font-normal text-pe-text">{r.name}</th>
                  <td className="px-3 py-1.5 text-right text-pe-text-2">{formatValue(r.weight, 2)}%</td>
                  <td className="px-3 py-1.5 text-right text-pe-text">{r.yoy === null ? <span className="text-pe-text-3">no data</span> : `${formatValue(r.yoy, 2)}%`}</td>
                  <td className="px-3 py-1.5 text-right text-pe-text-2">{r.previousYoy === null ? <span className="text-pe-text-3">no data</span> : `${formatValue(r.previousYoy, 2)}%`}</td>
                  <td className="px-3 py-1.5 text-right text-pe-text-2">{r.change === null ? <span className="text-pe-text-3">—</span> : formatPp(r.change, 2)}</td>
                  <td className="px-3 py-1.5 text-right font-medium text-pe-text">{r.contribution === null ? <span className="text-pe-text-3">no data</span> : `${formatValue(r.contribution, 2)} pp`}</td>
                </tr>
              ))}
            </tbody>
            {table.total && (
              <tfoot className="border-t-2 border-pe-border-strong bg-pe-surface-2 text-pe-text">
                <tr>
                  <th scope="row" className="px-3 py-2 text-left font-medium">All groups (headline)</th>
                  <td className="px-3 py-2 text-right">{formatValue(table.total.weight, 1)}%</td>
                  <td className="px-3 py-2 text-right">{formatValue(table.total.headlinePct, 2)}%</td>
                  <td className="px-3 py-2 text-right text-pe-text-3">—</td>
                  <td className="px-3 py-2 text-right text-pe-text-3">—</td>
                  <td className="px-3 py-2 text-right font-medium">{formatValue(table.total.contribution, 2)} pp</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-pe-text-3">
          Observation period: {monthLabel(cur)} (rates compare with {monthLabel(shiftMonth(cur, -12))}). Weights are PBS&rsquo;s fixed 2015-16 basket shares; they do not change month to month, which is why a group&rsquo;s contribution can differ from its weight × its rate.
        </p>
      </ChartFrame>
    </div>
  );
}
