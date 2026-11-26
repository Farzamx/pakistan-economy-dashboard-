// The interest-rate dataset pipeline end to end: source fingerprints, a full rebuild from the committed sources compared with the committed outputs,
// the integrity digests of the generated rows, the validation findings (pinned, so a change in the sources is noticed), and the safety of both scripts.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { buildInterestRateDatasets, DEFAULT_SOURCES, loadSources, verifyManifest, type BuildResult } from "./buildInterestRates";
import { easydataRows, looksLike, parseArgs, toCsv } from "./fetchInterestRateSources";
import { BANK_RATES_PROVENANCE, LD_EARLY, LD_MONTHLY } from "@/data/interestRates/bankRates";
import { CPI_PROVENANCE, CPI_YOY } from "@/data/interestRates/cpi";
import { EASY_PIB_AUCTIONS, EASY_TBILL_AUCTIONS, GOV_SEC_PROVENANCE, SBP_PIB_AUCTIONS, SBP_TBILL_AUCTIONS } from "@/data/interestRates/govSecurities";
import { KIBOR_DAILY, KIBOR_PROVENANCE } from "@/data/interestRates/kibor";
import { OMO_OPERATIONS, OMO_PROVENANCE } from "@/data/interestRates/omo";
import { OVERNIGHT_REPO, POLICY_RATES_PROVENANCE, SBP_REPO, SBP_REVERSE_REPO, SBP_TARGET } from "@/data/interestRates/policyRates";

const ROOT = path.resolve(__dirname, "..");
const SOURCES = path.join(ROOT, DEFAULT_SOURCES);
const digest = (...parts: unknown[]) => createHash("sha256").update(JSON.stringify(parts)).digest("hex");
const lf = (s: string) => s.replace(/\r\n/g, "\n"); // a Windows checkout may convert the generated text files to CRLF

let built: BuildResult;
beforeAll(async () => {
  built = await buildInterestRateDatasets(loadSources(SOURCES));
}, 180_000);

describe("source fingerprints", () => {
  it("every preserved source file matches the SHA-256 in its manifest", () => {
    expect(verifyManifest(loadSources(SOURCES)).length).toBe(13);
  });

  it("a single changed byte in any source stops the build", () => {
    const src = loadSources(SOURCES);
    const tampered = { ...src, read: (rel: string) => (rel === "sbp/OMO-MopUp-Hist.xlsx" ? Buffer.concat([src.read(rel), Buffer.from([0])]) : src.read(rel)) };
    expect(() => verifyManifest(tampered)).toThrow(/does not match the manifest/);
  });

  it("the manifest records institution, URL, retrieval date and hash for every file, and never an API key", () => {
    const m = JSON.parse(readFileSync(path.join(SOURCES, "manifest.json"), "utf8")) as { files: Record<string, unknown>[] };
    for (const f of m.files) {
      expect(f).toMatchObject({ institution: "State Bank of Pakistan", retrievedOn: "2026-11-26" });
      expect(String(f.url)).toMatch(/^https:\/\/(www|easydata)\.sbp\.org\.pk\//);
      expect(String(f.url)).not.toMatch(/api_key=/);
      expect(String(f.sha256)).toMatch(/^[0-9a-f]{64}$/);
    }
  });
});

describe("the committed outputs are exactly what the build produces from the committed sources", () => {
  it("writes the six datasets and the validation report", () => {
    expect(Object.keys(built.files).sort()).toEqual([
      "docs/interest-rates-validation-report.md",
      "src/data/interestRates/bankRates.ts",
      "src/data/interestRates/cpi.ts",
      "src/data/interestRates/govSecurities.ts",
      "src/data/interestRates/kibor.ts",
      "src/data/interestRates/omo.ts",
      "src/data/interestRates/policyRates.ts",
    ]);
  });

  it.each([
    "src/data/interestRates/policyRates.ts",
    "src/data/interestRates/kibor.ts",
    "src/data/interestRates/govSecurities.ts",
    "src/data/interestRates/bankRates.ts",
    "src/data/interestRates/omo.ts",
    "src/data/interestRates/cpi.ts",
    "docs/interest-rates-validation-report.md",
  ])("%s is unchanged by a rebuild (no hand edits)", (p) => {
    expect(lf(readFileSync(path.join(ROOT, p), "utf8"))).toBe(built.files[p]);
  });
});

describe("integrity digests of the stored rows", () => {
  it.each([
    ["policy", POLICY_RATES_PROVENANCE.rowsSha256, () => digest(SBP_REVERSE_REPO, SBP_REPO, SBP_TARGET, OVERNIGHT_REPO)],
    ["kibor", KIBOR_PROVENANCE.rowsSha256, () => digest(KIBOR_DAILY)],
    ["govSec", GOV_SEC_PROVENANCE.rowsSha256, () => digest(EASY_TBILL_AUCTIONS, EASY_PIB_AUCTIONS, SBP_TBILL_AUCTIONS, SBP_PIB_AUCTIONS)],
    ["bank", BANK_RATES_PROVENANCE.rowsSha256, () => digest(LD_MONTHLY, LD_EARLY)],
    ["omo", OMO_PROVENANCE.rowsSha256, () => digest(OMO_OPERATIONS)],
    ["cpi", CPI_PROVENANCE.rowsSha256, () => digest(CPI_YOY)],
  ] as const)("%s rows hash to the recorded digest", (_, recorded, compute) => {
    expect(compute()).toBe(recorded);
  });

  it("a one-basis-point edit anywhere changes the digest", () => {
    const edited = JSON.parse(JSON.stringify(KIBOR_DAILY)) as (string | number | null)[][];
    edited[1000][4] = (edited[1000][4] as number) + 0.01;
    expect(digest(edited)).not.toBe(KIBOR_PROVENANCE.rowsSha256);
  });
});

describe("validation findings (pinned)", () => {
  const report = () => built.files["docs/interest-rates-validation-report.md"];

  it("OMO unit conversion: every cut-off was a fraction and every quoted one lies inside its quote range", () => {
    expect(report()).toMatch(/All 1,871 OMO cut-off rates are stored by SBP as fractions/);
    expect(report()).toMatch(/in all 707 operations where SBP also printed the range of bid quotes \(in percent\), the converted cut-off lies inside that range \(0 exceptions/);
  });

  it("110 EasyData observations are not used, each listed with its reason", () => {
    expect(report()).toMatch(/^110 EasyData observations carry a value that is not used/m);
    expect((report().match(/^\| (TB|PIB)\d{4} \| /gm) ?? []).length).toBe(110);
  });

  it("independent checks against SBP's own publications", () => {
    expect(built.summary.at(-1)).toBe("independent checks: policy 13/13 values; T-bills 297/348; KIBOR daily 27/29; KIBOR monthly 30/39; PIB 230/230; bank (sir) 80/88; bank (pdf) 96/96");
    expect(report()).toMatch(/Of the 51 disagreements, 51 equal tb\.xlsx's value for the PREVIOUS auction/);
    expect(report()).toMatch(/in 19 sir\.pdf rows the weighted average exceeds that row's own cut-off/);
    expect(report()).toMatch(/SBP w\.e\.f\. 2026-10-27, EasyData 2026-10-26/);
  });

  it("source transitions: 53 real EasyData/SBP-file differences, and the SBP files have no cut-off below its weighted average", () => {
    expect(report()).toMatch(/Real differences \(not explained by EasyData's 2-decimal rounding\), 53 in total/);
    expect(report()).toMatch(/SBP files: 0 violations\. EasyData T-bills: 9 violations/);
  });

  it("frequency and coverage facts", () => {
    expect(report()).toMatch(/Lending\/deposit, scheduled banks: 274 months 2004-01\.\.2026-10; missing months: none/);
    expect(report()).toMatch(/CPI: 124 months 2016-07\.\.2026-10; missing months: none/);
    expect(report()).toMatch(/KIBOR 2Y and 3Y end on 2020-02-04/);
  });
});

describe("the scripts are safe", () => {
  const build = readFileSync(path.join(__dirname, "buildInterestRates.ts"), "utf8");
  const fetcher = readFileSync(path.join(__dirname, "fetchInterestRateSources.ts"), "utf8");

  it("the build has no network, database or credential access and runs only as the entry point", () => {
    for (const forbidden of [/\bfetch\(/, /node:https?/, /supabase/i, /process\.env/, /sbpTransport/, /@\/lib\/(ledger|ingest)/]) expect(build, String(forbidden)).not.toMatch(forbidden);
    expect(build).toMatch(/import\.meta\.url === pathToFileURL\(path\.resolve\(process\.argv\[1\]\)\)\.href/);
  });

  it("the fetcher reads only the EasyData key from .env.local, never logs it, and writes no database", () => {
    expect(fetcher).toMatch(/parseDotenv\(readFileSync\(path\.resolve\("\.env\.local"\)\)\)/);
    expect(fetcher).toMatch(/env\.SBP_EASYDATA_API_KEY/);
    expect(fetcher).not.toMatch(/process\.env/);
    expect(fetcher).not.toMatch(/supabase/i);
    expect(fetcher).not.toMatch(/console\.(log|error)\([^)]*\bkey\b/);
    expect(fetcher).toMatch(/import\.meta\.url === pathToFileURL\(path\.resolve\(process\.argv\[1\]\)\)\.href/);
  });

  it("fetcher helpers: argument parsing, file-type sniffing, verbatim CSV", () => {
    expect(parseArgs(["--retrieved", "2026-11-26"])).toEqual({ retrieved: "2026-11-26", out: "data/sources/interest-rates", only: null });
    expect(parseArgs([])).toMatch(/^Usage/);
    expect(looksLike("pdf", Buffer.from("%PDF-1.7"))).toBe(true);
    expect(looksLike("xls", Buffer.from("<!DOCTYPE html>"))).toBe(false);
    const body = JSON.stringify({ columns: ["Dataset Name", "Series Key", "Series Name", "Observation Date", "Observation Value", "Unit", "Observation Status", "Status Comments"], rows: [["d", "A.B", "n, x", "2026-01-02", ".1215", "Percent", "Normal", ""]] });
    expect(toCsv(easydataRows(body, "A.B"))).toBe('series_key,series_name,unit,observation_date,observation_value,observation_status,status_comments\nA.B,"n, x",Percent,2026-01-02,.1215,Normal,\n');
    expect(() => easydataRows(body, "A.C")).toThrow(/row for A\.B/);
  });
});
