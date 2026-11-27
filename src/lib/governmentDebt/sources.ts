// Pure parsers for the Pakistan Government Debt sources (data/sources/government-debt/). No I/O: scripts/buildGovernmentDebt.ts reads the files.
// Every value is taken as the source prints it; anything that does not match the expected layout throws, so nothing is guessed.

const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const num = (t: string) => Number(t.replace(/,/g, ""));

/** "Sep-26" -> "2026-09-30" (the quarter-end day). */
export function quarterLabelToDate(label: string): string {
  const m = /^([A-Za-z]{3})-(\d{2})$/.exec(label.trim());
  if (!m || !MONTHS[m[1].toLowerCase()]) throw new Error(`not a quarter label: "${label}"`);
  const month = MONTHS[m[1].toLowerCase()];
  const year = 2000 + Number(m[2]);
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2, "0")}-${last}`;
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------
// SBP "Pakistan's Debt and Liabilities - Summary" (Summary.pdf, one page)

export const SUMMARY_ROWS = {
  domestic: "I. Gross Government Domestic Debt",
  external: "II. Government External Debt",
  imf: "III. Debt from IMF",
  grossPublic: "A. Gross Public Debt (sum I to III)",
  frdla: "B. Total Debt of the Government - FRDLA Definition",
  totalExternal: "C. Total External Debt & Liabilities (sum II to VI+IX)",
} as const;
export type SummaryRow = keyof typeof SUMMARY_ROWS;

export interface SummaryTable {
  /** Quarter-end dates, oldest first, as printed in the header. */
  quarters: string[];
  /** "P" provisional, "R" revised, "" otherwise, per quarter. */
  flags: ("P" | "R" | "")[];
  rows: Record<SummaryRow | "govDeposits", number[]>;
  /** The fiscal-year ratios printed under "As percent of GDP" (one fiscal year). */
  ratios: { grossPublic: number; frdla: number; totalExternal: number; domestic: number; totalDebtLiabilities: number };
  fiscalYear: string; // e.g. "FY26"
  gdp: number; // billion PKR, "GDP (current market price)" for that fiscal year
}

export function parseSummaryPdf(text: string): SummaryTable {
  const flat = text.replace(/\s+/g, " ");
  const header = /((?:[PR] ){4}[PR])?\s*((?:[A-Z][a-z]{2}-\d{2} ){4}[A-Z][a-z]{2}-\d{2})/.exec(flat);
  if (!header) throw new Error("Summary.pdf: quarter header not found");
  const labels = header[2].split(" ");
  const quarters = labels.map(quarterLabelToDate);
  // Flags sit on the line above the header ("R R R R P"); the first quarter may carry none, so align them to the right.
  const flagTokens = (/((?:[PR] ?){1,5})\s+(?:[A-Z][a-z]{2}-\d{2} ){4}/.exec(flat)?.[1] ?? "").trim().split(/\s+/).filter(Boolean) as ("P" | "R")[];
  const flags = quarters.map((_, i) => flagTokens[i - (quarters.length - flagTokens.length)] ?? "") as ("P" | "R" | "")[];

  const five = String.raw`(-?[\d,]+\.\d)\s+(-?[\d,]+\.\d)\s+(-?[\d,]+\.\d)\s+(-?[\d,]+\.\d)\s+(-?[\d,]+\.\d)`;
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rows = {} as SummaryTable["rows"];
  for (const [key, label] of Object.entries(SUMMARY_ROWS) as [SummaryRow, string][]) {
    const m = new RegExp(`${esc(label)}\\s*\\d?\\s+${five}`).exec(flat);
    if (!m) throw new Error(`Summary.pdf: row "${label}" not found with five values`);
    rows[key] = m.slice(1, 6).map(num);
  }
  const dep = /Government Deposits with the banking system\s*\d?\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)/.exec(flat);
  if (!dep) throw new Error("Summary.pdf: government deposits row not found");
  rows.govDeposits = dep.slice(1, 6).map(num);

  const ratio = (label: string) => {
    const m = new RegExp(`As percent of GDP.*?${esc(label)}\\s+([\\d.]+)`).exec(flat);
    if (!m) throw new Error(`Summary.pdf: ratio "${label}" not found`);
    return Number(m[1]);
  };
  const tdl = /Total Debt and Liabilities \(As percent of GDP\)\s+([\d.]+)/.exec(flat);
  const fy = /Memorandum Items (FY\d{2})/.exec(flat);
  const gdp = /GDP \(current market price\)\s*\d?\s+([\d,]+)/.exec(flat);
  if (!tdl || !fy || !gdp) throw new Error("Summary.pdf: total-debt ratio, fiscal year or GDP not found");
  return {
    quarters,
    flags,
    rows,
    ratios: { grossPublic: ratio("Gross Public Debt"), frdla: ratio("Total Debt of the Government - FRDLA Definition"), totalExternal: ratio("Total External Debt & Liabilities"), domestic: ratio("Gross Government Domestic Debt"), totalDebtLiabilities: Number(tdl[1]) },
    fiscalYear: fy[1],
    gdp: num(gdp[1]),
  };
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------
// Ministry of Finance, Annual Debt Review FY-26

export interface MofYear {
  date: string; // June-end, YYYY-06-30
  totalPublic: number; // PKR billion
  domestic: number;
  external: number;
  totalPct: number; // % of GDP
  domesticPct: number;
  externalPct: number;
  frdla: number; // "Total Debt of the Govt" (FRDLA definition), PKR billion
  frdlaPct: number;
}

/**
 * Reads the review's public-debt figures for the three fiscal years it reports (June-24, June-25, June-26). The stock and ratio values come from the
 * "Total public debt" and "Public debt to GDP ratio" charts; the FRDLA values from the table under the FRDLA definition. Internal checks that must hold
 * before anything is returned: domestic + external = total (exactly, for stocks), domestic% + external% = total% (within rounding), and the narrative
 * sentence for June-26 states the same total, domestic and external figures.
 */
export function parseMofDebtReview(text: string): MofYear[] {
  const lines = text.split("\n").map((l) => l.trim());
  const heading = lines.findIndex((l) => /^T O T A L P U B L I C D E B T - P K R B I L L I O N$/.test(l));
  if (heading < 0) throw new Error("MoF review: 'Total public debt - PKR billion' chart not found");
  const domIdx = lines.slice(0, heading).map((l, i) => [l, i] as const).filter(([l]) => /^\d{2},\d{3} \d{2},\d{3} \d{2},\d{3}$/.test(l)).pop()?.[1];
  if (domIdx === undefined) throw new Error("MoF review: domestic debt series not found");
  const domestic = lines[domIdx].split(" ").map(num);
  // Between the domestic series and the chart heading: the six external/total values, then the chart's year-axis line ("J U N - 2 4 ..."), which is skipped.
  const singles = lines.slice(domIdx + 1, heading).filter((l) => /^\d{2},\d{3}$/.test(l)).map(num);
  if (singles.length !== 6 || singles.some((x) => !Number.isFinite(x))) throw new Error(`MoF review: expected 6 stock values after the domestic series, got ${singles.length}`);
  const external = singles.slice(0, 3);
  const total = singles.slice(3, 6);
  total.forEach((t, i) => {
    if (domestic[i] + external[i] !== t) throw new Error(`MoF review: domestic ${domestic[i]} + external ${external[i]} != total ${t}`);
  });

  const ratioHeading = lines.findIndex((l) => /^P U B L I C D E B T T O G D P R A T I O$/.test(l));
  const pctLines = lines.slice(0, ratioHeading).filter((l) => /^\d+\.\d% \d+\.\d% \d+\.\d%$/.test(l)).slice(-3).map((l) => l.split(" ").map((x) => Number(x.replace("%", ""))));
  if (ratioHeading < 0 || pctLines.length !== 3) throw new Error("MoF review: debt-to-GDP chart not found");
  const [domesticPct, externalPct, totalPct] = pctLines;
  totalPct.forEach((t, i) => {
    if (Math.abs(domesticPct[i] + externalPct[i] - t) > 0.11) throw new Error(`MoF review: ratio ${domesticPct[i]} + ${externalPct[i]} != ${t}`);
  });

  const frdla = /Total Debt of the Govt - PKR bn ([\d,]+) ([\d,]+) ([\d,]+)/.exec(text);
  const frdlaPct = /Total Debt Govt - to - GDP Ratio ([\d.]+)% ([\d.]+)% ([\d.]+)%/.exec(text);
  const years = /Jun-(\d{2}) Jun-(\d{2}) Jun-(\d{2})\s+Total Debt of the Govt/.exec(text);
  if (!frdla || !frdlaPct || !years) throw new Error("MoF review: FRDLA table not found");

  const narrative = /total public debt of Pakistan is PKR ([\d,]+) billion as of June-(\d{2}).*?PKR ([\d,]+) billion is domestic debt and PKR ([\d,]+) billion is external debt/.exec(text.replace(/\s+/g, " "));
  if (!narrative) throw new Error("MoF review: narrative total not found");
  if (num(narrative[1]) !== total[2] || num(narrative[3]) !== domestic[2] || num(narrative[4]) !== external[2] || narrative[2] !== years[3]) {
    throw new Error("MoF review: the narrative and the chart disagree on the latest year");
  }

  return [1, 2, 3].map((k, i) => ({
    date: `20${years[k]}-06-30`,
    totalPublic: total[i],
    domestic: domestic[i],
    external: external[i],
    totalPct: totalPct[i],
    domesticPct: domesticPct[i],
    externalPct: externalPct[i],
    frdla: num(frdla[k]),
    frdlaPct: Number(frdlaPct[k]),
  }));
}
