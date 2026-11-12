// Builds src/data/govSecAuctions.ts from SBP's two official auction workbooks. LOCAL AND READ-ONLY: it reads the two files you give it and writes one
// TypeScript file. No network, no database, no credentials, no production write of any kind.
//
//   1. Download (public files, no key needed):
//        https://www.sbp.org.pk/assets/document/tb.xlsx
//        https://www.sbp.org.pk/assets/document/Pakinvestbonds.xlsx
//   2. npx tsx scripts/buildGovSecAuctions.ts --tb <tb.xlsx> --pib <Pakinvestbonds.xlsx> --retrieved 2026-11-12
//        optional: --tb-modified "<Last-Modified header>"  --pib-modified "<Last-Modified header>"  --out <path>  --check (print the report, write nothing)
//   3. Review the report it prints (counts, excluded rows, warnings, data-quality findings), then run the budget and bond tests.
//
// Importing this module does nothing: main() runs only when the file is the entry point (the same inert-on-import rule the ingest scripts follow).

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import * as XLSX from "xlsx";
import { parsePibSheet, parseTBillSheet } from "@/lib/bonds/auctionWorkbook";
import { rowsDigest } from "@/lib/bonds/rowsDigest";
import type { AuctionOutcome, AuctionRecord, ExcludedRow, Tenor, TenorResult } from "@/lib/bonds/types";

export const TBILL_SHEET = "New Detailed Format";
export const PIB_SHEET = "New Format";
const OUTCOME_CODE: Record<AuctionOutcome, string> = { accepted: "A", "bids-rejected": "BR", "no-bids": "NB", "none-accepted": "NA" };

export interface GeneratorArgs {
  tb: string;
  pib: string;
  out: string;
  retrieved: string;
  tbModified: string | null;
  pibModified: string | null;
  check: boolean;
}

export function parseArgs(argv: string[]): GeneratorArgs | string {
  const get = (flag: string): string | null => {
    const i = argv.indexOf(flag);
    return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : null;
  };
  const tb = get("--tb");
  const pib = get("--pib");
  const retrieved = get("--retrieved");
  if (!tb || !pib || !retrieved) return "Usage: tsx scripts/buildGovSecAuctions.ts --tb <tb.xlsx> --pib <Pakinvestbonds.xlsx> --retrieved YYYY-MM-DD [--tb-modified <header>] [--pib-modified <header>] [--out <path>] [--check]";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(retrieved)) return `--retrieved must be YYYY-MM-DD, got "${retrieved}"`;
  return { tb, pib, retrieved, out: get("--out") ?? "src/data/govSecAuctions.ts", tbModified: get("--tb-modified"), pibModified: get("--pib-modified"), check: argv.includes("--check") };
}

/** One tenor as the compact tuple stored in the data file: [cutoff, wa, offered, accepted competitive, accepted non-competitive, target, outcome code, short sale?]. */
export function encodeTenor(t: TenorResult): (number | string | null)[] {
  const base: (number | string | null)[] = [t.cutoffYield, t.waYield, t.offered, t.acceptedCompetitive, t.acceptedNonCompetitive, t.target, OUTCOME_CODE[t.outcome]];
  if (t.acceptedShortSale !== undefined) base.push(t.acceptedShortSale);
  return base;
}

export function encodeAuction(a: AuctionRecord): string {
  const tenors = Object.fromEntries(Object.entries(a.tenors).map(([k, v]) => [k, encodeTenor(v as TenorResult)]));
  return `[${a.auctionNo === null ? "null" : a.auctionNo},${JSON.stringify(a.auctionDate)},${JSON.stringify(a.settlementDate)},${JSON.stringify(tenors)}]`;
}

const sha = (file: string) => createHash("sha256").update(readFileSync(file)).digest("hex");

/** Data-quality findings about the parsed auctions, reported (not corrected). */
export function qualityFindings(auctions: AuctionRecord[]): string[] {
  const out: string[] = [];
  let cutoffBelowWa = 0, acceptedAboveOffered = 0, yieldOutOfRange = 0, ncbMissing = 0;
  for (const a of auctions) {
    for (const [tenor, t] of Object.entries(a.tenors) as [Tenor, TenorResult][]) {
      if (t.cutoffYield !== null && t.waYield !== null && t.cutoffYield < t.waYield - 0.0001) { cutoffBelowWa++; out.push(`${a.instrument} ${a.auctionDate} ${tenor}: cut-off ${t.cutoffYield} is below the weighted average ${t.waYield}`); }
      if (t.acceptedCompetitive !== null && t.offered !== null && t.acceptedCompetitive > t.offered + 0.001) { acceptedAboveOffered++; out.push(`${a.instrument} ${a.auctionDate} ${tenor}: accepted competitive ${t.acceptedCompetitive} exceeds offered ${t.offered}`); }
      for (const y of [t.cutoffYield, t.waYield]) if (y !== null && (y <= 0 || y > 40)) { yieldOutOfRange++; out.push(`${a.instrument} ${a.auctionDate} ${tenor}: yield ${y} outside 0-40%`); }
      if (t.outcome === "accepted" && t.acceptedNonCompetitive === null) ncbMissing++;
    }
  }
  out.push(`summary: cut-off below weighted average: ${cutoffBelowWa}; accepted above offered: ${acceptedAboveOffered}; yield out of range: ${yieldOutOfRange}; accepted tenors with no non-competitive figure: ${ncbMissing}`);
  return out;
}

export function render(args: GeneratorArgs, tb: { auctions: AuctionRecord[]; excluded: ExcludedRow[] }, pib: { auctions: AuctionRecord[]; excluded: ExcludedRow[] }): string {
  const tbHash = sha(args.tb);
  const pibHash = sha(args.pib);
  const excluded = [...tb.excluded, ...pib.excluded];
  // Digest of the rows exactly as they are stored (parsed back from their encoding), so a hand edit of any value is detectable by a test.
  const rowsSha = rowsDigest(tb.auctions.map((a) => JSON.parse(encodeAuction(a))), pib.auctions.map((a) => JSON.parse(encodeAuction(a))));
  return `// GENERATED by scripts/buildGovSecAuctions.ts. Do not edit by hand: re-run the script (the header says how) and review its report.
//
// Pakistan government-securities AUCTION results, read from the State Bank of Pakistan's own public archives:
//   T-bills  https://www.sbp.org.pk/assets/document/tb.xlsx                 sheet "${TBILL_SHEET}"   sha256 ${tbHash}${args.tbModified ? `  (Last-Modified ${args.tbModified})` : ""}
//   PIBs     https://www.sbp.org.pk/assets/document/Pakinvestbonds.xlsx     sheet "${PIB_SHEET}"            sha256 ${pibHash}${args.pibModified ? `  (Last-Modified ${args.pibModified})` : ""}
// Retrieved on ${args.retrieved}. ${tb.auctions.length} T-bill auctions (${tb.auctions[0]?.auctionDate} to ${tb.auctions[tb.auctions.length - 1]?.auctionDate}) and ${pib.auctions.length} fixed-coupon PIB auctions (${pib.auctions[0]?.auctionDate} to ${pib.auctions[pib.auctions.length - 1]?.auctionDate}).
//
// These are PRIMARY-MARKET (auction) results. They are not secondary-market quotes and not the PKRV curve. Yields are percent per annum to four decimals
// as SBP prints them; amounts are PKR million FACE value. A missing figure is null: a failed tenor carries an outcome code, never a zero yield.
//
// Integrity: rowsSha256 below is the SHA-256 of the stored rows; a test recomputes it, so editing a value by hand fails the build until the file is regenerated.
//
// Tuple per tenor: [cut-off yield, weighted-average yield, competitive bids offered, competitive accepted, non-competitive accepted, target, outcome, (PIB only) short sale]
//   outcome: A accepted | BR bids rejected | NB no bids received | NA bids received, none accepted
// Row per auction: [SBP auction no. (T-bills; null for PIBs), auction date, settlement/issue date, { tenor: tuple }]
//
// Deliberately NOT read: the workbooks' older sheets (weighted-average yield only; PIB rows dated by settlement day, with mixed layouts). Merging them would put
// a different yield definition and a different date convention into the same series. Cross-checked against SBP's published auction-result PDFs and EasyData
// (see docs/bond-yields-workshop.md).

export const GOV_SEC_PROVENANCE = {
  retrievedOn: ${JSON.stringify(args.retrieved)},
  sources: [
    { instrument: "tbill", url: "https://www.sbp.org.pk/assets/document/tb.xlsx", sheet: ${JSON.stringify(TBILL_SHEET)}, sha256: ${JSON.stringify(tbHash)}, lastModified: ${JSON.stringify(args.tbModified)} },
    { instrument: "pib", url: "https://www.sbp.org.pk/assets/document/Pakinvestbonds.xlsx", sheet: ${JSON.stringify(PIB_SHEET)}, sha256: ${JSON.stringify(pibHash)}, lastModified: ${JSON.stringify(args.pibModified)} },
  ],
  rowsSha256: ${JSON.stringify(rowsSha)},
} as const;

/** Rows the generator deliberately left out (not on the standard tenor grid), so nothing is dropped silently. */
export const GOV_SEC_EXCLUDED = ${JSON.stringify(excluded, null, 2)} as const;

export type RawAuction = readonly [auctionNo: number | null, auctionDate: string, settlementDate: string, tenors: Readonly<Record<string, readonly (number | string | null)[]>>];

export const RAW_TBILL_AUCTIONS: readonly RawAuction[] = [
${tb.auctions.map((a) => "  " + encodeAuction(a)).join(",\n")},
];

export const RAW_PIB_AUCTIONS: readonly RawAuction[] = [
${pib.auctions.map((a) => "  " + encodeAuction(a)).join(",\n")},
];
`;
}

function main(argv: string[]): number {
  const parsed = parseArgs(argv);
  if (typeof parsed === "string") {
    console.error(parsed);
    return 2;
  }
  const sheetRows = (file: string, sheet: string): unknown[][] => {
    const wb = XLSX.readFile(file);
    const ws = wb.Sheets[sheet];
    if (!ws) throw new Error(`${path.basename(file)} has no sheet "${sheet}" (sheets: ${wb.SheetNames.join(", ")})`);
    return XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null }) as unknown[][];
  };
  const tb = parseTBillSheet(sheetRows(parsed.tb, TBILL_SHEET));
  const pib = parsePibSheet(sheetRows(parsed.pib, PIB_SHEET));
  console.log(`T-bill auctions: ${tb.auctions.length} (${tb.auctions[0]?.auctionDate} to ${tb.auctions[tb.auctions.length - 1]?.auctionDate}); tenor results: ${tb.auctions.reduce((n, a) => n + Object.keys(a.tenors).length, 0)}`);
  console.log(`PIB auctions:    ${pib.auctions.length} (${pib.auctions[0]?.auctionDate} to ${pib.auctions[pib.auctions.length - 1]?.auctionDate}); tenor results: ${pib.auctions.reduce((n, a) => n + Object.keys(a.tenors).length, 0)}`);
  for (const e of [...tb.excluded, ...pib.excluded]) console.log(`EXCLUDED ${e.instrument} ${e.auctionDate} ${e.tenorLabel}: ${e.reason}`);
  for (const w of [...tb.warnings, ...pib.warnings]) console.log(`WARNING ${w}`);
  for (const f of qualityFindings([...tb.auctions, ...pib.auctions])) console.log(`QUALITY ${f}`);
  if (parsed.check) {
    console.log("--check: nothing written.");
    return 0;
  }
  writeFileSync(parsed.out, render(parsed, tb, pib), "utf8");
  console.log(`wrote ${parsed.out}`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) process.exit(main(process.argv.slice(2)));
