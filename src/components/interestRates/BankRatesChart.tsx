"use client";

// Chart 6: weighted-average lending (WALR) and deposit (WADR) rates and their spread. Scheduled banks are the headline; the all-financial-institutions
// series exists only from Jul 2022 and is drawn as its own dashed lines, never joined to the bank series. Methodology breaks are marked on the chart.

import { useState } from "react";
import { Callout, ChartFrame } from "@/components/analytics/ChartFrame";
import { DateLines, type DateLineSeries } from "@/components/analytics/DateCharts";
import { ControlBar, Segmented, SeriesToggles } from "@/components/analytics/controls";
import { viz } from "@/components/analytics/TimeCharts";
import type { DatedPoint } from "@/lib/policyRate/dateSeries";
import { CsvButton } from "./CsvButton";

export interface BankData {
  series: Record<string, DatedPoint[]>;
  early: { period: string; frequency: string; lending: number | null; deposit: number | null }[];
  latest: { period: string; flag: string };
  to: string;
}

const MARKERS = [
  { date: "2011-01-01", label: "inter-bank split added" },
  { date: "2022-07-01", label: "FIs universe, new definitions" },
];

function spreadOf(lend: DatedPoint[], dep: DatedPoint[]): DatedPoint[] {
  const d = new Map(dep.map((p) => [p.date, p.value]));
  return lend.flatMap((p) => (d.has(p.date) ? [{ date: p.date, value: Math.round((p.value - d.get(p.date)!) * 1e4) / 1e4, note: p.note }] : []));
}

export default function BankRatesChart({ data, retrievedOn }: { data: BankData; retrievedOn: string }) {
  const [basis, setBasis] = useState<"new" | "out">("new");
  const [zero, setZero] = useState<"incl" | "excl">("incl");
  const [range, setRange] = useState<"all" | "5y">("all");
  const [active, setActive] = useState<Set<string>>(new Set(["lend", "dep", "spread"]));
  const [fi, setFi] = useState(false);
  const k = (entity: string, kind: "lend" | "dep") => data.series[`${entity}.${basis}.${kind}.${zero}`];
  const lend = k("SB", "lend");
  const dep = k("SB", "dep");
  const all: DateLineSeries[] = [
    { key: "lend", label: basis === "new" ? "Lending rate, new loans" : "Lending rate, outstanding loans", color: "purple", kind: "observed", points: lend },
    { key: "dep", label: basis === "new" ? "Deposit rate, fresh deposits" : "Deposit rate, outstanding deposits", color: "blue", kind: "observed", points: dep },
    { key: "spread", label: "Lending − deposit spread", color: "teal", kind: "observed", points: spreadOf(lend, dep), dash: "6 3" },
  ];
  const fiSeries: DateLineSeries[] = fi
    ? [
        { key: "fiLend", label: "Lending, all FIs (from Jul 2022)", color: "purple", kind: "observed", points: k("FI", "lend"), dash: "2 3" },
        { key: "fiDep", label: "Deposit, all FIs (from Jul 2022)", color: "blue", kind: "observed", points: k("FI", "dep"), dash: "2 3" },
      ]
    : [];
  const series = [...all.filter((s) => active.has(s.key)), ...fiSeries].map((s) => ({ ...s, monthly: true }));
  const from = range === "all" ? "2004-01-01" : `${Number(data.to.slice(0, 4)) - 5}${data.to.slice(4, 8)}01`;
  const toggle = (key: string) => setActive((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  });

  return (
    <div className="flex flex-col gap-4">
      <ChartFrame
        title="Bank lending and deposit rates"
        howToRead={`What banks charged on loans and paid on deposits, each a weighted average across all their loans or deposits. "New" means business done during the month (loans disbursed or repriced, deposits collected or rolled over); "outstanding" means everything on the books at month-end. The spread is lending minus deposit on the same basis. Dotted vertical lines mark changes in how SBP compiles the data; values either side are not strictly comparable. The ${data.latest.period} figure is provisional.`}
        legend={
          <ControlBar>
            <Segmented label="Basis" name="ir-bank-basis" options={[{ value: "new", label: "New business" }, { value: "out", label: "Outstanding" }]} value={basis} onChange={setBasis} />
            <Segmented label="Zero mark-up loans/deposits" name="ir-bank-zero" options={[{ value: "incl", label: "Included" }, { value: "excl", label: "Excluded" }]} value={zero} onChange={setZero} />
            <Segmented label="Range" name="ir-bank-range" options={[{ value: "all", label: "Since 2004" }, { value: "5y", label: "5 years" }]} value={range} onChange={setRange} />
            <SeriesToggles label="Show" items={all.map((s) => ({ key: s.key, label: s.label, color: viz(s.color), dash: s.dash }))} active={active} onToggle={toggle} />
            <label className="inline-flex items-center gap-2 text-[13px] text-pe-text-2">
              <input type="checkbox" checked={fi} onChange={(e) => setFi(e.target.checked)} className="h-4 w-4 accent-[var(--pe-accent)]" />
              Add all financial institutions (DFIs and microfinance banks included)
            </label>
            <CsvButton
              spec={{
                filename: `bank-lending-deposit-${basis}-${zero}-zero.csv`,
                head: ["month", "series", "value_pct", "note"],
                rows: series.flatMap((s) => s.points.map((p) => [p.date.slice(0, 7), s.label, p.value, p.note ?? ""])),
                notes: [`Source: SBP Lendingdepositrates_Arch.xls. Retrieved ${retrievedOn}.`, `Scheduled banks unless stated; inter-bank placements included; zero mark-up ${zero === "incl" ? "included" : "excluded"}. Regime 2 = Jan 2004-Dec 2010, 3 = Jan 2011-Jun 2022, 4 = Jul 2022 onward.`],
              }}
            />
          </ControlBar>
        }
        source={`Source: SBP, Weighted Average Lending and Deposit Rates (Lendingdepositrates_Arch.xls); scheduled banks, inter-bank placements included. Retrieved ${retrievedOn}.`}
      >
        <DateLines series={series} from={from} to={data.to} ariaLabel="Monthly weighted-average lending and deposit rates of scheduled banks and their spread" maxGapDays={45} markers={MARKERS} zeroLine={false} />
      </ChartFrame>
      <details>
        <summary className="cursor-pointer text-[13px] font-medium text-pe-accent hover:underline">Before 2004: a different compilation (1997–2003)</summary>
        <div className="mt-2 flex flex-col gap-2">
          <Callout tone="limit">
            SBP compiled these rates differently before 2004: half-yearly to December 2001 then monthly, for all bank groups combined, with lending measured on new
            business and deposits on the stock held (deposits only from June 1999). They are listed here and not joined to the chart above.
          </Callout>
          <div className="max-h-64 overflow-auto rounded-[var(--pe-radius)] border border-pe-border">
            <table className="w-full border-collapse text-[13px] tabular-nums">
              <thead className="sticky top-0 bg-pe-surface-2 text-pe-text-2">
                <tr>
                  <th scope="col" className="px-2.5 py-1.5 text-left font-medium">Period</th>
                  <th scope="col" className="px-2.5 py-1.5 text-left font-medium">Frequency</th>
                  <th scope="col" className="px-2.5 py-1.5 text-right font-medium">Lending</th>
                  <th scope="col" className="px-2.5 py-1.5 text-right font-medium">Deposit</th>
                </tr>
              </thead>
              <tbody>
                {data.early.map((r) => (
                  <tr key={r.period} className="border-t border-pe-border">
                    <th scope="row" className="px-2.5 py-1 text-left font-normal text-pe-text-2">{r.period}</th>
                    <td className="px-2.5 py-1">{r.frequency}</td>
                    <td className="px-2.5 py-1 text-right">{r.lending === null ? "—" : `${r.lending.toFixed(2)}%`}</td>
                    <td className="px-2.5 py-1 text-right">{r.deposit === null ? "—" : `${r.deposit.toFixed(2)}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </details>
    </div>
  );
}
