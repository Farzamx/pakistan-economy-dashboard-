"use client";

// SBP monetary policy implementation: the interest-rate corridor (reverse repo ceiling, policy target, repo floor) with the market overnight repo rate,
// and open market operations (OMO). Administered rates are stepped; the overnight repo rate and OMO cut-offs are observations.

import { useState } from "react";
import { ChartFrame } from "@/components/analytics/ChartFrame";
import { DateLines, type DateLineSeries } from "@/components/analytics/DateCharts";
import { ControlBar, Segmented } from "@/components/analytics/controls";
import type { DatedPoint } from "@/lib/policyRate/dateSeries";
import { formatDate } from "@/lib/policyRate/format";
import type { OmoOp } from "@/lib/interestRates/dataset";
import { CsvButton } from "./CsvButton";

export interface CorridorData {
  ceiling: DatedPoint[];
  floor: DatedPoint[];
  target: DatedPoint[];
  orrMonthly: DatedPoint[];
  orrDaily: DatedPoint[];
  dailyFrom: string;
  to: string;
}

export interface OmoData {
  recent: OmoOp[];
  yearly: { year: string; injections: number; mopups: number; rejected: number }[];
  injectionCutoffs: DatedPoint[];
  mopupCutoffs: DatedPoint[];
  from: string;
}

const OUTCOME: Record<string, string> = { A: "accepted", BR: "bids rejected", NB: "no bids", NA: "no cut-off printed" };

export function CorridorChart({ data, retrievedOn }: { data: CorridorData; retrievedOn: string }) {
  const [range, setRange] = useState<"recent" | "all">("recent");
  const recent = range === "recent";
  const series: DateLineSeries[] = [
    { key: "ceiling", label: "Reverse repo (ceiling)", color: "slate", kind: "step", points: data.ceiling, dash: "4 3" },
    { key: "target", label: "Policy (target) rate", color: "purple", kind: "step", points: data.target },
    { key: "floor", label: "Repo (floor)", color: "slate", kind: "step", points: data.floor },
    { key: "orr", label: recent ? "Overnight repo rate (daily)" : "Overnight repo rate (monthly avg.)", color: "amber", kind: "observed", points: recent ? data.orrDaily : data.orrMonthly, monthly: !recent },
  ];
  const from = recent ? data.dailyFrom : "2009-08-17";
  return (
    <ChartFrame
      title="The interest-rate corridor and the overnight repo rate"
      howToRead="SBP lends overnight to banks at the ceiling (reverse repo rate) and pays the floor (repo rate) on their surplus cash; the policy (target) rate sits inside, and SBP's operations aim to keep overnight market rates near it. The amber line is the weighted-average rate banks actually paid each other for overnight repo — a market rate, not one set by SBP. Before 25 May 2015 there was no separate target: the ceiling itself was the policy rate."
      legend={
        <ControlBar>
          <Segmented label="Range" name="ir-corridor-range" options={[{ value: "recent", label: "Last 2 years (daily)" }, { value: "all", label: "Since Aug 2009 (monthly)" }]} value={range} onChange={setRange} />
          <CsvButton
            spec={{
              filename: `sbp-corridor-overnight-repo-${range}.csv`,
              head: ["date", "series", "value_pct", "note"],
              rows: series.flatMap((s) => s.points.filter((p) => p.date >= from).map((p) => [p.date, s.label, p.value, p.note ?? ""])),
              notes: [`Source: State Bank of Pakistan EasyData (SBPOL0010, SBPOL0020, SBPOL0030, ORR). Retrieved ${retrievedOn}.`, "Administered rates: value set on that date, in force until the next row. Overnight repo: observed market rate."],
            }}
          />
        </ControlBar>
      }
      source={`Source: SBP EasyData — reverse repo, repo and policy (target) rates; weighted-average overnight repo rate. Retrieved ${retrievedOn}.`}
    >
      <DateLines series={series} from={from} to={data.to} ariaLabel="Step lines for SBP's ceiling, target and floor rates with the overnight repo market rate" maxGapDays={recent ? 10 : 70} zeroLine={false} />
    </ChartFrame>
  );
}

export function OmoPanel({ data, corridor, retrievedOn }: { data: OmoData; corridor: CorridorData; retrievedOn: string }) {
  const series: DateLineSeries[] = [
    { key: "ceiling", label: "Ceiling", color: "slate", kind: "step", points: corridor.ceiling, dash: "4 3" },
    { key: "target", label: "Policy (target) rate", color: "purple", kind: "step", points: corridor.target },
    { key: "floor", label: "Floor", color: "slate", kind: "step", points: corridor.floor },
    { key: "inj", label: "Injection cut-off (reverse repo)", color: "blue", kind: "observed", points: data.injectionCutoffs, dots: true },
    { key: "mop", label: "Mop-up cut-off (repo)", color: "orange", kind: "observed", points: data.mopupCutoffs, dots: true },
  ];
  return (
    <div className="flex flex-col gap-6">
      <ChartFrame
        title="Open market operations: cut-off rates against the corridor"
        howToRead="An injection (reverse repo) is SBP lending cash to banks for a few days; a mop-up (repo) is SBP absorbing surplus cash. Each dot is one operation's cut-off rate, which SBP's files store as a fraction (0.1201) and is shown here in percent (12.01%) — checked against the bid quotes SBP prints in percent. Operations are tools for steering overnight rates toward the target; they are not rate decisions."
        legend={
          <CsvButton
            spec={{
              filename: "sbp-omo-cutoffs.csv",
              head: ["date", "side", "cutoff_pct", "note"],
              rows: [...data.injectionCutoffs.map((p) => [p.date, "injection (reverse repo)", p.value, p.note ?? ""]), ...data.mopupCutoffs.map((p) => [p.date, "mop-up (repo)", p.value, p.note ?? ""])].sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
              notes: [`Source: SBP OMO-Inject-Hist.xlsx and OMO-MopUp-Hist.xlsx. Retrieved ${retrievedOn}.`, "Cut-off converted from SBP's fraction to percent (x100); amounts PKR."],
            }}
          />
        }
        source={`Source: SBP Domestic Markets & Monetary Management — OMO injection and mop-up history files. Last 3 years shown. Retrieved ${retrievedOn}.`}
      >
        <DateLines series={series} from={data.from} to={corridor.to} ariaLabel="Dots for each OMO cut-off rate over the last three years, with SBP's corridor" maxGapDays={10} zeroLine={false} />
      </ChartFrame>

      <div className="min-w-0">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-[15px] font-semibold text-pe-text">The 25 most recent operations</h3>
          <CsvButton
            spec={{
              filename: "sbp-omo-recent.csv",
              head: ["date", "side", "tenor_days", "offered_pkr_mn", "accepted_pkr_mn", "quote_low_pct", "quote_high_pct", "cutoff_pct", "outcome"],
              rows: data.recent.map((o) => [o.date, o.side, o.tenorDays, o.offered, o.accepted, o.quoteLow, o.quoteHigh, o.cutoffPct, OUTCOME[o.outcome]]),
              notes: [`Source: SBP OMO history files. Retrieved ${retrievedOn}.`],
            }}
          />
        </div>
        <div className="overflow-x-auto rounded-[var(--pe-radius)] border border-pe-border" tabIndex={0} role="region" aria-label="Recent OMO operations (scrolls)">
          <table className="w-full min-w-[640px] border-collapse text-left text-[13px] tabular-nums">
            <thead className="bg-pe-surface-2 text-pe-text-2">
              <tr>
                {["Date", "Operation", "Tenor", "Offered", "Accepted", "Bid quotes", "Cut-off"].map((h, i) => (
                  <th key={h} scope="col" className={`px-2.5 py-1.5 font-medium ${i > 1 ? "text-right" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.recent.map((o, i) => (
                <tr key={i} className="border-t border-pe-border text-pe-text">
                  <td className="whitespace-nowrap px-2.5 py-1">{formatDate(o.date)}</td>
                  <td className="whitespace-nowrap px-2.5 py-1">{o.side === "injection" ? "Injection" : "Mop-up"}</td>
                  <td className="px-2.5 py-1 text-right">{o.tenorDays ?? "—"}{o.tenorNote ? "*" : ""} d</td>
                  <td className="px-2.5 py-1 text-right">{o.offered === null ? "—" : `Rs ${(o.offered / 1000).toLocaleString("en-US", { maximumFractionDigits: 1 })}bn`}</td>
                  <td className="px-2.5 py-1 text-right">{o.accepted === null ? "—" : `Rs ${(o.accepted / 1000).toLocaleString("en-US", { maximumFractionDigits: 1 })}bn`}</td>
                  <td className="px-2.5 py-1 text-right">{o.quoteLow !== null && o.quoteHigh !== null ? `${o.quoteLow.toFixed(2)}–${o.quoteHigh.toFixed(2)}%` : "—"}</td>
                  <td className="px-2.5 py-1 text-right font-medium">{o.cutoffPct !== null ? `${o.cutoffPct.toFixed(2)}%` : <span className="font-normal text-pe-text-3">{OUTCOME[o.outcome]}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <details className="mt-2">
          <summary className="cursor-pointer text-[13px] font-medium text-pe-accent hover:underline">Operations per year since 2008</summary>
          <div className="mt-1 overflow-x-auto rounded-[var(--pe-radius)] border border-pe-border">
            <table className="w-full border-collapse text-[13px] tabular-nums">
              <thead className="bg-pe-surface-2 text-pe-text-2">
                <tr>
                  <th scope="col" className="px-2.5 py-1.5 text-left font-medium">Year</th>
                  <th scope="col" className="px-2.5 py-1.5 text-right font-medium">Injections</th>
                  <th scope="col" className="px-2.5 py-1.5 text-right font-medium">Mop-ups</th>
                  <th scope="col" className="px-2.5 py-1.5 text-right font-medium">Without a cut-off</th>
                </tr>
              </thead>
              <tbody>
                {data.yearly.map((y) => (
                  <tr key={y.year} className="border-t border-pe-border">
                    <th scope="row" className="px-2.5 py-1 text-left font-normal text-pe-text-2">{y.year}</th>
                    <td className="px-2.5 py-1 text-right">{y.injections}</td>
                    <td className="px-2.5 py-1 text-right">{y.mopups}</td>
                    <td className="px-2.5 py-1 text-right">{y.rejected}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </div>
    </div>
  );
}
