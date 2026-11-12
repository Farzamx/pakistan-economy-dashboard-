// Pure parsers for SBP's official auction archives. They work on the sheets' cell arrays (what `xlsx` returns with `header: 1, raw: true`), so they have
// no file or network access and can be tested with hand-built sheets. The generator (scripts/buildGovSecAuctions.ts) is the only caller that reads files.
//
//   T-bills  tb.xlsx, sheet "New Detailed Format"          (https://www.sbp.org.pk/assets/document/tb.xlsx)
//   PIBs     Pakinvestbonds.xlsx, sheet "New Format"       (https://www.sbp.org.pk/assets/document/Pakinvestbonds.xlsx)
//
// WHAT IS PARSED AND WHAT IS NOT. Only the detailed sheets: they carry the cut-off yield, the weighted-average yield and the offered and accepted amounts
// per tenor. The workbooks' older sheets (weighted-average yield only, PIB rows keyed by settlement date, mixed layouts) are deliberately not read:
// merging them would put a different definition and a different date convention into the same series.
//
// RULES (each is pinned by auctionWorkbook.test.ts)
//   - Yields are stored as percent p.a. to four decimals (SBP prints four). Amounts are PKR million face value to three decimals.
//   - SBP's markers are outcomes, not numbers: "NBR" (no bid received) and "BR" (bids rejected) give a null yield and an `outcome`; a PIB dash gives
//     "none-accepted". Nothing becomes zero.
//   - A tenor that is not on the standard grid (the one-off 22-day bill) is not silently dropped: it goes to `excluded` with a reason.
//   - A T-bill target is kept only from Sep-2019, when SBP began publishing one per tenor (before that every row repeats the combined target).

import type { AuctionOutcome, AuctionRecord, ExcludedRow, ParseResult, PibTenor, TBillTenor, TenorResult } from "./types";

type Cell = unknown;
type Row = Cell[];

/** Excel serial date → YYYY-MM-DD (UTC). Returns null for anything that is not a plausible serial. */
export function excelSerialToIso(serial: unknown): string | null {
  if (typeof serial !== "number" || !Number.isFinite(serial) || serial < 20000 || serial > 80000) return null;
  return new Date(Math.round((serial - 25569) * 86400000)).toISOString().slice(0, 10);
}

/** A number, or a numeric string ("0"), else null. SBP's markers ("BR", "NBR", "-") and blanks are null here; the caller reads them as outcomes. */
export function numberOrNull(cell: Cell): number | null {
  if (typeof cell === "number" && Number.isFinite(cell)) return cell;
  if (typeof cell === "string" && /^\s*-?\d+(\.\d+)?\s*$/.test(cell)) return Number(cell);
  return null;
}

const marker = (cell: Cell): string | null => (typeof cell === "string" ? cell.trim().toUpperCase() : null);

/** Fraction (0.119887) → percent to four decimals (11.9887). */
export const fractionToPercent = (f: number): number => Math.round(f * 1e6) / 1e4;
export const roundAmount = (n: number): number => Math.round(n * 1000) / 1000;

const amount = (cell: Cell): number | null => {
  const n = numberOrNull(cell);
  return n === null ? null : roundAmount(n);
};
const yieldPct = (cell: Cell): number | null => {
  const n = numberOrNull(cell);
  return n === null ? null : fractionToPercent(n);
};

/** Which outcome a tenor's yield/offer cells describe. "NBR" anywhere in the yield or offer cells means no bid; otherwise "BR" means rejected; otherwise numbers mean accepted; otherwise nothing accepted. */
export function classifyOutcome(offered: Cell, cutoff: Cell, wa: Cell, acceptedCompetitive: Cell): AuctionOutcome {
  const marks = [offered, cutoff, wa, acceptedCompetitive].map(marker);
  if (marks.includes("NBR")) return "no-bids";
  if (marks.includes("BR")) return "bids-rejected";
  if (numberOrNull(cutoff) !== null && numberOrNull(wa) !== null) return "accepted";
  return "none-accepted";
}

const TBILL_TENOR_BY_LABEL: Record<string, TBillTenor> = { "1-MONTH": "1M", "3-MONTH": "3M", "6-MONTH": "6M", "12-MONTH": "12M" };
const PIB_TENOR_BY_LABEL: Record<string, PibTenor> = { "02-YEAR": "2Y", "03-YEAR": "3Y", "05-YEAR": "5Y", "10-YEAR": "10Y", "15-YEAR": "15Y", "2-YEAR": "2Y", "3-YEAR": "3Y", "5-YEAR": "5Y" };
const normaliseTenor = (cell: Cell): string => String(cell ?? "").replace(/\s+/g, "").toUpperCase();

/** SBP began publishing a separate target for each T-bill tenor from Sep-2019 (sheet footnote 1/). */
export const TBILL_PER_TENOR_TARGET_FROM = "2019-09-01";

function result(outcome: AuctionOutcome, fields: Omit<TenorResult, "outcome">): TenorResult {
  // A failed tenor has no yield and no accepted amount: those are null, not zero.
  return outcome === "accepted" ? { outcome, ...fields } : { ...fields, outcome, cutoffYield: null, waYield: null, acceptedCompetitive: null, acceptedNonCompetitive: null };
}

/**
 * T-bills: the "New Detailed Format" sheet. Columns: 0 auction no., 1 tenure, 3 auction date, 4 issue date, 6 target, 7 competitive bids offered (face),
 * 10 competitive accepted (face), 11 non-competitive accepted (face), 15 cut-off yield, 16 weighted-average yield.
 */
export function parseTBillSheet(rows: Row[]): ParseResult {
  const auctions = new Map<string, AuctionRecord>();
  const excluded: ExcludedRow[] = [];
  const warnings: string[] = [];
  for (const r of rows) {
    const no = r[0];
    const auctionDate = excelSerialToIso(r[3]);
    if (typeof no !== "number" || !auctionDate) continue; // headers, footnotes, blank rows
    const settlementDate = excelSerialToIso(r[4]);
    const label = normaliseTenor(r[1]);
    const tenor = TBILL_TENOR_BY_LABEL[label];
    if (!tenor) {
      excluded.push({ instrument: "tbill", auctionDate, tenorLabel: String(r[1]), reason: "Not on the standard 1/3/6/12-month grid; a one-off tenor is kept out of the curve." });
      continue;
    }
    if (!settlementDate) {
      warnings.push(`T-bill auction ${no} (${auctionDate}) ${tenor}: no readable issue date; row skipped.`);
      continue;
    }
    const key = `${no}|${auctionDate}`;
    const rec = auctions.get(key) ?? { instrument: "tbill" as const, auctionNo: no, auctionDate, settlementDate, tenors: {} };
    if (rec.tenors[tenor]) warnings.push(`T-bill auction ${no} ${tenor}: duplicate row ignored.`);
    else {
      const outcome = classifyOutcome(r[7], r[15], r[16], r[10]);
      const target = auctionDate >= TBILL_PER_TENOR_TARGET_FROM ? amount(r[6]) : null;
      rec.tenors[tenor] = result(outcome, {
        cutoffYield: yieldPct(r[15]),
        waYield: yieldPct(r[16]),
        offered: amount(r[7]),
        acceptedCompetitive: amount(r[10]),
        acceptedNonCompetitive: amount(r[11]),
        target,
      });
    }
    auctions.set(key, rec);
  }
  return { auctions: [...auctions.values()].sort((a, b) => a.auctionDate.localeCompare(b.auctionDate) || (a.auctionNo ?? 0) - (b.auctionNo ?? 0)), excluded, warnings };
}

/**
 * Fixed-coupon PIBs: the "New Format" sheet. Columns: 0 auction type, 2 tenor, 5 auction date, 6 settlement date, 7 target, 8 competitive bids offered (face),
 * 10 competitive accepted (face), 12 non-competitive accepted (face), 14 short sale accommodated (face), 19 cut-off yield, 20 weighted-average yield.
 * One auction date can hold several rows (one per tenor); they are grouped into one record.
 */
export function parsePibSheet(rows: Row[]): ParseResult {
  const auctions = new Map<string, AuctionRecord>();
  const excluded: ExcludedRow[] = [];
  const warnings: string[] = [];
  for (const r of rows) {
    const auctionDate = excelSerialToIso(r[5]);
    if (!auctionDate || typeof r[2] !== "string") continue;
    const settlementDate = excelSerialToIso(r[6]);
    const tenor = PIB_TENOR_BY_LABEL[normaliseTenor(r[2])];
    if (!tenor) {
      excluded.push({ instrument: "pib", auctionDate, tenorLabel: String(r[2]), reason: "Not on the 2/3/5/10/15-year grid used by this workshop." });
      continue;
    }
    if (!settlementDate) {
      warnings.push(`PIB auction ${auctionDate} ${tenor}: no readable settlement date; row skipped.`);
      continue;
    }
    const rec = auctions.get(auctionDate) ?? { instrument: "pib" as const, auctionNo: null, auctionDate, settlementDate, tenors: {} };
    if (rec.tenors[tenor]) warnings.push(`PIB auction ${auctionDate} ${tenor}: duplicate row ignored.`);
    else {
      const outcome = classifyOutcome(r[8], r[19], r[20], r[10]);
      const base = result(outcome, {
        cutoffYield: yieldPct(r[19]),
        waYield: yieldPct(r[20]),
        offered: amount(r[8]),
        acceptedCompetitive: amount(r[10]),
        acceptedNonCompetitive: amount(r[12]),
        target: amount(r[7]),
      });
      rec.tenors[tenor] = outcome === "accepted" ? { ...base, acceptedShortSale: amount(r[14]) } : base;
    }
    auctions.set(auctionDate, rec);
  }
  return { auctions: [...auctions.values()].sort((a, b) => a.auctionDate.localeCompare(b.auctionDate)), excluded, warnings };
}
