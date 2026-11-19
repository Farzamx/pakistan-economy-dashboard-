// Research Datasets: the published files are exactly the validated deliverables, they agree with one another and with the metadata shown on the page,
// nothing but the intended files is exposed, and the dataset stays separate from the live, frequency-filtered catalogue.

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
import { offeredFrequencies, countByFrequency } from "./datasetFrequency";
import { PAKISTAN_30_YEAR as D, RESEARCH_DATASETS, formatFileSize, researchFileHref } from "./researchDatasets";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const DIR = path.join(ROOT, "public", "research-datasets", D.directory);
const file = (kind: string) => D.files.find((f) => f.kind === kind)!;
const read = (kind: string) => fs.readFileSync(path.join(DIR, file(kind).filename));
const text = (kind: string) => read(kind).toString("utf-8");

const parseCsv = (t: string) => t.trimEnd().split(/\r?\n/).map((l) => l.split(","));
const csv = parseCsv(text("csv"));
const HEADER = csv[0];
const BODY = csv.slice(1);
const VARIABLES = HEADER.slice(2);
const derived = parseCsv(text("csv-derived"));

describe("the published files are exactly the validated deliverables", () => {
  it("the directory holds the five intended files and nothing else (no scripts, no raw downloads)", () => {
    const onDisk = fs.readdirSync(DIR).sort();
    expect(onDisk).toEqual(D.files.map((f) => f.filename).sort());
    expect(fs.readdirSync(path.join(ROOT, "public", "research-datasets"))).toEqual([D.directory]);
    for (const name of onDisk) expect(name, name).toMatch(/^Pakistan_Macroeconomic_Data_[A-Za-z0-9_]+\.(xlsx|csv|pdf|sps)$/);
  });

  it("every file has the recorded size and SHA-256: not a byte has changed since validation", () => {
    for (const f of D.files) {
      const buf = fs.readFileSync(path.join(DIR, f.filename));
      expect(buf.length, `${f.filename} size`).toBe(f.bytes);
      expect(crypto.createHash("sha256").update(buf).digest("hex"), `${f.filename} sha256`).toBe(f.sha256);
    }
  });

  it("git is told to publish the directory byte-for-byte (no line-ending conversion of the CRLF CSV and SPSS files)", () => {
    const attrs = fs.readFileSync(path.join(ROOT, ".gitattributes"), "utf-8");
    expect(attrs).toMatch(/^public\/research-datasets\/\*\* -text$/m);
    expect(text("csv")).toContain("\r\n");
    expect(text("sps")).toContain("\r\n");
  });
});

describe("the CSV holds 30 annual observations", () => {
  it("one row per fiscal year, 1996 to 2025, labelled FY1995-96 to FY2024-25", () => {
    expect(BODY).toHaveLength(30);
    expect(BODY.map((r) => Number(r[0]))).toEqual(Array.from({ length: 30 }, (_, i) => 1996 + i));
    expect(BODY[0][1]).toBe("FY1995-96");
    expect(BODY[29][1]).toBe("FY2024-25");
    expect(new Set(BODY.map((r) => r[0])).size).toBe(30); // no duplicated year
  });
  it("has 64 variables besides year and fiscal_year, with unique SPSS-safe names", () => {
    expect(HEADER.slice(0, 2)).toEqual(["year", "fiscal_year"]);
    expect(VARIABLES).toHaveLength(64);
    expect(new Set(VARIABLES.map((v) => v.toLowerCase())).size).toBe(64);
    for (const v of VARIABLES) expect(v).toMatch(/^[A-Za-z][A-Za-z0-9_]{0,63}$/);
  });
  it("is rectangular, numeric where it has a value, and blank (never zero-filled) where the source has none", () => {
    for (const r of BODY) {
      expect(r).toHaveLength(HEADER.length);
      for (const c of r.slice(2)) if (c !== "") expect(Number.isFinite(Number(c)), c).toBe(true);
    }
    const filled = BODY.reduce((n, r) => n + r.slice(2).filter((c) => c !== "").length, 0);
    expect(filled).toBe(1565); // the figure the codebook states
    expect(filled).toBeLessThan(30 * 64);
  });
  it("has no scientific notation", () => expect(text("csv")).not.toMatch(/\d[eE][+-]?\d/));
  it("the derived CSV has the same 30 years and 22 derived variables", () => {
    expect(derived).toHaveLength(31);
    expect(derived.slice(1).map((r) => r[0])).toEqual(BODY.map((r) => r[0]));
    expect(derived[0].slice(0, 2)).toEqual(["year", "fiscal_year"]);
    expect(derived[0].length - 2).toBe(D.derivedVariables);
  });
});

describe("the workbook agrees with the CSV", () => {
  const wb = XLSX.read(read("xlsx"), { type: "buffer" });
  it("has the expected sheets", () => {
    expect(wb.SheetNames).toEqual(["Master Dataset", "Data Dictionary", "Sources", "Data Quality", "Derived Variables"]);
  });
  const master = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets["Master Dataset"], { header: 1, defval: null }) as unknown[][];
  it("the Master Dataset sheet is the CSV, cell for cell, with numbers stored as numbers", () => {
    expect(master[0]).toEqual(HEADER);
    expect(master).toHaveLength(31);
    let differences = 0;
    for (let r = 0; r < 30; r++) {
      for (let c = 2; c < HEADER.length; c++) {
        const v = master[r + 1][c];
        const cv = BODY[r][c];
        if (cv === "") {
          if (v !== null && v !== "") differences++;
        } else if (typeof v !== "number" || Math.abs(v - Number(cv)) > 0.01 + 1e-6 * Math.abs(Number(cv))) differences++;
      }
    }
    expect(differences).toBe(0);
  });
  it("documents every variable in its Data Dictionary and Sources sheets", () => {
    const names = (sheet: string) => new Set((XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheet], { header: 1 }) as unknown[][]).map((r) => String(r[0])));
    const dictionary = names("Data Dictionary");
    const sources = names("Sources");
    for (const v of VARIABLES) {
      expect(dictionary.has(v), `dictionary: ${v}`).toBe(true);
      expect(sources.has(v), `sources: ${v}`).toBe(true);
    }
  });
  it("the Derived Variables sheet has the derived CSV's header", () => {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets["Derived Variables"], { header: 1 }) as unknown[][];
    expect(rows[0]).toEqual(derived[0]);
  });
});

describe("the SPSS syntax reads this CSV", () => {
  const sps = text("sps");
  it("references the CSV by its published filename, not the derived file", () => {
    const fileLine = /\/FILE="([^"]+)"/.exec(sps)![1];
    expect(fileLine.endsWith(file("csv").filename)).toBe(true);
    expect(fileLine).not.toMatch(/Derived/);
  });
  it("declares every CSV column, in order, and labels and scales them all", () => {
    expect([...sps.matchAll(/^ {4}(\w+) (?:F22\.6|F4\.0|A12)\r?$/gm)].map((m) => m[1])).toEqual(HEADER);
    expect([...sps.matchAll(/^ {2}(\w+) "/gm)].map((m) => m[1])).toEqual(HEADER);
    expect([...sps.matchAll(/^VARIABLE LEVEL (\w+) \(SCALE\)\.\r?$/gm)].map((m) => m[1])).toEqual(HEADER.filter((h) => h !== "fiscal_year"));
  });
  it("keeps every line under SPSS's syntax line limit", () => {
    expect(Math.max(...sps.split(/\r?\n/).map((l) => l.length))).toBeLessThan(251);
  });
});

describe("the codebook matches the dataset", () => {
  it("is a PDF whose text states the same size, coverage and observation count, and names every variable", async () => {
    const buf = read("pdf");
    expect(buf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    const { getDocumentProxy, extractText } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(buf));
    const { text: t } = await extractText(pdf, { mergePages: true });
    const flat = t.replace(/\s+/g, " ");
    const squashed = t.replace(/\s+/g, "");
    expect(flat).toContain(`${D.variables} master variables`);
    expect(flat).toContain(D.coverage);
    expect(flat).toContain("1565 of 1920");
    expect(flat).toContain("Derived variables");
    expect(flat).toContain("separate sheet");
    const missing = VARIABLES.filter((v) => !squashed.includes(v));
    expect(missing).toEqual([]);
  }, 60_000);
});

describe("the metadata on the page is true of the files", () => {
  it("coverage, years, frequency, variable count, observation count and derived count all match", () => {
    expect(D.coverage).toBe(`${BODY[0][1]} to ${BODY[29][1]}`);
    expect([D.firstYear, D.lastYear]).toEqual([Number(BODY[0][0]), Number(BODY[29][0])]);
    expect(D.variables).toBe(VARIABLES.length);
    expect(D.observations).toBe(BODY.length);
    expect(D.derivedVariables).toBe(derived[0].length - 2);
    expect(D.frequencyLabel).toBe("Annual");
    expect(D.sources).toEqual(["World Bank", "IMF", "Ministry of Finance", "State Bank of Pakistan"]);
  });
  it("is offered at ONE frequency, yearly: no quarterly or monthly option exists for it", () => {
    expect(D.availableFrequencies).toEqual(["yearly"]);
  });
  it("sizes are shown in human units", () => {
    expect(formatFileSize(72242)).toBe("71 KB");
    expect(formatFileSize(2 * 1024 * 1024)).toBe("2.0 MB");
  });
});

describe("the page section", () => {
  const html = renderToStaticMarkup(createElement(ResearchDatasetsSection));

  it("is titled Research Datasets, with the agreed description and the dataset card", () => {
    expect(html).toContain("Research Datasets");
    expect(html).toContain("Explore curated historical economic datasets prepared for academic research, statistical analysis and economic studies.");
    expect(html).toContain("Pakistan — 30-Year Macroeconomic Dataset");
    expect(html).toContain("An annual historical dataset covering Pakistan&#x27;s macroeconomic performance");
  });
  it("displays coverage, frequency, variables, observations and source institutions", () => {
    for (const s of ["FY1995-96 to FY2024-25", "Annual", ">64<", "30 fiscal years", "World Bank, IMF, Ministry of Finance, State Bank of Pakistan"]) expect(html, s).toContain(s);
  });
  it("offers the four main downloads plus the optional derived CSV, each a download link to its own file", () => {
    for (const f of D.files) {
      expect(html).toContain(`href="${researchFileHref(D, f)}"`);
      expect(html).toContain(`download="${f.filename}"`);
    }
    expect((html.match(/data-research-file=/g) ?? []).length).toBe(5);
    expect(html).toContain("Excel workbook (.xlsx)");
    expect(html).toContain("CSV dataset (.csv)");
    expect(html).toContain("Codebook (.pdf)");
    expect(html).toContain("SPSS import syntax (.sps)");
    expect(html).toContain("Optional:");
  });
  it("has no frequency selector and no quarterly or monthly download", () => {
    expect(html).not.toContain("Select data frequency");
    expect(html).not.toContain("aria-pressed");
    expect(html).not.toMatch(/href="[^"]*(frequency=|quarterly|monthly)/i);
    expect(html).not.toContain("/api/datasets");
    expect(html).toContain("not offered quarterly or monthly");
  });
  it("says the build scripts and raw downloads cited in the files are not published", () => {
    expect(html).toContain("kept internally and are not published here");
  });
});

describe("kept separate from the live catalogue and its frequency filters", () => {
  it("is not in the live catalogue, and the frequency filter counts are unaffected by it", () => {
    expect(getDataset(D.id)).toBeUndefined();
    expect(DATASETS.map((d) => d.id)).not.toContain(D.id);
    for (const f of D.files) expect(DATASETS.some((d) => d.id.includes(f.filename))).toBe(false);
    // The catalogue's own frequencies come from the live series alone.
    const counts = countByFrequency(DATASETS.map((d) => ({ id: d.id, name: d.name, category: d.category, description: d.description, unit: "", source: "", frequencyId: d.frequency, points: [] })));
    expect(counts.yearly).toBe(4);
    expect(offeredFrequencies(counts)).toEqual(["yearly", "quarterly", "monthly", "weekly", "as-announced"]);
  });
  it("the page mounts the section outside the frequency-filtered browser, and the browser knows nothing of it", () => {
    const page = fs.readFileSync(path.join(ROOT, "src", "app", "download-datasets", "page.tsx"), "utf-8");
    expect(page.indexOf("<ResearchDatasets />")).toBeGreaterThan(-1);
    expect(page.indexOf("<ResearchDatasets />")).toBeLessThan(page.indexOf("<DatasetBrowser"));
    const browser = fs.readFileSync(path.join(ROOT, "src", "components", "datasets", "DatasetBrowser.tsx"), "utf-8");
    expect(browser).not.toMatch(/researchDatasets|ResearchDatasets/);
    expect(RESEARCH_DATASETS).toHaveLength(1);
  });
});

describe("access: the files are as protected as the page", () => {
  it("every file needs a signed-in visitor, exactly like /download-datasets itself (default-deny proxy)", () => {
    expect(requiresLogin("/download-datasets")).toBe(true);
    for (const f of D.files) expect(requiresLogin(researchFileHref(D, f)), f.filename).toBe(true);
  });
});

describe("nothing private is in the published files", () => {
  it("no local path, person, e-mail or credential word appears in any file", () => {
    const wb = XLSX.read(read("xlsx"), { type: "buffer" });
    const cells = wb.SheetNames.flatMap((n) => (XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[n], { header: 1 }) as unknown[][]).flat().map(String));
    const blobs = [text("csv"), text("csv-derived"), text("sps"), cells.join("\n")];
    const pattern = /C:\\+ECONOMY|C:\\+Users|farza|@gmail|ECONOMY DASHBOARD|\.env\b|api[_-]?key|secret|password|supabase/i;
    for (const b of blobs) expect(pattern.exec(b)?.[0]).toBeUndefined();
  });
});
