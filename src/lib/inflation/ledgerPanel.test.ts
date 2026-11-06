// Phase F.2e-Prep: the ledger panel assembler. Pure: ledger-shaped rows in, panel or reasons out.
// Every defect below is introduced into rows built from the REAL 26-series / 52-month PBS file.

import { describe, expect, it } from "vitest";
import { assembleLedgerPanel, monthKeyFromMonthEnd, type LedgerRow } from "./ledgerPanel";
import { parseCpiGroupPanel } from "./pbsGroups";
import { FULL_XML, editSeries, withoutMonth, setSeriesAttr } from "./__fixtures__/pbsCpiVariants";
import {
  DATASET_ID,
  addRow,
  asReads,
  dropKey,
  dropMonth,
  emptyKey,
  failKey,
  ledgerReadsFromXml,
  mapRows,
  newestRow,
  PREPARED,
  setAllRefField,
  setRefField,
  setValue,
  truncateKey,
} from "./__fixtures__/ledgerFixtures";
import { PBS_CPI_SERIES, createPbsCpiGroupsAdapter, loadPbsCpiDataset, observationsFor, sourceReferenceFor } from "@/lib/providers/pbsCpiGroupsAdapter";

const good = () => ledgerReadsFromXml(FULL_XML);
const assemble = (reads: ReturnType<typeof good>) => assembleLedgerPanel(asReads(reads));

describe("the fixture is faithful to production rows (so the tests below mean something)", () => {
  it("equals what the F.2b adapter writes, field for field, for all 26 series and 52 months", () => {
    const { dataset } = loadPbsCpiDataset(FULL_XML);
    expect(dataset).not.toBeNull();
    const adapter = createPbsCpiGroupsAdapter(dataset!);
    expect(adapter.providerId).toBe("pbs-sdmx");
    const reads = good();
    let compared = 0;
    for (const def of PBS_CPI_SERIES) {
      const read = reads[def.indicatorKey];
      if (!read || !read.ok) throw new Error("fixture read missing");
      const byPeriod = new Map(read.rows.map((r) => [r.observationPeriod, r]));
      const expected = observationsFor(dataset!, def.indicatorKey);
      expect(read.rows).toHaveLength(expected.length);
      for (const obs of expected) {
        const row = byPeriod.get(obs.observationPeriod) as LedgerRow;
        expect(row.value).toBe(obs.value);
        expect(row.unit).toBe(obs.unit);
        expect(row.sourceSeriesId).toBe(obs.sourceSeriesId);
        expect(row.qualityStatus).toBe(obs.qualityStatus);
        expect(row.releaseDate).toBe(obs.releaseDate);
        const ref = sourceReferenceFor(dataset!, def, String(row.sourceReference?.sourceValue));
        for (const field of ["file", "dataSetId", "sdmxIndicator", "dataDomain", "refArea", "frequency", "basePeriod", "sourceValue"]) {
          expect(row.sourceReference?.[field], `${def.indicatorKey} ${obs.observationPeriod} ${field}`).toEqual(ref[field]);
        }
        compared++;
      }
    }
    expect(compared).toBe(1352);
  });
});

describe("a complete, consistent ledger", () => {
  const result = assemble(good());

  it("assembles a panel", () => {
    expect(result.issues).toEqual([]);
    expect(result.failureKind).toBeNull();
    expect(result.panel).not.toBeNull();
  });

  it("is IDENTICAL to the panel the F.1 file parser builds from the same data (months, headline, 12 weights, 12 indices)", () => {
    const fromFile = parseCpiGroupPanel(FULL_XML).panel!;
    expect(result.panel!.months).toEqual(fromFile.months);
    expect([...result.panel!.headlineIndex]).toEqual([...fromFile.headlineIndex]);
    expect(result.panel!.groups.map((g) => g.groupNo)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    for (const g of fromFile.groups) {
      const l = result.panel!.groups.find((x) => x.groupNo === g.groupNo)!;
      expect(l.weight).toBe(g.weight);
      expect([...l.index]).toEqual([...g.index]);
    }
  });

  it("reports provenance: 52 months, the base period, the file's Prepared time, DataSetID", () => {
    expect(result.provenance).toMatchObject({
      source: "ledger",
      basePeriod: "2015/2016",
      seriesCount: 26,
      firstMonth: "2022-07",
      latestMonth: "2026-10",
      monthCount: 52,
      dataSetIds: [DATASET_ID],
    });
    expect(result.provenance?.sourceUpdatedAt).toEqual({ min: PREPARED, max: PREPARED });
  });

  it("carries an aligned grid with no missing cell", () => {
    expect(result.grid.size).toBe(26);
    for (const col of result.grid.values()) expect([...col.values()].every((v) => typeof v === "number")).toBe(true);
  });

  it("a ledger built over several ingestion runs (different Prepared times) is fine; the range is reported", () => {
    const reads = mapRows(good(), "pbs:cpiIndexNational", (r) => (r.observationPeriod === "2026-10-31" ? { ...r, sourceUpdatedAt: "2026-11-05T00:00:00+00:00" } : r));
    const r = assemble(reads);
    expect(r.panel).not.toBeNull();
    expect(r.provenance?.sourceUpdatedAt).toEqual({ min: PREPARED, max: "2026-11-05T00:00:00+00:00" });
  });
});

describe("month-end dates", () => {
  it("maps a month-end date to its month, and nothing else", () => {
    expect(monthKeyFromMonthEnd("2026-10-31")).toBe("2026-10");
    expect(monthKeyFromMonthEnd("2024-02-29")).toBe("2024-02");
    expect(monthKeyFromMonthEnd("2026-10-28")).toBeNull();
    expect(monthKeyFromMonthEnd("2026-10-01")).toBeNull();
    expect(monthKeyFromMonthEnd("garbage")).toBeNull();
  });
});

type Case = { name: string; mutate: (r: ReturnType<typeof good>) => ReturnType<typeof good>; kind: "unavailable" | "invalid"; issue: RegExp };

const REJECTED: Case[] = [
  // ── the ledger cannot be read / is incomplete ──
  { name: "a series was never read", mutate: (r) => dropKey(r, "pbs:cpiGroupIndex05"), kind: "unavailable", issue: /pbs:cpiGroupIndex05: this series was not read/ },
  { name: "a series' read failed", mutate: (r) => failKey(r, "pbs:cpiGroupIndex05"), kind: "unavailable", issue: /pbs:cpiGroupIndex05: the ledger read failed \(connection reset\)/ },
  { name: "a series is empty", mutate: (r) => emptyKey(r, "pbs:cpiGroupIndex05"), kind: "unavailable", issue: /holds no observations/ },
  { name: "a whole group's WEIGHT is absent (incomplete group)", mutate: (r) => dropKey(r, "pbs:cpiGroupWeight07"), kind: "unavailable", issue: /pbs:cpiGroupWeight07: this series was not read/ },
  { name: "the headline is absent", mutate: (r) => dropKey(r, "pbs:cpiIndexNational"), kind: "unavailable", issue: /pbs:cpiIndexNational: this series was not read/ },
  { name: "the total-weight series is absent", mutate: (r) => dropKey(r, "pbs:cpiWeightTotal"), kind: "unavailable", issue: /pbs:cpiWeightTotal: this series was not read/ },
  { name: "a read hit its row limit (completeness unprovable)", mutate: (r) => truncateKey(r, "pbs:cpiGroupIndex02"), kind: "invalid", issue: /reached its row limit/ },
  // ── months ──
  { name: "one group lacks the latest month (partly ingested)", mutate: (r) => dropMonth(r, "pbs:cpiGroupIndex03", "2026-10"), kind: "invalid", issue: /pbs:cpiGroupIndex03: missing 1 month\(s\) the headline has \(2026-10\)/ },
  { name: "one group has a NEW month the headline lacks (partly ingested)", mutate: (r) => addRow(r, "pbs:cpiGroupIndex03", { ...newestRow(r, "pbs:cpiGroupIndex03"), observationPeriod: "2026-11-30" }), kind: "invalid", issue: /has 1 month\(s\) the headline lacks \(2026-11\) — a partly updated ledger/ },
  { name: "a month is missing from a weight series", mutate: (r) => dropMonth(r, "pbs:cpiGroupWeight09", "2025-03"), kind: "invalid", issue: /pbs:cpiGroupWeight09: missing 1 month/ },
  { name: "a month is missing from EVERY series (a gap)", mutate: (r) => Object.keys(r).reduce((acc, k) => dropMonth(acc, k, "2025-03"), r), kind: "invalid", issue: /gap between 2025-02 and 2025-04/ },
  // ── provenance and precision ──
  { name: "a date that is not a month-end", mutate: (r) => mapRows(r, "pbs:cpiGroupIndex01", (x) => (x.observationPeriod === "2026-10-31" ? { ...x, observationPeriod: "2026-10-28" } : x)), kind: "invalid", issue: /not a month-end date/ },
  { name: "a duplicate current row for one month", mutate: (r) => addRow(r, "pbs:cpiGroupIndex01", { ...newestRow(r, "pbs:cpiGroupIndex01") }), kind: "invalid", issue: /more than one current row/ },
  { name: "a non-finite value (NaN)", mutate: (r) => setValue(r, "pbs:cpiGroupIndex01", "2026-10", Number.NaN), kind: "invalid", issue: /non-finite value/ },
  { name: "an infinite value", mutate: (r) => mapRows(r, "pbs:cpiGroupIndex01", (x) => (x.observationPeriod === "2026-10-31" ? { ...x, value: Infinity } : x)), kind: "invalid", issue: /non-finite value/ },
  { name: "a value that differs from the exact source text recorded beside it (precision lost)", mutate: (r) => setValue(r, "pbs:cpiGroupIndex01", "2026-10", 250.12, true), kind: "invalid", issue: /stores 250\.12 but the recorded source text is/ },
  { name: "no source text recorded", mutate: (r) => setRefField(r, "pbs:cpiGroupIndex01", "sourceValue", undefined, "2026-10"), kind: "invalid", issue: /records no source value text/ },
  { name: "wrong source_series_id", mutate: (r) => mapRows(r, "pbs:cpiGroupIndex01", (x) => ({ ...x, sourceSeriesId: "PCPI_CP_02_IX" })), kind: "invalid", issue: /source_series_id "PCPI_CP_02_IX"/ },
  { name: "a different SDMX indicator in the source reference", mutate: (r) => setRefField(r, "pbs:cpiGroupIndex01", "sdmxIndicator", "PCPI_CP_02_IX"), kind: "invalid", issue: /different SDMX indicator/ },
  { name: "not sourced from the PBS CPI file", mutate: (r) => setRefField(r, "pbs:cpiGroupIndex01", "file", "https://example.org/other.xml"), kind: "invalid", issue: /does not name the PBS CPI file/ },
  { name: "a provisional (not official) row", mutate: (r) => mapRows(r, "pbs:cpiGroupIndex01", (x) => (x.observationPeriod === "2026-10-31" ? { ...x, qualityStatus: "provisional" } : x)), kind: "invalid", issue: /quality_status "provisional"/ },
  { name: "a wrong unit", mutate: (r) => mapRows(r, "pbs:cpiGroupIndex01", (x) => ({ ...x, unit: "Index (2010-11=100)" })), kind: "invalid", issue: /has unit "Index \(2010-11=100\)"/ },
  // ── base period ──
  { name: "ONE row records a different base period", mutate: (r) => setRefField(r, "pbs:cpiGroupIndex01", "basePeriod", "2025/2026", "2026-10"), kind: "invalid", issue: /different base periods \(2015\/2016, 2025\/2026\)/ },
  { name: "no base period recorded", mutate: (r) => setRefField(r, "pbs:cpiGroupIndex01", "basePeriod", undefined, "2026-10"), kind: "invalid", issue: /records no base period/ },
  // ── weights ──
  { name: "a group weight that changes within the base period", mutate: (r) => setValue(r, "pbs:cpiGroupWeight02", "2026-10", 9.5), kind: "invalid", issue: /Group 2: the weight is not constant over time/ },
  { name: "a non-positive weight", mutate: (r) => mapRows(r, "pbs:cpiGroupWeight04", (x) => ({ ...x, value: 0, sourceReference: { ...(x.sourceReference ?? {}), sourceValue: "0" } })), kind: "invalid", issue: /Group 4: weight 0 is outside \(0, 100\)/ },
  { name: "weights that do not total 100", mutate: (r) => mapRows(r, "pbs:cpiGroupWeight01", (x) => ({ ...x, value: x.value + 5, sourceReference: { ...(x.sourceReference ?? {}), sourceValue: String(x.value + 5) } })), kind: "invalid", issue: /Weights total 10[0-9.]+, not 100/ },
  { name: "the stored total-weight series is not 100", mutate: (r) => setValue(r, "pbs:cpiWeightTotal", "2026-10", 95), kind: "invalid", issue: /total-weight series is 95 in 2026-10, not 100/ },
  // ── index sanity and the Laspeyres identity ──
  { name: "the group indices stop reproducing the headline (Laspeyres identity)", mutate: (r) => setValue(r, "pbs:cpiGroupIndex04", "2026-01", 999 / 3), kind: "invalid", issue: /do not reproduce the headline index/ },
  { name: "an implausible index", mutate: (r) => setValue(r, "pbs:cpiIndexNational", "2026-10", 10), kind: "invalid", issue: /Headline: implausible index 10 in 2026-10/ },
];

describe("the ledger is REJECTED — whole, never partly — when…", () => {
  it.each(REJECTED.map((c) => [c.name, c] as const))("%s", (_name, c) => {
    const r = assemble(c.mutate(good()));
    expect(r.panel, "a partially valid panel must never be returned").toBeNull();
    expect(r.provenance).toBeNull();
    expect(r.issues.length).toBeGreaterThan(0);
    expect(r.issues.join(" | ")).toMatch(c.issue);
    expect(r.failureKind).toBe(c.kind);
  });

  it("an UNREADABLE series dominates: unavailable (not invalid), even when other data is also bad", () => {
    const reads = failKey(setValue(good(), "pbs:cpiGroupIndex01", "2026-10", 250.12, true), "pbs:cpiGroupIndex09");
    const r = assemble(reads);
    expect(r.failureKind).toBe("unavailable");
    expect(r.issues.some((i) => /precision|recorded source text/.test(i))).toBe(true); // both are still reported
  });

  it("reports every problem it can find, not just the first", () => {
    const reads = setValue(dropMonth(good(), "pbs:cpiGroupIndex03", "2026-10"), "pbs:cpiGroupIndex01", "2026-10", Number.NaN);
    expect(assemble(reads).issues.length).toBeGreaterThanOrEqual(2);
  });

  it("missing observations are NULL in the aligned grid — never zero — and the panel is still refused", () => {
    const r = assemble(dropMonth(good(), "pbs:cpiGroupIndex03", "2026-10"));
    expect(r.grid.get("pbs:cpiGroupIndex03")?.get("2026-10")).toBeNull();
    expect(r.grid.get("pbs:cpiGroupIndex02")?.get("2026-10")).toBeGreaterThan(0);
    for (const col of r.grid.values()) for (const v of col.values()) expect(v === null || v > 0).toBe(true);
    expect(r.panel).toBeNull();
  });

  it("rejects everything when the base period is unsupported across the board (a rebase is never read as the old basket)", () => {
    const rebased = assembleLedgerPanel(asReads(ledgerReadsFromXml(FULL_XML, { base: "2025/2026" })));
    expect(rebased.panel).toBeNull();
    expect(rebased.issues.join(" ")).toMatch(/Base period 2025\/2026 is not supported/);
  });

  it("setAllRefField on every series with a consistent but unsupported base is rejected too", () => {
    const reads = setAllRefField(good(), "basePeriod", "2030/2031");
    expect(assemble(reads).issues.join(" ")).toMatch(/(not supported|expected "Index)/);
  });
});

describe("PARITY with the F.1 file parser on the same (possibly corrupted) data", () => {
  // For each scenario: does the FILE parser accept it, and does the LEDGER assembler accept the same data?
  // The ledger path must never accept what the file path rejects. It is allowed to be STRICTER (documented below).
  const scenarios: { name: string; xml: string; file: boolean; ledger: boolean; why?: string }[] = [
    { name: "clean", xml: FULL_XML, file: true, ledger: true },
    { name: "a group index nudged +5 (identity broken)", xml: editSeries(FULL_XML, "PCPI_CP_04_IX", (m, v) => (m === "2026-01" ? String(Number(v) + 5) : v)), file: false, ledger: false },
    { name: "a group index nudged +0.0001 (inside tolerance)", xml: editSeries(FULL_XML, "PCPI_CP_04_IX", (m, v) => (m === "2026-01" ? String(Number(v) + 0.0001) : v)), file: true, ledger: true },
    { name: "a group weight changes in one month", xml: editSeries(FULL_XML, "PCPI_CP_02_WT", (m, v) => (m === "2026-10" ? String(Number(v) + 1) : v)), file: false, ledger: false },
    { name: "one group lacks a month", xml: editSeries(FULL_XML, "PCPI_CP_05_IX", (m, v) => (m === "2024-03" ? null : v)), file: false, ledger: false },
    { name: "the headline is implausible", xml: editSeries(FULL_XML, "PCPI_IX", (m, v) => (m === "2026-10" ? "10" : v)), file: false, ledger: false },
    {
      name: "a month absent from EVERY series (a gap)",
      xml: withoutMonth(FULL_XML, "2025-03"),
      file: true,
      ledger: false,
      why: "the file parser tolerates an internally consistent gap; the ledger (like the F.2b adapter that wrote it) does not",
    },
    {
      name: "a different, consistent base period",
      xml: setSeriesAttr(FULL_XML, "PCPI_IX", "BASE_PER", "2025/2026"),
      file: true,
      ledger: true, // the fixture records the base the test passes; see the dedicated rebase test above for the rejecting case
      why: "BASE_PER lives in the XML attributes, which rawValues() does not read; the ledger-side rebase rejection is covered by its own tests",
    },
  ];

  it.each(scenarios.map((s) => [s.name, s] as const))("%s", (_name, s) => {
    const fileOk = parseCpiGroupPanel(s.xml).panel !== null;
    const ledgerOk = assembleLedgerPanel(asReads(ledgerReadsFromXml(s.xml))).panel !== null;
    expect(fileOk, "file parser verdict").toBe(s.file);
    expect(ledgerOk, `ledger verdict${s.why ? ` (${s.why})` : ""}`).toBe(s.ledger);
    // The invariant that matters: the ledger path never accepts what the file path rejects.
    if (!fileOk) expect(ledgerOk).toBe(false);
  });
});

describe("no hard-coded reference figures", () => {
  it("the assembler contains none of the October 2026 reference literals", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const src = readFileSync(join(__dirname, "ledgerPanel.ts"), "utf-8");
    for (const literal of ["2.85", "9.61", "28.61", "307.62", "34.58"]) expect(src, `ledgerPanel.ts contains ${literal}`).not.toContain(literal);
  });
});
