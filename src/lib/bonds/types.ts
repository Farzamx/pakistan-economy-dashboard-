// Types for Pakistan government-securities auction data (T-bills and fixed-coupon PIBs).
//
// Every figure comes from the State Bank of Pakistan's own auction archives (see src/data/govSecAuctions.ts for the files and how they were read).
// Yields are percent per annum to four decimals, exactly as SBP prints them. Amounts are PKR million of FACE value, as SBP prints them.
// A missing figure is `null`. It is never zero: a failed auction has an `outcome`, not a zero yield.

export type Instrument = "tbill" | "pib";

export type TBillTenor = "1M" | "3M" | "6M" | "12M";
export type PibTenor = "2Y" | "3Y" | "5Y" | "10Y" | "15Y";
export type Tenor = TBillTenor | PibTenor;

/** The tenor's length in years, for plotting on a maturity axis (1M = 1/12). */
export const TENOR_YEARS: Record<Tenor, number> = { "1M": 1 / 12, "3M": 0.25, "6M": 0.5, "12M": 1, "2Y": 2, "3Y": 3, "5Y": 5, "10Y": 10, "15Y": 15 };
export const TBILL_TENORS: TBillTenor[] = ["1M", "3M", "6M", "12M"];
export const PIB_TENORS: PibTenor[] = ["2Y", "3Y", "5Y", "10Y", "15Y"];
export const TENOR_LABEL: Record<Tenor, string> = { "1M": "1-month", "3M": "3-month", "6M": "6-month", "12M": "12-month", "2Y": "2-year", "3Y": "3-year", "5Y": "5-year", "10Y": "10-year", "15Y": "15-year" };

/**
 * What happened to one tenor in one auction.
 *   accepted        bids were accepted; the yields are present
 *   bids-rejected   bids were received and all rejected (SBP "BR"); no yield exists
 *   no-bids         no bid was received (SBP "NBR"); no yield exists
 *   none-accepted   bids were received but none was accepted (SBP prints a dash or zero); no yield exists
 */
export type AuctionOutcome = "accepted" | "bids-rejected" | "no-bids" | "none-accepted";

export interface TenorResult {
  outcome: AuctionOutcome;
  /** Highest accepted yield, % p.a. Null when no bid was accepted. */
  cutoffYield: number | null;
  /** Weighted average yield of accepted bids, % p.a. Null when no bid was accepted. */
  waYield: number | null;
  /** Competitive bids offered, PKR million face value. Null when no bid was received. */
  offered: number | null;
  /** Competitive bids accepted, PKR million face value. Null when none was accepted. */
  acceptedCompetitive: number | null;
  /** Non-competitive bids accepted, PKR million face value. */
  acceptedNonCompetitive: number | null;
  /** PIBs only: short sales accommodated, PKR million face value. */
  acceptedShortSale?: number | null;
  /** Government's target for this tenor, PKR million face value. Null where SBP published only a combined target (T-bills before Sep-2019). */
  target: number | null;
}

export interface AuctionRecord {
  instrument: Instrument;
  /** SBP's auction number (T-bills). Null for PIBs, which SBP does not number. */
  auctionNo: number | null;
  /** The day bids were taken, YYYY-MM-DD. */
  auctionDate: string;
  /** The day the securities were issued and paid for (T-bill "issue date", PIB "settlement date"), YYYY-MM-DD. */
  settlementDate: string;
  tenors: Partial<Record<Tenor, TenorResult>>;
}

/** A row the parser deliberately left out, so nothing is dropped silently. */
export interface ExcludedRow {
  instrument: Instrument;
  auctionDate: string;
  tenorLabel: string;
  reason: string;
}

export interface ParseResult {
  auctions: AuctionRecord[];
  excluded: ExcludedRow[];
  /** Anything unusual the parser met and handled (for the generator's report), not an error. */
  warnings: string[];
}
