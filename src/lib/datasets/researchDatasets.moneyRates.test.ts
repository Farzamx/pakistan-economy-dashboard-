// Money Supply and Interest Rates research dataset: the published files are exactly the validated deliverables, they agree with one another and with the metadata
// shown on the page, only the intended files are exposed, and the dataset stays separate from the live catalogue and from the 30-year dataset.

import { describe, expect, it } from "vitest";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as XLSX from "xlsx";
import ResearchDatasetsSection from "@/components/datasets/ResearchDatasets";
import { requiresLogin } from "@/lib/accessPolicy";
import { DATASETS, getDataset } from "./datasetRegistry";
import { PAKISTAN_30_YEAR, PAKISTAN_M2_INTEREST_RATES as D, RESEARCH_DATASETS, researchFileHref } from "./researchDatasets";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const DIR = path.join(ROOT, "public", "research-datasets", D.directory);
const file = (kind: string, name?: string) => D.files.find((f) => f.kind === kind && (!name || f.filename === name))!;
const read = (f: { filename: string }) => fs.readFileSync(path.join(DIR, f.filename));
const text = (f: { filename: string }) => read(f).toString("utf-8");
const parseCsv = (t: string) => t.trimEnd().split(/\r?\n/).map((l) => l.split(","));

const combined = parseCsv(text(file("csv")));
const HEADER = combined[0];
const BODY = combined.slice(1);
const VARS = HEADER.slice(2);
const col = (v: string) => BODY.map((r) => r[HEADER.indexOf(v)]);
const individual = D.files.filter((f) => f.kind === "csv-variable");

describe("the published files are exactly the validated deliverables", () => {
  it("the directory holds the eight intended files and nothing else (no scripts, no reports, no raw downloads)", () => {
    expect(fs.readdirSync(DIR).sort()).toEqual(D.files.map((f) => f.filename).sort());
    expect(D.files).toHaveLength(8);
    for (const name of fs.readdirSync(DIR)) {
      expect(name, name).toMatch(/^Pakistan_[A-Za-z0-9_]+_v1\.(xlsx|csv|pdf|sps)$/);
      expect(name, name).not.toMatch(/Validation|Coverage_and|results|Build|audit|raw|provenance|change_log|\.md$|\.py$|\.mjs$|\.json$/i);
    }
  });
  it("every file has the recorded size and SHA-256: not a byte has changed since validation", () => {
    for (const f of D.files) {
      const buf = read(f);
      expect(buf.length, `${f.filename} size`).toBe(f.bytes);
      expect(crypto.createHash("sha256").update(buf).digest("hex"), `${f.filename} sha256`).toBe(f.sha256);
    }
  });
  it("is published byte-for-byte: the CSV and SPSS files keep their CRLF line endings (.gitattributes -text)", () => {
    expect(fs.readFileSync(path.join(ROOT, ".gitattributes"), "utf-8")).toMatch(/^public\/research-datasets\/\*\* -text$/m);
    expect(text(file("csv"))).toContain("\r\n");
    expect(text(file("sps"))).toContain("\r\n");
  });
  it("does not touch the 30-year dataset: its directory, files and hashes are as before", () => {
    const dir30 = path.join(ROOT, "public", "research-datasets", PAKISTAN_30_YEAR.directory);
    expect(fs.readdirSync(dir30).sort()).toEqual(PAKISTAN_30_YEAR.files.map((f) => f.filename).sort());
    for (const f of PAKISTAN_30_YEAR.files) expect(crypto.createHash("sha256").update(fs.readFileSync(path.join(dir30, f.filename))).digest("hex")).toBe(f.sha256);
  });
});

describe("the combined CSV holds 30 annual observations of four variables", () => {
  it("one row per fiscal year, 1996 to 2025, labelled FY1995-96 to FY2024-25; no 2026", () => {
    expect(HEADER).toEqual(["year", "fiscal_year", "m2_growth_pct", "sbp_policy_rate_pct", "cpi_inflation_pct", "real_policy_rate_pct"]);
    expect(BODY.map((r) => Number(r[0]))).toEqual(Array.from({ length: 30 }, (_, i) => 1996 + i));
    expect(BODY[0][1]).toBe("FY1995-96");
    expect(BODY[29][1]).toBe("FY2024-25");
    expect(BODY.every((r) => r.length === HEADER.length)).toBe(true);
  });
  it("variable names are SPSS-safe and unique", () => {
    for (const v of VARS) expect(v).toMatch(/^[A-Za-z][A-Za-z0-9_]{0,63}$/);
    expect(new Set(VARS).size).toBe(VARS.length);
  });
  it("numbers have at most two decimals and no scientific notation; the only blank cell is FY2019-20 M2 growth", () => {
    for (const r of BODY) for (const c of r.slice(2)) if (c !== "") expect(c).toMatch(/^-?\d+(\.\d{1,2})?$/);
    const blanks = BODY.flatMap((r) => r.slice(2).map((c, j) => (c === "" ? `${r[1]}:${VARS[j]}` : null))).filter(Boolean);
    expect(blanks).toEqual(["FY2019-20:m2_growth_pct"]);
  });
  it("real_policy_rate_pct is exactly sbp_policy_rate_pct minus cpi_inflation_pct, in every year", () => {
    const [p, c, r] = [col("sbp_policy_rate_pct"), col("cpi_inflation_pct"), col("real_policy_rate_pct")];
    for (let i = 0; i < 30; i++) expect(Math.abs(Number(p[i]) - Number(c[i]) - Number(r[i])), BODY[i][1]).toBeLessThan(0.0051);
  });
  it("spot values agree with the official figures: FY2024-25 CPI 4.49 (PBS), FY2008-09 CPI 17.03, FY1995-96 M2 growth 13.82, FY2024-25 M2 growth 12.89, FY2024-25 policy rate 14.71", () => {
    const at = (fy: string, v: string) => BODY.find((r) => r[1] === fy)![HEADER.indexOf(v)];
    expect(at("FY2024-25", "cpi_inflation_pct")).toBe("4.49");
    expect(at("FY2008-09", "cpi_inflation_pct")).toBe("17.03");
    expect(at("FY1995-96", "m2_growth_pct")).toBe("13.82");
    expect(at("FY2024-25", "m2_growth_pct")).toBe("12.89");
    expect(at("FY2024-25", "sbp_policy_rate_pct")).toBe("14.71");
  });
  it("each individual CSV is year, fiscal_year and one variable, equal to that column of the combined CSV", () => {
    expect(individual).toHaveLength(4);
    for (const f of individual) {
      const rows = parseCsv(text(f));
      expect(rows[0].slice(0, 2)).toEqual(["year", "fiscal_year"]);
      expect(rows[0]).toHaveLength(3);
      const v = rows[0][2];
      expect(VARS).toContain(v);
      expect(rows.slice(1).map((r) => r.join(","))).toEqual(BODY.map((r) => [r[0], r[1], r[HEADER.indexOf(v)]].join(",")));
    }
    expect(individual.map((f) => parseCsv(text(f))[0][2]).sort()).toEqual([...VARS].sort());
  });
});

describe("the workbook agrees with the CSVs", () => {
  const wb = XLSX.read(read(file("xlsx")), { type: "buffer" });
  const rows = (n: string) => XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[n], { header: 1, defval: null }) as unknown[][];
  it("has a combined sheet, one sheet per variable, and the documentation sheets", () => {
    expect(wb.SheetNames).toEqual(["Read Me", "Combined Dataset", "M2 Growth", "SBP Policy Rate", "CPI Inflation", "Real Interest Rate", "M2 Calculation", "Policy Rate Calculation", "CPI Sources", "Coverage", "Validation", "Data Dictionary", "Sources"]);
  });
  it("the Combined Dataset sheet is the combined CSV, cell for cell, with numbers stored as numbers", () => {
    const m = rows("Combined Dataset");
    expect(m[0]).toEqual(HEADER);
    expect(m).toHaveLength(31);
    for (let r = 0; r < 30; r++)
      for (let c = 2; c < HEADER.length; c++) {
        const v = m[r + 1][c];
        const cv = BODY[r][c];
        if (cv === "") expect(v === null || v === "").toBe(true);
        else expect(typeof v === "number" && Math.abs(v - Number(cv)) < 1e-9, `${BODY[r][1]} ${HEADER[c]}`).toBe(true);
      }
  });
  it("each variable's own sheet equals the individual CSV", () => {
    for (const [sheet, v] of [["M2 Growth", "m2_growth_pct"], ["SBP Policy Rate", "sbp_policy_rate_pct"], ["CPI Inflation", "cpi_inflation_pct"], ["Real Interest Rate", "real_policy_rate_pct"]] as const) {
      const s = rows(sheet);
      expect(s[0].slice(0, 3)).toEqual(["year", "fiscal_year", v]);
      for (let i = 0; i < 30; i++) {
        const cv = BODY[i][HEADER.indexOf(v)];
        if (cv === "") expect(s[i + 1][2]).toBeNull();
        else expect(Math.abs((s[i + 1][2] as number) - Number(cv)), `${sheet} ${BODY[i][1]}`).toBeLessThan(1e-9);
      }
    }
  });
  it("the Coverage sheet states the same observation counts as the page metadata", () => {
    const cov = rows("Coverage");
    expect(cov.slice(1, 5).map((r) => [r[0], r[1]])).toEqual(D.variableCoverage!.map((v) => [v.variable, v.observations]));
    expect(cov[5][1]).toBe(29);
  });
  it("the Validation sheet lists both validation layers and every check passed", () => {
    const v = rows("Validation").slice(1);
    expect(new Set(v.map((r) => r[0]))).toEqual(new Set(["build", "independent"]));
    expect(v.length).toBeGreaterThanOrEqual(46);
    expect(v.filter((r) => r[3] !== "PASS")).toEqual([]);
  });
  it("documents every column in the Data Dictionary and the policy-rate periods add up to each fiscal year's days", () => {
    expect(new Set(rows("Data Dictionary").slice(1).map((r) => String(r[0])))).toEqual(new Set(HEADER));
    const calc = rows("Policy Rate Calculation").slice(1).filter((r) => r[2]);
    for (let y = 1996; y <= 2025; y++) {
      const days = calc.filter((r) => r[0] === y).reduce((n, r) => n + Number(r[4]), 0);
      expect(days, `FY${y}`).toBe(y % 4 === 0 ? 366 : 365);
    }
  });
});

describe("the SPSS syntax reads the combined CSV", () => {
  const sps = text(file("sps"));
  it("references the combined CSV by its published filename", () => {
    expect(/\/FILE="([^"]+)"/.exec(sps)![1].endsWith(file("csv").filename)).toBe(true);
  });
  it("declares every CSV column in order, labels the numeric ones, and keeps lines under SPSS's limit", () => {
    expect([...sps.matchAll(/^ {4}(\w+) (?:F8\.2|F4\.0|A12)\.?\r?$/gm)].map((m) => m[1])).toEqual(HEADER);
    for (const v of VARS) expect(sps).toContain(`  ${v} '`);
    expect(Math.max(...sps.split(/\r?\n/).map((l) => l.length))).toBeLessThan(251);
  });
});

describe("the codebook matches the dataset", () => {
  it("is a PDF that states the title, study period, version and the FY2020 M2 decision, and names every variable", async () => {
    const buf = read(file("pdf"));
    expect(buf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    const { getDocumentProxy, extractText } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(buf));
    const { text: t } = await extractText(pdf, { mergePages: true });
    const flat = t.replace(/\s+/g, " ");
    const squashed = t.replace(/\s+/g, "");
    for (const s of ["Pakistan Money Supply and Interest Rates Dataset (1995-2025)", "FY1995-96 to FY2024-25", "Version 1", "FY2020 is withheld", "29 of 30", "time-weighted", "Reverse Repo", "Policy (Target) Rate"]) expect(flat, s).toContain(s);
    expect(VARS.filter((v) => !squashed.includes(v))).toEqual([]);
  }, 60_000);
});

describe("the metadata on the page is true of the files", () => {
  it("title, coverage, years, frequency, variable count, observation count, version and sources", () => {
    expect(D.title).toBe("Pakistan Money Supply and Interest Rates Dataset (1995–2025)");
    expect(D.coverage).toBe(`${BODY[0][1]} to ${BODY[29][1]}`);
    expect([D.firstYear, D.lastYear]).toEqual([Number(BODY[0][0]), Number(BODY[29][0])]);
    expect(D.variables).toBe(VARS.length);
    expect(D.observations).toBe(BODY.length);
    expect(D.frequencyLabel).toBe("Annual");
    expect(D.availableFrequencies).toEqual(["yearly"]);
    expect(D.version).toBe("Version 1");
    expect(D.sources).toEqual(["State Bank of Pakistan", "Pakistan Bureau of Statistics", "Ministry of Finance"]);
  });
  it("observations per variable, first and last year and blank years are recomputed from the CSV", () => {
    expect(D.variableCoverage!.map((v) => v.variable)).toEqual(VARS);
    for (const v of D.variableCoverage!) {
      const present = BODY.filter((r) => r[HEADER.indexOf(v.variable)] !== "");
      expect(v.observations, v.variable).toBe(present.length);
      expect(v.first).toBe(present[0][1]);
      expect(v.last).toBe(present[present.length - 1][1]);
      expect(v.missing).toEqual(BODY.filter((r) => r[HEADER.indexOf(v.variable)] === "").map((r) => r[1]));
    }
  });
  it("the page's note says 119 of 120 values, 29 complete years and the blank FY2019-20, consistently with the CSV", () => {
    const filled = BODY.reduce((n, r) => n + r.slice(2).filter((c) => c !== "").length, 0);
    expect(filled).toBe(119);
    expect(BODY.filter((r) => r.slice(2).every((c) => c !== "")).length).toBe(29);
    expect(D.notes.join(" ")).toContain("119 of 120");
    expect(D.notes.join(" ")).toContain("29 years have all four variables");
    expect(D.missingDataNote).toContain("M2 growth for FY2019-20 is unavailable");
    expect(D.missingDataNote).toContain("revised its M2 data series");
    expect(D.missingDataNote).toContain("No missing value has been estimated or artificially filled in");
  });
});

describe("the page section", () => {
  const html = renderToStaticMarkup(createElement(ResearchDatasetsSection));
  const card = html.slice(html.indexOf(`data-research-dataset="${D.id}"`));
  const esc = (s: string) => s.replace(/'/g, "&#x27;");
  /** What a reader sees: markup removed, entities decoded, whitespace collapsed. */
  const visibleText = (h: string) => h.replace(/<[^>]+>/g, "").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ");

  it("shows the dataset as its own card with the exact title and a short description", () => {
    expect(card).toContain("Pakistan Money Supply and Interest Rates Dataset (1995–2025)");
    expect(card).toContain("Annual M2 growth, SBP policy rate, CPI inflation and the calculated real interest rate for Pakistan");
    expect(html.indexOf(`data-research-dataset="${PAKISTAN_30_YEAR.id}"`)).toBeLessThan(html.indexOf(`data-research-dataset="${D.id}"`));
  });
  it("shows the simple facts: time period, frequency, number of variables and how many of the possible values are available", () => {
    const facts = card.slice(card.indexOf('aria-label="About the data"'), card.indexOf("</dl>", card.indexOf('aria-label="About the data"')));
    const flat = facts.replace(/<\/(dt|dd)>/g, " ").replace(/<[^>]+>/g, "").replace(/\s+/g, " ");
    for (const s of ["Time period FY1995-96 to FY2024-25", "Frequency Annual", "Variables 4", "Available values 119 out of 120 possible"]) expect(flat, s).toContain(s);
    expect(card).toContain("Annual data · Version 1");
    expect(card).toContain("Sources: <span");
    expect(card).toContain("State Bank of Pakistan, Pakistan Bureau of Statistics, Ministry of Finance");
  });
  it("explains annual data and the financial year in plain words", () => {
    const vt = visibleText(card);
    expect(vt).toContain("One observation per financial year.");
    expect(vt).toContain("runs from 1 July to 30 June and is named after the year it ends");
    expect(vt).toContain("FY2019-20 means July 2019 to June 2020");
    // a financial-year label is never split across two lines
    expect(card).toMatch(/<span class="whitespace-nowrap">FY2019-20<\/span> means July 2019/);
  });
  it("shows how many years each measure has on that measure's own card, true to the CSV", () => {
    for (const v of D.variableCoverage!) {
      const start = card.indexOf(`data-variable-card="${v.variable}"`);
      expect(start, v.variable).toBeGreaterThan(-1);
      const cardHtml = card.slice(start, card.indexOf("</li>", start));
      const txt = visibleText(cardHtml);
      expect(txt, v.variable).toContain(`${v.observations} of 30 years available`);
      if (v.missing.length) expect(txt).toContain(`(missing ${v.missing.join(", ")})`);
      else expect(txt).not.toContain("missing");
    }
  });
  it("states the one missing value in plain language on the card itself, not only inside the collapsible notes, and says nothing was filled in", () => {
    const visible = card.slice(0, card.indexOf("<details"));
    const flat = visibleText(visible);
    expect(flat).toContain("One value is missing.");
    expect(flat).toContain("M2 growth for FY2019-20 is unavailable");
    expect(flat).toContain("State Bank of Pakistan revised its M2 data series");
    expect(flat).toContain("No missing value has been estimated or artificially filled in");
  });
  it("explains the four measures in simple language, as four cards, in order, each with a name, an explanation and an example", () => {
    const order = [...card.matchAll(/data-variable-card="([a-z0-9_]+)"/g)].map((m) => m[1]);
    expect(order).toEqual(["m2_growth_pct", "sbp_policy_rate_pct", "cpi_inflation_pct", "real_policy_rate_pct"]);
    expect(order).toEqual(VARS);
    expect(card).toContain("The four measures");
    for (const v of D.guide!.variables) {
      const start = card.indexOf(`data-variable-card="${v.variable}"`);
      const cardHtml = card.slice(start, card.indexOf("</li>", start));
      expect(cardHtml, v.variable).toContain("<svg"); // the small icon
      expect(cardHtml).toContain('aria-hidden="true"');
      expect(cardHtml).toContain(esc(v.title));
      expect(cardHtml).toContain(esc(v.plain));
      expect(cardHtml).toContain("Example: ");
      expect(cardHtml).toContain(esc(v.example));
      expect(v.plain.split(/(?<=[.!?])\s+/).length, `${v.variable}: one or two sentences`).toBeLessThanOrEqual(2);
    }
  });
  it("uses the agreed beginner wording for each measure (plain words, no unexplained jargon)", () => {
    const g = Object.fromEntries(D.guide!.variables.map((v) => [v.variable, v]));
    expect(g.m2_growth_pct.plain).toContain("How quickly the amount of money in Pakistan's economy is growing or shrinking");
    expect(g.m2_growth_pct.plain).toContain("cash plus the money people and businesses keep in bank accounts");
    expect(g.sbp_policy_rate_pct.plain).toContain("State Bank of Pakistan (SBP)");
    expect(g.sbp_policy_rate_pct.plain).toContain("influence borrowing, lending, spending and inflation");
    expect(g.cpi_inflation_pct.plain).toContain("prices of everyday goods and services are rising");
    expect(g.cpi_inflation_pct.plain).toContain("Consumer Price Index (CPI)");
    expect(g.real_policy_rate_pct.plain).toContain("policy rate minus inflation");
    expect(g.real_policy_rate_pct.title).toBe("Real Interest Rate");
    expect(g.real_policy_rate_pct.plain).toContain("approximate guide"); // the card says it is approximate, in words a beginner reads first
    expect(g.real_policy_rate_pct.example).toContain("12% policy rate with 8% inflation gives a real rate of about 4%");
  });
  it("has a \"What can you learn from this dataset?\" section of research questions, never conclusions", () => {
    expect(card).toContain("What can you learn from this dataset?");
    const g = D.guide!;
    expect(g.questions).toHaveLength(4);
    for (const q of g.questions) {
      expect(card).toContain(esc(q));
      expect(q.endsWith("?"), q).toBe(true); // a question, not a finding
      expect(q, q).not.toMatch(/\b(causes?|caused|proves?|proven|leads? to|results? in|because of|due to)\b/i);
    }
    expect(g.learnIntro).toContain("does not prove that one thing causes another");
    expect(g.learnIntro).toContain("questions the data can help you investigate");
    // the topics the owner asked for
    const all = g.questions.join(" ");
    for (const s of ["money supply", "inflation", "interest rates", "monetary policy"]) expect(all.toLowerCase(), s).toContain(s);
    expect(all).toContain("associated with higher inflation");
  });
  it("keeps the technical coverage details out of the main view: they sit in a collapsed \"Data coverage and technical notes\"", () => {
    const visible = card.slice(0, card.indexOf("<details"));
    const details = card.slice(card.indexOf("<details"));
    expect(details.slice(0, 40)).not.toContain(" open");
    expect(details).toContain("Data coverage and technical notes");
    expect(details).toContain("3 of 4 variables have a value for every year; 119 of 120 variable-years are available.");
    expect(visible).not.toContain("3 of 4 variables");
    expect(visible).not.toContain("variable-years");
  });
  it("is a guided card, the compact Version 2 card is not, and the download section can be reached from the top", () => {
    expect(card.slice(0, 400)).toContain("data-guided-card");
    expect(html.slice(html.indexOf(`data-research-dataset="${PAKISTAN_30_YEAR.id}"`), html.indexOf(`data-research-dataset="${D.id}"`))).not.toContain("data-guided-card");
    expect(card).toContain(`href="#${D.id}-downloads"`);
    expect(card).toContain(`id="${D.id}-downloads"`);
    expect(card.indexOf(`href="#${D.id}-downloads"`)).toBeLessThan(card.indexOf(`id="${D.id}-downloads"`));
  });
  it("offers all eight downloads, each a download link to its own file: Excel, combined CSV, codebook, SPSS syntax and four individual CSVs", () => {
    for (const f of D.files) {
      expect(card).toContain(`href="${researchFileHref(D, f)}"`);
      expect(card).toContain(`download="${f.filename}"`);
    }
    const end = html.length;
    expect((card.slice(0, end).match(/data-research-file=/g) ?? []).length).toBe(8);
    expect(card).toContain("Individual variable downloads");
    expect((card.match(/data-research-file="csv-variable"/g) ?? []).length).toBe(4);
  });
  it("labels every download with its file format, exactly as agreed", () => {
    const labels: Record<string, string> = {
      "Pakistan_M2_Interest_Rates_Dataset_v1.xlsx": "Download Excel Workbook (.xlsx)",
      "Pakistan_M2_Interest_Rates_Combined_v1.csv": "Download Combined Dataset (.csv)",
      "Pakistan_M2_Interest_Rates_Codebook_v1.pdf": "Download Codebook &amp; Methodology (.pdf)",
      "Pakistan_M2_Interest_Rates_Import_v1.sps": "Download SPSS Syntax (.sps)",
      "Pakistan_M2_Growth_v1.csv": "M2 Growth — CSV",
      "Pakistan_SBP_Policy_Rate_v1.csv": "SBP Policy Rate — CSV",
      "Pakistan_CPI_Inflation_v1.csv": "CPI Inflation — CSV",
      "Pakistan_Real_Policy_Rate_v1.csv": "Real Policy Rate — CSV",
    };
    expect(Object.keys(labels).sort()).toEqual(D.files.map((f) => f.filename).sort());
    for (const [filename, label] of Object.entries(labels)) {
      const a = card.slice(card.indexOf(`download="${filename}"`));
      const anchor = a.slice(0, a.indexOf("</a>"));
      expect(anchor, filename).toContain(`>${label}<span class="sr-only">`); // the visible text of that very link
    }
    // two headed groups: the four main downloads, then the four single-variable CSVs
    const main = card.slice(card.indexOf('data-research-group="main"'), card.indexOf('data-research-group="individual"'));
    expect((main.match(/data-research-file=/g) ?? []).length).toBe(4);
    expect(card.slice(card.indexOf('data-research-group="individual"'), card.indexOf("<details")).match(/data-research-file="csv-variable"/g)).toHaveLength(4);
    expect(card).toContain("Main downloads");
    // no format selector: every file is the only format offered for what it is
    expect(card).not.toMatch(/<select|role="radiogroup"|aria-pressed/);
  });
  it("the displayed format is the file's real format: label, link extension and the file's own signature all agree", () => {
    const fmt = (f: { filename: string }) => f.filename.split(".").pop()!;
    for (const f of D.files) {
      const buf = read(f);
      const ext = fmt(f);
      if (ext === "xlsx") expect(buf.subarray(0, 4).toString("latin1"), f.filename).toBe("PK\x03\x04");
      if (ext === "pdf") expect(buf.subarray(0, 5).toString("latin1"), f.filename).toBe("%PDF-");
      if (ext === "csv") expect(buf.includes(0) || buf.subarray(0, 2).toString("latin1") === "PK", f.filename).toBe(false);
      if (ext === "sps") expect(buf.toString("utf-8"), f.filename).toContain("GET DATA");
      const shown = f.kind === "csv-variable" ? "CSV" : `(.${ext})`;
      const html = renderToStaticMarkup(createElement(ResearchDatasetsSection));
      const a = html.slice(html.indexOf(`download="${f.filename}"`));
      expect(a.slice(0, a.indexOf("</a>")), f.filename).toContain(shown);
      expect(a.slice(0, 200)).toContain(`.${ext}"`); // the href and download attribute end in the same extension
    }
  });
  it("keeps the methodology and missing-data notes in the collapsible \"Data coverage and technical notes\", with coverage by variable", () => {
    const details = card.slice(card.indexOf("<details"));
    expect(details).toContain("Data coverage and technical notes");
    expect(details).toContain("Coverage by variable");
    for (const n of D.notes) expect(details).toContain(esc(n.slice(0, 40)));
    expect(details).toContain("blank: FY2019-20");
  });
  it("has no frequency selector and no quarterly or monthly download", () => {
    expect(card).not.toContain("Select data frequency");
    expect(card).not.toMatch(/href="[^"]*(frequency=|quarterly|monthly)/i);
    expect(card).toContain("Nothing is converted to a quarterly or monthly frequency");
  });
});

describe("kept separate from the live catalogue and its frequency filters", () => {
  it("is not in the live catalogue", () => {
    expect(getDataset(D.id)).toBeUndefined();
    expect(DATASETS.map((d) => d.id)).not.toContain(D.id);
    expect(RESEARCH_DATASETS).toContain(D);
  });
});

describe("access: the files are as protected as the page", () => {
  it("every file needs a signed-in visitor, exactly like /download-datasets itself (default-deny proxy)", () => {
    expect(requiresLogin("/download-datasets")).toBe(true);
    for (const f of D.files) expect(requiresLogin(researchFileHref(D, f)), f.filename).toBe(true);
    expect(requiresLogin(`/research-datasets/${D.directory}/anything.csv`)).toBe(true);
    expect(requiresLogin(`/research-datasets/${D.directory}/`)).toBe(true);
  });
});

describe("nothing private is in the published files", () => {
  it("no local path, person, e-mail, credential word or internal tooling appears in any file", async () => {
    const wb = XLSX.read(read(file("xlsx")), { type: "buffer" });
    const cells = wb.SheetNames.flatMap((n) => (XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[n], { header: 1 }) as unknown[][]).flat().map(String));
    const { getDocumentProxy, extractText } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(read(file("pdf"))));
    const { text: pdfText } = await extractText(pdf, { mergePages: true });
    const blobs = [...D.files.filter((f) => /\.(csv|sps)$/.test(f.filename)).map(text), cells.join("\n"), pdfText];
    const pattern = /C:\\+ECONOMY|C:\\+Users|farza|@gmail|ECONOMY DASHBOARD|\.env\b|api[_-]?key|secret|password|supabase|\.venv|scripts[\\/]|m2r_|\.py\b/i;
    for (const b of blobs) expect(pattern.exec(b)?.[0]).toBeUndefined();
  }, 60_000);
});

describe("annual frequency: every published file holds annual fiscal-year observations only", () => {
  const MONTH_OR_DATE = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[-\s/]?\d{2,4}\b|\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/i;
  const csvs = D.files.filter((f) => f.filename.endsWith(".csv"));

  it("all five CSVs have exactly 30 rows, one per fiscal year FY1995-96 to FY2024-25, with no duplicate, gap or 2026 year", () => {
    expect(csvs).toHaveLength(5);
    for (const f of csvs) {
      const rows = parseCsv(text(f));
      expect(rows.length - 1, f.filename).toBe(30);
      expect(rows.slice(1).map((r) => Number(r[0])), f.filename).toEqual(Array.from({ length: 30 }, (_, i) => 1996 + i));
      expect(rows.slice(1).map((r) => r[1]), f.filename).toEqual(Array.from({ length: 30 }, (_, i) => `FY${1995 + i}-${String((1996 + i) % 100).padStart(2, "0")}`));
      expect(text(f), f.filename).not.toMatch(/2026|FY2025-26/);
    }
  });
  it("no CSV has a date, month, quarter or week column, and no cell holds a date or month", () => {
    for (const f of csvs) {
      const rows = parseCsv(text(f));
      expect(rows[0].slice(0, 2)).toEqual(["year", "fiscal_year"]);
      for (const h of rows[0]) expect(h, f.filename).not.toMatch(/month|quarter|date|week|day/i);
      for (const r of rows) for (const c of r) expect(c, `${f.filename}: ${c}`).not.toMatch(MONTH_OR_DATE);
    }
  });
  it("observation counts: M2 growth 29, policy rate 30, CPI 30, real rate 30; combined 119 values (FY2019-20 M2 growth the only blank)", () => {
    const n = (name: string) => parseCsv(text(D.files.find((f) => f.filename === name)!)).slice(1).filter((r) => r[2] !== "").length;
    expect([n("Pakistan_M2_Growth_v1.csv"), n("Pakistan_SBP_Policy_Rate_v1.csv"), n("Pakistan_CPI_Inflation_v1.csv"), n("Pakistan_Real_Policy_Rate_v1.csv")]).toEqual([29, 30, 30, 30]);
    expect(BODY.reduce((a, r) => a + r.slice(2).filter((c) => c !== "").length, 0)).toBe(119);
  });
  it("the workbook's combined and four variable sheets are annual: 30 rows, FY1995-96 to FY2024-25, no dates, no duplicates", () => {
    const wb = XLSX.read(read(file("xlsx")), { type: "buffer", cellDates: true });
    for (const sheet of ["Combined Dataset", "M2 Growth", "SBP Policy Rate", "CPI Inflation", "Real Interest Rate"]) {
      const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheet], { header: 1, defval: null }) as unknown[][];
      expect(rows.length - 1, sheet).toBe(30);
      expect(rows.slice(1).map((r) => r[0]), sheet).toEqual(Array.from({ length: 30 }, (_, i) => 1996 + i));
      expect(rows.flat().some((c) => c instanceof Date), sheet).toBe(false);
      // Data columns hold no date or month. The optional free-text "note" column may name a date in prose (e.g. "the June 1995 stock"), and nowhere else may.
      const noteCol = rows[0].indexOf("note");
      for (const r of rows) r.forEach((c, j) => { if (j !== noteCol && typeof c === "string") expect(c, `${sheet}: ${c}`).not.toMatch(MONTH_OR_DATE); });
      expect(rows[0].filter((h) => h !== "note").every((h) => /^(year|fiscal_year|m2_growth_pct|sbp_policy_rate_pct|cpi_inflation_pct|real_policy_rate_pct)$/.test(String(h))), sheet).toBe(true);
    }
  });
  it("the policy-rate sheet is one weighted average per fiscal year: the calculation worksheet lists rate-effective periods (SBP effective dates) and exactly one fiscal-year average row per year", () => {
    const wb = XLSX.read(read(file("xlsx")), { type: "buffer" });
    const rows = (XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets["Policy Rate Calculation"], { header: 1, defval: null }) as unknown[][]).slice(1);
    const avg = rows.filter((r) => typeof r[6] === "string" && (r[6] as string).startsWith("FISCAL-YEAR AVERAGE"));
    expect(avg.map((r) => r[0])).toEqual(Array.from({ length: 30 }, (_, i) => 1996 + i));
    const pol = col("sbp_policy_rate_pct");
    avg.forEach((r, i) => expect(Math.abs((r[5] as number) - Number(pol[i])), `FY${r[0]}`).toBeLessThan(0.0051));
    // every period begins on 1 July or on a date SBP changed the rate: never on a monthly boundary chosen for convenience
    const starts = rows.filter((r) => r[2]).map((r) => String(r[2]));
    expect(starts.every((s) => /^\d{4}-\d{2}-\d{2}$/.test(s))).toBe(true);
    expect(starts.filter((s) => s.endsWith("-07-01"))).toHaveLength(30);
  });
  it("the codebook says the data are annual, and its only dates are the worked-example rate periods", async () => {
    const { getDocumentProxy, extractText } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(read(file("pdf"))));
    const { text: t } = await extractText(pdf, { mergePages: true });
    expect(t.replace(/\s+/g, " ")).toContain("30 annual observations");
    const iso = t.match(/(?<![\w-])\d{4}-\d{2}-\d{2}(?![\w-])/g) ?? [];
    expect(iso).toHaveLength(14);
    expect([iso.slice().sort()[0], iso.slice().sort()[13]]).toEqual(["2024-07-01", "2025-06-30"]);
  }, 60_000);
});
