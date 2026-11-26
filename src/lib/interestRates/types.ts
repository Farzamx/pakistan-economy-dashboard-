// Row types of the generated interest-rate datasets (src/data/interestRates/*.ts, written by scripts/buildInterestRates.ts). Compact tuples keep the
// files small; src/lib/interestRates/dataset.ts decodes them into named objects. Every rate is percent per annum. A missing figure is null, never zero.

/** An administered or observed rate on a date: [YYYY-MM-DD, percent]. */
export type DateValue = readonly [date: string, value: number];

export const KIBOR_TENORS = ["1W", "2W", "1M", "3M", "6M", "9M", "1Y", "2Y", "3Y"] as const;
export type KiborTenor = (typeof KIBOR_TENORS)[number];
/** [date, offer rate per KIBOR_TENORS]; 2Y and 3Y are null after SBP discontinued them (4 Feb 2020). */
export type KiborRow = readonly [date: string, ...values: (number | null)[]];

export const EASY_TBILL_TENORS = ["3M", "6M", "12M"] as const;
/** EasyData T-bill auction row: [date, cut-off 3M, 6M, 12M, weighted average 3M, 6M, 12M]. */
export type EasyTbillRow = readonly [date: string, ...values: (number | null)[]];

export const EASY_PIB_TENORS = ["2Y", "3Y", "5Y", "7Y", "10Y", "15Y", "20Y", "30Y"] as const;
/** EasyData PIB auction row: [date, cut-off per EASY_PIB_TENORS (8), weighted average per EASY_PIB_TENORS (8)]. */
export type EasyPibRow = readonly [date: string, ...values: (number | null)[]];

/** Outcome of one tenor at an SBP auction: A accepted | BR bids rejected | NB no bids | NA none accepted. */
export type AuctionOutcomeCode = "A" | "BR" | "NB" | "NA";
/** SBP auction file row: [auction date, settlement date, { tenor: [cut-off, weighted average, outcome] }]. */
export type SbpAuctionRow = readonly [auctionDate: string, settlementDate: string, tenors: Readonly<Record<string, readonly [number | null, number | null, AuctionOutcomeCode]>>];

/** Monthly lending/deposit row: [YYYY-MM, entity, regime, flag, 16 values in LD_VARIANTS order]. entity SB = scheduled banks, FI = all financial institutions. */
export type LdMonthTuple = readonly [period: string, entity: "SB" | "FI", regime: 2 | 3 | 4, flag: "" | "P" | "R", ...values: (number | null)[]];
/** 1997-2003 "All Groups" row: [YYYY-MM, H (half-yearly) | M (monthly), lending, deposit]. */
export type LdEarlyTuple = readonly [period: string, frequency: "H" | "M", lending: number | null, deposit: number | null];

/** OMO row: [date, I (injection, reverse repo) | M (mop-up, repo), tenor days, tenor note, offered, bids offered, quote low, quote high, accepted, bids accepted, cut-off %, outcome]. Amounts PKR million. */
export type OmoTuple = readonly [
  date: string,
  side: "I" | "M",
  tenorDays: number | null,
  tenorNote: string | null,
  offered: number | null,
  bidsOffered: number | null,
  quoteLow: number | null,
  quoteHigh: number | null,
  accepted: number | null,
  bidsAccepted: number | null,
  cutoffPct: number | null,
  outcome: "A" | "BR" | "NB" | "NA",
];

/** National CPI inflation, year on year: [YYYY-MM, percent]. */
export type CpiRow = readonly [month: string, yoy: number];

/** A source observation deliberately not used, with the reason (nothing is dropped silently). */
export interface ExcludedObservationRow {
  series: string;
  date: string;
  raw: string;
  status: string;
  reason: string;
}

export interface SourceFileRef {
  path: string;
  url: string;
  sha256: string;
  retrievedOn: string;
}
