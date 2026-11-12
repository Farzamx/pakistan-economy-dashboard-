"use client";

import { useMemo } from "react";
import { ChartFrame } from "@/components/analytics/ChartFrame";
import { DateLines, type DateLineSeries } from "@/components/analytics/DateCharts";
import ShapeStrip from "./ShapeStrip";
import { SHAPE_THRESHOLD_BP, shapeRegimes, slopeSeries, type YieldDefinition } from "@/lib/bonds/analytics";
import type { AuctionRecord } from "@/lib/bonds/types";
import { formatDate } from "@/lib/policyRate/format";

interface TermStructureSectionProps {
  tbills: AuctionRecord[];
  pibs: AuctionRecord[];
  def: YieldDefinition;
}

const bp = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(1).replace(/\.0$/, "")}`;

export default function TermStructureSection({ tbills, pibs, def }: TermStructureSectionProps) {
  const tSlopes = useMemo(() => slopeSeries(tbills, def), [tbills, def]);
  const pSlopes = useMemo(() => slopeSeries(pibs, def), [pibs, def]);
  const regimes = useMemo(() => shapeRegimes(tSlopes), [tSlopes]);
  const counts = useMemo(() => {
    const c = { upward: 0, flat: 0, inverted: 0 };
    for (const s of tSlopes) c[s.shape]++;
    return c;
  }, [tSlopes]);
  const longestInverted = useMemo(() => regimes.filter((r) => r.shape === "inverted").sort((a, b) => b.auctions - a.auctions || a.extremeBp - b.extremeBp).slice(0, 3), [regimes]);

  const series: DateLineSeries[] = [
    { key: "t", label: "T-bills: 12-month minus 3-month", color: "blue", kind: "observed", points: tSlopes.map((s) => ({ date: s.date, value: s.bp })), dots: false },
    ...(pSlopes.length ? [{ key: "p", label: "PIBs: 10-year minus 3-year", color: "orange" as const, kind: "observed" as const, points: pSlopes.map((s) => ({ date: s.date, value: s.bp })), dots: true }] : []),
  ];
  const last = tbills[tbills.length - 1].auctionDate;
  const skipped = tbills.length - tSlopes.length;

  return (
    <div className="flex flex-col gap-5">
      <ChartFrame
        title="Curve slope over time"
        howToRead={`Basis points: the long yield minus the short yield at each auction. Below zero the curve is inverted. Between ±${SHAPE_THRESHOLD_BP} bp it is called flat.`}
        legend={
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-pe-text-2" aria-label="Key">
            {series.map((s) => (
              <li key={s.key} className="flex items-center gap-1.5">
                <span aria-hidden className="inline-block h-0.5 w-5 rounded" style={{ background: `var(--pe-viz-${s.color})` }} />
                {s.label}
              </li>
            ))}
          </ul>
        }
        source={`SBP auction archive (primary market) · ${def === "cutoff" ? "cut-off" : "weighted-average"} yields · basis points · to ${formatDate(last)}`}
        table={{ caption: "T-bill curve slope by auction", head: ["Auction date", "12M minus 3M, bp", "Shape"], rows: [...tSlopes].reverse().slice(0, 120).map((s) => [formatDate(s.date), bp(s.bp), s.shape]) }}
      >
        <DateLines series={series} from={null} to={last} unit=" bp" decimals={0} axisDecimals={0} height={300} ariaLabel="Slope of the T-bill and PIB curves in basis points" maxGapDays={75} zeroLine animate />
      </ChartFrame>

      <ChartFrame
        title="When the T-bill curve was upward, flat or inverted"
        howToRead={`Each auction is classed by its 12-month minus 3-month slope. ${tSlopes.length} of ${tbills.length} auctions have a slope; ${skipped} do not because the 3-month or 12-month tenor produced no yield, and those are skipped rather than counted as flat.`}
        source="SBP auction archive · derived by PEIC from the slope above"
      >
        <ShapeStrip regimes={regimes} ariaLabel={`Curve shape at each T-bill auction: ${counts.upward} upward, ${counts.flat} flat, ${counts.inverted} inverted`} />
        <p className="mt-2 text-[13px] text-pe-text-2">
          Of {tSlopes.length} auctions with a slope: <strong className="font-semibold text-pe-text">{counts.inverted}</strong> inverted, <strong className="font-semibold text-pe-text">{counts.flat}</strong> flat, <strong className="font-semibold text-pe-text">{counts.upward}</strong> upward-sloping.
        </p>
        {longestInverted.length > 0 && (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-left text-[12px] tabular-nums">
              <caption className="pb-1 text-left text-[12px] font-medium text-pe-text-2">Longest inverted runs</caption>
              <thead>
                <tr className="text-pe-text-3">
                  <th scope="col" className="py-1 pr-3 font-medium">From</th>
                  <th scope="col" className="px-2 py-1 font-medium">To</th>
                  <th scope="col" className="px-2 py-1 text-right font-medium">Auctions</th>
                  <th scope="col" className="px-2 py-1 text-right font-medium">Average, bp</th>
                  <th scope="col" className="px-2 py-1 text-right font-medium">Deepest, bp</th>
                </tr>
              </thead>
              <tbody>
                {longestInverted.map((r) => (
                  <tr key={r.from} className="border-t border-pe-border">
                    <th scope="row" className="py-1 pr-3 text-left font-normal text-pe-text-2">{formatDate(r.from)}</th>
                    <td className="px-2 py-1">{formatDate(r.to)}</td>
                    <td className="px-2 py-1 text-right">{r.auctions}</td>
                    <td className="px-2 py-1 text-right">{bp(r.averageBp)}</td>
                    <td className="px-2 py-1 text-right">{bp(r.extremeBp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ChartFrame>
    </div>
  );
}
