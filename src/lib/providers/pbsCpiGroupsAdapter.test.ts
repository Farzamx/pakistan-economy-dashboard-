// F.2b: the PBS CPI adapter. Validation (every rejection), normalisation (precision,
// dates, provenance) and the all-or-nothing contract. Pure: no network, no database.

import { describe, expect, it, vi } from "vitest";
import { validateNormalizedObservation } from "./providerAdapter";
import {
  PBS_CPI_FILE_URL,
  PBS_CPI_INDICATOR_KEYS,
  PBS_CPI_SERIES,
  PBS_SDMX_PROVIDER_ID,
  SUPPORTED_BASE_PERIODS,
  baseLabel,
  createPbsCpiGroupsAdapter,
  loadPbsCpiDataset,
  monthEnd,
  observationsFor,
} from "./pbsCpiGroupsAdapter";
import { fetchPbsCpiFile } from "./pbsCpiGroupsIngestion";
import { FULL_XML, TRIMMED_XML, duplicateObs, editSeries, rawValues, removeDataSetId, reviseGroupIndex, setAllSeriesAttr, setPrepared, setSeriesAttr, withoutMonth } from "@/lib/inflation/__fixtures__/pbsCpiVariants";

const failedIds = (xml: string) => loadPbsCpiDataset(xml).report.checks.filter((c) => c.status === "fail").map((c) => c.id);

describe("the 26 series", () => {
  it("are exactly 1 national index + 12 group indices + 12 group weights + 1 total-weight series", () => {
    expect(PBS_CPI_SERIES).toHaveLength(26);
    expect(PBS_CPI_SERIES.filter((s) => s.kind === "headlineIndex")).toHaveLength(1);
    expect(PBS_CPI_SERIES.filter((s) => s.kind === "groupIndex")).toHaveLength(12);
    expect(PBS_CPI_SERIES.filter((s) => s.kind === "groupWeight")).toHaveLength(12);
    expect(PBS_CPI_SERIES.filter((s) => s.kind === "weightTotal")).toHaveLength(1);
  });

  it("use unique, provider-qualified keys and the verified SDMX codes", () => {
    expect(new Set(PBS_CPI_INDICATOR_KEYS).size).toBe(26);
    expect(PBS_CPI_INDICATOR_KEYS.every((k) => /^pbs:cpi[A-Za-z]+\d*$/.test(k))).toBe(true);
    const by = Object.fromEntries(PBS_CPI_SERIES.map((s) => [s.indicatorKey, s.sdmxIndicator]));
    expect(by["pbs:cpiIndexNational"]).toBe("PCPI_IX");
    expect(by["pbs:cpiGroupIndex07"]).toBe("PCPI_CP_07_IX");
    expect(by["pbs:cpiGroupWeight12"]).toBe("PCPI_CP_12_WT");
    expect(by["pbs:cpiWeightTotal"]).toBe("PCPI_WT");
  });

  it("every SDMX code the adapter expects exists in the real file", () => {
    const codes = [...rawValues(FULL_XML).keys()];
    for (const s of PBS_CPI_SERIES) expect(codes, s.sdmxIndicator).toContain(s.sdmxIndicator);
  });

  it("only the base periods the adapter is certified for are supported", () => {
    expect(SUPPORTED_BASE_PERIODS).toEqual(["2015/2016"]);
  });
});

describe("a valid file", () => {
  const { dataset, report } = loadPbsCpiDataset(FULL_XML);

  it("is accepted: every check passes", () => {
    expect(report.ok).toBe(true);
    expect(report.checks.filter((c) => c.status === "fail")).toEqual([]);
    expect(dataset).not.toBeNull();
  });

  it("holds 26 series × 52 consecutive months = 1,352 observations", () => {
    expect(dataset!.series.size).toBe(26);
    expect(dataset!.months).toHaveLength(52);
    expect(dataset!.months[0]).toBe("2022-07");
    expect(dataset!.months.at(-1)).toBe("2026-10");
    expect([...dataset!.series.values()].reduce((n, s) => n + s.points.length, 0)).toBe(1352);
  });

  it("carries the file's own provenance: DataSetID, Prepared, base period, declared source", () => {
    expect(dataset!.dataSetId).toBe("2c92d746-2c93-4d9e-807e-38a79b797c10");
    expect(dataset!.preparedAt).toBe("2026-11-03T06:38:35.000Z");
    expect(dataset!.basePeriod).toBe("2015/2016");
    expect(dataset!.declaredSource).toBe("IMF SDMX Central");
    expect(dataset!.fileUrl).toBe(PBS_CPI_FILE_URL);
  });

  it("accepts the trimmed real slice too", () => {
    const r = loadPbsCpiDataset(TRIMMED_XML);
    expect(r.report.ok).toBe(true);
    expect(r.dataset!.months).toHaveLength(17);
  });
});

describe("normalisation", () => {
  const { dataset } = loadPbsCpiDataset(FULL_XML);
  const all = PBS_CPI_INDICATOR_KEYS.flatMap((k) => observationsFor(dataset!, k));

  it("produces 1,352 observations and every one passes the orchestrator's own validator", () => {
    expect(all).toHaveLength(1352);
    for (const o of all) expect(validateNormalizedObservation(o), `${o.indicatorKey}@${o.observationPeriod}`).toEqual({ valid: true });
  });

  it("uses MONTH-END observation dates, including leap-year February", () => {
    expect(monthEnd("2026-10")).toBe("2026-10-31");
    expect(monthEnd("2026-09")).toBe("2026-09-30");
    expect(monthEnd("2024-02")).toBe("2024-02-29");
    expect(monthEnd("2023-02")).toBe("2023-02-28");
    const periods = observationsFor(dataset!, "pbs:cpiIndexNational").map((o) => o.observationPeriod);
    expect(periods[0]).toBe("2022-07-31");
    expect(periods).toContain("2024-02-29");
    expect(periods.at(-1)).toBe("2026-10-31");
  });

  it("preserves FULL source precision: every value equals the file's own number exactly", () => {
    const source = rawValues(FULL_XML);
    for (const def of PBS_CPI_SERIES) {
      for (const o of observationsFor(dataset!, def.indicatorKey)) {
        const src = source.get(def.sdmxIndicator)!.get(o.observationPeriod.slice(0, 7))!;
        expect(o.value, `${def.sdmxIndicator} ${o.observationPeriod}`).toBe(src.n);
        expect((o.sourceReference as { sourceValue: string }).sourceValue).toBe(src.text);
      }
    }
    // Not rounded to two decimals (as the existing cpi_monthly_index table is).
    const oct = observationsFor(dataset!, "pbs:cpiIndexNational").at(-1)!;
    expect(oct.value).toBe(307.6230055276665);
    expect(oct.value).not.toBe(307.62);
  });

  it("preserves the source series identifier on every observation", () => {
    for (const def of PBS_CPI_SERIES) for (const o of observationsFor(dataset!, def.indicatorKey)) expect(o.sourceSeriesId).toBe(def.sdmxIndicator);
  });

  it("records the file URL, DataSetID and BASE_PER in the source reference", () => {
    const o = observationsFor(dataset!, "pbs:cpiGroupIndex07")[3];
    expect(o.sourceReference).toMatchObject({ file: PBS_CPI_FILE_URL, dataSetId: "2c92d746-2c93-4d9e-807e-38a79b797c10", sdmxIndicator: "PCPI_CP_07_IX", basePeriod: "2015/2016", frequency: "M", refArea: "PK", dataDomain: "CPI" });
  });

  it("records the source-reported Prepared timestamp as source_updated_at — and invents NO release date", () => {
    for (const o of all) {
      expect(o.sourceUpdatedAt).toBe("2026-11-03T06:38:35.000Z");
      expect(o.releaseDate).toBeNull();
    }
  });

  it("states the fixed-base-period methodology", () => {
    expect(observationsFor(dataset!, "pbs:cpiGroupIndex01")[0].methodology).toMatch(/Laspeyres.*2015\/2016/);
    expect(observationsFor(dataset!, "pbs:cpiGroupWeight01")[0].methodology).toMatch(/Fixed base-period basket weight/);
  });

  it("keeps weights, indices and totals as separate series with their own units", () => {
    expect(observationsFor(dataset!, "pbs:cpiIndexNational")[0].unit).toBe("Index (2015-16=100)");
    expect(observationsFor(dataset!, "pbs:cpiGroupIndex04")[0].unit).toBe("Index (2015-16=100)");
    expect(observationsFor(dataset!, "pbs:cpiGroupWeight04")[0].unit).toBe("% of basket");
    expect(observationsFor(dataset!, "pbs:cpiWeightTotal")[0].unit).toBe("% of basket (all groups)");
    // Weights are shares of a basket: nothing like an index level.
    for (const o of observationsFor(dataset!, "pbs:cpiGroupWeight04")) expect(o.value).toBeLessThan(100);
    for (const o of observationsFor(dataset!, "pbs:cpiGroupIndex04")) expect(o.value).toBeGreaterThan(100);
  });

  it("stores no derived quantity: only source observations, never an inflation rate or a contribution", () => {
    expect(PBS_CPI_INDICATOR_KEYS.some((k) => /yoy|mom|rate|contribution|inflation/i.test(k))).toBe(false);
  });

  it("all observations are monthly, from one provider, marked official, and carry no credential-shaped value", () => {
    for (const o of all) {
      expect(o.cadence).toBe("monthly");
      expect(o.provider).toBe(PBS_SDMX_PROVIDER_ID);
      expect(o.qualityStatus).toBe("official");
      expect(JSON.stringify(o.sourceReference)).not.toMatch(/api[_-]?key|bearer|[?&]key=/i);
    }
  });

  it("base label follows the codebase's own convention", () => {
    expect(baseLabel("2015/2016")).toBe("2015-16");
  });
});

describe("rejection: any defect rejects the WHOLE file", () => {
  function expectRejected(xml: string, expectedCheck: string) {
    const r = loadPbsCpiDataset(xml);
    expect(r.report.ok).toBe(false);
    expect(r.dataset, "a rejected file must yield no dataset at all").toBeNull();
    expect(failedIds(xml), `expected check "${expectedCheck}" to fail`).toContain(expectedCheck);
  }

  it("an unsupported base period on one index series", () => {
    expectRejected(setSeriesAttr(FULL_XML, "PCPI_CP_03_IX", "BASE_PER", "2007/2008"), "base-period");
  });

  it("an unsupported base period on every series (a rebase)", () => {
    const xml = setAllSeriesAttr(FULL_XML, "BASE_PER", "2025/2026");
    const r = loadPbsCpiDataset(xml);
    expect(r.dataset).toBeNull();
    expect(r.report.checks.find((c) => c.id === "base-period")!.detail).toMatch(/not supported[\s\S]*new base period means new weights/);
  });

  it("a missing CPI group (series absent)", () => {
    expectRejected(FULL_XML.replace(/INDICATOR="PCPI_CP_09_IX"/, 'INDICATOR="PCPI_CP_09_XX"'), "structure");
  });

  it("a series that appears twice", () => {
    const dup = /(<Series [^>]*INDICATOR="PCPI_CP_02_WT"[^>]*>[\s\S]*?<\/Series>)/.exec(FULL_XML)![1];
    expectRejected(FULL_XML.replace(dup, dup + dup), "series-unique");
  });

  it("a duplicated period within a series (the F.1 parser would silently collapse it)", () => {
    expectRejected(duplicateObs(FULL_XML, "PCPI_CP_05_IX", "2025-03"), "no-duplicates");
  });

  it("a month missing from ONE series", () => {
    expectRejected(editSeries(FULL_XML, "PCPI_CP_06_WT", (m, v) => (m === "2025-08" ? null : v)), "no-gaps");
    expect(failedIds(editSeries(FULL_XML, "PCPI_CP_06_WT", (m, v) => (m === "2025-08" ? null : v)))).toContain("same-periods");
  });

  it("a gap in EVERY series (invisible to the F.1 parser, which only compares series with each other)", () => {
    expectRejected(withoutMonth(FULL_XML, "2024-05"), "no-gaps");
  });

  it("the newest month missing from one series", () => {
    expectRejected(editSeries(FULL_XML, "PCPI_CP_11_IX", (m, v) => (m === "2026-10" ? null : v)), "same-periods");
  });

  it("non-finite or invalid values are rejected, never coerced to zero", () => {
    for (const bad of ["NaN", "", "abc", "Infinity", "1e999x", "--5"]) {
      const xml = editSeries(FULL_XML, "PCPI_CP_08_IX", (m, v) => (m === "2025-12" ? bad : v));
      const r = loadPbsCpiDataset(xml);
      expect(r.dataset, `value "${bad}"`).toBeNull();
      expect(failedIds(xml), `value "${bad}"`).toContain("values-finite");
    }
  });

  it("an invalid period label", () => {
    expectRejected(FULL_XML.replace(/TIME_PERIOD="2025-03"/, 'TIME_PERIOD="2025-13"'), "period-format");
  });

  it("weights that do not total 100 ± 0.1 (total-weight series off in one month)", () => {
    expectRejected(editSeries(FULL_XML, "PCPI_WT", (m, v) => (m === "2025-01" ? "103" : v)), "weight-total");
  });

  it("weights that do not total 100 ± 0.1 (a group weight shifted in every month)", () => {
    expectRejected(editSeries(FULL_XML, "PCPI_CP_01_WT", (_m, v) => String(Number(v) + 1)), "weight-total");
  });

  it("a weight that changes within the same base period", () => {
    expectRejected(editSeries(FULL_XML, "PCPI_CP_10_WT", (m, v) => (m === "2026-10" ? String(Number(v) + 0.05) : v)), "weights-constant");
  });

  it("a Laspeyres identity failure (group indices no longer reproduce the headline)", () => {
    const xml = editSeries(FULL_XML, "PCPI_CP_04_IX", (m, v) => (m === "2025-06" ? String(Number(v) + 5) : v));
    expectRejected(xml, "laspeyres");
    expect(loadPbsCpiDataset(xml).report.checks.find((c) => c.id === "laspeyres")!.detail).toMatch(/do not reproduce the headline index.*2025-06/);
  });

  it("a series that is not monthly, or not Pakistan", () => {
    expectRejected(setSeriesAttr(FULL_XML, "PCPI_CP_12_IX", "FREQ", "Q"), "attributes");
    expectRejected(setSeriesAttr(FULL_XML, "PCPI_IX", "REF_AREA", "IN"), "attributes");
  });

  it("an unparseable Prepared timestamp", () => {
    expectRejected(setPrepared(FULL_XML, "last Tuesday"), "header-prepared");
  });

  it("garbage, an empty document and a truncated file", () => {
    for (const xml of ["", "<html>blocked</html>", FULL_XML.slice(0, 5000)]) {
      const r = loadPbsCpiDataset(xml);
      expect(r.report.ok).toBe(false);
      expect(r.dataset).toBeNull();
    }
  });

  it("never returns a dataset together with a failed check", () => {
    const variants = [
      setSeriesAttr(FULL_XML, "PCPI_CP_03_IX", "BASE_PER", "2007/2008"),
      duplicateObs(FULL_XML, "PCPI_IX", "2024-01"),
      withoutMonth(FULL_XML, "2023-06"),
      editSeries(FULL_XML, "PCPI_CP_08_IX", (m, v) => (m === "2025-12" ? "NaN" : v)),
    ];
    for (const xml of variants) {
      const r = loadPbsCpiDataset(xml);
      expect(r.dataset === null).toBe(r.report.checks.some((c) => c.status === "fail"));
    }
  });

  it("reports EVERY failing check, not just the first", () => {
    const xml = setSeriesAttr(editSeries(FULL_XML, "PCPI_CP_08_IX", (m, v) => (m === "2025-12" ? "NaN" : v)), "PCPI_CP_03_IX", "BASE_PER", "2007/2008");
    expect(failedIds(xml)).toEqual(expect.arrayContaining(["values-finite", "base-period"]));
  });
});

describe("headers: warn, don't invent", () => {
  it("a file without <Prepared> is accepted with a warning and source_updated_at null — never inferred", () => {
    const r = loadPbsCpiDataset(setPrepared(FULL_XML, null));
    expect(r.report.ok).toBe(true);
    expect(r.report.checks.find((c) => c.id === "header-prepared")!.status).toBe("warn");
    expect(r.dataset!.preparedAt).toBeNull();
    expect(observationsFor(r.dataset!, "pbs:cpiIndexNational")[0].sourceUpdatedAt).toBeNull();
  });

  it("a file without a DataSetID is accepted with a warning and a null id", () => {
    const r = loadPbsCpiDataset(removeDataSetId(FULL_XML));
    expect(r.report.ok).toBe(true);
    expect(r.report.checks.find((c) => c.id === "header-dataset-id")!.status).toBe("warn");
    expect((observationsFor(r.dataset!, "pbs:cpiIndexNational")[0].sourceReference as { dataSetId: unknown }).dataSetId).toBeNull();
  });
});

describe("a coherent revision is NOT a corruption", () => {
  it("a revised group index with a matching headline revision is accepted", () => {
    const r = loadPbsCpiDataset(reviseGroupIndex(FULL_XML, 3, "2026-09", 1));
    expect(r.report.ok).toBe(true);
  });
});

describe("the adapter object", () => {
  const { dataset } = loadPbsCpiDataset(FULL_XML);
  const adapter = createPbsCpiGroupsAdapter(dataset!);

  it("returns each series ascending and complete, and ignores the incremental hint (the orchestrator's diff is still exact)", async () => {
    const full = await adapter.fetchObservations({ indicatorKey: "pbs:cpiGroupIndex02" });
    const hinted = await adapter.fetchObservations({ indicatorKey: "pbs:cpiGroupIndex02", sinceDate: "2026-06-01" });
    expect(full).toHaveLength(52);
    expect(hinted).toEqual(full);
    expect(full.map((o) => o.observationPeriod)).toEqual([...full.map((o) => o.observationPeriod)].sort());
  });

  it("refuses a key it does not know", async () => {
    await expect(adapter.fetchObservations({ indicatorKey: "pbs:cpiGroupIndex13" })).rejects.toThrow(/unknown indicator key/);
  });

  it("performs no network request: the orchestrator's retries re-read memory, never PBS", async () => {
    const f = vi.fn(() => { throw new Error("network must not be touched"); });
    vi.stubGlobal("fetch", f);
    try {
      await adapter.fetchObservations({ indicatorKey: "pbs:cpiIndexNational" });
      expect(f).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("fetchPbsCpiFile", () => {
  const ok = (body: string) => new Response(body, { status: 200 });
  const asFetch = (fn: (u: string) => Promise<Response>) => fn as unknown as typeof fetch;

  it("returns the body of a 200", async () => {
    expect(await fetchPbsCpiFile({ fetchImpl: asFetch(async () => ok("<x/>")), retryDelayMs: 0 })).toBe("<x/>");
  });

  it("retries a failure and succeeds on a later attempt", async () => {
    let n = 0;
    const f = asFetch(async () => (++n < 3 ? new Response("blocked", { status: 403 }) : ok("<x/>")));
    expect(await fetchPbsCpiFile({ fetchImpl: f, attempts: 3, retryDelayMs: 0 })).toBe("<x/>");
    expect(n).toBe(3);
  });

  it("throws after the last attempt — an HTTP error is a failure, never empty data", async () => {
    let n = 0;
    await expect(fetchPbsCpiFile({ fetchImpl: asFetch(async () => { n++; return new Response("blocked", { status: 403 }); }), attempts: 2, retryDelayMs: 0 })).rejects.toThrow(/HTTP 403/);
    expect(n).toBe(2);
  });

  it("refuses an oversized body", async () => {
    await expect(fetchPbsCpiFile({ fetchImpl: asFetch(async () => ok("x".repeat(2_000_001))), attempts: 1, retryDelayMs: 0 })).rejects.toThrow(/larger than expected/);
  });
});
