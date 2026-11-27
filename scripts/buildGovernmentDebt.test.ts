// The government-debt pipeline end to end: source fingerprints, a full rebuild compared with the committed outputs, the row digest, the validation
// findings (pinned) and the safety of both scripts.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { buildGovernmentDebt, DATA_PATH, DEFAULT_SOURCES, loadSources, REPORT_PATH, verifyManifest, type BuildResult } from "./buildGovernmentDebt";
import { DEBT_SERIES, parseArgs } from "./fetchGovernmentDebtSources";
import { GOVERNMENT_DEBT_PROVENANCE, MOF_DEBT_REVIEW, SBP_DEBT_QUARTERLY, SBP_DEBT_RATIOS, SBP_SUMMARY_FLAGS } from "@/data/governmentDebt";

const ROOT = path.resolve(__dirname, "..");
const SOURCES = path.join(ROOT, DEFAULT_SOURCES);
const lf = (s: string) => s.replace(/\r\n/g, "\n");

let built: BuildResult;
beforeAll(async () => {
  built = await buildGovernmentDebt(loadSources(SOURCES));
}, 180_000);

describe("sources", () => {
  it("every file matches its recorded SHA-256; a changed byte stops the build", () => {
    const src = loadSources(SOURCES);
    expect(() => verifyManifest(src)).not.toThrow();
    const tampered = { ...src, read: (rel: string) => (rel === "sbp/Summary.pdf" ? Buffer.concat([src.read(rel), Buffer.from([0])]) : src.read(rel)) };
    expect(() => verifyManifest(tampered)).toThrow(/does not match the manifest/);
  });

  it("the manifest names the institution, URL and retrieval date of each file, and never an API key", () => {
    const m = JSON.parse(readFileSync(path.join(SOURCES, "manifest.json"), "utf8")) as { files: Record<string, string>[] };
    expect(m.files.map((f) => [f.path, f.institution])).toEqual([
      ["easydata/TS_GP_BAM_PKDLP_Q.csv", "State Bank of Pakistan"],
      ["mof/Annual_Debt_Review_FY26.pdf", "Ministry of Finance"],
      ["sbp/Summary.pdf", "State Bank of Pakistan"],
    ]);
    for (const f of m.files) {
      expect(f.retrievedOn).toBe("2026-11-27");
      expect(f.url).not.toMatch(/api_key=/);
    }
  });
});

describe("the committed outputs are exactly what the build produces", () => {
  it.each([DATA_PATH, REPORT_PATH])("%s is unchanged by a rebuild", (p) => {
    expect(lf(readFileSync(path.join(ROOT, p), "utf8"))).toBe(built.files[p]);
  });

  it("the stored rows hash to the recorded digest, and a one-unit edit changes it", () => {
    const digest = (x: unknown) => createHash("sha256").update(JSON.stringify(x)).digest("hex");
    expect(digest([SBP_DEBT_QUARTERLY, SBP_DEBT_RATIOS, SBP_SUMMARY_FLAGS, MOF_DEBT_REVIEW])).toBe(GOVERNMENT_DEBT_PROVENANCE.rowsSha256);
    const edited = JSON.parse(JSON.stringify(SBP_DEBT_QUARTERLY)) as number[][];
    edited[10][4] += 1;
    expect(digest([edited, SBP_DEBT_RATIOS, SBP_SUMMARY_FLAGS, MOF_DEBT_REVIEW])).not.toBe(GOVERNMENT_DEBT_PROVENANCE.rowsSha256);
  });
});

describe("validation findings (pinned)", () => {
  const report = () => built.files[REPORT_PATH];

  it("coverage, identities and SBP's own summary table", () => {
    expect(built.summary).toEqual([
      "SBP quarterly: 67 quarters 2009-06-30..2026-09-30; ratios: 18 June ends",
      "identities: A 67/67, FRDLA 67/67, ratios 90",
      "Summary.pdf: 40 values agree; flags RRRRP",
      "MoF: 3 June ends",
    ]);
  });

  it("the latest quarter is provisional and the ratios exist only at fiscal-year ends", () => {
    expect(SBP_SUMMARY_FLAGS.at(-1)).toEqual(["2026-09-30", "P"]);
    expect(SBP_DEBT_RATIOS.every((r) => r[0].endsWith("-06-30"))).toBe(true);
    expect(SBP_DEBT_RATIOS.at(-1)!.slice(0, 3).map((v) => (typeof v === "number" ? Math.round(v * 100) / 100 : v))).toEqual(["2026-06-30", 68.59, 61.03]);
  });

  it("MoF and SBP differ and both are kept: FY26 public debt 68.3% (MoF) vs 68.59% (SBP)", () => {
    expect(MOF_DEBT_REVIEW.at(-1)).toEqual(["2026-06-30", 86715, 59441, 27274, 68.3, 46.9, 21.5, 77168, 60.8]);
    expect(report()).toMatch(/\| 2026-06-30 \| Public debt % of GDP \| 68\.3% \| 68\.59% \| -0\.29 pp \|/);
  });
});

describe("the scripts are safe", () => {
  const build = readFileSync(path.join(__dirname, "buildGovernmentDebt.ts"), "utf8");
  const fetcher = readFileSync(path.join(__dirname, "fetchGovernmentDebtSources.ts"), "utf8");

  it("the build has no network, database or credential access", () => {
    for (const forbidden of [/\bfetch\(/, /node:https?/, /supabase/i, /process\.env/, /sbpTransport/]) expect(build, String(forbidden)).not.toMatch(forbidden);
  });

  it("the fetcher starts only through the guarded entry, reads only the EasyData key and writes no database", () => {
    expect(fetcher).toMatch(/runIfEntryPoint\(\{ filename: __filename, requireMain: typeof require !== "undefined" && require\.main === module \}, \(\) => \{\s+enterScript\(/);
    expect([...new Set(fetcher.match(/process\.env\.[A-Z_]+/g) ?? [])]).toEqual(["process.env.SBP_EASYDATA_API_KEY"]);
    expect(fetcher).not.toMatch(/supabase|from "dotenv"/i);
  });

  it("fetches every series of the dataset, not a hand-picked subset", () => {
    expect(DEBT_SERIES).toHaveLength(27);
    expect(parseArgs(["--retrieved", "2026-11-27"])).toEqual({ retrieved: "2026-11-27", out: "data/sources/government-debt" });
  });
});
