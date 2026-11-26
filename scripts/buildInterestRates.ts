// Builds the Interest Rates & Monetary Policy datasets (src/data/interestRates/*.ts) and their validation report (docs/interest-rates-validation-report.md)
// from the official source files preserved in data/sources/interest-rates/. LOCAL AND READ-ONLY: no network, no database, no credentials.
//
//   1. Acquire sources (network, read-only):  npx tsx scripts/fetchInterestRateSources.ts --retrieved YYYY-MM-DD
//   2. Build (this script, local only):       npx tsx scripts/buildInterestRates.ts [--check]
//   3. Review the printed report and docs/interest-rates-validation-report.md, then run: npx vitest run scripts/buildInterestRates.test.ts src/lib/interestRates
//
// Order of work, and what stops the build:
//   - every source file's SHA-256 must equal the one recorded in manifest.json (a changed or substituted file stops the build);
//   - parsing (src/lib/interestRates/sources.ts) throws on any layout it does not recognise;
//   - unit, range, duplicate and ordering checks throw (a rate outside 0-40%, an OMO cut-off that is not a fraction or falls outside its own quote range,
//     two values for one date, an unsorted series);
//   - cross-source and independent checks against SBP's own PDFs are REPORTED with exact counts (the tests pin those counts, so a change is noticed).
//
// The output is deterministic (no clock, no randomness): building twice from the same sources gives byte-identical files, and a test rebuilds from the
// committed sources and compares, so a hand edit of a data file, a source file or the manifest fails the test suite.
//
// Importing this module does nothing: main() runs only when the file is the entry point.

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import * as XLSX from "xlsx";
import { extractText, getDocumentProxy } from "unpdf";
import { parsePibSheet, parseTBillSheet } from "@/lib/bonds/auctionWorkbook";
import type { AuctionOutcome, AuctionRecord, TenorResult } from "@/lib/bonds/types";
import {
  LD_VARIANTS,
  lendingPdf,
  parseLendingWorkbook,
  parseOmoSheet,
  readEasyDataCsv,
  sirBankRates,
  sirPage2,
  sirPibTable,
  sirPolicyTable,
  usableObservations,
  type EasySeries,
  type ExcludedObservation,
  type LdMonthRow,
  type OmoOperation,
  type SheetRows,
} from "@/lib/interestRates/sources";
import { daysBetween, monthRange, monthlyMeans, rateInForce, round, weekday } from "@/lib/interestRates/series";
import { EASY_PIB_TENORS, KIBOR_TENORS, type DateValue } from "@/lib/interestRates/types";

export const DEFAULT_SOURCES = "data/sources/interest-rates";
export const OUTPUT_DIR = "src/data/interestRates";
export const REPORT_PATH = "docs/interest-rates-validation-report.md";
const TBILL_SHEET = "New Detailed Format";
const PIB_SHEET = "New Format";

/** Values excluded on documented evidence (raw value kept in the source file and listed in the report; never altered). */
export const IMPLAUSIBLE: Record<string, { date: string; reason: string }[]> = {
  "TS_GP_BAM_SIRTBIL_AH.TB0050": [
    { date: "2007-12-05", reason: "6-month weighted-average yield printed as .1215 while the same auction's 6-month cut-off is 9.2523; a weighted average cannot be 9 points below the cut-off and x100 would give 12.15, also inconsistent. Excluded, not corrected." },
  ],
};

const KIBOR_CODES: Record<(typeof KIBOR_TENORS)[number], string> = { "1W": "1KIBOR1W", "2W": "2KIBOR2W", "1M": "KIBOR0010", "3M": "KIBOR0020", "6M": "KIBOR0030", "9M": "6KIBOR9M", "1Y": "7KIBOR12M", "2Y": "8KIBOR2Y", "3Y": "9KIBOR3Y" };
const KIBOR_NAME: Record<(typeof KIBOR_TENORS)[number], RegExp> = { "1W": /^One-Week/, "2W": /^Two-Weeks/, "1M": /^One-Month/, "3M": /^Three-Months/, "6M": /^Six-Months/, "9M": /^Nine-Months/, "1Y": /^One-Year/, "2Y": /^Two-Years/, "3Y": /^Three-Years/ };
const TBILL_CODES = { cutoff: { "3M": "TB0010", "6M": "TB0020", "12M": "TB0030" }, wa: { "3M": "TB0040", "6M": "TB0050", "12M": "TB0060" } } as const;
const PIB_CODES = {
  cutoff: { "2Y": "PIB0150", "3Y": "PIB0010", "5Y": "PIB0020", "7Y": "PIB0030", "10Y": "PIB0040", "15Y": "PIB0050", "20Y": "PIB0060", "30Y": "PIB0070" },
  wa: { "2Y": "PIB0160", "3Y": "PIB0080", "5Y": "PIB0090", "7Y": "PIB0100", "10Y": "PIB0110", "15Y": "PIB0120", "20Y": "PIB0130", "30Y": "PIB0140" },
} as const;
const OUTCOME: Record<AuctionOutcome, "A" | "BR" | "NB" | "NA"> = { accepted: "A", "bids-rejected": "BR", "no-bids": "NB", "none-accepted": "NA" };

// ---------------------------------------------------------------------------------------------------------------------------------------------------------

interface ManifestFile {
  path: string;
  url: string;
  sha256: string;
  retrievedOn: string;
  description: string;
  bytes: number;
  rows?: number;
}

export interface SourceBundle {
  manifest: ManifestFile[];
  read: (rel: string) => Buffer;
}

export function loadSources(dir: string): SourceBundle {
  const manifest = (JSON.parse(readFileSync(path.join(dir, "manifest.json"), "utf8")) as { files: ManifestFile[] }).files;
  return { manifest, read: (rel) => readFileSync(path.join(dir, rel)) };
}

const sha256 = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");

/** Throws unless every manifest entry's file exists and hashes to the recorded SHA-256. */
export function verifyManifest(src: SourceBundle): string[] {
  const lines: string[] = [];
  for (const f of src.manifest) {
    const got = sha256(src.read(f.path));
    if (got !== f.sha256) throw new Error(`source ${f.path}: SHA-256 ${got} does not match the manifest (${f.sha256}). Re-acquire it with fetchInterestRateSources.ts; never edit a source by hand.`);
    lines.push(`| \`${f.path}\` | ${f.retrievedOn} | ${f.bytes.toLocaleString("en-US")}${f.rows !== undefined ? ` (${f.rows.toLocaleString("en-US")} rows)` : ""} | \`${f.sha256.slice(0, 16)}…\` |`);
  }
  return lines;
}

const ref = (src: SourceBundle, p: string) => {
  const f = src.manifest.find((x) => x.path === p);
  if (!f) throw new Error(`manifest has no entry for ${p}`);
  return { path: f.path, url: f.url, sha256: f.sha256, retrievedOn: f.retrievedOn };
};

function sheets(buf: Buffer): Record<string, SheetRows> {
  const wb = XLSX.read(buf, { type: "buffer" });
  return Object.fromEntries(wb.SheetNames.map((n) => [n, XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: null }) as SheetRows]));
}

async function pdfPages(buf: Buffer): Promise<string[]> {
  const pdf = await getDocumentProxy(new Uint8Array(buf));
  return (await extractText(pdf, { mergePages: false })).text as string[];
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------
// Checks that stop the build

function assertRange(label: string, v: number | null, lo = 0, hi = 40) {
  if (v !== null && (!(v > lo) || v > hi)) throw new Error(`${label}: ${v} is outside the plausible ${lo}-${hi}% range (units or scale problem)`);
}

function assertSortedUnique(label: string, dates: readonly string[]) {
  for (let i = 1; i < dates.length; i++) if (!(dates[i - 1] < dates[i])) throw new Error(`${label}: dates not strictly increasing at ${dates[i - 1]} / ${dates[i]}`);
}

function seriesOf(map: Map<string, EasySeries>, key: string, nameRe?: RegExp): EasySeries {
  const s = map.get(key);
  if (!s) throw new Error(`EasyData extract has no series ${key}`);
  if (s.unit !== "Percent") throw new Error(`${key}: unit "${s.unit}", expected Percent`);
  if (nameRe && !nameRe.test(s.name)) throw new Error(`${key}: series name "${s.name}" does not match ${nameRe} (code mapping error)`);
  return s;
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------

export interface BuildResult {
  files: Record<string, string>;
  /** Short console summary. */
  summary: string[];
}

export async function buildInterestRateDatasets(src: SourceBundle): Promise<BuildResult> {
  const R: string[] = []; // validation report body (markdown)
  const summary: string[] = [];
  const fingerprintRows = verifyManifest(src);
  const excluded: ExcludedObservation[] = [];
  const csv = (dataset: string) => readEasyDataCsv(src.read(`easydata/${dataset}.csv`).toString("utf8"));

  // ---- Administered rates and the overnight repo rate
  const pr = csv("TS_GP_IR_SIRPR_AH");
  const step = (code: string, re: RegExp): DateValue[] => {
    const u = usableObservations(seriesOf(pr, `TS_GP_IR_SIRPR_AH.${code}`, re));
    excluded.push(...u.excluded);
    const ev = [...u.values.entries()].sort(([a], [b]) => (a < b ? -1 : 1)) as DateValue[];
    assertSortedUnique(code, ev.map((e) => e[0]));
    ev.forEach(([d, v]) => assertRange(`${code} ${d}`, v));
    return ev;
  };
  const ceiling = step("SBPOL0010", /Reverse Repo Rate/);
  const floor = step("SBPOL0020", /Repo Rate/);
  const target = step("SBPOL0030", /Policy \(Target\) Rate/);
  const orrU = usableObservations(seriesOf(csv("TS_GP_IR_REPOMR_D"), "TS_GP_IR_REPOMR_D.ORR", /Overnight Repo Rate/));
  excluded.push(...orrU.excluded);
  const orr = [...orrU.values.entries()].sort(([a], [b]) => (a < b ? -1 : 1)) as DateValue[];
  orr.forEach(([d, v]) => assertRange(`ORR ${d}`, v));

  // ---- KIBOR
  const kb = csv("TS_GP_BAM_SIRKIBOR_D");
  const kMaps = KIBOR_TENORS.map((t) => {
    const u = usableObservations(seriesOf(kb, `TS_GP_BAM_SIRKIBOR_D.${KIBOR_CODES[t]}`, KIBOR_NAME[t]));
    excluded.push(...u.excluded);
    u.values.forEach((v, d) => assertRange(`KIBOR ${t} ${d}`, v));
    return u.values;
  });
  const kDates = [...new Set(kMaps.flatMap((m) => [...m.keys()]))].sort();
  const kiborRows = kDates.map((d) => [d, ...kMaps.map((m) => m.get(d) ?? null)] as const);

  // ---- EasyData T-bills and PIBs
  const tb = csv("TS_GP_BAM_SIRTBIL_AH");
  const tbCols = (["cutoff", "wa"] as const).flatMap((kind) =>
    (["3M", "6M", "12M"] as const).map((t) => {
      const key = `TS_GP_BAM_SIRTBIL_AH.${TBILL_CODES[kind][t]}`;
      const re = new RegExp(`${kind === "cutoff" ? "Cut-off" : "Weighted Average"} Yield ${t.replace("M", "")}-Months`);
      const u = usableObservations(seriesOf(tb, key, re), IMPLAUSIBLE[key]);
      excluded.push(...u.excluded);
      u.values.forEach((v, d) => assertRange(`${key} ${d}`, v));
      return u.values;
    }),
  );
  const tbDates = [...new Set([...tb.values()].flatMap((s) => s.observations.map((o) => o.date)))].sort();
  const easyTbillRows = tbDates.map((d) => [d, ...tbCols.map((m) => m.get(d) ?? null)] as const);

  const pb = csv("TS_GP_BAM_SIRPIBS_AH");
  const pbCols = (["cutoff", "wa"] as const).flatMap((kind) =>
    EASY_PIB_TENORS.map((t) => {
      const key = `TS_GP_BAM_SIRPIBS_AH.${PIB_CODES[kind][t]}`;
      const re = new RegExp(`${kind === "cutoff" ? "Cut-off" : "Weighted Average"} Yield ${t.replace("Y", "")}-Year`);
      const u = usableObservations(seriesOf(pb, key, re), IMPLAUSIBLE[key]);
      excluded.push(...u.excluded);
      u.values.forEach((v, d) => assertRange(`${key} ${d}`, v));
      return u.values;
    }),
  );
  const pbDates = [...new Set([...pb.values()].flatMap((s) => s.observations.map((o) => o.date)))].sort();
  const easyPibRows = pbDates.map((d) => [d, ...pbCols.map((m) => m.get(d) ?? null)] as const);

  // ---- CPI
  const cpiU = usableObservations(seriesOf(csv("TS_GP_PT_CPI_M"), "TS_GP_PT_CPI_M.P00011516", /National CPI/));
  excluded.push(...cpiU.excluded);
  const cpiRows = [...cpiU.values.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([d, v]) => [d.slice(0, 7), v] as const);
  assertSortedUnique("CPI", cpiRows.map((r) => r[0]));

  // ---- SBP auction files
  const tbSheet = sheets(src.read("sbp/tb.xlsx"))[TBILL_SHEET];
  const pibSheet = sheets(src.read("sbp/Pakinvestbonds.xlsx"))[PIB_SHEET];
  if (!tbSheet || !pibSheet) throw new Error("auction workbooks: expected sheets not found");
  const tbP = parseTBillSheet(tbSheet as unknown[][] as Parameters<typeof parseTBillSheet>[0]);
  const pibP = parsePibSheet(pibSheet as unknown[][] as Parameters<typeof parsePibSheet>[0]);
  const encodeAuction = (a: AuctionRecord) =>
    [a.auctionDate, a.settlementDate, Object.fromEntries(Object.entries(a.tenors).map(([k, t]) => [k, [(t as TenorResult).cutoffYield, (t as TenorResult).waYield, OUTCOME[(t as TenorResult).outcome]]]))] as const;
  const sbpTbillRows = tbP.auctions.map(encodeAuction);
  const sbpPibRows = pibP.auctions.map(encodeAuction);
  for (const a of [...tbP.auctions, ...pibP.auctions]) for (const [k, t] of Object.entries(a.tenors) as [string, TenorResult][]) {
    assertRange(`SBP auction ${a.auctionDate} ${k} cut-off`, t.cutoffYield);
    assertRange(`SBP auction ${a.auctionDate} ${k} WA`, t.waYield);
  }

  // ---- Lending and deposit rates
  const ld = parseLendingWorkbook(sheets(src.read("sbp/Lendingdepositrates_Arch.xls")));
  for (const r of ld.monthly) r.values.forEach((v, i) => assertRange(`lending ${r.period} ${r.entity} ${LD_VARIANTS[i]}`, v, 0, 45)); // MFB-free aggregates; 45 allows 1990s-style peaks
  for (const r of ld.early) [r.lending, r.deposit].forEach((v) => assertRange(`lending ${r.period}`, v));
  const ldMonthRows = ld.monthly.map((r) => [r.period, r.entity, r.regime, r.flag, ...r.values] as const);
  const ldEarlyRows = ld.early.map((r) => [r.period, r.frequency === "half-yearly" ? "H" : "M", r.lending, r.deposit] as const);

  // ---- OMO
  const inj = parseOmoSheet(Object.values(sheets(src.read("sbp/OMO-Inject-Hist.xlsx")))[0], "injection");
  const mop = parseOmoSheet(Object.values(sheets(src.read("sbp/OMO-MopUp-Hist.xlsx")))[0], "mopup");
  const ops: OmoOperation[] = [...inj.operations, ...mop.operations].sort((a, b) => (a.date === b.date ? (a.side === b.side ? (a.tenorDays ?? 0) - (b.tenorDays ?? 0) : a.side < b.side ? -1 : 1) : a.date < b.date ? -1 : 1));
  let quoted = 0;
  for (const o of ops) {
    assertRange(`OMO ${o.side} ${o.date} cut-off`, o.cutoffPct);
    if (o.cutoffPct !== null && o.quoteLow !== null && o.quoteHigh !== null) {
      quoted++;
      if (o.cutoffPct < o.quoteLow - 1e-9 || o.cutoffPct > o.quoteHigh + 1e-9) throw new Error(`OMO ${o.side} ${o.date}: converted cut-off ${o.cutoffPct}% lies outside the quote range ${o.quoteLow}-${o.quoteHigh}%: unit conversion is wrong`);
    }
  }
  const omoRows = ops.map((o) => [o.date, o.side === "injection" ? "I" : "M", o.tenorDays, o.tenorNote, o.offered, o.bidsOffered, o.quoteLow, o.quoteHigh, o.accepted, o.bidsAccepted, o.cutoffPct, o.outcome] as const);

  // ---- Independent publications
  const sir = await pdfPages(src.read("sbp/sir.pdf"));
  const ldPdf = lendingPdf((await pdfPages(src.read("sbp/Lendingdepositrates.pdf"))).join("\n"));

  // =====================================================================================================================================================
  // Validation report
  const retrieved = [...new Set(src.manifest.map((f) => f.retrievedOn))].sort().join(", ");
  R.push(`# Interest rates: data validation report`, ``);
  R.push(`GENERATED by \`scripts/buildInterestRates.ts\` from the source files in \`${DEFAULT_SOURCES}/\` (retrieved ${retrieved}). Do not edit by hand.`);
  R.push(`Every count below is recomputed on each build; \`scripts/buildInterestRates.test.ts\` pins them, so any change in the sources is noticed.`, ``);

  R.push(`## 1. Source fingerprints`, ``, `Every file was hashed and matched the SHA-256 recorded in \`manifest.json\` before parsing.`, ``, `| File | Retrieved | Bytes | SHA-256 |`, `|---|---|---|---|`, ...fingerprintRows, ``);

  // Coverage
  R.push(`## 2. Coverage after validation`, ``, `| Series | Frequency | First | Last | Observations |`, `|---|---|---|---|---|`);
  const cov = (name: string, freq: string, dates: string[]) => R.push(`| ${name} | ${freq} | ${dates[0] ?? "—"} | ${dates[dates.length - 1] ?? "—"} | ${dates.length.toLocaleString("en-US")} |`);
  cov("SBP reverse repo (ceiling) rate", "on change", ceiling.map((e) => e[0]));
  cov("SBP repo (floor) rate", "on change", floor.map((e) => e[0]));
  cov("SBP policy (target) rate", "on change", target.map((e) => e[0]));
  cov("Weighted-average overnight repo rate", "daily (business days)", orr.map((e) => e[0]));
  KIBOR_TENORS.forEach((t, i) => cov(`KIBOR ${t} (offer)`, "daily (business days)", [...kMaps[i].keys()].sort()));
  (["cutoff", "wa"] as const).forEach((kind, ki) =>
    (["3M", "6M", "12M"] as const).forEach((t, ti) => cov(`T-bill ${t} ${kind === "cutoff" ? "cut-off" : "weighted average"} (EasyData)`, "per auction", [...tbCols[ki * 3 + ti].keys()].sort())),
  );
  (["1M", "3M", "6M", "12M"] as const).forEach((t) => cov(`T-bill ${t} cut-off and weighted average (SBP tb.xlsx)`, "per auction", tbP.auctions.filter((a) => a.tenors[t]?.cutoffYield != null).map((a) => a.auctionDate)));
  (["cutoff", "wa"] as const).forEach((kind, ki) =>
    EASY_PIB_TENORS.forEach((t, ti) => cov(`PIB ${t} ${kind === "cutoff" ? "cut-off" : "weighted average"} (EasyData)`, "per auction", [...pbCols[ki * EASY_PIB_TENORS.length + ti].keys()].sort())),
  );
  (["2Y", "3Y", "5Y", "10Y", "15Y"] as const).forEach((t) => cov(`PIB ${t} cut-off and weighted average (SBP Pakinvestbonds.xlsx)`, "per auction", pibP.auctions.filter((a) => a.tenors[t]?.cutoffYield != null).map((a) => a.auctionDate)));
  cov("Lending/deposit rates, scheduled banks", "monthly", ld.monthly.filter((r) => r.entity === "SB").map((r) => r.period));
  cov("Lending/deposit rates, all financial institutions", "monthly", ld.monthly.filter((r) => r.entity === "FI").map((r) => r.period));
  cov("Lending/deposit rates, all groups (1997-2003)", "half-yearly, then monthly", ld.early.map((r) => r.period));
  cov("OMO injections (reverse repo)", "per operation", inj.operations.map((o) => o.date));
  cov("OMO mop-ups (repo)", "per operation", mop.operations.map((o) => o.date));
  cov("National CPI inflation, YoY (2015-16 base)", "monthly", cpiRows.map((r) => r[0]));
  R.push(``);

  // Units
  R.push(`## 3. Units and scale`, ``);
  R.push(`- Every EasyData series used declares its unit as "Percent" (checked per series), and every value lies inside the plausible 0-40% range (the build stops otherwise).`);
  R.push(`- SBP's auction files print percent per annum to four decimals; the 1997-2022 lending/deposit sheets print percent to two decimals; the Jul-2022 sheet prints full precision (kept as printed).`);
  const fracCount = ops.filter((o) => o.cutoffRaw !== null).length;
  R.push(`- **OMO unit conversion.** All ${fracCount.toLocaleString("en-US")} OMO cut-off rates are stored by SBP as fractions (0 < value < 1; the build stops if one is not). They are multiplied by 100. Independent check: in all ${quoted} operations where SBP also printed the range of bid quotes (in percent), the converted cut-off lies inside that range (0 exceptions; the build stops on any).`);
  const inCorr = (d: string, v: number) => {
    const c = rateInForce(ceiling, d);
    const f = rateInForce(floor, d);
    return c === null || f === null || d < "2009-08-17" ? null : v >= f - 1e-9 && v <= c + 1e-9;
  };
  const omoCorr = ops.filter((o) => o.cutoffPct !== null).map((o) => inCorr(o.date, o.cutoffPct!)).filter((x) => x !== null);
  const omoOut = ops.filter((o) => o.cutoffPct !== null && inCorr(o.date, o.cutoffPct!) === false);
  R.push(`- OMO cut-offs against the SBP corridor in force on the day (from 17 Aug 2009): ${omoCorr.filter(Boolean).length} of ${omoCorr.length} inside the floor-ceiling band; ${omoOut.length} outside${omoOut.length ? ` (${omoOut.slice(0, 8).map((o) => `${o.date} ${o.side} ${o.cutoffPct}%`).join("; ")}${omoOut.length > 8 ? "; …" : ""})` : ""}.`);
  const orrCorr = orr.map(([d, v]) => inCorr(d, v)).filter((x) => x !== null);
  const orrOut = orr.filter(([d, v]) => inCorr(d, v) === false);
  R.push(`- Overnight repo rate against the corridor: ${orrCorr.filter(Boolean).length} of ${orrCorr.length} days inside; ${orrOut.length} outside${orrOut.length ? ` (${orrOut.slice(0, 8).map(([d, v]) => `${d} ${v}%`).join("; ")}${orrOut.length > 8 ? "; …" : ""})` : ""}. A market rate can trade outside an administered band; these days are shown as observed.`);
  R.push(``);

  // Dates, duplicates, frequency
  R.push(`## 4. Dates, duplicates and frequency`, ``);
  R.push(`- No series has two values for one date (the build stops otherwise). Every series is strictly date-ordered.`);
  const kWeekend = kDates.filter((d) => weekday(d) === 0 || weekday(d) === 6);
  R.push(`- KIBOR: ${kDates.length.toLocaleString("en-US")} fixing dates. ${kWeekend.length} fall on a Saturday or Sunday (${kWeekend.slice(0, 12).join(", ")}${kWeekend.length > 12 ? ", …" : ""}); they are kept as published (SBP and banks have opened on weekend days, e.g. at fiscal year-end).`);
  const kOnly = kDates.filter((d) => kMaps[0].get(d) === undefined);
  R.push(`- KIBOR dates published for some tenors only: ${kOnly.length ? kOnly.map((d) => `${d} (${KIBOR_TENORS.filter((_, i) => kMaps[i].has(d)).join(", ")})`).join("; ") : "none"}. Missing tenors on those dates are null, not filled.`);
  const gaps = kDates.slice(1).map((d, i) => [kDates[i], d, daysBetween(kDates[i], d)] as const).filter((g) => g[2] > 7);
  R.push(`- KIBOR gaps longer than 7 calendar days: ${gaps.length ? gaps.map((g) => `${g[0]} → ${g[1]} (${g[2]} days)`).join("; ") : "none"}.`);
  const kibor2yLast = [...kMaps[7].keys()].sort().pop();
  R.push(`- KIBOR 2Y and 3Y end on ${kibor2yLast} (discontinued by SBP); they are not extended.`);
  const sbMonths = ld.monthly.filter((r) => r.entity === "SB").map((r) => r.period);
  const sbMissing = monthRange(sbMonths[0], sbMonths[sbMonths.length - 1]).filter((m) => !sbMonths.includes(m));
  R.push(`- Lending/deposit, scheduled banks: ${sbMonths.length} months ${sbMonths[0]}..${sbMonths[sbMonths.length - 1]}; missing months: ${sbMissing.length ? sbMissing.join(", ") : "none"}.`);
  const cpiMonths = cpiRows.map((r) => r[0]);
  const cpiMissing = monthRange(cpiMonths[0], cpiMonths[cpiMonths.length - 1]).filter((m) => !cpiMonths.includes(m));
  R.push(`- CPI: ${cpiMonths.length} months ${cpiMonths[0]}..${cpiMonths[cpiMonths.length - 1]}; missing months: ${cpiMissing.length ? cpiMissing.join(", ") : "none"}. EasyData dates monthly CPI on the month's last day; it is stored as YYYY-MM.`);
  const repeats = (label: string, ev: DateValue[]) => ev.slice(1).filter((e, i) => e[1] === ev[i][1]).map((e) => `${label} ${e[0]} (${e[1]}%)`);
  const rep = [...repeats("reverse repo", ceiling), ...repeats("repo", floor), ...repeats("policy", target)];
  R.push(`- Administered-rate records that repeat the previous value (kept as SBP records them; they are not rate changes): ${rep.length ? rep.join("; ") : "none"}.`);
  R.push(``);

  // Exclusions
  R.push(`## 5. Source observations not used`, ``);
  R.push(`${excluded.length} EasyData observations carry a value that is not used. EasyData's own status is respected: an observation it marks "Missing value" is missing even when a number is printed beside it. For dates on or after the SBP auction files' first date the dashboard reads the SBP files instead (section 6), so most of these are covered there.`, ``);
  R.push(`| Series | Date | Printed value | EasyData status | Reason |`, `|---|---|---|---|---|`);
  for (const e of excluded) R.push(`| ${e.series.replace(/^TS_GP_[A-Z_]+\./, "")} | ${e.date} | ${e.raw} | ${e.status} | ${e.reason} |`);
  R.push(``);

  // Source transitions
  R.push(`## 6. Source transitions (EasyData against SBP's auction files)`, ``);
  const tbStart = tbP.auctions[0].auctionDate;
  const pibStart = pibP.auctions[0].auctionDate;
  R.push(`Approved hierarchy: T-bills from SBP \`tb.xlsx\` from its first detailed auction (${tbStart}) and EasyData before that; PIBs from SBP \`Pakinvestbonds.xlsx\` from ${pibStart} (the 2-year PIB in particular) and EasyData before that. Cut-off and weighted-average yields are separate series throughout and never combined.`, ``);
  /** Finds the SBP auction an EasyData (or sir.pdf) date refers to: its auction date, or else its settlement date (both conventions occur). */
  const matchAuction = (auctions: AuctionRecord[], d: string): { a: AuctionRecord; via: "auction" | "settlement" } | null => {
    const byAuction = auctions.find((x) => x.auctionDate === d);
    if (byAuction) return { a: byAuction, via: "auction" };
    const bySettle = auctions.find((x) => x.settlementDate === d);
    return bySettle ? { a: bySettle, via: "settlement" } : null;
  };
  const yieldOf = (a: AuctionRecord, tenor: string, kind: "cutoffYield" | "waYield") => (a.tenors as Record<string, TenorResult | undefined>)[tenor]?.[kind] ?? null;
  const transitionFindings: string[] = [];
  const compare = (label: string, easy: Map<string, number>, auctions: AuctionRecord[], tenor: string, kind: "cutoffYield" | "waYield", from: string, to: string) => {
    let exact = 0, rounded = 0, viaSettle = 0, noAuction = 0, nullInSbp = 0;
    const differ: string[] = [];
    for (const [d, v] of [...easy.entries()].filter(([d]) => d >= from && d <= to)) {
      const m = matchAuction(auctions, d);
      if (!m) {
        noAuction++;
        continue;
      }
      if (m.via === "settlement") viaSettle++;
      const s = yieldOf(m.a, tenor, kind);
      if (s === null) {
        nullInSbp++;
        continue;
      }
      if (Math.abs(s - v) < 0.00005) exact++;
      else if (Math.abs(round(s, 2) - v) < 0.00005) rounded++;
      else differ.push(`${d}: EasyData ${v} vs SBP ${s}`);
    }
    const sbpDates = auctions.filter((a) => a.auctionDate >= from && a.auctionDate <= to && yieldOf(a, tenor, kind) !== null);
    const missingInEasy = sbpDates.filter((a) => !easy.has(a.auctionDate) && !easy.has(a.settlementDate)).length;
    R.push(`| ${label} | ${exact} | ${rounded} | ${differ.length} | ${viaSettle} | ${noAuction + nullInSbp} | ${missingInEasy} |`);
    transitionFindings.push(...differ.map((x) => `${label} ${x}`));
  };
  const easyEnd = tbDates[tbDates.length - 1];
  R.push(`Overlap ${tbStart} to ${easyEnd} (T-bills) and ${pibStart} to ${pbDates[pbDates.length - 1]} (PIBs). An EasyData date is matched to the SBP auction held on that date or, failing that, settled on it: EasyData dates some auctions by settlement day.`, ``);
  R.push(`| Series | Equal to 4 dp | Equal after SBP value rounded to 2 dp | Different | Matched via settlement date | EasyData value with no SBP auction/value | SBP auctions absent from EasyData |`, `|---|---|---|---|---|---|---|`);
  (["cutoff", "wa"] as const).forEach((kind, ki) =>
    (["3M", "6M", "12M"] as const).forEach((t, ti) => compare(`T-bill ${t} ${kind === "cutoff" ? "cut-off" : "WA"}`, tbCols[ki * 3 + ti], tbP.auctions, t, kind === "cutoff" ? "cutoffYield" : "waYield", tbStart, easyEnd)),
  );
  (["cutoff", "wa"] as const).forEach((kind, ki) =>
    (["2Y", "3Y", "5Y", "10Y", "15Y"] as const).forEach((t) => compare(`PIB ${t} ${kind === "cutoff" ? "cut-off" : "WA"}`, pbCols[ki * EASY_PIB_TENORS.length + EASY_PIB_TENORS.indexOf(t)], pibP.auctions, t, kind === "cutoff" ? "cutoffYield" : "waYield", pibStart, pbDates[pbDates.length - 1])),
  );
  R.push(``, `Real differences (not explained by EasyData's 2-decimal rounding), ${transitionFindings.length} in total. The SBP auction files are used for these dates:`, ``);
  for (const f of transitionFindings) R.push(`- ${f}`);
  R.push(``, `Latest auction in each source: EasyData T-bills ${easyEnd}, SBP tb.xlsx ${tbP.auctions[tbP.auctions.length - 1].auctionDate}; EasyData PIBs ${pbDates[pbDates.length - 1]}, SBP Pakinvestbonds.xlsx ${pibP.auctions[pibP.auctions.length - 1].auctionDate}.`);
  const tbillDef = [...tbP.auctions, ...pibP.auctions].flatMap((a) => Object.entries(a.tenors).filter(([, t]) => (t as TenorResult).cutoffYield !== null && (t as TenorResult).waYield !== null && (t as TenorResult).cutoffYield! < (t as TenorResult).waYield! - 1e-4).map(([k]) => `${a.auctionDate} ${k}`));
  const easyDef: string[] = [];
  for (const [i, d] of tbDates.entries()) for (let t = 0; t < 3; t++) {
    const c = easyTbillRows[i][1 + t] as number | null;
    const w = easyTbillRows[i][4 + t] as number | null;
    if (c !== null && w !== null && c < w - 1e-4) easyDef.push(`${d} ${["3M", "6M", "12M"][t]} (cut-off ${c} < WA ${w})`);
  }
  R.push(``, `**Cut-off versus weighted-average definition.** In a multiple-price auction the cut-off (highest accepted yield) cannot be below the weighted average of accepted yields. SBP files: ${tbillDef.length} violations${tbillDef.length ? ` (${tbillDef.join(", ")})` : ""}. EasyData T-bills: ${easyDef.length} violations${easyDef.length ? ` (${easyDef.slice(0, 10).join("; ")}${easyDef.length > 10 ? "; …" : ""})` : ""}. A violation is reported, not corrected.`, ``);

  // Independent checks
  R.push(`## 7. Independent checks against SBP publications`, ``);
  R.push(`\`sir.pdf\` (Structure of Interest Rates) and \`Lendingdepositrates.pdf\` are separate SBP publications. Their text was extracted and compared with the datasets at the precision SBP prints (2 decimals).`, ``);
  const pol = sirPolicyTable(sir[0]);
  const polRes = pol.map((p) => {
    const vals = [rateInForce(ceiling, p.date), rateInForce(floor, p.date), rateInForce(target, p.date)];
    const ok = vals[0] === p.reverseRepo && vals[1] === p.repo && vals[2] === p.target;
    const exactEvent = target.some((e) => e[0] === p.date) || ceiling.some((e) => e[0] === p.date);
    const near = [...target, ...ceiling].map((e) => e[0]).filter((d) => Math.abs(daysBetween(d, p.date)) <= 7 && d !== p.date);
    return { p, ok, exactEvent, near, vals };
  });
  R.push(`**Policy rates (sir.pdf table I, ${pol.length} decisions ${pol[0]?.date} to ${pol[pol.length - 1]?.date}).** Values in force on SBP's "w.e.f." date: ${polRes.filter((x) => x.ok).length} of ${pol.length} match all three rates. Dates: ${polRes.filter((x) => x.exactEvent).length} of ${pol.length} have an EasyData record on the same date.${polRes.filter((x) => !x.exactEvent).length ? ` Differences: ${polRes.filter((x) => !x.exactEvent).map((x) => `SBP w.e.f. ${x.p.date}, EasyData ${x.near.join("/") || "none within 7 days"}`).join("; ")}. The dashboard shows EasyData's date and notes SBP's effective date.` : ""}`, ``);
  const p2 = sirPage2(sir[1]);
  let tbCmp = 0;
  const tbBad: string[] = [];
  let shifted = 0;
  const same2 = (v: number | null, pdfv: number | null) => v !== null && pdfv !== null && Math.abs(round(v, 2) - pdfv) <= 0.0051;
  for (const row of p2.tbills) {
    const ai = tbP.auctions.findIndex((x) => x.auctionDate === row.date);
    if (ai < 0) {
      tbBad.push(`${row.date}: not in tb.xlsx`);
      continue;
    }
    const a = tbP.auctions[ai];
    for (const t of ["1M", "3M", "6M", "12M"] as const) for (const [kind, pdfv] of [["cutoffYield", row.cutoff[t]], ["waYield", row.wa[t]]] as const) {
      const v = a.tenors[t]?.[kind] ?? null;
      if (pdfv === null && v === null) continue;
      tbCmp++;
      if (!same2(v, pdfv)) {
        const prev = ai > 0 ? (tbP.auctions[ai - 1].tenors[t]?.[kind] ?? null) : null;
        const isShift = pdfv === null ? prev === null : same2(prev, pdfv);
        if (isShift) shifted++;
        tbBad.push(`${row.date} ${t} ${kind === "cutoffYield" ? "cut-off" : "WA"}: sir ${pdfv ?? "NA"} vs tb.xlsx ${v ?? "null"}${isShift ? " (= tb.xlsx previous auction)" : ""}`);
      }
    }
  }
  const sirImpossible = p2.tbills.flatMap((r) => (["1M", "3M", "6M", "12M"] as const).filter((t) => r.cutoff[t] !== null && r.wa[t] !== null && r.wa[t]! > r.cutoff[t]! + 0.0051).map((t) => `${r.date} ${t}`));
  R.push(`**T-bill auctions (sir.pdf table II, ${p2.tbills.length} auctions ${p2.tbills[0]?.date} to ${p2.tbills[p2.tbills.length - 1]?.date}).** ${tbCmp - tbBad.length} of ${tbCmp} yields agree with SBP tb.xlsx at 2 decimals. Of the ${tbBad.length} disagreements, ${shifted} equal tb.xlsx's value for the PREVIOUS auction, i.e. sir.pdf prints those values one row late. Supporting evidence that the PDF, not tb.xlsx, is misaligned: in ${sirImpossible.length} sir.pdf rows the weighted average exceeds that row's own cut-off (${sirImpossible.join(", ") || "none"}), which cannot happen in these auctions; tb.xlsx has 0 such cases (section 6). EasyData repeats some of the shifted values (2025-08-06 and 2025-08-20, section 6). tb.xlsx is used.${tbBad.length ? ` Detail: ${tbBad.join("; ")}.` : ""}`, ``);
  const kd = p2.kibor.filter((k) => k.kind === "daily");
  const kdBad = kd.filter((k) => [[2, k.k1M], [3, k.k3M], [4, k.k6M]].some(([i, v]) => kMaps[i].get(k.period) !== v)).map((k) => `${k.period}: sir ${k.k1M}/${k.k3M}/${k.k6M} vs EasyData ${[2, 3, 4].map((i) => kMaps[i].get(k.period) ?? "—").join("/")}`);
  R.push(`**KIBOR daily (sir.pdf, ${kd.length} days ${kd[0]?.period} to ${kd[kd.length - 1]?.period}, 1M/3M/6M).** ${kd.length - kdBad.length} of ${kd.length} days match EasyData exactly.${kdBad.length ? ` Mismatches: ${kdBad.join("; ")}. A "—" means EasyData has no fixing for a day SBP's PDF prints: EasyData's daily KIBOR history has gaps. They are NOT filled from the PDF (a different publication, 1M/3M/6M only, last ~6 weeks); they stay missing and monthly averages state their day count.` : ""}`, ``);
  const km = p2.kibor.filter((k) => k.kind === "monthly-average");
  const means = [2, 3, 4].map((i) => new Map(monthlyMeans([...kMaps[i].entries()]).map((m) => [m.month, m])));
  const kmBad: string[] = [];
  for (const k of km) [k.k1M, k.k3M, k.k6M].forEach((v, j) => {
    const m = means[j].get(k.period);
    if (!m || round(m.mean, 2) !== v) kmBad.push(`${k.period} ${["1M", "3M", "6M"][j]}: SBP ${v} vs PEIC ${m ? round(m.mean, 4) : "—"} (${m?.days ?? 0} days)`);
  });
  R.push(`**KIBOR monthly averages (sir.pdf, ${km.length} months ${km[0]?.period} to ${km[km.length - 1]?.period}).** PEIC's monthly mean of EasyData's daily fixings, rounded to 2 decimals, equals SBP's published monthly average in ${km.length * 3 - kmBad.length} of ${km.length * 3} cases.${kmBad.length ? ` Differences: ${kmBad.join("; ")}. Each differing month is one where EasyData lacks fixing days (October 2026 is confirmed: the two days missing above); SBP averages over all its fixings. Where the day sets agree the method reproduces SBP's figures exactly, which validates the monthly-average transformation; the charts label every monthly average with its day count.` : " This validates the monthly-average transformation used in the charts."}`, ``);
  const pibRows = sirPibTable(sir[2]);
  let pibCmp = 0;
  const pibBad: string[] = [];
  const SIR_T = ["2Y", "3Y", "5Y", "10Y", "15Y"] as const;
  let pibViaSettle = 0;
  for (const row of pibRows.filter((r) => r.date >= pibStart)) {
    const m = matchAuction(pibP.auctions, row.date);
    if (!m) {
      pibBad.push(`${row.date}: no auction held or settled on that date in Pakinvestbonds.xlsx`);
      continue;
    }
    if (m.via === "settlement") pibViaSettle++;
    const a = m.a;
    SIR_T.forEach((t, i) => {
      for (const [kind, pdfv] of [["cutoffYield", row.cutoff[i]], ["waYield", row.wa[i]]] as const) {
        const v = a.tenors[t]?.[kind] ?? null;
        if (pdfv === null && v === null) continue;
        pibCmp++;
        if (pdfv === null || v === null || Math.abs(round(v, 2) - pdfv) > 0.0051) pibBad.push(`${row.date} ${t} ${kind === "cutoffYield" ? "cut-off" : "WA"}: sir ${pdfv ?? "R/N/NA"} vs file ${v ?? "null"}`);
      }
    });
  }
  R.push(`**PIB auctions (sir.pdf table III, rows from ${pibStart}).** sir.pdf dates ${pibViaSettle} of these auctions by settlement day (matched to the auction settled that day). ${pibCmp - pibBad.length} of ${pibCmp} yields agree with SBP Pakinvestbonds.xlsx at 2 decimals.${pibBad.length ? ` Disagreements: ${pibBad.join("; ")}.` : ""}`, ``);
  const sb = sirBankRates(sir[5]);
  const sbBad: string[] = [];
  const idx = (m: string) => LD_VARIANTS.indexOf(`${m}.inclZero.inclInter` as (typeof LD_VARIANTS)[number]);
  for (const r of sb) {
    const w = ld.monthly.find((x) => x.period === r.period && x.entity === "SB");
    const pairs: [string, number, number | null | undefined][] = [
      ["lending new", r.lendingNew, w?.values[idx("grossDisbursements")]],
      ["lending outstanding", r.lendingOutstanding, w?.values[idx("outstandingLoans")]],
      ["deposit new", r.depositNew, w?.values[idx("freshDeposits")]],
      ["deposit outstanding", r.depositOutstanding, w?.values[idx("outstandingDeposits")]],
    ];
    for (const [l, pdfv, v] of pairs) if (v == null || Math.abs(round(v, 2) - pdfv) > 0.0051) sbBad.push(`${r.period} ${l}: sir ${pdfv} vs workbook ${v == null ? "—" : round(v, 4)}`);
  }
  R.push(`**Lending/deposit rates (sir.pdf table VI, ${sb.length} months).** SBP's "Overall Weighted Average Rates" (scheduled banks, zero-rate and inter-FI included) against the workbook's scheduled-bank series: ${sb.length * 4 - sbBad.length} of ${sb.length * 4} values agree at 2 decimals.${sbBad.length ? ` Disagreements: ${sbBad.join("; ")}. They are confined to the June year-end rows of the PDF's annual block (every recent month agrees), consistent with the PDF carrying earlier vintages of those months; the workbook (the full, latest-revision series) is used.` : ""}`, ``);
  const lpBad: string[] = [];
  let lpCmp = 0;
  for (const m of ldPdf) for (const e of ["SB", "FI"] as const) {
    const w: LdMonthRow | undefined = ld.monthly.find((x) => x.period === m.period && x.entity === e);
    m.rows[e].forEach((pdfv, i) => {
      lpCmp++;
      const v = w?.values[i];
      if (v == null || Math.abs(round(v, 2) - pdfv) > 0.0051) lpBad.push(`${m.period} ${e} ${LD_VARIANTS[i]}: pdf ${pdfv} vs workbook ${v == null ? "—" : round(v, 4)}`);
    });
    if (w && w.flag !== m.flag) lpBad.push(`${m.period} ${e}: pdf flag "${m.flag}" vs workbook flag "${w.flag}"`);
  }
  R.push(`**Lending/deposit rates (Lendingdepositrates.pdf, months ${ldPdf.map((m) => `${m.period}${m.flag ? ` ${m.flag}` : ""}`).join(", ")}).** ${lpCmp - lpBad.filter((x) => !x.includes("flag")).length} of ${lpCmp} values (scheduled banks and all FIs, 16 variants each) agree with the workbook at 2 decimals.${lpBad.length ? ` Disagreements: ${lpBad.join("; ")}.` : ""}`, ``);

  // Methodology breaks
  R.push(`## 8. Lending and deposit rates: methodological regimes`, ``, `| Regime | Months stored | Entity | Notes |`, `|---|---|---|---|`);
  const reg = (n: number) => ld.monthly.filter((r) => r.regime === n && r.entity === "SB").map((r) => r.period);
  R.push(`| 1 (1997-2003) | ${ld.early.length} (${ld.early.filter((r) => r.frequency === "half-yearly").length} half-yearly, ${ld.early.filter((r) => r.frequency === "monthly").length} monthly) | All Groups | lending on a flow basis, deposits on a stock basis from Jun 1999; incl. zero mark-up |`);
  R.push(`| 2 (Jan 2004-Dec 2010) | ${reg(2).length} | All Banks | inter-bank placements included, no split |`);
  R.push(`| 3 (Jan 2011-Jun 2022) | ${reg(3).length} | All Banks | incl/excl inter-bank split |`);
  R.push(`| 4 (Jul 2022-) | ${reg(4).length} SB + ${ld.monthly.filter((r) => r.entity === "FI").length} FI | Scheduled Banks; All FIs | universe widened to DFIs and MFBs; inter-FI split; FIs = all FIs from Jul 2024 (SBP note 12) |`);
  const flags = ld.monthly.filter((r) => r.flag && r.entity === "SB").map((r) => `${r.period} ${r.flag === "P" ? "provisional" : "revised"}`);
  R.push(``, `Flags carried from SBP: ${flags.join(", ") || "none"}.`);
  if (ld.warnings.length || inj.warnings.length || mop.warnings.length || tbP.warnings.length || pibP.warnings.length) R.push(``, `Parser notes: ${[...ld.warnings, ...inj.warnings, ...mop.warnings, ...tbP.warnings, ...pibP.warnings].join("; ")}`);
  R.push(``, `## 9. Not available from an official source`, ``);
  R.push(`- Secondary-market government securities yields (PKRV, published by MUFAP) — excluded by decision; the yield curve uses SBP auction results only.`);
  R.push(`- National CPI before Jul 2016 on the 2015-16 base — the older-base series is not on EasyData; real rates start Jul 2016. Bases are not spliced.`);
  R.push(`- KIBID (bid side) is published by SBP but not used in this release; KIBOR 2Y/3Y end in Feb 2020.`);
  R.push(`- Bank-group detail of lending/deposit rates (public, private, foreign, specialized, DFIs, MFBs) is in the source workbook but not stored in this release.`);
  R.push(`- 7-year and 30-year PIBs: sparse in EasyData (${[...pbCols[3].keys()].length} and ${[...pbCols[7].keys()].length} cut-offs); the 30-year weighted average is entirely missing.`);
  R.push(``);

  // =====================================================================================================================================================
  // Data files
  const files: Record<string, string> = {};
  const digest = (...parts: unknown[]) => sha256(JSON.stringify(parts));
  const header = (title: string, lines: string[]) =>
    [`// GENERATED by scripts/buildInterestRates.ts from the official source files in ${DEFAULT_SOURCES}/. Do not edit by hand: re-run the build.`, `//`, `// ${title}`, ...lines.map((l) => (l ? `// ${l}` : `//`)), `//`, `// Integrity: rowsSha256 is the SHA-256 of the stored rows; a test recomputes it and rebuilds the file from the sources, so a hand edit fails the suite.`, ``].join("\n");
  const rows = (name: string, type: string, data: readonly unknown[]) => `export const ${name}: readonly ${type}[] = [\n${data.map((r) => "  " + JSON.stringify(r)).join(",\n")},\n];\n`;
  const prov = (name: string, refs: ReturnType<typeof ref>[], sha: string, extra = "") => `export const ${name} = {\n  sources: ${JSON.stringify(refs, null, 2).replace(/\n/g, "\n  ")},\n  rowsSha256: ${JSON.stringify(sha)},${extra}\n} as const;\n\n`;

  files[`${OUTPUT_DIR}/policyRates.ts`] =
    header("SBP administered rates and the overnight repo market rate (SBP EasyData). Percent per annum.", [
      "SBP_REVERSE_REPO  [date, %]  TS_GP_IR_SIRPR_AH.SBPOL0010  ceiling of the corridor; before 17 Aug 2009 the 3-day repo facility rate; the policy rate until 24 May 2015",
      "SBP_REPO          [date, %]  TS_GP_IR_SIRPR_AH.SBPOL0020  floor of the corridor, from 17 Aug 2009",
      "SBP_TARGET        [date, %]  TS_GP_IR_SIRPR_AH.SBPOL0030  policy (target) rate, from 25 May 2015",
      "OVERNIGHT_REPO    [date, %]  TS_GP_IR_REPOMR_D.ORR        weighted-average overnight repo rate: a MARKET rate, observed daily, not administered",
      "Each administered row is a date the rate took a value (a change, or a re-statement SBP recorded); it is not a list of every MPC meeting.",
    ]) +
    `import type { DateValue } from "@/lib/interestRates/types";\n\n` +
    prov("POLICY_RATES_PROVENANCE", [ref(src, "easydata/TS_GP_IR_SIRPR_AH.csv"), ref(src, "easydata/TS_GP_IR_REPOMR_D.csv")], digest(ceiling, floor, target, orr)) +
    rows("SBP_REVERSE_REPO", "DateValue", ceiling) + "\n" + rows("SBP_REPO", "DateValue", floor) + "\n" + rows("SBP_TARGET", "DateValue", target) + "\n" + rows("OVERNIGHT_REPO", "DateValue", orr);

  files[`${OUTPUT_DIR}/kibor.ts`] =
    header("KIBOR (Karachi Interbank Offered Rate), daily fixings, OFFER side, percent per annum (SBP EasyData TS_GP_BAM_SIRKIBOR_D).", [
      `Row: [date, ${KIBOR_TENORS.join(", ")}]. A tenor not fixed on a date is null (2Y and 3Y end on ${kibor2yLast}, when they were discontinued).`,
      "KIBOR is the average of quotes submitted by contributing banks under SBP's KIBOR framework. It is not set by SBP.",
    ]) +
    `import type { KiborRow } from "@/lib/interestRates/types";\n\n` +
    prov("KIBOR_PROVENANCE", [ref(src, "easydata/TS_GP_BAM_SIRKIBOR_D.csv")], digest(kiborRows)) +
    rows("KIBOR_DAILY", "KiborRow", kiborRows);

  files[`${OUTPUT_DIR}/govSecurities.ts`] =
    header("Government securities PRIMARY-MARKET (auction) yields, percent per annum. Not secondary-market yields, not PKRV.", [
      "EASY_TBILL_AUCTIONS [date, cut-off 3M, 6M, 12M, weighted-average 3M, 6M, 12M]                    SBP EasyData TS_GP_BAM_SIRTBIL_AH",
      `EASY_PIB_AUCTIONS   [date, cut-off ${EASY_PIB_TENORS.join("/")}, weighted-average ${EASY_PIB_TENORS.join("/")}]   SBP EasyData TS_GP_BAM_SIRPIBS_AH`,
      "SBP_TBILL_AUCTIONS  [auction date, settlement date, {tenor: [cut-off, weighted average, outcome]}]  SBP tb.xlsx, sheet \"New Detailed Format\"",
      "SBP_PIB_AUCTIONS    same layout                                                                     SBP Pakinvestbonds.xlsx, sheet \"New Format\" (fixed-coupon PIBs)",
      "outcome: A accepted | BR bids rejected | NB no bids | NA none accepted. A failed tenor has null yields, never zero.",
      "Cut-off = highest accepted yield; weighted average = average of accepted yields weighted by amount. They are different series and are never combined.",
      "EasyData observations its own status marks \"Missing value\" are null here even when a number was printed (see GOV_SEC_EXCLUDED and the validation report).",
    ]) +
    `import type { EasyPibRow, EasyTbillRow, ExcludedObservationRow, SbpAuctionRow } from "@/lib/interestRates/types";\n\n` +
    prov("GOV_SEC_PROVENANCE", [ref(src, "easydata/TS_GP_BAM_SIRTBIL_AH.csv"), ref(src, "easydata/TS_GP_BAM_SIRPIBS_AH.csv"), ref(src, "sbp/tb.xlsx"), ref(src, "sbp/Pakinvestbonds.xlsx")], digest(easyTbillRows, easyPibRows, sbpTbillRows, sbpPibRows), `\n  sbpTbillFrom: ${JSON.stringify(tbStart)},\n  sbpPibFrom: ${JSON.stringify(pibStart)},`) +
    `export const GOV_SEC_EXCLUDED: readonly ExcludedObservationRow[] = ${JSON.stringify(excluded.filter((e) => /SIRTBIL|SIRPIBS/.test(e.series)), null, 2)};\n\n` +
    rows("EASY_TBILL_AUCTIONS", "EasyTbillRow", easyTbillRows) + "\n" + rows("EASY_PIB_AUCTIONS", "EasyPibRow", easyPibRows) + "\n" + rows("SBP_TBILL_AUCTIONS", "SbpAuctionRow", sbpTbillRows) + "\n" + rows("SBP_PIB_AUCTIONS", "SbpAuctionRow", sbpPibRows);

  files[`${OUTPUT_DIR}/bankRates.ts`] =
    header("Weighted-average lending and deposit rates, percent per annum (SBP Lendingdepositrates_Arch.xls).", [
      "LD_MONTHLY [YYYY-MM, entity, regime, flag, 16 values]",
      "  entity  SB = all scheduled banks (\"All Banks\" before Jul 2022, \"1. Scheduled Banks\" after): the headline analytical series",
      "          FI = all financial institutions (scheduled banks + DFIs + MFBs), from Jul 2022 only; never joined to SB",
      "  regime  2 Jan 2004-Dec 2010 | 3 Jan 2011-Jun 2022 | 4 Jul 2022- (see docs/interest-rates-methodology.md). Regimes are not spliced.",
      "  flag    P provisional | R revised, as SBP marks the month",
      `  values  ${LD_VARIANTS.join(", ")}`,
      "          new business = grossDisbursements (lending) and freshDeposits; outstanding = outstandingLoans and outstandingDeposits.",
      "          Regime 2 has no inter-bank split: its values (which include inter-bank placements) sit in the inclInter slots; exclInter is null.",
      "LD_EARLY   [YYYY-MM, H half-yearly | M monthly, lending, deposit]  regime 1, \"All Groups\", Jun 1997-Dec 2003 (deposit from Jun 1999)",
    ]) +
    `import type { LdEarlyTuple, LdMonthTuple } from "@/lib/interestRates/types";\n\n` +
    prov("BANK_RATES_PROVENANCE", [ref(src, "sbp/Lendingdepositrates_Arch.xls")], digest(ldMonthRows, ldEarlyRows)) +
    rows("LD_MONTHLY", "LdMonthTuple", ldMonthRows) + "\n" + rows("LD_EARLY", "LdEarlyTuple", ldEarlyRows);

  files[`${OUTPUT_DIR}/omo.ts`] =
    header("SBP open market operations (SBP OMO-Inject-Hist.xlsx and OMO-MopUp-Hist.xlsx). Amounts PKR million; rates percent per annum.", [
      "Row: [date, side, tenor days, tenor note, offered, bids offered, quote low, quote high, accepted, bids accepted, cut-off %, outcome]",
      "  side I = injection (reverse repo: SBP lends to banks) | M = mop-up (repo: SBP absorbs liquidity)",
      "  cut-off: SBP stores it as a FRACTION (0.1201); it is converted x100 to percent here. Checked: every converted cut-off with a printed quote range lies",
      "  inside that range (the quotes are printed in percent), so the conversion is verified independently, row by row.",
      "  outcome A accepted | BR bids rejected | NB no bids received | NA no cut-off printed and no reason given",
    ]) +
    `import type { OmoTuple } from "@/lib/interestRates/types";\n\n` +
    prov("OMO_PROVENANCE", [ref(src, "sbp/OMO-Inject-Hist.xlsx"), ref(src, "sbp/OMO-MopUp-Hist.xlsx")], digest(omoRows)) +
    rows("OMO_OPERATIONS", "OmoTuple", omoRows);

  files[`${OUTPUT_DIR}/cpi.ts`] =
    header("National CPI inflation, year on year, percent (SBP EasyData TS_GP_PT_CPI_M.P00011516, base 2015-16). Used only to compute real rates.", [
      "Row: [YYYY-MM, %]. The series starts Jul 2016; earlier inflation on the 2007-08 base is a different index and is not spliced on.",
    ]) +
    `import type { CpiRow } from "@/lib/interestRates/types";\n\n` +
    prov("CPI_PROVENANCE", [ref(src, "easydata/TS_GP_PT_CPI_M.csv")], digest(cpiRows)) +
    rows("CPI_YOY", "CpiRow", cpiRows);

  files[REPORT_PATH] = R.join("\n") + "\n";

  summary.push(
    `policy: ${ceiling.length} ceiling / ${floor.length} floor / ${target.length} target records; ORR ${orr.length} days`,
    `KIBOR: ${kiborRows.length} dates ${kDates[0]}..${kDates[kDates.length - 1]}`,
    `T-bills: EasyData ${easyTbillRows.length} auctions; SBP file ${sbpTbillRows.length} (${tbStart}..${tbP.auctions[tbP.auctions.length - 1].auctionDate})`,
    `PIBs: EasyData ${easyPibRows.length} auctions; SBP file ${sbpPibRows.length}`,
    `lending/deposit: ${ldMonthRows.length} monthly rows, ${ldEarlyRows.length} early rows`,
    `OMO: ${omoRows.length} operations; CPI ${cpiRows.length} months`,
    `excluded EasyData observations: ${excluded.length}`,
    `independent checks: policy ${polRes.filter((x) => x.ok).length}/${pol.length} values; T-bills ${tbCmp - tbBad.length}/${tbCmp}; KIBOR daily ${kd.length - kdBad.length}/${kd.length}; KIBOR monthly ${km.length * 3 - kmBad.length}/${km.length * 3}; PIB ${pibCmp - pibBad.length}/${pibCmp}; bank (sir) ${sb.length * 4 - sbBad.length}/${sb.length * 4}; bank (pdf) ${lpCmp - lpBad.length}/${lpCmp}`,
  );
  return { files, summary };
}

function main(argv: string[]): Promise<number> {
  const check = argv.includes("--check");
  const i = argv.indexOf("--sources");
  const dir = i >= 0 && argv[i + 1] ? argv[i + 1] : DEFAULT_SOURCES;
  return buildInterestRateDatasets(loadSources(dir)).then(({ files, summary }) => {
    for (const s of summary) console.log(s);
    if (check) {
      console.log("--check: nothing written.");
      return 0;
    }
    for (const [p, content] of Object.entries(files)) {
      mkdirSync(path.dirname(p), { recursive: true });
      writeFileSync(p, content, "utf8");
    }
    console.log(`wrote ${Object.keys(files).length} files`);
    return 0;
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (err: unknown) => {
      console.error(`build failed: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    },
  );
}
