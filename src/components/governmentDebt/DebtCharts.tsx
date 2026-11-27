"use client";

// Government debt charts: the stock by component (quarterly, SBP) and debt as a share of GDP (fiscal-year ends; SBP and the Ministry of Finance as
// separate series, never joined). Values are as published; nothing between observations is drawn as data.

import { useState } from "react";
import { ChartFrame } from "@/components/analytics/ChartFrame";
import { DateLines, type DateLineSeries } from "@/components/analytics/DateCharts";
import { ControlBar, Key, Segmented } from "@/components/analytics/controls";
import { viz } from "@/components/analytics/TimeCharts";
import { CsvButton } from "@/components/interestRates/CsvButton";
import type { DatedPoint } from "@/lib/policyRate/dateSeries";

export interface DebtChartData {
  quarterly: { date: string; domestic: number; external: number; imf: number; grossPublic: number; frdla: number; flag: string }[];
  ratios: { date: string; grossPublicPct: number; frdlaPct: number; domesticPct: number; gdp: number }[];
  mof: { date: string; totalPct: number; frdlaPct: number }[];
  retrievedOn: string;
}

const tn = (v: number) => Math.round(v / 10) / 100; // billion -> trillion, 2 dp

export function DebtStockChart({ data }: { data: DebtChartData }) {
  const [measure, setMeasure] = useState<"components" | "measures">("components");
  const pts = (k: "domestic" | "external" | "imf" | "grossPublic" | "frdla"): DatedPoint[] =>
    data.quarterly.map((q) => ({ date: q.date, value: tn(q[k]), ...(q.flag ? { note: q.flag === "P" ? "provisional" : "revised" } : {}) }));
  const series: DateLineSeries[] =
    measure === "components"
      ? [
          { key: "domestic", label: "Domestic debt", color: "blue", kind: "observed", points: pts("domestic") },
          { key: "external", label: "External debt (excl. IMF)", color: "orange", kind: "observed", points: pts("external") },
          { key: "imf", label: "Debt from the IMF", color: "purple", kind: "observed", points: pts("imf"), dash: "4 3" },
        ]
      : [
          { key: "gross", label: "Gross public debt", color: "blue", kind: "observed", points: pts("grossPublic") },
          { key: "frdla", label: "FRDLA total debt of the government", color: "teal", kind: "observed", points: pts("frdla"), dash: "6 3" },
        ];
  return (
    <ChartFrame
      title="Government debt, quarter by quarter (trillion rupees)"
      howToRead="Each point is the stock at the end of a quarter, as SBP reports it. 'Components' splits gross public debt into its three parts. 'Measures' compares gross public debt with the narrower legal (FRDLA) measure, which subtracts the government's own deposits with banks."
      legend={
        <ControlBar>
          <Segmented label="Show" name="debt-measure" options={[{ value: "components", label: "Components" }, { value: "measures", label: "Gross vs FRDLA" }]} value={measure} onChange={setMeasure} />
          <Key items={series.map((s) => ({ label: s.label, color: viz(s.color) }))} />
          <CsvButton
            spec={{
              filename: "pakistan-government-debt-quarterly.csv",
              head: ["quarter_end", "domestic_bn_pkr", "external_excl_imf_bn_pkr", "imf_bn_pkr", "gross_public_debt_bn_pkr", "frdla_debt_bn_pkr", "sbp_flag"],
              rows: data.quarterly.map((q) => [q.date, q.domestic, q.external, q.imf, q.grossPublic, q.frdla, q.flag]),
              notes: [`Source: State Bank of Pakistan, Pakistan's Debt and Liabilities Summary (EasyData TS_GP_BAM_PKDLP_Q; flags from SBP's Summary.pdf). Retrieved ${data.retrievedOn}.`, "Billion PKR, end of quarter. P provisional, R revised."],
            }}
          />
        </ControlBar>
      }
      source={`Source: State Bank of Pakistan, Pakistan's Debt and Liabilities Summary. Retrieved ${data.retrievedOn}.`}
    >
      <DateLines series={series} from={data.quarterly[0].date} to={data.quarterly[data.quarterly.length - 1].date} unit=" tn" decimals={2} axisDecimals={0} ariaLabel="Pakistan government debt by quarter, trillion rupees" maxGapDays={100} zeroLine={false} />
    </ChartFrame>
  );
}

export function DebtRatioChart({ data }: { data: DebtChartData }) {
  const series: DateLineSeries[] = [
    { key: "gross", label: "Gross public debt (SBP)", color: "blue", kind: "observed", points: data.ratios.map((r) => ({ date: r.date, value: Math.round(r.grossPublicPct * 100) / 100 })), dots: true },
    { key: "frdla", label: "FRDLA debt of the government (SBP)", color: "teal", kind: "observed", points: data.ratios.map((r) => ({ date: r.date, value: Math.round(r.frdlaPct * 100) / 100 })), dash: "6 3", dots: true },
    { key: "mof", label: "Public debt (Ministry of Finance)", color: "orange", kind: "observed", points: data.mof.map((m) => ({ date: m.date, value: m.totalPct, note: "MoF Annual Debt Review FY-26" })), dots: true },
  ];
  return (
    <ChartFrame
      title="Government debt as a share of GDP (end of each fiscal year)"
      howToRead="Debt at the end of June divided by that fiscal year's nominal GDP. SBP publishes the ratio only for fiscal-year ends, so there are no quarterly points. The Ministry of Finance's own figures (orange) use a slightly different GDP estimate and are shown separately, not joined to SBP's."
      legend={
        <ControlBar>
          <Key items={series.map((s) => ({ label: s.label, color: viz(s.color) }))} />
          <CsvButton
            spec={{
              filename: "pakistan-government-debt-to-gdp.csv",
              head: ["fiscal_year_end", "gross_public_debt_pct_gdp_sbp", "frdla_debt_pct_gdp_sbp", "domestic_debt_pct_gdp_sbp", "nominal_gdp_bn_pkr_sbp", "public_debt_pct_gdp_mof", "frdla_pct_gdp_mof"],
              rows: data.ratios.map((r) => {
                const m = data.mof.find((x) => x.date === r.date);
                return [r.date, r.grossPublicPct, r.frdlaPct, r.domesticPct, r.gdp, m?.totalPct ?? null, m?.frdlaPct ?? null];
              }),
              notes: [`Sources: State Bank of Pakistan (EasyData TS_GP_BAM_PKDLP_Q); Ministry of Finance, Annual Debt Review FY-26 (FY24-FY26 only). Retrieved ${data.retrievedOn}.`, "Percent of nominal GDP at market prices; fiscal years end on 30 June. MoF and SBP figures differ (GDP vintage) and are kept separate."],
            }}
          />
        </ControlBar>
      }
      source={`Sources: State Bank of Pakistan; Ministry of Finance, Annual Debt Review FY-26. Retrieved ${data.retrievedOn}.`}
    >
      <DateLines series={series} from={data.ratios[0].date} to={data.ratios[data.ratios.length - 1].date} ariaLabel="Pakistan government debt as a percentage of GDP at each fiscal year end" maxGapDays={400} zeroLine={false} decimals={1} />
    </ChartFrame>
  );
}
