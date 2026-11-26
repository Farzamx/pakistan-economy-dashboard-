"use client";

// Chart 5 (policy rate, inflation and the real policy rate; real KIBOR) and Chart 7 (monetary policy transmission, with a lag table).

import { useState } from "react";
import { Callout, ChartFrame } from "@/components/analytics/ChartFrame";
import { DateLines, RealRateChart, type DateLineSeries } from "@/components/analytics/DateCharts";
import { ControlBar, Key, Segmented } from "@/components/analytics/controls";
import { viz } from "@/components/analytics/TimeCharts";
import type { DatedPoint } from "@/lib/policyRate/dateSeries";
import { CsvButton } from "./CsvButton";

export interface RealData {
  rows: { period: string; policy: number | null; inflation: number | null; real: number | null }[];
  realKibor6m: DatedPoint[];
  realPolicy: DatedPoint[];
  from: string;
  to: string;
}

export interface LagRow {
  lag: number;
  r: number | null;
  n: number;
}

export interface TransmissionData {
  policy: DatedPoint[];
  kibor6m: DatedPoint[];
  walrNew: DatedPoint[];
  wadrNew: DatedPoint[];
  lags: { x: string; y: string; rows: LagRow[] }[];
  from: string;
  to: string;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const label = (m: string) => `${MONTHS[Number(m.slice(5, 7)) - 1]} ${m.slice(2, 4)}`;

export function RealRates({ data, formula, retrievedOn }: { data: RealData; formula: { policy: string; kibor: string }; retrievedOn: string }) {
  const [view, setView] = useState<"policy" | "compare">("policy");
  const compare: DateLineSeries[] = [
    { key: "rp", label: "Real policy rate", color: "purple", kind: "observed", points: data.realPolicy, monthly: true },
    { key: "rk", label: "Real 6M KIBOR", color: "teal", kind: "observed", points: data.realKibor6m, dash: "6 3", monthly: true },
  ];
  return (
    <ChartFrame
      title="Policy rate, inflation and the real policy rate"
      howToRead={`The real rate is the interest rate minus inflation that has already happened (an "ex post" real rate, not an expectation). Above zero, the policy rate was higher than inflation; below zero, lower. ${formula.policy} Inflation is national CPI, year on year, available on its current base from July 2016, so the chart starts there.`}
      legend={
        <ControlBar>
          <Segmented label="View" name="ir-real-view" options={[{ value: "policy", label: "Policy rate and inflation" }, { value: "compare", label: "Real policy rate vs real 6M KIBOR" }]} value={view} onChange={setView} />
          <Key
            items={
              view === "policy"
                ? [{ label: "SBP policy rate (nominal)", color: viz("purple") }, { label: "CPI inflation, YoY (dashed)", color: viz("blue") }, { label: "Real policy rate (shaded)", color: viz("teal") }]
                : compare.map((s) => ({ label: s.label + (s.dash ? " (dashed)" : ""), color: viz(s.color) }))
            }
          />
          <CsvButton
            spec={{
              filename: "real-interest-rates.csv",
              head: ["month", "policy_rate_month_end_pct", "cpi_yoy_pct", "real_policy_rate_pct", "real_6m_kibor_pct"],
              rows: data.rows.map((r) => [r.period, r.policy, r.inflation, r.real === null ? null : Math.round(r.real * 1e4) / 1e4, data.realKibor6m.find((p) => p.date.slice(0, 7) === r.period)?.value ?? null]),
              notes: [`Derived by PEIC from SBP EasyData (policy rates, KIBOR, CPI P00011516). Retrieved ${retrievedOn}.`, formula.policy, formula.kibor],
            }}
          />
        </ControlBar>
      }
      source={`Policy rate and KIBOR: SBP EasyData. Inflation: national CPI YoY (2015-16 base), SBP EasyData P00011516. Retrieved ${retrievedOn}.`}
      table={{ caption: "Real policy rate by month", head: ["Month", "Policy rate", "Inflation", "Real rate"], rows: data.rows.slice(-36).reverse().map((r) => [r.period, r.policy === null ? null : `${r.policy.toFixed(2)}%`, r.inflation === null ? null : `${r.inflation.toFixed(1)}%`, r.real === null ? null : `${r.real.toFixed(2)} pp`]) }}
    >
      {view === "policy" ? (
        <RealRateChart data={data.rows.map((r) => ({ ...r, period: label(r.period) }))} inflationLabel="CPI inflation (YoY)" ariaLabel="Policy rate, CPI inflation and the real policy rate by month since July 2016" />
      ) : (
        <DateLines series={compare} from={data.from} to={data.to} unit=" pp" ariaLabel="Real policy rate and real 6-month KIBOR by month" maxGapDays={45} />
      )}
    </ChartFrame>
  );
}

const strength = (r: number | null) => {
  if (r === null) return "not computable";
  const a = Math.abs(r);
  const dir = r > 0 ? "positive" : "negative";
  return a >= 0.8 ? `very strong ${dir}` : a >= 0.6 ? `strong ${dir}` : a >= 0.4 ? `moderate ${dir}` : a >= 0.2 ? `weak ${dir}` : "little or none";
};

export function Transmission({ data, retrievedOn }: { data: TransmissionData; retrievedOn: string }) {
  const series: DateLineSeries[] = [
    { key: "p", label: "Policy rate (month-end)", color: "purple", kind: "step", points: data.policy, monthly: true },
    { key: "k", label: "6M KIBOR (monthly avg.)", color: "teal", kind: "observed", points: data.kibor6m, monthly: true },
    { key: "l", label: "Bank lending rate, new loans", color: "orange", kind: "observed", points: data.walrNew, monthly: true },
    { key: "d", label: "Bank deposit rate, fresh deposits", color: "blue", kind: "observed", points: data.wadrNew, dash: "6 3", monthly: true },
  ];
  return (
    <div className="flex flex-col gap-4">
      <ChartFrame
        title="From the policy rate to bank rates"
        howToRead="When SBP changes its rate, money-market rates such as KIBOR usually move first, then the rates banks charge on new loans, and deposit rates more slowly. The chart puts the four monthly series on one axis so the order can be seen. It shows timing and co-movement only; other forces (inflation, government borrowing, liquidity) move these rates too, so it does not measure the effect of policy."
        legend={
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Key items={series.map((s) => ({ label: s.label, color: viz(s.color) }))} />
          <CsvButton
            spec={{
              filename: "monetary-transmission-monthly.csv",
              head: ["month", "series", "value_pct"],
              rows: series.flatMap((s) => s.points.map((p) => [p.date.slice(0, 7), s.label, p.value])),
              notes: [`Source: SBP EasyData (policy rate, KIBOR) and SBP Lendingdepositrates_Arch.xls (scheduled banks, zero mark-up and inter-bank included). Retrieved ${retrievedOn}.`, "Bank rates change definition in Jan 2011 and Jul 2022 (marked)."],
            }}
          />
          </div>
        }
        source={`Policy rate and KIBOR: SBP EasyData. Bank rates: SBP, scheduled banks. Retrieved ${retrievedOn}.`}
      >
        <DateLines series={series} from={data.from} to={data.to} ariaLabel="Monthly policy rate, 6-month KIBOR, bank lending rate on new loans and deposit rate on fresh deposits" maxGapDays={45} zeroLine={false} markers={[{ date: "2011-01-01", label: "bank data: inter-bank split" }, { date: "2022-07-01", label: "bank data: FIs definitions" }]} />
      </ChartFrame>

      <div className="min-w-0">
        <h3 className="text-[15px] font-semibold text-pe-text">How closely do monthly changes line up, and after how long?</h3>
        <p className="mt-0.5 max-w-3xl text-[14px] leading-relaxed text-pe-text-2">
          Correlation between the month-to-month change in the policy rate and the change in each rate the same month (lag 0) or 1, 3, 6 and 12 months later.
          r runs from −1 to +1; n is the number of month pairs. Changes that span a change in SBP&rsquo;s bank-rate methodology (Jan 2011, Jul 2022) are left out.
        </p>
        <div className="mt-2 overflow-x-auto rounded-[var(--pe-radius)] border border-pe-border" tabIndex={0} role="region" aria-label="Lag correlation table (scrolls)">
          <table className="w-full min-w-[620px] border-collapse text-[13px] tabular-nums">
            <thead className="bg-pe-surface-2 text-pe-text-2">
              <tr>
                <th scope="col" className="px-2.5 py-1.5 text-left font-medium">Change in…</th>
                {data.lags[0].rows.map((r) => (
                  <th key={r.lag} scope="col" className="px-2.5 py-1.5 text-right font-medium">{r.lag === 0 ? "Same month" : `${r.lag} mo later`}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.lags.map((t) => (
                <tr key={t.y} className="border-t border-pe-border">
                  <th scope="row" className="px-2.5 py-1.5 text-left font-normal text-pe-text-2">{t.y.replace("Change in ", "").replace(/^./, (c) => c.toUpperCase())}</th>
                  {t.rows.map((r) => (
                    <td key={r.lag} className="px-2.5 py-1.5 text-right" title={strength(r.r)}>
                      <span className="font-medium text-pe-text">{r.r === null ? "—" : r.r.toFixed(2)}</span>
                      <span className="block text-[11px] text-pe-text-3">n = {r.n}</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3">
          <Callout tone="limit" title="Correlation is not causation">
            These numbers describe how the series moved together in this sample. They do not show that the policy rate caused the other moves: SBP often acts
            in response to the same conditions that move market and bank rates, and expectations can move KIBOR before a decision. Treat the table as a
            description of timing, not an estimate of policy effects.
          </Callout>
        </div>
      </div>
    </div>
  );
}
