// Read access to the generated interest-rate datasets (src/data/interestRates/*). Decodes the compact tuples into named series and applies the approved
// source hierarchy. Nothing here fills, interpolates or extrapolates: a missing observation is absent (or null), never zero.

import { BANK_RATES_PROVENANCE, LD_EARLY, LD_MONTHLY } from "@/data/interestRates/bankRates";
import { CPI_PROVENANCE, CPI_YOY } from "@/data/interestRates/cpi";
import { EASY_PIB_AUCTIONS, EASY_TBILL_AUCTIONS, GOV_SEC_EXCLUDED, GOV_SEC_PROVENANCE, SBP_PIB_AUCTIONS, SBP_TBILL_AUCTIONS } from "@/data/interestRates/govSecurities";
import { KIBOR_DAILY, KIBOR_PROVENANCE } from "@/data/interestRates/kibor";
import { OMO_OPERATIONS, OMO_PROVENANCE } from "@/data/interestRates/omo";
import { OVERNIGHT_REPO, POLICY_RATES_PROVENANCE, SBP_REPO, SBP_REVERSE_REPO, SBP_TARGET } from "@/data/interestRates/policyRates";
import { LD_VARIANTS, type LdMeasure } from "./sources";
import { monthlyMeans, type MonthlyMean } from "./series";
import { EASY_PIB_TENORS, KIBOR_TENORS, type AuctionOutcomeCode, type DateValue, type KiborTenor } from "./types";

// ---------------------------------------------------------------------------------------------------------------------------------------------------------
// SBP administered rates

/** The date SBP introduced the policy (target) rate. Before it, the reverse repo (ceiling) rate served as the policy rate (SBP sir.pdf, note 1). */
export const TARGET_RATE_FROM = "2015-05-25";
/** The date the corridor's floor (repo rate) was introduced and the ceiling became the O/N reverse repo rate (DMMD Circular 1 of 2009). */
export const CORRIDOR_FROM = "2009-08-17";

export const reverseRepoRate = (): readonly DateValue[] => SBP_REVERSE_REPO;
export const repoRate = (): readonly DateValue[] => SBP_REPO;
export const targetRate = (): readonly DateValue[] => SBP_TARGET;
export const overnightRepoRate = (): readonly DateValue[] => OVERNIGHT_REPO;

export type PolicyInstrument = "reverse-repo" | "target";

export interface PolicyRecord {
  date: string;
  value: number;
  /** Which administered rate served as "the policy rate" on that date. */
  instrument: PolicyInstrument;
}

/**
 * SBP's policy rate through time AS SBP DEFINES IT: the reverse repo rate until 24 May 2015, the policy (target) rate from 25 May 2015. The two instruments
 * are different rates (the reverse repo is the corridor's ceiling, the target sits inside the corridor); every record says which one it is, and charts
 * mark the switch. This is not a splice of two estimates of one thing: it is the sequence of the rates SBP itself named as its policy rate.
 */
export function policyRateRecords(): PolicyRecord[] {
  return [
    ...SBP_REVERSE_REPO.filter(([d]) => d < TARGET_RATE_FROM).map(([date, value]) => ({ date, value, instrument: "reverse-repo" as const })),
    ...SBP_TARGET.map(([date, value]) => ({ date, value, instrument: "target" as const })),
  ];
}

export const policyRateSteps = (): DateValue[] => policyRateRecords().map((r) => [r.date, r.value] as const);

// ---------------------------------------------------------------------------------------------------------------------------------------------------------
// KIBOR

export function kiborDaily(tenor: KiborTenor): DateValue[] {
  const i = KIBOR_TENORS.indexOf(tenor) + 1;
  return KIBOR_DAILY.flatMap((r) => (r[i] === null || r[i] === undefined ? [] : [[r[0], r[i] as number] as const]));
}

/** Monthly mean of the daily fixings actually published in each month (with the day count). */
export const kiborMonthly = (tenor: KiborTenor): MonthlyMean[] => monthlyMeans(kiborDaily(tenor));

// ---------------------------------------------------------------------------------------------------------------------------------------------------------
// Government securities (auction yields)

export type YieldKind = "cutoff" | "wa";
export type AuctionSource = "SBP auction file" | "SBP EasyData";

export interface AuctionPoint {
  date: string;
  value: number;
  source: AuctionSource;
}

export const TBILL_TENORS = ["1M", "3M", "6M", "12M"] as const;
export type TbillTenor = (typeof TBILL_TENORS)[number];
export const PIB_TENORS = ["2Y", "3Y", "5Y", "7Y", "10Y", "15Y", "20Y", "30Y"] as const;
export type PibTenor = (typeof PIB_TENORS)[number];
const SBP_FILE_PIB_TENORS: readonly PibTenor[] = ["2Y", "3Y", "5Y", "10Y", "15Y"];

export const SBP_TBILL_FROM: string = GOV_SEC_PROVENANCE.sbpTbillFrom;
export const SBP_PIB_FROM: string = GOV_SEC_PROVENANCE.sbpPibFrom;

function sbpAuctionPoints(rows: typeof SBP_TBILL_AUCTIONS, tenor: string, kind: YieldKind): AuctionPoint[] {
  const k = kind === "cutoff" ? 0 : 1;
  return rows.flatMap((r) => {
    const t = r[2][tenor];
    return t && t[k] !== null ? [{ date: r[0], value: t[k] as number, source: "SBP auction file" as const }] : [];
  });
}

/**
 * One T-bill yield series under the approved hierarchy: SBP's own auction file (tb.xlsx) from its first detailed auction, SBP EasyData before that.
 * Cut-off and weighted-average yields are separate series; this never mixes them. The 1-month bill exists only in the SBP file (from Mar 2025).
 */
export function tbillSeries(tenor: TbillTenor, kind: YieldKind): AuctionPoint[] {
  const sbp = sbpAuctionPoints(SBP_TBILL_AUCTIONS, tenor, kind);
  if (tenor === "1M") return sbp;
  const col = 1 + (kind === "cutoff" ? 0 : 3) + ["3M", "6M", "12M"].indexOf(tenor);
  const easy = EASY_TBILL_AUCTIONS.filter((r) => r[0] < SBP_TBILL_FROM && r[col] !== null).map((r) => ({ date: r[0], value: r[col] as number, source: "SBP EasyData" as const }));
  return [...easy, ...sbp];
}

/** PIB yields: SBP's Pakinvestbonds.xlsx from its first auction for the tenors it carries; SBP EasyData before that, and for 7, 20 and 30 years throughout. */
export function pibSeries(tenor: PibTenor, kind: YieldKind): AuctionPoint[] {
  const col = 1 + (kind === "cutoff" ? 0 : EASY_PIB_TENORS.length) + EASY_PIB_TENORS.indexOf(tenor);
  const inFile = SBP_FILE_PIB_TENORS.includes(tenor);
  const easy = EASY_PIB_AUCTIONS.filter((r) => (!inFile || r[0] < SBP_PIB_FROM) && r[col] !== null).map((r) => ({ date: r[0], value: r[col] as number, source: "SBP EasyData" as const }));
  return inFile ? [...easy, ...sbpAuctionPoints(SBP_PIB_AUCTIONS, tenor, kind)] : easy;
}

export interface CurvePoint {
  tenor: TbillTenor | PibTenor;
  years: number;
  value: number | null;
  outcome: AuctionOutcomeCode | null;
  auctionDate: string;
}

export const TENOR_YEARS: Record<TbillTenor | PibTenor, number> = { "1M": 1 / 12, "3M": 0.25, "6M": 0.5, "12M": 1, "2Y": 2, "3Y": 3, "5Y": 5, "7Y": 7, "10Y": 10, "15Y": 15, "20Y": 20, "30Y": 30 };

export interface AuctionSnapshot {
  date: string;
  settlement: string;
  tenors: Partial<Record<string, { cutoff: number | null; wa: number | null; outcome: AuctionOutcomeCode }>>;
}

const snap = (r: (typeof SBP_TBILL_AUCTIONS)[number]): AuctionSnapshot => ({ date: r[0], settlement: r[1], tenors: Object.fromEntries(Object.entries(r[2]).map(([k, v]) => [k, { cutoff: v[0], wa: v[1], outcome: v[2] }])) });
/** Every auction in SBP's detailed T-bill file, oldest first. */
export const tbillAuctions = (): AuctionSnapshot[] => SBP_TBILL_AUCTIONS.map(snap);
/** Every auction in SBP's fixed-coupon PIB file, oldest first. */
export const pibAuctions = (): AuctionSnapshot[] => SBP_PIB_AUCTIONS.map(snap);

// ---------------------------------------------------------------------------------------------------------------------------------------------------------
// Lending and deposit rates

export type LdEntity = "SB" | "FI";
export interface LdPoint {
  period: string;
  value: number;
  regime: 2 | 3 | 4;
  flag: "" | "P" | "R";
}

export interface LdSelector {
  entity: LdEntity;
  measure: LdMeasure;
  zeroMarkup: "incl" | "excl";
  /** Inter-bank / inter-FI placements. "excl" exists only from Jan 2011. */
  interbank: "incl" | "excl";
}

/** The headline analytical choice (matches SBP's own "Overall Weighted Average Rates" in sir.pdf): scheduled banks, zero mark-up and inter-FI included. */
export const LD_HEADLINE: Omit<LdSelector, "measure"> = { entity: "SB", zeroMarkup: "incl", interbank: "incl" };

export function ldSeries(sel: LdSelector): LdPoint[] {
  const i = LD_VARIANTS.indexOf(`${sel.measure}.${sel.zeroMarkup}Zero.${sel.interbank}Inter` as (typeof LD_VARIANTS)[number]);
  return LD_MONTHLY.filter((r) => r[1] === sel.entity).flatMap((r) => {
    const v = r[4 + i];
    return v === null || v === undefined ? [] : [{ period: r[0], value: v as number, regime: r[2], flag: r[3] }];
  });
}

export interface LdEarlyPoint {
  period: string;
  frequency: "half-yearly" | "monthly";
  lending: number | null;
  deposit: number | null;
}
/** Regime 1 (Jun 1997 - Dec 2003, "All Groups"): a different compilation, shown on its own and never joined to the monthly series. */
export const ldEarly = (): LdEarlyPoint[] => LD_EARLY.map((r) => ({ period: r[0], frequency: r[1] === "H" ? "half-yearly" : "monthly", lending: r[2], deposit: r[3] }));

// ---------------------------------------------------------------------------------------------------------------------------------------------------------
// OMO and CPI

export interface OmoOp {
  date: string;
  side: "injection" | "mopup";
  tenorDays: number | null;
  tenorNote: string | null;
  offered: number | null;
  accepted: number | null;
  quoteLow: number | null;
  quoteHigh: number | null;
  cutoffPct: number | null;
  outcome: "A" | "BR" | "NB" | "NA";
}

export const omoOperations = (): OmoOp[] =>
  OMO_OPERATIONS.map((r) => ({ date: r[0], side: r[1] === "I" ? "injection" : "mopup", tenorDays: r[2], tenorNote: r[3], offered: r[4], accepted: r[8], quoteLow: r[6], quoteHigh: r[7], cutoffPct: r[10], outcome: r[11] }));

export const cpiYoy = (): { month: string; value: number }[] => CPI_YOY.map(([month, value]) => ({ month, value }));

// ---------------------------------------------------------------------------------------------------------------------------------------------------------

export const PROVENANCE = {
  policy: POLICY_RATES_PROVENANCE,
  kibor: KIBOR_PROVENANCE,
  govSec: GOV_SEC_PROVENANCE,
  bank: BANK_RATES_PROVENANCE,
  omo: OMO_PROVENANCE,
  cpi: CPI_PROVENANCE,
} as const;

export const govSecExcluded = () => GOV_SEC_EXCLUDED;

/** The retrieval date of the newest source file behind the datasets. */
export function dataRetrievedOn(): string {
  return Object.values(PROVENANCE)
    .flatMap((p) => p.sources.map((s) => s.retrievedOn))
    .sort()
    .at(-1)!;
}
