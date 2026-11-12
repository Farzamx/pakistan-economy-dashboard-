// The generator for src/data/govSecAuctions.ts: its pure helpers, its round trip against the committed data file, and the guarantee that it is local and
// read-only. (The workbook parsers themselves are tested in src/lib/bonds/auctionWorkbook.test.ts.)

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { encodeAuction, encodeTenor, parseArgs, qualityFindings } from "./buildGovSecAuctions";
import { GOV_SEC_PROVENANCE, RAW_PIB_AUCTIONS, RAW_TBILL_AUCTIONS } from "@/data/govSecAuctions";
import { getPibAuctions, getTBillAuctions } from "@/lib/bonds/dataset";
import { rowsDigest } from "@/lib/bonds/rowsDigest";
import type { AuctionRecord, TenorResult } from "@/lib/bonds/types";

const ok: TenorResult = { outcome: "accepted", cutoffYield: 12.4101, waYield: 12.3937, offered: 800000, acceptedCompetitive: 150000, acceptedNonCompetitive: 5000, target: 100000 };
const rec = (over: Partial<TenorResult> = {}, date = "2026-10-14"): AuctionRecord => ({ instrument: "tbill", auctionNo: 700, auctionDate: date, settlementDate: "2026-10-15", tenors: { "12M": { ...ok, ...over } } });

describe("parseArgs", () => {
  const base = ["--tb", "tb.xlsx", "--pib", "pib.xlsx", "--retrieved", "2026-11-12"];

  it("reads the three required arguments and defaults the output path to the data file", () => {
    expect(parseArgs(base)).toEqual({ tb: "tb.xlsx", pib: "pib.xlsx", retrieved: "2026-11-12", out: "src/data/govSecAuctions.ts", tbModified: null, pibModified: null, check: false });
  });

  it("accepts the optional headers, an output path and --check", () => {
    const a = parseArgs([...base, "--tb-modified", "Wed, 11 Nov 2026", "--pib-modified", "Tue, 10 Nov 2026", "--out", "x.ts", "--check"]);
    expect(a).toMatchObject({ tbModified: "Wed, 11 Nov 2026", pibModified: "Tue, 10 Nov 2026", out: "x.ts", check: true });
  });

  it.each([[["--pib", "p", "--retrieved", "2026-11-12"]], [["--tb", "t", "--retrieved", "2026-11-12"]], [["--tb", "t", "--pib", "p"]]])("returns the usage text when a required argument is missing", (argv) => {
    expect(parseArgs(argv)).toMatch(/^Usage:/);
  });

  it("does not take the next flag as a value", () => {
    expect(parseArgs(["--tb", "--pib", "p", "--retrieved", "2026-11-12"])).toMatch(/^Usage:/);
  });

  it("rejects a retrieval date that is not YYYY-MM-DD", () => {
    expect(parseArgs(["--tb", "t", "--pib", "p", "--retrieved", "12/11/2026"])).toMatch(/must be YYYY-MM-DD/);
  });
});

describe("encodeTenor and encodeAuction", () => {
  it("stores an accepted tenor as the documented tuple", () => {
    expect(encodeTenor(ok)).toEqual([12.4101, 12.3937, 800000, 150000, 5000, 100000, "A"]);
  });

  it("stores a failed tenor with its outcome code and nulls, never zeros", () => {
    const failed: TenorResult = { outcome: "bids-rejected", cutoffYield: null, waYield: null, offered: 52000, acceptedCompetitive: null, acceptedNonCompetitive: null, target: 100000 };
    const t = encodeTenor(failed);
    expect(t).toEqual([null, null, 52000, null, null, 100000, "BR"]);
    expect(t.slice(0, 2).every((v) => v === null)).toBe(true);
  });

  it.each([
    ["bids-rejected", "BR"],
    ["no-bids", "NB"],
    ["none-accepted", "NA"],
    ["accepted", "A"],
  ] as const)("codes outcome %s as %s", (outcome, code) => {
    expect(encodeTenor({ ...ok, outcome })[6]).toBe(code);
  });

  it("appends the short-sale figure for PIBs only when there is one", () => {
    expect(encodeTenor({ ...ok, acceptedShortSale: 1000 })).toHaveLength(8);
    expect(encodeTenor(ok)).toHaveLength(7);
  });

  it("encodes an auction as parseable JSON with a null number for PIBs", () => {
    const pib: AuctionRecord = { ...rec(), instrument: "pib", auctionNo: null };
    expect(JSON.parse(encodeAuction(pib))).toEqual([null, "2026-10-14", "2026-10-15", { "12M": [12.4101, 12.3937, 800000, 150000, 5000, 100000, "A"] }]);
    expect(JSON.parse(encodeAuction(rec()))[0]).toBe(700);
  });
});

describe("qualityFindings", () => {
  const summary = (xs: string[]) => xs[xs.length - 1];

  it("reports a clean archive as zero findings", () => {
    const out = qualityFindings([rec()]);
    expect(out).toHaveLength(1);
    expect(summary(out)).toBe("summary: cut-off below weighted average: 0; accepted above offered: 0; yield out of range: 0; accepted tenors with no non-competitive figure: 0");
  });

  it("flags a cut-off below the weighted average", () => {
    const out = qualityFindings([rec({ cutoffYield: 12.1, waYield: 12.39 })]);
    expect(out.some((l) => /cut-off 12.1 is below the weighted average 12.39/.test(l))).toBe(true);
    expect(summary(out)).toContain("cut-off below weighted average: 1");
  });

  it("flags accepted bids above offered bids", () => {
    const out = qualityFindings([rec({ offered: 100, acceptedCompetitive: 200 })]);
    expect(out.some((l) => /exceeds offered/.test(l))).toBe(true);
    expect(summary(out)).toContain("accepted above offered: 1");
  });

  it.each([[0], [-1], [41]])("flags a yield of %s as outside 0-40%", (y) => {
    const out = qualityFindings([rec({ cutoffYield: y, waYield: null })]);
    expect(summary(out)).toContain("yield out of range: 1");
  });

  it("counts accepted tenors with no non-competitive figure, and does not flag failed ones for it", () => {
    expect(summary(qualityFindings([rec({ acceptedNonCompetitive: null })]))).toContain("no non-competitive figure: 1");
    expect(summary(qualityFindings([rec({ outcome: "bids-rejected", cutoffYield: null, waYield: null, acceptedCompetitive: null, acceptedNonCompetitive: null })]))).toContain("no non-competitive figure: 0");
  });
});

describe("the committed data file is exactly what the generator would write", () => {
  const strip = (v: unknown) => JSON.parse(JSON.stringify(v));

  it("every T-bill auction round-trips through encodeAuction to the stored row", () => {
    const decoded = getTBillAuctions();
    expect(decoded).toHaveLength(RAW_TBILL_AUCTIONS.length);
    decoded.forEach((a, i) => expect(JSON.parse(encodeAuction(a)), a.auctionDate).toEqual(strip(RAW_TBILL_AUCTIONS[i])));
  });

  it("every PIB auction round-trips through encodeAuction to the stored row", () => {
    const decoded = getPibAuctions();
    expect(decoded).toHaveLength(RAW_PIB_AUCTIONS.length);
    decoded.forEach((a, i) => expect(JSON.parse(encodeAuction(a)), a.auctionDate).toEqual(strip(RAW_PIB_AUCTIONS[i])));
  });

  it("the archive has no data-quality finding beyond the known, reported ones", () => {
    const findings = qualityFindings([...getTBillAuctions(), ...getPibAuctions()]);
    const s = findings[findings.length - 1];
    expect(s).toMatch(/^summary: cut-off below weighted average: \d+; accepted above offered: \d+; yield out of range: 0;/);
  });
});

describe("the integrity digest of the stored rows", () => {
  it("matches the digest the generator recorded: the data file has not been edited by hand", () => {
    expect(GOV_SEC_PROVENANCE.rowsSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(rowsDigest(RAW_TBILL_AUCTIONS, RAW_PIB_AUCTIONS)).toBe(GOV_SEC_PROVENANCE.rowsSha256);
  });

  it("changes when a single yield anywhere in the archive changes", () => {
    const edited = JSON.parse(JSON.stringify(RAW_TBILL_AUCTIONS)) as typeof RAW_TBILL_AUCTIONS;
    const mid = Math.floor(edited.length / 2);
    const tenor = Object.values(edited[mid][3])[0] as (number | string | null)[];
    tenor[0] = (tenor[0] as number) + 0.0001;
    expect(rowsDigest(edited, RAW_PIB_AUCTIONS)).not.toBe(GOV_SEC_PROVENANCE.rowsSha256);
  });

  it("changes when a failed tenor is turned into a zero, or a row is dropped", () => {
    const dropped = RAW_TBILL_AUCTIONS.slice(1);
    expect(rowsDigest(dropped, RAW_PIB_AUCTIONS)).not.toBe(GOV_SEC_PROVENANCE.rowsSha256);
    const zeroed = JSON.parse(JSON.stringify(RAW_PIB_AUCTIONS)) as typeof RAW_PIB_AUCTIONS;
    const last = zeroed[zeroed.length - 1];
    (last[3]["15Y"] as (number | string | null)[])[0] = 0;
    expect(rowsDigest(RAW_TBILL_AUCTIONS, zeroed)).not.toBe(GOV_SEC_PROVENANCE.rowsSha256);
  });

  it("the generator records it in the provenance block it writes", () => {
    const src = readFileSync(path.resolve(__dirname, "buildGovSecAuctions.ts"), "utf8");
    expect(src).toContain("rowsSha256: ${JSON.stringify(rowsSha)}");
  });
});

describe("the generator is local and read-only", () => {
  const src = readFileSync(path.resolve(__dirname, "buildGovSecAuctions.ts"), "utf8");

  it("has no network, database or credential access", () => {
    for (const forbidden of [/\bfetch\(/, /https?\.request|node:https?/, /supabase/i, /process\.env/, /WRITE_MODE_AUTHORIZED/, /@\/lib\/(ledger|data\/sbp|ingest)/]) expect(src, String(forbidden)).not.toMatch(forbidden);
  });

  it("writes exactly one file, the output path, and only when not in --check mode", () => {
    expect((src.match(/writeFileSync\(/g) ?? []).length).toBe(1);
    expect(src).toMatch(/if \(parsed\.check\) \{[\s\S]*?return 0;[\s\S]*?\}\s*writeFileSync\(parsed\.out/);
  });

  it("runs main only when it is the entry point", () => {
    expect(src).toMatch(/import\.meta\.url === pathToFileURL\(path\.resolve\(process\.argv\[1\]\)\)\.href/);
  });
});
