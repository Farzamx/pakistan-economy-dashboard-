// Builds the Pakistan Government Debt dataset (src/data/governmentDebt.ts) and its validation report (docs/government-debt-validation-report.md) from the
// official files preserved in data/sources/government-debt/. LOCAL AND READ-ONLY: no network, no database, no credentials. Deterministic.
//
//   1. Acquire (network, read-only):  npx tsx scripts/fetchGovernmentDebtSources.ts --retrieved YYYY-MM-DD
//   2. Build (local):                 npx tsx scripts/buildGovernmentDebt.ts [--check]
//   3. Test:                          npx vitest run scripts/buildGovernmentDebt.test.ts src/lib/governmentDebt
//
// What stops the build: a source whose SHA-256 differs from the manifest; a layout the parsers do not recognise; a broken accounting identity in SBP's
// series (gross public debt = domestic + external + IMF; FRDLA debt = gross public debt - government deposits; ratio = gross public debt / GDP); a value
// outside a plausible range; SBP's own summary PDF disagreeing with EasyData for the quarters it prints. Differences between SBP and the Ministry of
// Finance are REPORTED (they use different definitions and GDP vintages) and pinned by the tests, never forced to agree.
//
// Importing this module does nothing: main() runs only when the file is the entry point.

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { extractText, getDocumentProxy } from "unpdf";
import { parseMofDebtReview, parseSummaryPdf, type MofYear } from "@/lib/governmentDebt/sources";
import { readEasyDataCsv, usableObservations } from "@/lib/interestRates/sources";

export const DEFAULT_SOURCES = "data/sources/government-debt";
export const DATA_PATH = "src/data/governmentDebt.ts";
export const REPORT_PATH = "docs/government-debt-validation-report.md";
const DATASET = "TS_GP_BAM_PKDLP_Q";

/** EasyData series used, by role. Names are checked against the series' own names so a code mapping error stops the build. */
export const SERIES = {
  domestic: { code: "PDLS00010", name: /^I\. Gross Government Domestic Debt/ },
  external: { code: "PDLS00020", name: /^II\. Government External Debt/ },
  imf: { code: "PDLS00030", name: /^III\. Debt from IMF/ },
  totalDebtLiabilities: { code: "PDLS00100", name: /^Total Debt and Liabilities \(sum I to IX-X\)/ },
  grossPublic: { code: "PDLS00110", name: /^A\. Gross Public Debt \(sum I to III\)/ },
  frdla: { code: "PDLS00120", name: /^B\. Total Debt of the Government - FRDLA Definition/ },
  totalExternal: { code: "PDLS00130", name: /^C\. Total External Debt & Liabilities/ },
  govDeposits: { code: "PDLS00260", name: /^Government Deposits with the banking system/ },
  pctTotalDebtLiabilities: { code: "PDLS00170", name: /^Total Debt and Liabilities\s+As percent of GDP/ },
  pctGrossPublic: { code: "PDLS00180", name: /^Gross Public Debt As percent of GDP/ },
  pctFrdla: { code: "PDLS00190", name: /^Total Debt of the Government - FRDLA Definition As percent of GDP/ },
  pctTotalExternal: { code: "PDLS00200", name: /^Total External Debt & Liabilities\s+As percent of GDP/ },
  pctDomestic: { code: "PDLS00240", name: /^Government Domestic Debt\s+As percent of GDP/ },
  gdp: { code: "PDLS00250", name: /^GDP \(current market price\)/ },
} as const;
type Role = keyof typeof SERIES;
const STOCKS: Role[] = ["domestic", "external", "imf", "grossPublic", "frdla", "govDeposits", "totalExternal", "totalDebtLiabilities"];
const RATIOS: Role[] = ["pctGrossPublic", "pctFrdla", "pctDomestic", "pctTotalExternal", "pctTotalDebtLiabilities", "gdp"];

interface ManifestFile {
  path: string;
  url: string;
  sha256: string;
  retrievedOn: string;
  institution: string;
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

export function verifyManifest(src: SourceBundle): void {
  for (const f of src.manifest) {
    const got = sha256(src.read(f.path));
    if (got !== f.sha256) throw new Error(`source ${f.path}: SHA-256 ${got} does not match the manifest (${f.sha256}); re-acquire it, never edit a source by hand`);
  }
}

async function pdfText(buf: Buffer): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(buf));
  return ((await extractText(pdf, { mergePages: false })).text as string[]).join("\n");
}

const r1 = (v: number) => Math.round(v * 10) / 10;
const r2 = (v: number) => Math.round(v * 100) / 100;

export interface BuildResult {
  files: Record<string, string>;
  summary: string[];
}

export async function buildGovernmentDebt(src: SourceBundle): Promise<BuildResult> {
  verifyManifest(src);
  const ref = (p: string) => {
    const f = src.manifest.find((x) => x.path === p);
    if (!f) throw new Error(`manifest has no entry for ${p}`);
    return { path: f.path, institution: f.institution, url: f.url, sha256: f.sha256, retrievedOn: f.retrievedOn };
  };

  // ---- SBP EasyData
  const csv = readEasyDataCsv(src.read(`easydata/${DATASET}.csv`).toString("utf8"));
  const values = {} as Record<Role, Map<string, number>>;
  for (const [role, s] of Object.entries(SERIES) as [Role, (typeof SERIES)[Role]][]) {
    const series = csv.get(`${DATASET}.${s.code}`);
    if (!series) throw new Error(`EasyData extract has no ${s.code}`);
    if (!s.name.test(series.name)) throw new Error(`${s.code}: name "${series.name}" does not match ${s.name} (code mapping error)`);
    const expectedUnit = role.startsWith("pct") ? "percent" : "Billion PKR";
    if (series.unit !== expectedUnit) throw new Error(`${s.code}: unit "${series.unit}", expected "${expectedUnit}"`);
    const u = usableObservations(series);
    if (u.excluded.length) throw new Error(`${s.code}: ${u.excluded.length} observations with a value but a non-Normal status (not expected in this dataset)`);
    values[role] = u.values;
  }
  const quarters = [...values.grossPublic.keys()].sort();
  const ratioDates = [...values.pctGrossPublic.keys()].sort();

  const failures: string[] = [];
  let identityA = 0, identityB = 0, ratioChecks = 0;
  for (const d of quarters) {
    const g = (r: Role) => {
      const v = values[r].get(d);
      if (v === undefined) throw new Error(`${SERIES[r].code}: no observation for ${d} (every stock series must cover every quarter)`);
      return v;
    };
    for (const r of STOCKS) if (!(g(r) > 0 && g(r) < 1_000_000)) failures.push(`${d} ${r}: ${g(r)} outside 0-1,000,000 billion PKR`);
    if (Math.abs(g("domestic") + g("external") + g("imf") - g("grossPublic")) > 0.151) failures.push(`${d}: domestic + external + IMF = ${r2(g("domestic") + g("external") + g("imf"))} but gross public debt = ${g("grossPublic")}`);
    else identityA++;
    if (Math.abs(g("grossPublic") - g("govDeposits") - g("frdla")) > 0.101) failures.push(`${d}: gross public debt - deposits = ${r2(g("grossPublic") - g("govDeposits"))} but FRDLA debt = ${g("frdla")}`);
    else identityB++;
  }
  for (const d of ratioDates) {
    const gdp = values.gdp.get(d);
    if (!d.endsWith("-06-30")) failures.push(`${d}: a debt-to-GDP ratio outside a fiscal year end`);
    if (gdp === undefined) {
      failures.push(`${d}: a ratio without GDP`);
      continue;
    }
    for (const [pct, stock] of [["pctGrossPublic", "grossPublic"], ["pctFrdla", "frdla"], ["pctDomestic", "domestic"], ["pctTotalExternal", "totalExternal"], ["pctTotalDebtLiabilities", "totalDebtLiabilities"]] as [Role, Role][]) {
      const published = values[pct].get(d);
      const stockV = values[stock].get(d);
      if (published === undefined || stockV === undefined) {
        failures.push(`${d}: ${pct} or ${stock} missing`);
        continue;
      }
      ratioChecks++;
      if (Math.abs(stockV / gdp * 100 - published) > 0.06) failures.push(`${d} ${pct}: published ${published} vs ${stock}/GDP ${r2(stockV / gdp * 100)}`);
    }
  }
  if (failures.length) throw new Error(`government debt validation failed:\n  ${failures.join("\n  ")}`);

  // ---- SBP Summary.pdf (independent publication)
  const summary = parseSummaryPdf(await pdfText(src.read("sbp/Summary.pdf")));
  const sumChecks: string[] = [];
  let sumCompared = 0;
  summary.quarters.forEach((d, i) => {
    for (const [row, role] of [["domestic", "domestic"], ["external", "external"], ["imf", "imf"], ["grossPublic", "grossPublic"], ["frdla", "frdla"], ["totalExternal", "totalExternal"]] as const) {
      const e = values[role].get(d);
      sumCompared++;
      if (e === undefined || Math.abs(r1(e) - summary.rows[row][i]) > 0.051) sumChecks.push(`${d} ${row}: Summary.pdf ${summary.rows[row][i]} vs EasyData ${e ?? "missing"}`);
    }
    const dep = values.govDeposits.get(d);
    sumCompared++;
    if (dep === undefined || Math.round(dep) !== summary.rows.govDeposits[i]) sumChecks.push(`${d} deposits: Summary.pdf ${summary.rows.govDeposits[i]} vs EasyData ${dep ?? "missing"}`);
  });
  const fyEnd = `20${summary.fiscalYear.slice(2)}-06-30`;
  for (const [k, role] of [["grossPublic", "pctGrossPublic"], ["frdla", "pctFrdla"], ["domestic", "pctDomestic"], ["totalExternal", "pctTotalExternal"], ["totalDebtLiabilities", "pctTotalDebtLiabilities"]] as const) {
    const e = values[role].get(fyEnd);
    sumCompared++;
    if (e === undefined || Math.abs(r1(e) - summary.ratios[k]) > 0.051) sumChecks.push(`${summary.fiscalYear} ${k} % of GDP: Summary.pdf ${summary.ratios[k]} vs EasyData ${e ?? "missing"}`);
  }
  if (sumChecks.length) throw new Error(`SBP Summary.pdf disagrees with EasyData:\n  ${sumChecks.join("\n  ")}`);
  const flags = summary.quarters.map((d, i) => [d, summary.flags[i]] as const);

  // ---- Ministry of Finance (kept separate)
  const mof: MofYear[] = parseMofDebtReview(await pdfText(src.read("mof/Annual_Debt_Review_FY26.pdf")));

  // ---- Rows
  const quarterlyRows = quarters.map((d) => [d, ...STOCKS.map((r) => values[r].get(d)!)] as const);
  const ratioRows = ratioDates.map((d) => [d, ...RATIOS.map((r) => values[r].get(d)!)] as const);
  const mofRows = mof.map((m) => [m.date, m.totalPublic, m.domestic, m.external, m.totalPct, m.domesticPct, m.externalPct, m.frdla, m.frdlaPct] as const);
  const digest = sha256(JSON.stringify([quarterlyRows, ratioRows, flags, mofRows]));

  // ---- Report
  const R: string[] = [];
  const retrieved = [...new Set(src.manifest.map((f) => f.retrievedOn))].join(", ");
  R.push(`# Pakistan government debt: data validation report`, ``, `GENERATED by \`scripts/buildGovernmentDebt.ts\` from \`${DEFAULT_SOURCES}/\` (retrieved ${retrieved}). Do not edit by hand.`, ``);
  R.push(`## 1. Sources and fingerprints`, ``, `| File | Institution | SHA-256 |`, `|---|---|---|`);
  for (const f of src.manifest) R.push(`| \`${f.path}\` | ${f.institution} | \`${f.sha256.slice(0, 16)}…\` |`);
  R.push(``, `## 2. Coverage`, ``);
  const expectedQuarters: string[] = [];
  for (let y = Number(quarters[0].slice(0, 4)); y <= Number(quarters[quarters.length - 1].slice(0, 4)); y++) for (const md of ["03-31", "06-30", "09-30", "12-31"]) { const x = `${y}-${md}`; if (x >= quarters[0] && x <= quarters[quarters.length - 1]) expectedQuarters.push(x); }
  const absent = expectedQuarters.filter((x) => !quarters.includes(x));
  R.push(`- SBP quarterly stocks (${STOCKS.length} series, billion PKR): ${quarters.length} quarter-ends, ${quarters[0]} to ${quarters[quarters.length - 1]}; every series covers the same dates. Quarters SBP does not publish in this dataset: ${absent.length ? absent.join(", ") : "none"} (the series has June 2009, then quarterly data from June 2010). They are absent, not filled.`);
  R.push(`- SBP debt-to-GDP ratios and GDP: ${ratioDates.length} fiscal-year ends (${ratioDates[0]} to ${ratioDates[ratioDates.length - 1]}). SBP publishes no quarterly ratio: the other ${quarters.length - ratioDates.length} quarters are blank in EasyData and are not computed here (annual GDP cannot be used for a quarter).`);
  R.push(`- Ministry of Finance Annual Debt Review FY-26: ${mof.length} fiscal-year ends (${mof.map((m) => m.date).join(", ")}).`);
  R.push(``, `## 3. Accounting identities (SBP)`, ``);
  R.push(`- Gross public debt = gross government domestic debt + government external debt + debt from the IMF: holds in ${identityA} of ${quarters.length} quarters (tolerance 0.15 billion: older quarters are stored to one decimal, so a sum of three rounded values can differ by up to 0.15).`);
  R.push(`- Total debt of the government (FRDLA) = gross public debt - government deposits with the banking system: holds in ${identityB} of ${quarters.length} quarters.`);
  R.push(`- Each published ratio = the stock / GDP x 100: ${ratioChecks} published ratios checked, all within 0.06 percentage points.`);
  R.push(``, `## 4. Independent check: SBP's own summary table (Summary.pdf)`, ``);
  R.push(`${sumCompared} values compared (quarters ${summary.quarters.join(", ")}; ${summary.fiscalYear} ratios): all agree with EasyData at the PDF's precision. Revision flags printed by SBP: ${flags.map(([d, f]) => `${d} ${f || "-"}`).join(", ")} (P provisional, R revised). EasyData carries no flags, so the page shows SBP's.`);
  R.push(``, `## 5. Ministry of Finance against SBP (reported, not reconciled)`, ``, `| Fiscal year end | Measure | MoF | SBP | Difference |`, `|---|---|---|---|---|`);
  for (const m of mof) {
    const s = (r: Role) => values[r].get(m.date);
    const row = (label: string, a: number, b: number | undefined, unit: string) => R.push(`| ${m.date} | ${label} | ${a.toLocaleString("en-US")}${unit} | ${b === undefined ? "—" : `${r2(b).toLocaleString("en-US")}${unit}`} | ${b === undefined ? "—" : `${r2(a - b).toLocaleString("en-US")}${unit === "%" ? " pp" : unit}`} |`);
    row("Total public debt (MoF) vs gross public debt (SBP)", m.totalPublic, s("grossPublic"), " bn");
    row("Domestic", m.domestic, s("domestic"), " bn");
    row("External incl. IMF (MoF) vs external + IMF (SBP)", m.external, (s("external") ?? NaN) + (s("imf") ?? NaN), " bn");
    row("FRDLA total debt of the government", m.frdla, s("frdla"), " bn");
    row("Public debt % of GDP", m.totalPct, s("pctGrossPublic"), "%");
    row("FRDLA % of GDP", m.frdlaPct, s("pctFrdla"), "%");
  }
  R.push(``, `The MoF counts IMF debt inside external debt; SBP lists it separately. Stocks agree to within about 0.1%. The ratios differ more because the MoF divides by a different estimate of nominal GDP (its implied FY26 GDP is about ${Math.round(mof[2].totalPublic / mof[2].totalPct * 100).toLocaleString("en-US")} bn against SBP's ${values.gdp.get(mof[2].date)?.toLocaleString("en-US")} bn, "as per revised GDP(MP) released by PBS"). Both are shown on the page, labelled; neither is adjusted to the other. The June 2026 stocks differ by about 47-51 bn (0.06%) in domestic and FRDLA debt; SBP marks June 2026 as revised (R), which is consistent with the review having been prepared on an earlier vintage, but that is not stated by either source.`);
  R.push(``, `## 6. Not included`, ``);
  R.push(`- Government-guaranteed debt of public sector enterprises is in SBP's series (PSE domestic and external debt) but is not government debt and is not shown as such; it is listed only within "total debt and liabilities".`);
  R.push(`- Debt servicing and interest payments: the MoF review reports external debt servicing in US dollars for three years only, and federal interest payments sit in the fiscal-operations tables (a different dataset). Not included in this release.`);
  R.push(`- Monthly composition of domestic debt by instrument (SBP dataset TS_GP_BAM_GOVTDDL_M, 50 series) exists and is a candidate for a later release.`);
  R.push(`- Before June 2009: not in this SBP dataset.`);
  R.push(``);

  const header = [
    `// GENERATED by scripts/buildGovernmentDebt.ts from the official files in ${DEFAULT_SOURCES}/. Do not edit by hand: re-run the build.`,
    `//`,
    `// Pakistan government debt. Billion PKR unless stated; ratios in percent of GDP. A missing figure is absent, never zero.`,
    `//`,
    `// SBP_DEBT_QUARTERLY  [quarter-end, ${STOCKS.join(", ")}]          SBP EasyData ${DATASET} (Pakistan's Debt and Liabilities Summary)`,
    `//   domestic       I.  Gross government domestic debt (federal and provincial; LTZC PIBs at nominal value from June 2025)`,
    `//   external       II. Government external debt (excluding IMF)`,
    `//   imf            III. Debt from the IMF`,
    `//   grossPublic    A. Gross public debt = I + II + III`,
    `//   frdla          B. Total debt of the government, FRDLA 2005 (amended 2017) = gross public debt - government deposits with the banking system`,
    `//   govDeposits    accumulated deposits of the federal and provincial governments with the banking system`,
    `//   totalExternal  C. Total external debt and liabilities of the country (government, IMF, PSEs, banks, private sector, intercompany): NOT government debt`,
    `//   totalDebtLiabilities  total debt and liabilities of the economy (sum I-IX less consolidation): NOT government debt`,
    `// SBP_DEBT_RATIOS     [fiscal-year end, ${RATIOS.join(", ")}]   published by SBP for June ends only; gdp = nominal GDP at market prices, billion PKR`,
    `// SBP_SUMMARY_FLAGS   [quarter-end, P | R | ""]   from SBP Summary.pdf (P provisional, R revised) for the quarters it prints`,
    `// MOF_DEBT_REVIEW     [June end, totalPublic, domestic, external (incl. IMF), total %GDP, domestic %GDP, external %GDP, frdla, frdla %GDP]`,
    `//                     Ministry of Finance Annual Debt Review FY-26: a separate series (different GDP vintage), never mixed with SBP's`,
    `//`,
    `// Integrity: rowsSha256 is the SHA-256 of the stored rows; a test recomputes it and rebuilds this file from the sources.`,
    ``,
  ].join("\n");
  const rows = (name: string, type: string, data: readonly unknown[]) => `export const ${name}: readonly ${type}[] = [\n${data.map((r) => "  " + JSON.stringify(r)).join(",\n")},\n];\n`;
  const data =
    header +
    `export const GOVERNMENT_DEBT_PROVENANCE = {\n  sources: ${JSON.stringify([ref(`easydata/${DATASET}.csv`), ref("sbp/Summary.pdf"), ref("mof/Annual_Debt_Review_FY26.pdf")], null, 2).replace(/\n/g, "\n  ")},\n  rowsSha256: ${JSON.stringify(digest)},\n} as const;\n\n` +
    `export type DebtQuarterRow = readonly [date: string, domestic: number, external: number, imf: number, grossPublic: number, frdla: number, govDeposits: number, totalExternal: number, totalDebtLiabilities: number];\n` +
    `export type DebtRatioRow = readonly [date: string, grossPublicPct: number, frdlaPct: number, domesticPct: number, totalExternalPct: number, totalDebtLiabilitiesPct: number, gdp: number];\n` +
    `export type DebtFlagRow = readonly [date: string, flag: "P" | "R" | ""];\n` +
    `export type MofDebtRow = readonly [date: string, totalPublic: number, domestic: number, external: number, totalPct: number, domesticPct: number, externalPct: number, frdla: number, frdlaPct: number];\n\n` +
    rows("SBP_DEBT_QUARTERLY", "DebtQuarterRow", quarterlyRows) + "\n" +
    rows("SBP_DEBT_RATIOS", "DebtRatioRow", ratioRows) + "\n" +
    rows("SBP_SUMMARY_FLAGS", "DebtFlagRow", flags) + "\n" +
    rows("MOF_DEBT_REVIEW", "MofDebtRow", mofRows);

  return {
    files: { [DATA_PATH]: data, [REPORT_PATH]: R.join("\n") + "\n" },
    summary: [
      `SBP quarterly: ${quarters.length} quarters ${quarters[0]}..${quarters[quarters.length - 1]}; ratios: ${ratioDates.length} June ends`,
      `identities: A ${identityA}/${quarters.length}, FRDLA ${identityB}/${quarters.length}, ratios ${ratioChecks}`,
      `Summary.pdf: ${sumCompared} values agree; flags ${flags.map(([, f]) => f || "-").join("")}`,
      `MoF: ${mof.length} June ends`,
    ],
  };
}

function main(argv: string[]): Promise<number> {
  const check = argv.includes("--check");
  return buildGovernmentDebt(loadSources(DEFAULT_SOURCES)).then(({ files, summary }) => {
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
