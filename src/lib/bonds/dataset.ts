// Decodes the generated data file (src/data/govSecAuctions.ts) into typed auction records. Pure and synchronous.

import { GOV_SEC_EXCLUDED, GOV_SEC_PROVENANCE, RAW_PIB_AUCTIONS, RAW_TBILL_AUCTIONS, type RawAuction } from "@/data/govSecAuctions";
import type { AuctionOutcome, AuctionRecord, ExcludedRow, Instrument, Tenor, TenorResult } from "./types";

const OUTCOME_BY_CODE: Record<string, AuctionOutcome> = { A: "accepted", BR: "bids-rejected", NB: "no-bids", NA: "none-accepted" };
const VALID_TENORS: ReadonlySet<string> = new Set(["1M", "3M", "6M", "12M", "2Y", "3Y", "5Y", "10Y", "15Y"]);

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** One stored tuple → a typed result. An unknown outcome code throws: a corrupt data file must not be read as "accepted". */
export function decodeTenor(tuple: readonly (number | string | null)[]): TenorResult {
  const code = tuple[6];
  const outcome = typeof code === "string" ? OUTCOME_BY_CODE[code] : undefined;
  if (!outcome) throw new Error(`govSecAuctions: unknown outcome code ${JSON.stringify(code)}`);
  const base: TenorResult = {
    outcome,
    cutoffYield: num(tuple[0]),
    waYield: num(tuple[1]),
    offered: num(tuple[2]),
    acceptedCompetitive: num(tuple[3]),
    acceptedNonCompetitive: num(tuple[4]),
    target: num(tuple[5]),
  };
  return tuple.length > 7 ? { ...base, acceptedShortSale: num(tuple[7]) } : base;
}

export function decodeAuction(instrument: Instrument, raw: RawAuction): AuctionRecord {
  const [auctionNo, auctionDate, settlementDate, tenors] = raw;
  const out: AuctionRecord["tenors"] = {};
  for (const [tenor, tuple] of Object.entries(tenors)) {
    if (!VALID_TENORS.has(tenor)) throw new Error(`govSecAuctions: unknown tenor "${tenor}" in the ${instrument} auction of ${auctionDate}`);
    out[tenor as Tenor] = decodeTenor(tuple);
  }
  return { instrument, auctionNo, auctionDate, settlementDate, tenors: out };
}

let cache: { tbill: AuctionRecord[]; pib: AuctionRecord[] } | null = null;

function load() {
  if (!cache) cache = { tbill: RAW_TBILL_AUCTIONS.map((r) => decodeAuction("tbill", r)), pib: RAW_PIB_AUCTIONS.map((r) => decodeAuction("pib", r)) };
  return cache;
}

/** Every T-bill auction in the archive, oldest first. */
export const getTBillAuctions = (): AuctionRecord[] => load().tbill;
/** Every fixed-coupon PIB auction in SBP's detailed archive, oldest first. */
export const getPibAuctions = (): AuctionRecord[] => load().pib;
export const getAuctions = (instrument: Instrument): AuctionRecord[] => (instrument === "tbill" ? getTBillAuctions() : getPibAuctions());
export const getExcludedRows = (): readonly ExcludedRow[] => GOV_SEC_EXCLUDED as unknown as readonly ExcludedRow[];
export const getProvenance = () => GOV_SEC_PROVENANCE;
