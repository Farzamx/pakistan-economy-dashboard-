// The dashboard's view model: everything the Interest Rates page draws, built on the server from the fixed datasets (no database). Pure and
// deterministic for a given dataset, so it is unit-tested directly. Every value carries its observation date; every derived value its formula;
// every comparison its sample size.

import type { AuctionOutcome, AuctionRecord, TenorResult } from "@/lib/bonds/types";
import type { DatedPoint } from "@/lib/policyRate/dateSeries";
import { formatDate } from "@/lib/policyRate/format";
import { change, comparePeriods, lagCorrelations, summarize, type LagResult, type PeriodDef, type SummaryStats } from "./analytics";
import {
  CORRIDOR_FROM,
  LD_HEADLINE,
  PROVENANCE,
  SBP_PIB_FROM,
  SBP_TBILL_FROM,
  TARGET_RATE_FROM,
  cpiYoy,
  dataRetrievedOn,
  kiborDaily,
  kiborMonthly,
  ldEarly,
  ldSeries,
  omoOperations,
  overnightRepoRate,
  pibAuctions,
  pibSeries,
  policyRateRecords,
  policyRateSteps,
  repoRate,
  reverseRepoRate,
  tbillAuctions,
  tbillSeries,
  type AuctionSnapshot,
  type LdEntity,
  type OmoOp,
} from "./dataset";
import { FORMULAS, lendingDepositSpread, policyMinusKibor, policyMinusTbill, realKibor, realPolicyRate, termSpread } from "./derived";
import { monthlyMeans, rateAtMonthEnd, rateInForce } from "./series";
import type { LdMeasure } from "./sources";
import { KIBOR_TENORS, type KiborTenor } from "./types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const monthName = (m: string) => `${MONTHS[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`;
/** Display precision for chart payloads: 4 decimals (SBP prints 2-4). The stored datasets keep full precision. */
export const r4 = (v: number) => Math.round(v * 1e4) / 1e4;
const monthPoint = (m: string, value: number, note?: string): DatedPoint => ({ date: `${m}-15`, value: r4(value), ...(note ? { note } : {}) });

/** ISO date `months` months before `iso` (same day, clamped). */
export function monthsBefore(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const t = y * 12 + (m - 1) - months;
  const yy = Math.floor(t / 12);
  const mm = (t % 12) + 1;
  const last = new Date(Date.UTC(yy, mm, 0)).getUTCDate();
  return `${yy}-${String(mm).padStart(2, "0")}-${String(Math.min(d, last)).padStart(2, "0")}`;
}

const onOrBefore = <T extends { date: string }>(pts: readonly T[], iso: string): T | null => {
  let r: T | null = null;
  for (const p of pts) if (p.date <= iso) r = p;
  else break;
  return r;
};

export interface Tile {
  id: string;
  label: string;
  value: number | null;
  /** Shown instead of the value when there is no single number (the corridor). */
  display?: string;
  unit: "%" | "pp";
  date: string; // observation date or YYYY-MM
  dateLabel: string;
  kind: "administered" | "market" | "auction" | "survey" | "derived";
  note: string;
  flag?: string;
}

export interface StatRow {
  id: string;
  label: string;
  formula: string;
  frequency: string;
  stats: SummaryStats | null;
}

export interface ChangeRow {
  label: string;
  frequency: string;
  latest: { date: string; value: number } | null;
  yearAgo: { date: string; value: number } | null;
  threeYearsAgo: { date: string; value: number } | null;
  pp1y: number | null;
  bp1y: number | null;
  pp3y: number | null;
  bp3y: number | null;
}

export interface PeriodRow {
  period: PeriodDef;
  metrics: { label: string; stats: SummaryStats | null }[];
}

export interface CoverageRow {
  family: string;
  series: string;
  kind: "Observed" | "Derived";
  frequency: string;
  first: string;
  last: string;
  n: number;
  source: string;
  notes: string;
}

export interface LagTable {
  x: string;
  y: string;
  rows: LagResult[];
}

export interface BankSeriesSet {
  /** key -> monthly points (mid-month dates) with regime/flag notes */
  [key: string]: DatedPoint[];
}

export interface DashboardModel {
  retrievedOn: string;
  tiles: Tile[];
  overview: {
    policy: DatedPoint[];
    kibor3mMonthly: DatedPoint[];
    kibor6mMonthly: DatedPoint[];
    kibor3mDaily: DatedPoint[];
    kibor6mDaily: DatedPoint[];
    tbill3m: DatedPoint[];
    dailyFrom: string;
    to: string;
  };
  corridor: { ceiling: DatedPoint[]; floor: DatedPoint[]; target: DatedPoint[]; orrMonthly: DatedPoint[]; orrDaily: DatedPoint[]; dailyFrom: string; to: string };
  omo: { recent: OmoOp[]; yearly: { year: string; injections: number; mopups: number; rejected: number }[]; injectionCutoffs: DatedPoint[]; mopupCutoffs: DatedPoint[]; from: string };
  kibor: {
    tenors: KiborTenor[];
    snapshots: { label: string; date: string; values: (number | null)[] }[];
    monthly: Record<string, DatedPoint[]>;
    spread6mDaily: DatedPoint[];
    spread6mMonthly: DatedPoint[];
    spread3mMonthly: DatedPoint[];
    dailyFrom: string;
    to: string;
  };
  auctions: { tbills: AuctionRecord[]; pibs: AuctionRecord[]; policyMinusTbill: DatedPoint[]; termSpread: DatedPoint[]; sbpTbillFrom: string; sbpPibFrom: string };
  real: { rows: { period: string; policy: number | null; inflation: number | null; real: number | null }[]; realKibor6m: DatedPoint[]; realPolicy: DatedPoint[]; from: string; to: string };
  bank: { series: BankSeriesSet; early: { period: string; frequency: string; lending: number | null; deposit: number | null }[]; latest: { period: string; flag: string }; to: string };
  transmission: { policy: DatedPoint[]; kibor6m: DatedPoint[]; walrNew: DatedPoint[]; wadrNew: DatedPoint[]; lags: LagTable[]; from: string; to: string };
  stats: StatRow[];
  changes: ChangeRow[];
  periods: PeriodRow[];
  coverage: CoverageRow[];
  formulas: typeof FORMULAS;
  instrumentSwitch: string;
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------

const OUTCOME_FULL: Record<string, AuctionOutcome> = { A: "accepted", BR: "bids-rejected", NB: "no-bids", NA: "none-accepted" };

/** SBP auction snapshots as the Bond Yields curve explorer's records (yields and outcomes only; amounts are not part of this dataset). */
export function toAuctionRecords(instrument: "tbill" | "pib", snaps: AuctionSnapshot[]): AuctionRecord[] {
  return snaps.map((s) => ({
    instrument,
    auctionNo: null,
    auctionDate: s.date,
    settlementDate: s.settlement,
    tenors: Object.fromEntries(
      Object.entries(s.tenors).map(([k, t]) => [k, { outcome: OUTCOME_FULL[t!.outcome], cutoffYield: t!.cutoff, waYield: t!.wa, offered: null, acceptedCompetitive: null, acceptedNonCompetitive: null, target: null } satisfies TenorResult]),
    ),
  }));
}

function changeRow(label: string, frequency: string, pts: { date: string; value: number }[]): ChangeRow {
  const latest = pts.at(-1) ?? null;
  const yearAgo = latest ? onOrBefore(pts, monthsBefore(latest.date, 12)) : null;
  const threeYearsAgo = latest ? onOrBefore(pts, monthsBefore(latest.date, 36)) : null;
  const c1 = latest && yearAgo ? change(yearAgo.value, latest.value) : null;
  const c3 = latest && threeYearsAgo ? change(threeYearsAgo.value, latest.value) : null;
  return { label, frequency, latest, yearAgo, threeYearsAgo, pp1y: c1?.pp ?? null, bp1y: c1?.bp ?? null, pp3y: c3?.pp ?? null, bp3y: c3?.bp ?? null };
}

export function buildDashboard(): DashboardModel {
  const retrievedOn = dataRetrievedOn();
  const records = policyRateRecords();
  const steps = policyRateSteps();
  const policyPoints: DatedPoint[] = records.map((r) => ({ date: r.date, value: r.value, note: r.instrument === "target" ? "policy (target) rate" : r.date < "2009-08-17" ? "reverse repo (3-day repo facility) rate, then SBP's policy rate" : "reverse repo rate, then SBP's policy rate" }));
  const lastPolicy = records.at(-1)!;

  const k3 = kiborDaily("3M");
  const k6 = kiborDaily("6M");
  const kLast = k6.at(-1)![0];
  const dailyFrom = monthsBefore(kLast, 24);
  const daily = (pts: readonly (readonly [string, number])[]) => pts.filter(([d]) => d >= dailyFrom).map(([date, value]) => ({ date, value }));
  const monthly = (t: KiborTenor) => kiborMonthly(t).map((m) => monthPoint(m.month, m.mean, `monthly average of ${m.days} daily fixings`));

  const tb3 = tbillSeries("3M", "cutoff");
  const tb3Points: DatedPoint[] = tb3.map((p) => ({ date: p.date, value: p.value, note: `cut-off yield · ${p.source}` }));
  const orr = overnightRepoRate();
  const orrLast = orr.at(-1)![0];

  // Corridor
  const stepPoints = (ev: readonly (readonly [string, number])[], from: string) => {
    const before = ev.filter(([d]) => d < from).at(-1);
    return [...(before ? [{ date: from, value: before[1], note: `in force since ${before[0]}` }] : []), ...ev.filter(([d]) => d >= from).map(([date, value]) => ({ date, value }))];
  };
  const corridorFrom = CORRIDOR_FROM;

  // OMO
  const ops = omoOperations();
  const omoFrom = monthsBefore(ops.at(-1)!.date, 36);
  const years = [...new Set(ops.map((o) => o.date.slice(0, 4)))].sort();
  const yearly = years.map((year) => {
    const y = ops.filter((o) => o.date.startsWith(year));
    return { year, injections: y.filter((o) => o.side === "injection").length, mopups: y.filter((o) => o.side === "mopup").length, rejected: y.filter((o) => o.outcome !== "A").length };
  });
  const cut = (side: "injection" | "mopup") => ops.filter((o) => o.side === side && o.cutoffPct !== null && o.date >= omoFrom).map((o) => ({ date: o.date, value: o.cutoffPct!, note: `${o.tenorDays ?? "?"}-day ${side === "injection" ? "reverse repo" : "repo"}${o.accepted !== null ? `, Rs ${Math.round(o.accepted / 1000).toLocaleString("en-US")}bn accepted` : ""}` }));

  // KIBOR tenor snapshots: the latest fixing date and the fixing on or before 1, 6, 12 and 24 months earlier
  const kRows = KIBOR_TENORS.slice(0, 7).map((t) => new Map(kiborDaily(t)));
  const kDates = [...kRows[0].keys()];
  const snapAt = (label: string, iso: string) => {
    const d = [...kDates].reverse().find((x) => x <= iso)!;
    return { label, date: d, values: kRows.map((m) => m.get(d) ?? null) };
  };
  const snapshots = [snapAt("Latest", kLast), snapAt("1 month earlier", monthsBefore(kLast, 1)), snapAt("6 months earlier", monthsBefore(kLast, 6)), snapAt("1 year earlier", monthsBefore(kLast, 12)), snapAt("2 years earlier", monthsBefore(kLast, 24))];

  const spread6 = policyMinusKibor("6M");
  const spread3 = policyMinusKibor("3M");
  const spreadMonthly = (pts: { date: string; value: number }[]) => monthlyMeans(pts.map((p) => [p.date, p.value] as const)).map((m) => monthPoint(m.month, m.mean, `monthly average of ${m.days} daily spreads`));

  // Real rates
  const rp = realPolicyRate();
  const rk = realKibor("6M");

  // Bank rates
  const bank: BankSeriesSet = {};
  const add = (key: string, entity: LdEntity, measure: LdMeasure, zero: "incl" | "excl", inter: "incl" | "excl") => {
    bank[key] = ldSeries({ entity, measure, zeroMarkup: zero, interbank: inter }).map((p) => monthPoint(p.period, p.value, `regime ${p.regime}${p.flag === "P" ? " · provisional" : p.flag === "R" ? " · revised" : ""}`));
  };
  for (const zero of ["incl", "excl"] as const) {
    add(`SB.new.lend.${zero}`, "SB", "grossDisbursements", zero, "incl");
    add(`SB.new.dep.${zero}`, "SB", "freshDeposits", zero, "incl");
    add(`SB.out.lend.${zero}`, "SB", "outstandingLoans", zero, "incl");
    add(`SB.out.dep.${zero}`, "SB", "outstandingDeposits", zero, "incl");
    add(`FI.new.lend.${zero}`, "FI", "grossDisbursements", zero, "incl");
    add(`FI.new.dep.${zero}`, "FI", "freshDeposits", zero, "incl");
    add(`FI.out.lend.${zero}`, "FI", "outstandingLoans", zero, "incl");
    add(`FI.out.dep.${zero}`, "FI", "outstandingDeposits", zero, "incl");
  }
  const lendNew = ldSeries({ ...LD_HEADLINE, measure: "grossDisbursements" });
  const depNew = ldSeries({ ...LD_HEADLINE, measure: "freshDeposits" });
  const lastLd = lendNew.at(-1)!;

  // Transmission (monthly, from Jan 2005 when KIBOR and the monthly bank series overlap)
  const k6m = kiborMonthly("6M");
  const months = k6m.map((m) => m.month);
  const policyMonthEnd = new Map(months.map((m) => [m, rateAtMonthEnd(steps, m)!] as const));
  const k6map = new Map(k6m.map((m) => [m.month, m.mean]));
  const lendMap = new Map(lendNew.map((p) => [p.period, p.value]));
  const depMap = new Map(depNew.map((p) => [p.period, p.value]));
  /** Month-on-month changes between CONSECUTIVE months only; a change ending in a month listed in `breaks` (a methodology change) is not formed. */
  const diff = (m: Map<string, number>, breaks: readonly string[] = []) => {
    const out = new Map<string, number>();
    const keys = [...m.keys()].sort();
    keys.forEach((k, i) => {
      if (i === 0 || breaks.includes(k)) return;
      const prev = keys[i - 1];
      const [py, pm] = prev.split("-").map(Number);
      const [ky, km] = k.split("-").map(Number);
      if (ky * 12 + km - (py * 12 + pm) === 1) out.set(k, m.get(k)! - m.get(prev)!);
    });
    return out;
  };
  const LD_BREAKS = ["2011-01", "2022-07"]; // first months of regimes 3 and 4
  const dPolicy = diff(policyMonthEnd);
  const lags: LagTable[] = [
    { x: "Change in policy rate (month-end)", y: "Change in 6M KIBOR (monthly average)", rows: lagCorrelations(dPolicy, diff(k6map)) },
    { x: "Change in policy rate (month-end)", y: "Change in lending rate on new loans (scheduled banks)", rows: lagCorrelations(dPolicy, diff(lendMap, LD_BREAKS)) },
    { x: "Change in policy rate (month-end)", y: "Change in deposit rate on fresh deposits (scheduled banks)", rows: lagCorrelations(dPolicy, diff(depMap, LD_BREAKS)) },
  ];

  // Analytics tables
  const stats: StatRow[] = [
    { id: "pk6", label: "Policy rate − 6M KIBOR", formula: FORMULAS.policyMinusKibor, frequency: "daily", stats: summarize(spread6) },
    { id: "pk3", label: "Policy rate − 3M KIBOR", formula: FORMULAS.policyMinusKibor, frequency: "daily", stats: summarize(spread3) },
    { id: "pt3", label: "Policy rate − 3M T-bill cut-off", formula: FORMULAS.policyMinusTbill, frequency: "per auction", stats: summarize(policyMinusTbill("3M")) },
    { id: "lds", label: "Lending − deposit spread, new business (scheduled banks)", formula: FORMULAS.lendingDepositSpread, frequency: "monthly", stats: summarize(lendingDepositSpread("new", LD_HEADLINE).map((r) => ({ date: r.period, value: r.spread }))) },
    { id: "ldo", label: "Lending − deposit spread, outstanding (scheduled banks)", formula: FORMULAS.lendingDepositSpread, frequency: "monthly", stats: summarize(lendingDepositSpread("outstanding", LD_HEADLINE).map((r) => ({ date: r.period, value: r.spread }))) },
    { id: "ts", label: "10Y PIB − 3M T-bill (cut-off yields)", formula: FORMULAS.termSpread, frequency: "per PIB auction", stats: summarize(termSpread().map((t) => ({ date: t.date, value: t.spread }))) },
    { id: "rp", label: "Real policy rate", formula: FORMULAS.realPolicy, frequency: "monthly", stats: summarize(rp.map((r) => ({ date: r.month, value: r.real }))) },
    { id: "rk", label: "Real 6M KIBOR", formula: FORMULAS.realKibor, frequency: "monthly", stats: summarize(rk.map((r) => ({ date: r.month, value: r.real }))) },
  ];

  const changes: ChangeRow[] = [
    changeRow("SBP policy rate", "on change", records.map((r) => ({ date: r.date, value: r.value }))),
    changeRow("Overnight repo rate", "daily", orr.map(([date, value]) => ({ date, value }))),
    changeRow("6M KIBOR", "daily", k6.map(([date, value]) => ({ date, value }))),
    changeRow("3M T-bill cut-off yield", "per auction", tb3.map((p) => ({ date: p.date, value: p.value }))),
    changeRow("10Y PIB cut-off yield", "per auction", pibSeries("10Y", "cutoff").map((p) => ({ date: p.date, value: p.value }))),
    changeRow("Lending rate, new loans (scheduled banks)", "monthly", lendNew.map((p) => ({ date: p.period, value: p.value }))),
    changeRow("Deposit rate, fresh deposits (scheduled banks)", "monthly", depNew.map((p) => ({ date: p.period, value: p.value }))),
  ];

  // Period comparison: calendar windows, each defined by its months and described by what the policy rate did in it (computed, not asserted).
  const windows: [string, string][] = [["2016-07", "2018-06"], ["2018-07", "2020-02"], ["2020-03", "2021-08"], ["2021-09", "2023-06"], ["2023-07", "2024-05"], ["2024-06", "2025-05"], ["2025-06", rp.at(-1)!.month]];
  const periodDefs: PeriodDef[] = windows.map(([from, to]) => {
    const a = rateAtMonthEnd(steps, from)!;
    const b = rateAtMonthEnd(steps, to)!;
    return { id: `${from}_${to}`, label: `${monthName(from)} – ${monthName(to)}`, from, to, definition: `Calendar months ${monthName(from)} to ${monthName(to)} inclusive. Policy rate ${a}% at the end of the first month, ${b}% at the end of the last.` };
  });
  const realPts = rp.map((r) => ({ date: r.month, value: r.real }));
  const spreadPts = spread6.map((p) => ({ date: p.date, value: p.value }));
  const ldsPts = lendingDepositSpread("new", LD_HEADLINE).map((r) => ({ date: r.period, value: r.spread }));
  const periods: PeriodRow[] = periodDefs.map((p, i) => ({
    period: p,
    metrics: [
      { label: "Real policy rate (monthly)", stats: comparePeriods(realPts, periodDefs)[i].stats },
      { label: "Policy − 6M KIBOR (daily)", stats: comparePeriods(spreadPts, periodDefs)[i].stats },
      { label: "Lending − deposit spread, new (monthly)", stats: comparePeriods(ldsPts, periodDefs)[i].stats },
    ],
  }));

  // Coverage matrix
  const cov = (family: string, series: string, kind: CoverageRow["kind"], frequency: string, dates: string[], source: string, notes: string): CoverageRow => ({ family, series, kind, frequency, first: dates[0] ?? "—", last: dates.at(-1) ?? "—", n: dates.length, source, notes });
  const coverage: CoverageRow[] = [
    cov("SBP policy", "Reverse repo (ceiling) rate", "Observed", "on change", reverseRepoRate().map((e) => e[0]), "SBP EasyData SBPOL0010", "3-day repo facility rate before 17 Aug 2009; the policy rate until 24 May 2015"),
    cov("SBP policy", "Repo (floor) rate", "Observed", "on change", repoRate().map((e) => e[0]), "SBP EasyData SBPOL0020", "from 17 Aug 2009"),
    cov("SBP policy", "Policy (target) rate", "Observed", "on change", records.filter((r) => r.instrument === "target").map((r) => r.date), "SBP EasyData SBPOL0030", "SBP's sir.pdf dates the latest change w.e.f. 27 Oct 2026"),
    cov("SBP policy", "Weighted-average overnight repo rate", "Observed", "daily", orr.map((e) => e[0]), "SBP EasyData ORR", "a market rate"),
    cov("SBP policy", "OMO injections and mop-ups", "Observed", "per operation", ops.map((o) => o.date), "SBP OMO history files", "cut-off converted from fraction to percent; checked against quote ranges"),
    ...KIBOR_TENORS.map((t) => cov("KIBOR", `KIBOR ${t} (offer)`, "Observed", "daily", kiborDaily(t).map((e) => e[0]), "SBP EasyData", t === "2Y" || t === "3Y" ? "discontinued" : "some fixing days missing in EasyData")),
    ...(["1M", "3M", "6M", "12M"] as const).map((t) => cov("Government securities", `T-bill ${t} cut-off / weighted average`, "Observed", "per auction", tbillSeries(t, "cutoff").map((p) => p.date), t === "1M" ? "SBP tb.xlsx" : `EasyData to ${SBP_TBILL_FROM}, then SBP tb.xlsx`, "primary-market auction yields")),
    ...(["2Y", "3Y", "5Y", "7Y", "10Y", "15Y", "20Y", "30Y"] as const).map((t) => cov("Government securities", `PIB ${t} cut-off`, "Observed", "per auction", pibSeries(t, "cutoff").map((p) => p.date), ["7Y", "20Y", "30Y"].includes(t) ? "SBP EasyData" : t === "2Y" ? "SBP Pakinvestbonds.xlsx" : `EasyData to ${SBP_PIB_FROM}, then SBP Pakinvestbonds.xlsx`, t === "30Y" ? "no weighted-average yield" : "fixed-coupon PIBs")),
    cov("Banking", "Lending and deposit rates, scheduled banks (4 measures)", "Observed", "monthly", lendNew.map((p) => p.period), "SBP Lendingdepositrates_Arch.xls", "regimes 2-4; Oct 2026 provisional"),
    cov("Banking", "Lending and deposit rates, all financial institutions", "Observed", "monthly", ldSeries({ ...LD_HEADLINE, entity: "FI", measure: "grossDisbursements" }).map((p) => p.period), "SBP Lendingdepositrates_Arch.xls", "from Jul 2022 only"),
    cov("Banking", "Lending and deposit rates, all groups (regime 1)", "Observed", "half-yearly, then monthly", ldEarly().map((p) => p.period), "SBP Lendingdepositrates_Arch.xls", "a different compilation; not joined"),
    cov("Inflation", "National CPI inflation, YoY (2015-16 base)", "Observed", "monthly", cpiYoy().map((c) => c.month), "SBP EasyData P00011516", "input to real rates only"),
    cov("Derived", "Real policy rate", "Derived", "monthly", rp.map((r) => r.month), "computed", FORMULAS.realPolicy),
    cov("Derived", "Real 6M KIBOR", "Derived", "monthly", rk.map((r) => r.month), "computed", FORMULAS.realKibor),
    cov("Derived", "Policy − 6M KIBOR", "Derived", "daily", spread6.map((p) => p.date), "computed", FORMULAS.policyMinusKibor),
    cov("Derived", "Policy − 3M T-bill", "Derived", "per auction", policyMinusTbill("3M").map((p) => p.date), "computed", FORMULAS.policyMinusTbill),
    cov("Derived", "Lending − deposit spread", "Derived", "monthly", ldsPts.map((p) => p.date), "computed", FORMULAS.lendingDepositSpread),
    cov("Derived", "10Y PIB − 3M T-bill", "Derived", "per PIB auction", termSpread().map((t) => t.date), "computed", FORMULAS.termSpread),
  ];

  const real = rp.at(-1)!;
  const tiles: Tile[] = [
    { id: "policy", label: "SBP policy rate", value: lastPolicy.value, unit: "%", date: lastPolicy.date, dateLabel: `since ${formatDate(lastPolicy.date)}`, kind: "administered", note: "Set by SBP's Monetary Policy Committee (EasyData date; SBP's table says w.e.f. 27 Oct 2026)." },
    { id: "corridor", label: "Corridor (floor – ceiling)", value: null, display: `${rateInForce(repoRate(), lastPolicy.date)}% – ${rateInForce(reverseRepoRate(), lastPolicy.date)}%`, unit: "%", date: lastPolicy.date, dateLabel: `since ${formatDate(lastPolicy.date)}`, kind: "administered", note: "SBP's repo (floor) and reverse repo (ceiling) rates." },
    { id: "orr", label: "Overnight repo rate", value: orr.at(-1)![1], unit: "%", date: orrLast, dateLabel: formatDate(orrLast), kind: "market", note: "Weighted average of overnight interbank repo trades." },
    { id: "k6", label: "6M KIBOR", value: k6.at(-1)![1], unit: "%", date: kLast, dateLabel: formatDate(kLast), kind: "market", note: "Offer rate quoted by contributing banks; not set by SBP." },
    { id: "tb3", label: "3M T-bill cut-off yield", value: tb3.at(-1)!.value, unit: "%", date: tb3.at(-1)!.date, dateLabel: `auction of ${formatDate(tb3.at(-1)!.date)}`, kind: "auction", note: "Highest yield accepted at the latest auction." },
    { id: "walr", label: "Lending rate, new loans", value: lastLd.value, unit: "%", date: lastLd.period, dateLabel: `${monthName(lastLd.period)}${lastLd.flag === "P" ? " (provisional)" : ""}`, kind: "survey", note: "Scheduled banks, weighted average on gross disbursements.", flag: lastLd.flag },
    { id: "wadr", label: "Deposit rate, fresh deposits", value: depNew.at(-1)!.value, unit: "%", date: depNew.at(-1)!.period, dateLabel: `${monthName(depNew.at(-1)!.period)}${depNew.at(-1)!.flag === "P" ? " (provisional)" : ""}`, kind: "survey", note: "Scheduled banks, weighted average on fresh deposits.", flag: depNew.at(-1)!.flag },
    { id: "real", label: "Real policy rate", value: real.real, unit: "%", date: real.month, dateLabel: `${monthName(real.month)} (CPI ${real.inflation}%)`, kind: "derived", note: FORMULAS.realPolicy },
  ];

  const to = [kLast, orrLast, tb3.at(-1)!.date].sort().at(-1)!;
  return {
    retrievedOn,
    tiles,
    overview: { policy: policyPoints, kibor3mMonthly: monthly("3M"), kibor6mMonthly: monthly("6M"), kibor3mDaily: daily(k3), kibor6mDaily: daily(k6), tbill3m: tb3Points, dailyFrom, to },
    corridor: {
      ceiling: stepPoints(reverseRepoRate(), corridorFrom),
      floor: stepPoints(repoRate(), corridorFrom),
      target: records.filter((r) => r.instrument === "target").map((r) => ({ date: r.date, value: r.value })),
      orrMonthly: monthlyMeans(orr).map((m) => monthPoint(m.month, m.mean, `monthly average of ${m.days} days`)),
      orrDaily: daily(orr),
      dailyFrom,
      to,
    },
    omo: { recent: ops.slice(-25).reverse(), yearly, injectionCutoffs: cut("injection"), mopupCutoffs: cut("mopup"), from: omoFrom },
    kibor: {
      tenors: [...KIBOR_TENORS.slice(0, 7)],
      snapshots,
      monthly: Object.fromEntries(KIBOR_TENORS.slice(0, 7).map((t) => [t, monthly(t)])),
      spread6mDaily: spread6.filter((p) => p.date >= dailyFrom).map((p) => ({ date: p.date, value: r4(p.value) })),
      spread6mMonthly: spreadMonthly(spread6),
      spread3mMonthly: spreadMonthly(spread3),
      dailyFrom,
      to,
    },
    auctions: {
      tbills: toAuctionRecords("tbill", tbillAuctions()),
      pibs: toAuctionRecords("pib", pibAuctions()),
      policyMinusTbill: policyMinusTbill("3M").map((p) => ({ date: p.date, value: r4(p.value) })),
      termSpread: termSpread().map((t) => ({ date: t.date, value: r4(t.spread), note: `10Y ${t.long}% (${t.date}) − 3M ${t.short}% (${t.tbillDate})` })),
      sbpTbillFrom: SBP_TBILL_FROM,
      sbpPibFrom: SBP_PIB_FROM,
    },
    real: {
      rows: rp.map((r) => ({ period: r.month, policy: r.nominal, inflation: r.inflation, real: r.real })),
      realKibor6m: rk.map((r) => monthPoint(r.month, r.real, `6M KIBOR ${r.nominal.toFixed(2)}% (average of ${r.days} fixings), CPI ${r.inflation}%`)),
      realPolicy: rp.map((r) => monthPoint(r.month, r.real, `policy rate ${r.nominal}%, CPI ${r.inflation}%`)),
      from: `${rp[0].month}-01`,
      to: `${rp.at(-1)!.month}-28`,
    },
    bank: { series: bank, early: ldEarly(), latest: { period: lastLd.period, flag: lastLd.flag }, to: `${lastLd.period}-28` },
    transmission: {
      policy: months.map((m) => monthPoint(m, policyMonthEnd.get(m)!, "policy rate at month-end")),
      kibor6m: k6m.map((m) => monthPoint(m.month, m.mean, `average of ${m.days} fixings`)),
      walrNew: lendNew.map((p) => monthPoint(p.period, p.value, p.flag === "P" ? "provisional" : undefined)),
      wadrNew: depNew.map((p) => monthPoint(p.period, p.value, p.flag === "P" ? "provisional" : undefined)),
      lags,
      from: "2005-06-01",
      to: `${lastLd.period}-28`,
    },
    stats,
    changes,
    periods,
    coverage,
    formulas: FORMULAS,
    instrumentSwitch: TARGET_RATE_FROM,
  };
}

export { PROVENANCE };
