"use client";

import { useMemo, useState } from "react";
import { ChartFrame } from "@/components/analytics/ChartFrame";
import { Segmented, SeriesToggles, type LegendItem } from "@/components/analytics/controls";
import { DateLines, type DateLineSeries } from "@/components/analytics/DateCharts";
import { viz } from "@/components/analytics/TimeCharts";
import { YIELD_DEFINITION_LABEL, monthsBefore, policySpreadSeries, tenorSeries, type YieldDefinition } from "@/lib/bonds/analytics";
import type { AuctionRecord, Tenor } from "@/lib/bonds/types";
import type { DatedPoint } from "@/lib/policyRate/dateSeries";
import { formatDate } from "@/lib/policyRate/format";

type RangeKey = "1y" | "3y" | "5y" | "all";
const RANGE_MONTHS: Record<RangeKey, number | null> = { "1y": 12, "3y": 36, "5y": 60, all: null };

interface SeriesDef {
  key: string;
  label: string;
  instrument: "tbill" | "pib" | "policy";
  tenor?: Tenor;
  color: Parameters<typeof viz>[0];
}

const SERIES: SeriesDef[] = [
  { key: "t3m", label: "3-month T-bill", instrument: "tbill", tenor: "3M", color: "blue" },
  { key: "t6m", label: "6-month T-bill", instrument: "tbill", tenor: "6M", color: "teal" },
  { key: "t12m", label: "12-month T-bill", instrument: "tbill", tenor: "12M", color: "purple" },
  { key: "p3y", label: "3-year PIB", instrument: "pib", tenor: "3Y", color: "amber" },
  { key: "p10y", label: "10-year PIB", instrument: "pib", tenor: "10Y", color: "orange" },
  { key: "policy", label: "SBP policy rate", instrument: "policy", color: "slate" },
];

interface YieldHistorySectionProps {
  tbills: AuctionRecord[];
  pibs: AuctionRecord[];
  /** SBP policy rate, one point per change, ascending. Null when the ledger could not be read. */
  policy: DatedPoint[] | null;
  def: YieldDefinition;
}

export default function YieldHistorySection({ tbills, pibs, policy, def }: YieldHistorySectionProps) {
  const [range, setRange] = useState<RangeKey>("5y");
  const [active, setActive] = useState<ReadonlySet<string>>(new Set(["t3m", "t12m", "policy"]));
  const lastDate = tbills[tbills.length - 1].auctionDate;
  const months = RANGE_MONTHS[range];
  const from = months === null ? null : monthsBefore(lastDate, months);

  const built = useMemo(() => {
    const m = new Map<string, DateLineSeries & { points: DatedPoint[] }>();
    for (const s of SERIES) {
      if (s.instrument === "policy") {
        if (policy) m.set(s.key, { key: s.key, label: s.label, color: s.color, kind: "step", points: policy, dash: "5 3" });
        continue;
      }
      const pts = tenorSeries(s.instrument === "tbill" ? tbills : pibs, s.tenor as Tenor, def).map((p) => ({ date: p.date, value: p.value }));
      m.set(s.key, { key: s.key, label: s.label, color: s.color, kind: "observed", points: pts, dots: pts.length < 60 });
    }
    return m;
  }, [tbills, pibs, policy, def]);

  const legend: LegendItem[] = SERIES.map((s) => ({ key: s.key, label: s.label, color: viz(s.color), dash: s.instrument === "policy" ? "5 3" : undefined, disabled: !built.has(s.key) }));
  const shown = SERIES.filter((s) => active.has(s.key) && built.has(s.key)).map((s) => built.get(s.key) as DateLineSeries);

  const spread = useMemo(() => (policy ? policySpreadSeries(tbills, "3M", def, policy) : []), [tbills, policy, def]);
  const spreadSeries: DateLineSeries[] = [{ key: "spread", label: "3-month T-bill minus policy rate", color: "blue", kind: "observed", points: spread.map((p) => ({ date: p.date, value: p.spreadPp })), dots: false }];

  const inRange = (d: string) => from === null || d >= from;
  const tableDates = [...new Set(shown.flatMap((s) => s.points.filter((p) => inRange(p.date)).map((p) => p.date)))].sort().reverse().slice(0, 120);
  const valueOn = (s: DateLineSeries, d: string): number | null => (s.kind === "observed" ? (s.points.find((p) => p.date === d)?.value ?? null) : null);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
        <Segmented label="Period" name="yh-range" value={range} onChange={setRange} options={[{ value: "1y", label: "1 year" }, { value: "3y", label: "3 years" }, { value: "5y", label: "5 years" }, { value: "all", label: "Since 2014" }]} />
        <SeriesToggles
          label="Series"
          items={legend}
          active={active}
          minActive={1}
          onToggle={(k) =>
            setActive((cur) => {
              const next = new Set(cur);
              if (next.has(k)) next.delete(k);
              else next.add(k);
              return next;
            })
          }
        />
      </div>

      <ChartFrame
        title={`Auction yields and the policy rate (${YIELD_DEFINITION_LABEL[def].toLowerCase()})`}
        howToRead="Each dot is one auction, on its auction date. A tenor that failed to attract an accepted bid leaves a gap, not a zero. The dashed line is the SBP policy rate, which changes only on decision dates."
        source={`SBP auction archive (primary market) · policy rate: SBP EasyData · % per annum · to ${formatDate(lastDate)}`}
        table={{ caption: "Auction yields by date", head: ["Auction date", ...shown.filter((s) => s.kind === "observed").map((s) => `${s.label}, %`)], rows: tableDates.map((d) => [formatDate(d), ...shown.filter((s) => s.kind === "observed").map((s) => valueOn(s, d))]) }}
      >
        <DateLines series={shown} from={from} to={lastDate} unit="%" decimals={2} axisDecimals={0} height={320} ariaLabel="Auction yields over time with the SBP policy rate" maxGapDays={75} animate />
      </ChartFrame>

      <ChartFrame
        title="3-month T-bill yield minus the policy rate"
        howToRead="Percentage points. Below zero, T-bills cleared under the policy rate; above, over it. The policy rate used is the one in force on each auction date."
        source="SBP auction archive · SBP EasyData policy rate · percentage points"
        table={spread.length ? { caption: "T-bill minus policy rate", head: ["Auction date", "3M yield, %", "Policy rate, %", "Spread, pp"], rows: [...spread].reverse().filter((p) => inRange(p.date)).slice(0, 120).map((p) => [formatDate(p.date), p.yield.toFixed(2), p.policyRate.toFixed(2), p.spreadPp.toFixed(2)]) } : undefined}
      >
        {policy ? (
          <DateLines series={spreadSeries} from={from} to={lastDate} unit=" pp" decimals={2} axisDecimals={1} height={220} ariaLabel="Three-month T-bill yield minus the policy rate" maxGapDays={75} zeroLine />
        ) : (
          <p className="px-1 py-8 text-center text-[13px] text-pe-text-3">The policy-rate history could not be loaded, so this comparison is not shown. Nothing is estimated in its place.</p>
        )}
      </ChartFrame>
    </div>
  );
}
