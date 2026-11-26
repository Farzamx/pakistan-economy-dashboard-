// Pure parsers for the official source files behind the Interest Rates & Monetary Policy dashboard (data/sources/interest-rates/). No I/O here: the build script
// (scripts/buildInterestRates.ts) reads the files and hands their contents to these functions, so every rule below is unit-tested on its own.
//
// Rules every parser follows:
//   - a value is taken exactly as the source prints it; nothing is interpolated, rounded (except the documented OMO unit conversion) or filled;
//   - a missing figure is null, never zero;
//   - anything the parser cannot place is reported in `warnings`, never silently dropped.

export type Cell = string | number | boolean | null | undefined;
export type SheetRows = Cell[][];

// ---------------------------------------------------------------------------------------------------------------------------------------------------------
// Small helpers

const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, arp: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

export const pad2 = (n: number) => String(n).padStart(2, "0");

/** Excel serial date (1900 system) to YYYY-MM-DD. */
export function excelSerialToIso(v: Cell): string | null {
  if (typeof v !== "number" || !Number.isFinite(v) || v < 20000 || v > 80000) return null;
  return new Date(Math.round((v - 25569) * 864e5)).toISOString().slice(0, 10);
}

/** "Jan-2004", "Jan - 11 ***", "Arpil - 19", "Oct-26 P", "Aug-26 R" -> { period: "2026-10", flag: "P" }. Two-digit years are 20yy (the sheets start in 2004). */
export function parseMonthLabel(label: string): { period: string; flag: "" | "P" | "R" } | null {
  const m = /^([A-Za-z]{3})[A-Za-z]*\.?\s*-\s*(\d{2}|\d{4})\s*(\*+)?\s*([PR])?\s*$/.exec(label.trim());
  if (!m) return null;
  const month = MONTHS[m[1].toLowerCase()];
  if (!month) return null;
  const year = m[2].length === 2 ? 2000 + Number(m[2]) : Number(m[2]);
  return { period: `${year}-${pad2(month)}`, flag: (m[4] as "P" | "R" | undefined) ?? "" };
}

/** "27-Oct-26" -> "2026-10-27". */
export function parseDayMonthYear(token: string): string | null {
  const m = /^(\d{1,2})-([A-Za-z]{3})-(\d{2})$/.exec(token.trim());
  if (!m) return null;
  const month = MONTHS[m[2].toLowerCase()];
  if (!month) return null;
  return `${2000 + Number(m[3])}-${pad2(month)}-${pad2(Number(m[1]))}`;
}

const isNum = (v: Cell): v is number => typeof v === "number" && Number.isFinite(v);

// ---------------------------------------------------------------------------------------------------------------------------------------------------------
// CSV (the verbatim EasyData extracts written by scripts/fetchInterestRateSources.ts)

export function parseCsv(text: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      out.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    out.push(row);
  }
  return out;
}

export interface EasyObservation {
  date: string;
  /** The value exactly as EasyData printed it ("" when absent). */
  raw: string;
  status: string;
  comment: string;
}

export interface EasySeries {
  key: string;
  name: string;
  unit: string;
  observations: EasyObservation[];
}

/** Groups a verbatim EasyData CSV by series key. Throws on a header or a row that is not the documented layout. */
export function readEasyDataCsv(text: string): Map<string, EasySeries> {
  const rows = parseCsv(text);
  const header = rows.shift()?.join(",");
  if (header !== "series_key,series_name,unit,observation_date,observation_value,observation_status,status_comments") throw new Error(`unexpected EasyData CSV header: ${header}`);
  const out = new Map<string, EasySeries>();
  for (const r of rows) {
    if (r.length === 1 && r[0] === "") continue;
    if (r.length !== 7) throw new Error(`EasyData CSV row with ${r.length} fields: ${r.join(",")}`);
    const [key, name, unit, date, raw, status, comment] = r;
    let s = out.get(key);
    if (!s) out.set(key, (s = { key, name, unit, observations: [] }));
    s.observations.push({ date, raw, status, comment });
  }
  return out;
}

/** Why an EasyData row was not used. */
export interface ExcludedObservation {
  series: string;
  date: string;
  raw: string;
  status: string;
  reason: string;
}

/**
 * The usable numeric observations of one series. A row is used only when EasyData marks it "Normal" AND its value is a finite number. Rows marked
 * "Missing value" are treated as missing even when a number is printed beside the status (EasyData's own status wins; audit finding), and are reported.
 * `implausible` lets the caller exclude specific, documented values (reported, never altered).
 */
export function usableObservations(
  s: EasySeries,
  implausible: ReadonlyArray<{ date: string; reason: string }> = [],
): { values: Map<string, number>; excluded: ExcludedObservation[] } {
  const values = new Map<string, number>();
  const excluded: ExcludedObservation[] = [];
  const bad = new Map(implausible.map((x) => [x.date, x.reason]));
  for (const o of s.observations) {
    const n = o.raw === "" ? NaN : Number(o.raw);
    if (o.status !== "Normal") {
      if (o.raw !== "") excluded.push({ series: s.key, date: o.date, raw: o.raw, status: o.status, reason: `EasyData marks this observation "${o.status}" although a value is printed; treated as missing` });
      continue;
    }
    if (!Number.isFinite(n)) {
      excluded.push({ series: s.key, date: o.date, raw: o.raw, status: o.status, reason: "status Normal but the value is not a number" });
      continue;
    }
    const reason = bad.get(o.date);
    if (reason !== undefined) {
      excluded.push({ series: s.key, date: o.date, raw: o.raw, status: o.status, reason });
      continue;
    }
    if (values.has(o.date)) throw new Error(`${s.key}: two observations dated ${o.date}`);
    values.set(o.date, n);
  }
  return { values, excluded };
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------
// Weighted-average lending and deposit rates (Lendingdepositrates_Arch.xls)

/** The four rate measures SBP publishes. "New" business = gross disbursements (lending) and fresh deposits; "outstanding" = end-of-month stocks. */
export const LD_MEASURES = ["grossDisbursements", "outstandingLoans", "freshDeposits", "outstandingDeposits"] as const;
export type LdMeasure = (typeof LD_MEASURES)[number];

/** Column order of the 16 stored values: measure x zero-markup (incl, excl) x inter-bank / inter-FI (incl, excl). */
export const LD_VARIANTS = LD_MEASURES.flatMap((m) => (["inclZero", "exclZero"] as const).flatMap((z) => (["inclInter", "exclInter"] as const).map((b) => `${m}.${z}.${b}` as const)));

/**
 * The four methodological regimes of the series (docs/interest-rates-methodology.md). They are never spliced: every stored row carries its regime.
 *   1  Jun 1997 - Dec 2003   half-yearly to Dec 2001, then monthly; "All Groups" only; one lending rate (flow basis) and one deposit rate (stock basis, from Jun 1999)
 *   2  Jan 2004 - Dec 2010   monthly; "All Banks"; four measures, incl/excl zero mark-up; inter-bank placements included (no split)
 *   3  Jan 2011 - Jun 2022   as 2, plus the incl/excl inter-bank split
 *   4  Jul 2022 -            reporting universe widened to financial institutions: "Scheduled Banks" (= the former "All Banks") plus DFIs, MFBs and an all-FI total;
 *                            inter-FI split; revised definitions (non-resident lending included, foreign bills excluded)
 */
export type LdRegime = 1 | 2 | 3 | 4;

export interface LdMonthRow {
  period: string; // YYYY-MM
  entity: "SB" | "FI"; // SB = all scheduled banks (headline); FI = all financial institutions (regime 4 only)
  regime: 2 | 3 | 4;
  flag: "" | "P" | "R"; // P provisional, R revised (as SBP marks them)
  values: (number | null)[]; // 16, in LD_VARIANTS order
}

export interface LdEarlyRow {
  period: string; // YYYY-MM (Jun/Dec of each year to 2001, monthly from Nov 2001)
  frequency: "half-yearly" | "monthly";
  lending: number | null;
  deposit: number | null;
}

export interface LendingParse {
  early: LdEarlyRow[];
  monthly: LdMonthRow[];
  warnings: string[];
}

const ldNum = (v: Cell): number | null => (isNum(v) ? v : null);

/** Normalises the row label of an aggregate line; null for bank-group lines (Public, Private, Foreign, Specialized, DFIs, MFBs), which are not stored. */
export function ldEntity(label: string): "SB" | "FI" | null {
  const l = label.replace(/\s+/g, " ").trim().toLowerCase();
  if (l === "all banks" || /^1\.\s*scheduled banks$/.test(l)) return "SB";
  if (l === "all financial institutions" || /overall\s*\(sbs, ?mfbs, ?dfis\)/.test(l)) return "FI";
  return null;
}

const KNOWN_GROUP = /^(\d+(\.\d+)?\.\s*)?(public|private|foreign|speciali[sz]ed|dfis|mfbs)$/i;

export function parseLendingWorkbook(sheets: Record<string, SheetRows>): LendingParse {
  const warnings: string[] = [];
  const early: LdEarlyRow[] = [];
  const monthly: LdMonthRow[] = [];
  const names = Object.keys(sheets);
  const find = (re: RegExp) => {
    const n = names.find((x) => re.test(x));
    if (!n) throw new Error(`lending workbook: no sheet matching ${re} (sheets: ${names.join(", ")})`);
    return sheets[n];
  };

  // Regime 1
  {
    const rows = find(/97.*2003/);
    let year: number | null = null;
    for (const r of rows) {
      const y = r[0];
      if (y !== null && y !== undefined && String(y).trim() !== "") {
        const m = /^(\d{4})/.exec(String(y).trim());
        if (m) year = Number(m[1]);
      }
      const mon = r[1] === null || r[1] === undefined ? "" : String(r[1]).trim();
      const mm = MONTHS[mon.replace(".", "").slice(0, 3).toLowerCase()];
      if (!year || !mm) continue;
      const period = `${year}-${pad2(mm)}`;
      const frequency = mon.endsWith(".") ? "half-yearly" : "monthly";
      const row: LdEarlyRow = { period, frequency, lending: ldNum(r[12]), deposit: ldNum(r[13]) };
      const dup = early.find((e) => e.period === period);
      if (dup) {
        if (dup.lending !== row.lending || dup.deposit !== row.deposit) throw new Error(`lending 1997-2003: ${period} printed twice with different values`);
        continue; // Dec 2001 closes the half-yearly block and opens the monthly one with the same figures
      }
      early.push(row);
    }
  }

  // Regimes 2-4
  const blocks: { re: RegExp; regime: 2 | 3 | 4; width: 8 | 16 }[] = [
    { re: /2004.*2010/, regime: 2, width: 8 },
    { re: /11.*22/, regime: 3, width: 16 },
    { re: /^Jul-22/, regime: 4, width: 16 },
  ];
  for (const b of blocks) {
    const rows = find(b.re);
    let current: { period: string; flag: "" | "P" | "R" } | null = null;
    for (const r of rows) {
      const a = r[0] === null || r[0] === undefined ? "" : String(r[0]).trim();
      if (a) {
        const p = parseMonthLabel(a);
        if (p) current = p;
      }
      const label = r[1] === null || r[1] === undefined ? "" : String(r[1]).trim();
      if (!label || !isNum(r[2])) continue;
      if (!current) {
        warnings.push(`lending regime ${b.regime}: a data row "${label}" before any month label`);
        continue;
      }
      const entity = ldEntity(label);
      if (!entity) {
        if (!KNOWN_GROUP.test(label)) warnings.push(`lending regime ${b.regime} ${current.period}: unrecognised row label "${label}" (not stored)`);
        continue;
      }
      if (entity === "FI" && b.regime !== 4) throw new Error(`lending: an all-FI row in regime ${b.regime}`);
      const values: (number | null)[] = [];
      if (b.width === 8) {
        // incl/excl zero mark-up per measure; inter-bank placements included (SBP note 5), so the values go to the "inclInter" slots
        for (let m = 0; m < 4; m++) for (let z = 0; z < 2; z++) values.push(ldNum(r[2 + m * 2 + z]), null);
      } else {
        for (let i = 0; i < 16; i++) values.push(ldNum(r[2 + i]));
      }
      if (monthly.some((x) => x.period === current!.period && x.entity === entity)) throw new Error(`lending: ${current.period} ${entity} printed twice`);
      monthly.push({ period: current.period, entity, regime: b.regime, flag: current.flag, values });
    }
  }
  monthly.sort((x, y) => (x.period === y.period ? x.entity.localeCompare(y.entity) : x.period < y.period ? -1 : 1));
  return { early, monthly, warnings };
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------
// Open market operations (OMO-Inject-Hist.xlsx, OMO-MopUp-Hist.xlsx)

/**
 *   A   bids accepted; a cut-off rate exists
 *   BR  bids rejected ("Bids Rejected", "Rejected")
 *   NB  no bid received ("No Bid Received", "No Bids")
 *   NA  no cut-off printed and no reason given ("-" or blank)
 */
export type OmoOutcome = "A" | "BR" | "NB" | "NA";

export interface OmoOperation {
  date: string;
  side: "injection" | "mopup";
  tenorDays: number | null;
  /** SBP's own note on the tenor, e.g. "13*" (maturity rolled over); null when the tenor is a plain number. */
  tenorNote: string | null;
  offered: number | null; // PKR million
  bidsOffered: number | null;
  quoteLow: number | null; // percent p.a.
  quoteHigh: number | null; // percent p.a.
  accepted: number | null; // PKR million
  bidsAccepted: number | null;
  /** Cut-off rate in PERCENT p.a. SBP stores it as a fraction (0.1201); converted x100 here and validated against the quote range. */
  cutoffPct: number | null;
  /** The cut-off exactly as SBP stored it (a fraction). */
  cutoffRaw: number | null;
  outcome: OmoOutcome;
}

export interface OmoParse {
  operations: OmoOperation[];
  warnings: string[];
}

/** x100 without binary noise: 0.1161 -> 11.61 (SBP prints at most 4 decimals of the fraction, i.e. 2 decimals of the percent). */
export const fractionToPercent = (f: number) => Math.round(f * 100 * 1e6) / 1e6;

function omoOutcome(texts: string[]): OmoOutcome | null {
  const t = texts.join(" ").toLowerCase();
  if (/rejected/.test(t)) return "BR";
  if (/no bids?( received)?/.test(t)) return "NB";
  return null;
}

/**
 * Columns (both files, offset by one empty column): 1 date, 2 type, 3 tenor (days), 4 amount offered, 5 bids offered, 6/7 quote range, 8 amount accepted,
 * 9 bids accepted, 10 cut-off. The quote range is "High, Low" in the injection file and "Low, High" in the mop-up file; both are stored as low/high.
 */
export function parseOmoSheet(rows: SheetRows, side: "injection" | "mopup"): OmoParse {
  const warnings: string[] = [];
  const operations: OmoOperation[] = [];
  const header = rows.findIndex((r) => String(r[1] ?? "").trim() === "Date" && String(r[2] ?? "").trim() === "Type");
  if (header < 0) throw new Error(`OMO ${side}: header row not found`);
  const sub = rows[header + 1].map((v) => String(v ?? "").trim());
  const expected = side === "injection" ? ["High", "Low"] : ["Low", "High"];
  if (sub[6] !== expected[0] || sub[7] !== expected[1]) throw new Error(`OMO ${side}: quote-range columns are "${sub[6]}, ${sub[7]}", expected "${expected.join(", ")}"`);
  const expectedType = side === "injection" ? "reverse repo" : "repo";
  for (const r of rows.slice(header + 2)) {
    const date = excelSerialToIso(r[1]);
    if (!date) continue;
    const type = String(r[2] ?? "").trim();
    if (!type) continue; // a month separator row: a date and nothing else
    if (type.toLowerCase() !== expectedType) throw new Error(`OMO ${side} ${date}: unexpected type "${type}"`);
    const texts = r.slice(3, 11).filter((v): v is string => typeof v === "string" && v.trim() !== "" && v.trim() !== "-").map((v) => v.trim());
    let tenorDays: number | null = null;
    let tenorNote: string | null = null;
    if (isNum(r[3])) tenorDays = r[3];
    else if (typeof r[3] === "string" && r[3].trim()) {
      tenorNote = r[3].trim();
      const m = /^(\d+)/.exec(tenorNote);
      tenorDays = m ? Number(m[1]) : null;
    }
    const q = [ldNum(r[6]), ldNum(r[7])];
    const [low, high] = side === "injection" ? [q[1], q[0]] : [q[0], q[1]];
    const cutoffRaw = ldNum(r[10]);
    if (cutoffRaw !== null && cutoffRaw >= 1) throw new Error(`OMO ${side} ${date}: cut-off ${cutoffRaw} is not a fraction; the unit assumption no longer holds`);
    const textOutcome = omoOutcome(texts.filter((t) => t !== tenorNote));
    const outcome: OmoOutcome = cutoffRaw !== null ? "A" : (textOutcome ?? "NA");
    if (cutoffRaw !== null && textOutcome) warnings.push(`OMO ${side} ${date}: a cut-off and the text "${texts.join(" ")}" on one row`);
    operations.push({
      date,
      side,
      tenorDays,
      tenorNote,
      offered: ldNum(r[4]),
      bidsOffered: ldNum(r[5]),
      quoteLow: low,
      quoteHigh: high,
      accepted: ldNum(r[8]),
      bidsAccepted: ldNum(r[9]),
      cutoffPct: cutoffRaw === null ? null : fractionToPercent(cutoffRaw),
      cutoffRaw,
      outcome,
    });
  }
  return { operations, warnings };
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------
// Independent-check extracts from SBP's PDFs (text as unpdf extracts it, one string per page)

const tokNum = (t: string): number | null => (/^-?\d+(\.\d+)?$/.test(t) ? Number(t) : null);

export interface SirPolicyRow {
  date: string;
  reverseRepo: number;
  repo: number;
  target: number;
}

/** sir.pdf page 1, "Structure of Interest Rates -I": w.e.f. | reverse repo | repo | policy (target) | ... */
export function sirPolicyTable(page: string): SirPolicyRow[] {
  const out: SirPolicyRow[] = [];
  for (const line of page.split("\n")) {
    const t = line.trim().split(/\s+/);
    const date = parseDayMonthYear(t[0] ?? "");
    const n = t.slice(1, 4).map(tokNum);
    if (date && n.length === 3 && n.every((x) => x !== null)) out.push({ date, reverseRepo: n[0]!, repo: n[1]!, target: n[2]! });
  }
  return out;
}

export interface SirTbillRow {
  date: string;
  cutoff: Record<"1M" | "3M" | "6M" | "12M", number | null>;
  wa: Record<"1M" | "3M" | "6M" | "12M", number | null>;
}

export interface SirKiborRow {
  /** YYYY-MM for a monthly average, YYYY-MM-DD for a daily rate. */
  period: string;
  kind: "monthly-average" | "daily";
  k1M: number;
  k3M: number;
  k6M: number;
}

/** sir.pdf page 2, "Structure of Interest Rates -II": T-bill auctions (cut-off and WA, 1-12 m) on the left; KIBOR offer 1/3/6 m (monthly averages, then daily) on the right. */
export function sirPage2(page: string): { tbills: SirTbillRow[]; kibor: SirKiborRow[] } {
  const tbills: SirTbillRow[] = [];
  const kibor: SirKiborRow[] = [];
  const val = (t: string) => (t === "NA" || t === "N" || t === "R" ? null : tokNum(t));
  const right = (t: string[]) => {
    if (t.length !== 4) return;
    const nums = t.slice(1).map(tokNum);
    if (nums.some((x) => x === null)) return;
    const daily = parseDayMonthYear(t[0]);
    const monthly = daily ? null : parseMonthLabel(t[0]);
    if (daily) kibor.push({ period: daily, kind: "daily", k1M: nums[0]!, k3M: nums[1]!, k6M: nums[2]! });
    else if (monthly) kibor.push({ period: monthly.period, kind: "monthly-average", k1M: nums[0]!, k3M: nums[1]!, k6M: nums[2]! });
  };
  for (const line of page.split("\n")) {
    const t = line.trim().split(/\s+/);
    const date = parseDayMonthYear(t[0] ?? "");
    if (date && t.length >= 9 && t.slice(1, 9).every((x) => x === "NA" || x === "N" || x === "R" || tokNum(x) !== null)) {
      const v = t.slice(1, 9).map(val);
      tbills.push({ date, cutoff: { "1M": v[0], "3M": v[1], "6M": v[2], "12M": v[3] }, wa: { "1M": v[4], "3M": v[5], "6M": v[6], "12M": v[7] } });
      right(t.slice(9));
    } else right(t);
  }
  return { tbills, kibor };
}

export const SIR_PIB_TENORS = ["2Y", "3Y", "5Y", "10Y", "15Y", "20Y", "30Y"] as const;

export interface SirPibRow {
  date: string;
  cutoff: (number | null)[]; // SIR_PIB_TENORS order; null for R (rejected), N (no bid) and NA
  wa: (number | null)[];
}

/** sir.pdf page 3, "Structure of Interest Rates -III": fixed-rate PIB auctions, cut-off then weighted-average yields for 2-30 years. */
export function sirPibTable(page: string): SirPibRow[] {
  const out: SirPibRow[] = [];
  const ok = (x: string) => x === "NA" || x === "N" || x === "R" || tokNum(x) !== null;
  for (const line of page.split("\n")) {
    const t = line.trim().split(/\s+/);
    const date = parseDayMonthYear(t[0] ?? "");
    if (!date || t.length < 15 || !t.slice(1, 15).every(ok)) continue;
    const v = t.slice(1, 15).map((x) => tokNum(x));
    out.push({ date, cutoff: v.slice(0, 7), wa: v.slice(7, 14) });
  }
  return out;
}

export interface SirBankRow {
  period: string; // YYYY-MM
  lendingNew: number;
  lendingOutstanding: number;
  depositNew: number;
  depositOutstanding: number;
}

/** sir.pdf page 6, "Overall Weighted Average Rates" (scheduled banks, zero-rate and inter-FI included): Marginal = new business, Stocks = outstanding. */
export function sirBankRates(page: string): SirBankRow[] {
  const out = new Map<string, SirBankRow>();
  for (const line of page.split("\n")) {
    const t = line.trim().split(/\s+/);
    const p = parseMonthLabel(t[0] ?? "");
    const n = t.slice(1, 5).map(tokNum);
    if (p && n.length === 4 && n.every((x) => x !== null)) out.set(p.period, { period: p.period, lendingNew: n[0]!, lendingOutstanding: n[1]!, depositNew: n[2]!, depositOutstanding: n[3]! });
  }
  return [...out.values()].sort((a, b) => a.period.localeCompare(b.period));
}

export interface LendingPdfMonth {
  period: string;
  flag: "" | "P" | "R";
  rows: Record<"SB" | "FI", number[]>;
}

/**
 * Lendingdepositrates.pdf (SBP's monthly release: the latest month, the month before and the same month a year earlier). Each text line is
 * "[<month label>] <row label> <16 numbers>"; the 16 numbers for "1. Scheduled Banks" and the all-FI total are returned per month, in LD_VARIANTS order.
 */
export function lendingPdf(text: string): LendingPdfMonth[] {
  const months: LendingPdfMonth[] = [];
  let current: { period: string; flag: "" | "P" | "R" } | null = null;
  const rowsOf = new Map<string, Partial<Record<"SB" | "FI", number[]>>>();
  for (const raw of text.split("\n")) {
    let line = raw.trim();
    const m = /^([A-Za-z]{3}-\d{2}(?:\s+[PR])?)\s+(.*)$/.exec(line);
    if (m && parseMonthLabel(m[1])) {
      current = parseMonthLabel(m[1]);
      line = m[2];
    }
    if (!current) continue;
    const nm = /^(.*?)\s+((?:-?\d+(?:\.\d+)?\s+){15}-?\d+(?:\.\d+)?)$/.exec(line);
    if (!nm) continue;
    const e = ldEntity(nm[1]);
    if (!e) continue;
    const key = `${current.period}|${current.flag}`;
    const rows = rowsOf.get(key) ?? {};
    rows[e] = nm[2].split(/\s+/).map(Number);
    rowsOf.set(key, rows);
  }
  for (const [key, rows] of rowsOf) {
    const [period, flag] = key.split("|") as [string, "" | "P" | "R"];
    if (!rows.SB || !rows.FI) throw new Error(`Lendingdepositrates.pdf ${period}: scheduled-bank or all-FI row not found`);
    months.push({ period, flag, rows: rows as Record<"SB" | "FI", number[]> });
  }
  if (months.length === 0) throw new Error("Lendingdepositrates.pdf: no month found");
  return months;
}
