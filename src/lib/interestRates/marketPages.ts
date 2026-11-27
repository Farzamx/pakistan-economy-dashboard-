// Facts for the public KIBOR and T-bill pages, computed from the validated interest-rate datasets (src/data/interestRates). Every value carries its
// observation date; comparisons use the observation on or before the comparison date (never an interpolated value). Pure: unit-tested.

import { kiborDaily, policyRateSteps, tbillAuctions, tbillSeries, type TbillTenor } from "./dataset";
import { rateInForce } from "./series";
import { KIBOR_TENORS, type KiborTenor } from "./types";

export const KIBOR_CURRENT_TENORS = KIBOR_TENORS.slice(0, 7) as readonly KiborTenor[];

const minusMonths = (iso: string, months: number) => {
  const [y, m, d] = iso.split("-").map(Number);
  const t = y * 12 + (m - 1) - months;
  const yy = Math.floor(t / 12);
  const mm = (t % 12) + 1;
  const last = new Date(Date.UTC(yy, mm, 0)).getUTCDate();
  return `${yy}-${String(mm).padStart(2, "0")}-${String(Math.min(d, last)).padStart(2, "0")}`;
};

const onOrBefore = (pts: readonly (readonly [string, number])[], iso: string) => {
  let r: readonly [string, number] | null = null;
  for (const p of pts) {
    if (p[0] <= iso) r = p;
    else break;
  }
  return r;
};

export interface KiborRow {
  tenor: KiborTenor;
  latest: { date: string; value: number };
  previous: { date: string; value: number } | null;
  monthAgo: { date: string; value: number } | null;
  yearAgo: { date: string; value: number } | null;
}

export interface KiborFacts {
  date: string;
  rows: KiborRow[];
  policy: number;
  first: string;
  fixings: number;
  high6m: { date: string; value: number };
  low6m: { date: string; value: number };
  /** The 6M fixing minus the policy rate in force on the same day, in percentage points. */
  spread6m: number;
}

export function kiborFacts(): KiborFacts {
  const rows = KIBOR_CURRENT_TENORS.map((tenor) => {
    const pts = kiborDaily(tenor);
    const [date, value] = pts[pts.length - 1];
    const prev = pts.length > 1 ? pts[pts.length - 2] : null;
    const m = onOrBefore(pts, minusMonths(date, 1));
    const y = onOrBefore(pts, minusMonths(date, 12));
    return {
      tenor,
      latest: { date, value },
      previous: prev ? { date: prev[0], value: prev[1] } : null,
      monthAgo: m ? { date: m[0], value: m[1] } : null,
      yearAgo: y ? { date: y[0], value: y[1] } : null,
    };
  });
  const six = kiborDaily("6M");
  let high = six[0];
  let low = six[0];
  for (const p of six) {
    if (p[1] > high[1]) high = p;
    if (p[1] < low[1]) low = p;
  }
  const date = rows.find((r) => r.tenor === "6M")!.latest.date;
  const policy = rateInForce(policyRateSteps(), date)!;
  return {
    date,
    rows,
    policy,
    first: six[0][0],
    fixings: six.length,
    high6m: { date: high[0], value: high[1] },
    low6m: { date: low[0], value: low[1] },
    spread6m: rows.find((r) => r.tenor === "6M")!.latest.value - policy,
  };
}

export interface TbillTenorRow {
  tenor: TbillTenor;
  cutoff: number | null;
  wa: number | null;
  outcome: string;
  prevCutoff: { date: string; value: number } | null;
  yearAgoCutoff: { date: string; value: number } | null;
}

export interface TbillFacts {
  auctionDate: string;
  settlementDate: string;
  rows: TbillTenorRow[];
  policy: number;
  auctions: number;
  first: string;
  high3m: { date: string; value: number };
  low3m: { date: string; value: number };
}

const OUTCOME_TEXT: Record<string, string> = { A: "accepted", BR: "bids rejected", NB: "no bids received", NA: "none accepted" };

export function tbillFacts(): TbillFacts {
  const auctions = tbillAuctions();
  const last = auctions[auctions.length - 1];
  const rows = (["1M", "3M", "6M", "12M"] as const).map((tenor) => {
    const t = last.tenors[tenor];
    const series = tbillSeries(tenor, "cutoff").filter((p) => p.date < last.date);
    const prev = series.length ? series[series.length - 1] : null;
    const ya = onOrBefore(series.map((p) => [p.date, p.value] as const), minusMonths(last.date, 12));
    return {
      tenor,
      cutoff: t?.cutoff ?? null,
      wa: t?.wa ?? null,
      outcome: t ? OUTCOME_TEXT[t.outcome] : "not offered",
      prevCutoff: prev ? { date: prev.date, value: prev.value } : null,
      yearAgoCutoff: ya ? { date: ya[0], value: ya[1] } : null,
    };
  });
  const s3 = tbillSeries("3M", "cutoff");
  let high = s3[0];
  let low = s3[0];
  for (const p of s3) {
    if (p.value > high.value) high = p;
    if (p.value < low.value) low = p;
  }
  return {
    auctionDate: last.date,
    settlementDate: last.settlement,
    rows,
    policy: rateInForce(policyRateSteps(), last.date)!,
    auctions: s3.length,
    first: s3[0].date,
    high3m: { date: high.date, value: high.value },
    low3m: { date: low.date, value: low.value },
  };
}
