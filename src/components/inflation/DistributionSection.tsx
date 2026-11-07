"use client";

// Section 9: distribution and volatility.
//   - Histogram: how many months inflation spent in each band, for a chosen measure.
//   - Box plot: for each CPI group, the spread of its monthly year-on-year rate —
//     a group with a wide box and long whiskers is a volatile one.
// Both describe the months in PEIC's data, not a forecast, and say how many
// observations they rest on.

import { useMemo, useState } from "react";
import { Callout, ChartFrame } from "@/components/analytics/ChartFrame";
import { ControlBar, Segmented } from "@/components/analytics/controls";
import { BoxPlot } from "@/components/analytics/RowCharts";
import { Histogram } from "@/components/analytics/TimeCharts";
import { boxStats, histogram, rankDescending } from "@/lib/inflation/analytics";
import { coverageText } from "@/lib/inflation/chartData";
import { groupNos } from "@/lib/inflation/groupViews";
import { groupLabel } from "@/lib/inflation/groups";
import { monthLabel, type MonthlyPoint } from "@/lib/inflation/periods";
import { formatValue } from "@/lib/analytics/scales";
import type { GroupModel } from "@/lib/inflation/viewModel";

type M = "headline" | "core" | "food";
const BIN = 2;

export default function DistributionSection({ headline, core, food, groups }: { headline: MonthlyPoint[]; core: MonthlyPoint[]; food: MonthlyPoint[]; groups: GroupModel | null }) {
  const [measure, setMeasure] = useState<M>("headline");
  const all = { headline, core, food };
  const label: Record<M, string> = { headline: "Headline CPI (national)", core: "Core, NFNE (urban)", food: "Food (urban)" };
  const pts = all[measure];
  const bins = useMemo(() => histogram(pts.map((p) => p.value), BIN), [pts]);
  const latest = pts[pts.length - 1];
  const latestBin = latest ? bins.findIndex((b, i) => latest.value >= b.from && (latest.value < b.to || i === bins.length - 1)) : -1;
  const stats = useMemo(() => pts.length ? { max: pts.reduce((a, b) => (b.value > a.value ? b : a)), min: pts.reduce((a, b) => (b.value < a.value ? b : a)) } : null, [pts]);

  const boxRows = useMemo(() => {
    if (!groups) return [];
    const rows = groupNos(groups).map((no) => ({ key: String(no), label: groupLabel(no).short, stats: boxStats(groups.yoy[no].map((p) => p.value)) }));
    return [...rankDescending(rows.filter((r) => r.stats), (r) => (r.stats as { median: number }).median), ...rows.filter((r) => !r.stats)];
  }, [groups]);

  return (
    <div className="flex flex-col gap-7">
      <ChartFrame
        title="How often has inflation been this high?"
        howToRead={`Each bar counts the months whose year-on-year rate fell in a ${BIN}-percentage-point band. The orange bar is the band the latest reading is in.`}
        legend={
          <ControlBar>
            <Segmented name="dist-measure" label="Measure" value={measure} onChange={setMeasure} options={[{ value: "headline", label: "Headline" }, { value: "core", label: "Core", disabled: core.length === 0 }, { value: "food", label: "Food (urban)", disabled: food.length === 0 }]} />
          </ControlBar>
        }
        source={`Source: SBP EasyData / PBS, ${label[measure]}, year-on-year · ${coverageText(pts)}`}
        table={{ caption: `Months by inflation band, ${label[measure]}`, head: ["Band (% YoY)", "Months"], rows: bins.map((b) => [`${formatValue(b.from, 0)} to under ${formatValue(b.to, 0)}`, String(b.count)]) }}
      >
        <Histogram bins={bins} highlightBin={latestBin} ariaLabel={`Histogram of ${label[measure]} year-on-year inflation across ${pts.length} months`} />
        {stats && latest && (
          <p className="mt-1.5 text-[12px] tabular-nums text-pe-text-2">
            {pts.length} months · lowest {formatValue(stats.min.value, 1)}% ({monthLabel(stats.min.month)}) · highest {formatValue(stats.max.value, 1)}% ({monthLabel(stats.max.month)}) · latest {formatValue(latest.value, 1)}% ({monthLabel(latest.month)})
          </p>
        )}
      </ChartFrame>

      {groups ? (
        <ChartFrame
          title="Which groups are the most volatile?"
          howToRead={
            <>
              One row per CPI group: the blue box holds the middle half of its monthly year-on-year readings, the line inside it is the median, the thin line reaches the typical extremes, and orange rings are unusual months. A <strong className="font-medium text-pe-text">wide box means a volatile group</strong>. Ordered by median.
            </>
          }
          source={`Source: PBS CPI group indices, derived year-on-year · ${groups.yoy[1]?.length ?? 0} months per group (${coverageText(groups.yoy[1] ?? [])})`}
          table={{ caption: "Spread of each group's monthly year-on-year rate", head: ["Group", "Months", "Median", "Lower quartile", "Upper quartile", "Min", "Max"], rows: boxRows.map((r) => [groupLabel(Number(r.key)).name, r.stats ? String(r.stats.n) : null, r.stats ? `${formatValue(r.stats.median, 1)}%` : null, r.stats ? `${formatValue(r.stats.q1, 1)}%` : null, r.stats ? `${formatValue(r.stats.q3, 1)}%` : null, r.stats ? `${formatValue(r.stats.min, 1)}%` : null, r.stats ? `${formatValue(r.stats.max, 1)}%` : null]) }}
        >
          <BoxPlot rows={boxRows} ariaLabel="Box plot of the spread of each CPI group's monthly year-on-year inflation" />
        </ChartFrame>
      ) : (
        <Callout tone="limit" title="Group volatility is unavailable right now">It is built from PBS&rsquo;s group history, which could not be loaded.</Callout>
      )}
    </div>
  );
}
