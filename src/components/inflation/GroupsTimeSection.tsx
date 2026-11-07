"use client";

// Section 6b: the CPI groups over time.
//   - Heatmap: every group × every month (year on year, or month on month).
//   - Stacked bars: each month's headline rate split into group contributions.
//   - Waterfall: how the headline rate moved between two chosen months, by group.
//   - Small multiples: one trend per group on a shared scale.
//
// The stacked bars and waterfall are legitimate only because the contributions
// are additive (they sum to the headline — verified on every parse and again in
// the page's checks). They would be invalid if built from weights or group rates.

import { useMemo, useState } from "react";
import { Callout, ChartFrame } from "@/components/analytics/ChartFrame";
import { ControlBar, Key, Segmented, Select } from "@/components/analytics/controls";
import { Heatmap } from "@/components/analytics/Heatmap";
import { WaterfallChart } from "@/components/analytics/RowCharts";
import { SmallMultiples } from "@/components/analytics/SmallMultiples";
import { StackedBars } from "@/components/analytics/TimeCharts";
import { MOM_SCALE, YOY_SCALE } from "@/lib/analytics/vizPalette";
import { formatValue } from "@/lib/analytics/scales";
import { buildWaterfall, rankDescending } from "@/lib/inflation/analytics";
import { RANGE_OPTIONS, type RangeKey } from "@/lib/inflation/chartData";
import { groupHeatRows, groupMonths, groupNos, measureMonths, monthOptions, STACK_SERIES, stackedContributions, type GroupMeasure } from "@/lib/inflation/groupViews";
import { groupLabel } from "@/lib/inflation/groups";
import { monthIndex, monthLabel, shiftMonth, shortMonthLabel, type MonthKey } from "@/lib/inflation/periods";
import type { GroupModel } from "@/lib/inflation/viewModel";

const lastMonths = <T,>(arr: readonly T[], range: RangeKey, key: (t: T) => MonthKey): T[] => {
  if (range === "all" || arr.length === 0) return [...arr];
  const newest = monthIndex(key(arr[arr.length - 1]));
  return arr.filter((a) => monthIndex(key(a)) > newest - Number(range));
};

export default function GroupsTimeSection({ groups }: { groups: GroupModel | null }) {
  const months = useMemo(() => (groups ? groupMonths(groups) : []), [groups]);
  const [measure, setMeasure] = useState<GroupMeasure>("yoy");
  const [shared, setShared] = useState<"own" | "shared">("own");
  const [heatRange, setHeatRange] = useState<RangeKey>("24");
  const [stackRange, setStackRange] = useState<RangeKey>("24");
  const [to, setTo] = useState<MonthKey>(months[months.length - 1] ?? "");
  const defaultFrom = months.includes(shiftMonth(months[months.length - 1] ?? "2000-01", -12)) ? shiftMonth(months[months.length - 1], -12) : (months[0] ?? "");
  const [from, setFrom] = useState<MonthKey>(defaultFrom);

  if (!groups) {
    return <Callout tone="limit" title="Group history is unavailable right now">PBS&rsquo;s group-level CPI history could not be loaded or did not pass PEIC&rsquo;s integrity checks, so the heatmap, contribution charts and trends are not drawn.</Callout>;
  }

  // Heatmap
  const heatMonthsAll = measureMonths(groups, measure);
  const heatMonths = lastMonths(heatMonthsAll.map((m) => ({ month: m })), heatRange, (x) => x.month).map((x) => x.month);
  const heatRows = groupHeatRows(groups, heatMonths, measure);
  const heatScale = measure === "yoy" ? YOY_SCALE : MOM_SCALE;
  const unitText = measure === "yoy" ? "year on year" : "month on month";

  // Stacked contributions
  const stackMonths = lastMonths(months.map((m) => ({ month: m })), stackRange, (x) => x.month).map((x) => x.month);
  const stackRows = stackedContributions(groups, stackMonths);

  // Waterfall
  const wf = from !== to ? buildWaterfall(groups.contribYoY, from, to) : null;
  const wfRows = wf
    ? [
        { key: "start", label: `Headline ${shortMonthLabel(from)}`, kind: "total" as const, value: wf.start },
        ...rankDescending(wf.steps, (s) => s.delta).map((s) => ({ key: `g${s.groupNo}`, label: groupLabel(s.groupNo).short, kind: "delta" as const, value: s.delta })),
        { key: "end", label: `Headline ${shortMonthLabel(to)}`, kind: "total" as const, value: wf.end },
      ]
    : [];
  const fromOptions = monthOptions(months.filter((m) => m < to));

  return (
    <div className="flex flex-col gap-8">
      <ChartFrame
        title="Every group, every month"
        howToRead={
          measure === "yoy"
            ? "Each cell is one group's year-on-year inflation in one month. Darker = higher. Blue cells are below zero. Hatched cells have no observation."
            : "Each cell is one group's change from the previous month. Orange = prices rose, blue = fell, grey = barely moved. Hatched cells have no observation."
        }
        legend={
          <ControlBar>
            <Segmented name="gt-measure" label="Measure" value={measure} onChange={setMeasure} options={[{ value: "yoy", label: "Year on year" }, { value: "mom", label: "Month on month" }]} />
            <Segmented name="gt-heat-range" label="Months" value={heatRange} onChange={setHeatRange} options={RANGE_OPTIONS.filter((o) => o.value !== "60")} />
          </ControlBar>
        }
        source={`Source: PBS CPI group indices (base 2015-16), derived ${unitText} · ${heatMonths.length} months × 12 groups`}
      >
        <Heatmap
          rows={heatRows}
          columns={heatMonths.map((m) => ({ key: m, label: shortMonthLabel(m) }))}
          scale={heatScale}
          decimals={measure === "yoy" ? 1 : 1}
          caption={`Inflation by CPI group and month, % ${unitText}`}
          cellTitle={(r, c, v) => `${r.label}, ${monthLabel(c.key)}: ${v === null ? "no data" : `${formatValue(v, 2)}% ${unitText}`}`}
        />
      </ChartFrame>

      <ChartFrame
        title="What the headline is made of, month by month"
        howToRead={
          <>
            Each bar is that month&rsquo;s headline year-on-year rate, split into <strong className="font-medium text-pe-text">percentage-point contributions</strong> from each group; the dot is the total. The bands add up to the headline exactly. Groups not named are folded into one band.
          </>
        }
        legend={
          <ControlBar>
            <Key items={STACK_SERIES.map((s) => ({ label: s.label, color: `var(--pe-viz-${s.color})` }))} />
            <Segmented name="gt-stack-range" label="Months" value={stackRange} onChange={setStackRange} options={RANGE_OPTIONS.filter((o) => o.value !== "60")} />
          </ControlBar>
        }
        source="Source: derived — contribution = weight × change in group index ÷ headline index (twelve-month change)"
        table={{ caption: "Contribution to the headline year-on-year rate, percentage points", head: ["Month", ...STACK_SERIES.map((s) => s.label), "Total"], rows: stackRows.map((r) => [monthLabel(r.month), ...STACK_SERIES.map((s) => formatValue(r[s.key] as number, 2)), formatValue(r.total, 2)]) }}
      >
        <StackedBars data={stackRows} series={STACK_SERIES} ariaLabel={`Stacked bars: the headline year-on-year rate split into group contributions, ${stackRows.length} months`} />
      </ChartFrame>

      <ChartFrame
        title="What moved the headline between two months"
        howToRead="Starts at the headline rate in the earlier month, adds each group's change in contribution (orange = pushed the rate up, teal = pulled it down), and ends at the later month's rate. The steps add up exactly."
        legend={
          <ControlBar>
            <Select id="wf-from" label="From" value={from} onChange={setFrom} options={fromOptions} />
            <Select id="wf-to" label="To" value={to} onChange={(v) => { setTo(v); if (from >= v) setFrom(months.find((m) => m < v) ?? from); }} options={monthOptions(months.slice(1))} />
          </ControlBar>
        }
        source="Source: derived — change in each group's contribution to the headline year-on-year rate"
        table={wf ? { caption: "Waterfall: headline rate and group changes, percentage points", head: ["Step", "pp"], rows: wfRows.map((r) => [r.label, formatValue(r.value, 2, { signed: r.kind === "delta" })]) } : undefined}
      >
        {wf ? (
          <WaterfallChart rows={wfRows} ariaLabel={`Waterfall of the headline year-on-year rate from ${monthLabel(from)} to ${monthLabel(to)}, by CPI group`} />
        ) : (
          <Callout tone="limit" title="Choose two different months">Pick an earlier &ldquo;From&rdquo; month and a later &ldquo;To&rdquo; month.</Callout>
        )}
      </ChartFrame>

      <ChartFrame
        title="Each group's own trend"
        howToRead={shared === "shared" ? "Twelve small charts on ONE shared vertical scale, so a flat line really is flat next to a steep one — but a few volatile groups can flatten the rest." : "Twelve small charts, each on its OWN vertical scale (printed in the corner) so every group’s shape is visible. Do not compare heights between charts; switch to the shared scale for that."}
        legend={<Segmented name="gt-scale" label="Vertical scale" value={shared} onChange={setShared} options={[{ value: "own", label: "Each group’s own" }, { value: "shared", label: "Same for all" }]} />}
        source="Source: PBS CPI group indices, derived year-on-year"
      >
        <SmallMultiples sharedScale={shared === "shared"} items={groupNos(groups).map((no) => ({ key: String(no), label: groupLabel(no).short, points: groups.yoy[no] }))} />
      </ChartFrame>
    </div>
  );
}
