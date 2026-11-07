// The two new fetch paths must degrade, never throw: a provider failure takes
// out one section of the Inflation page, not the page.

import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getCpiGroupPanel, PBS_CPI_SDMX_URL } from "./pbsCpiGroups";
import { getWorldBankInflation, parseWorldBankInflation, WB_INFLATION_INDICATOR } from "./worldBankInflation";

const FIXTURE = readFileSync(join(__dirname, "..", "inflation", "__fixtures__", "pbsCpiSample.xml"), "utf-8");
const ok = (body: string) => new Response(body, { status: 200 });
const asFetch = (fn: (url: string) => Promise<Response>) => fn as unknown as typeof fetch;

describe("getCpiGroupPanel", () => {
  it("requests the same PBS file the headline-index sync uses", () => {
    const sync = readFileSync(join(__dirname, "..", "economicCalendar", "automation", "syncCpiFromPbs.ts"), "utf-8");
    expect(sync).toContain(PBS_CPI_SDMX_URL);
  });

  it("parses a valid file into a panel", async () => {
    const f = vi.fn<(url: string) => Promise<Response>>(async () => ok(FIXTURE));
    const r = await getCpiGroupPanel(asFetch(f));
    expect(r.issues).toEqual([]);
    expect(r.panel?.groups).toHaveLength(12);
    expect(f.mock.calls[0][0]).toBe(PBS_CPI_SDMX_URL);
  });

  it("returns null with a reason on HTTP failure", async () => {
    const r = await getCpiGroupPanel(asFetch(async () => new Response("blocked", { status: 403 })));
    expect(r.panel).toBeNull();
    expect(r.issues[0]).toMatch(/HTTP 403/);
  });

  it("returns null with a reason when the request throws (network error, timeout)", async () => {
    const r = await getCpiGroupPanel(asFetch(async () => { throw new Error("socket hang up"); }));
    expect(r.panel).toBeNull();
    expect(r.issues[0]).toMatch(/socket hang up/);
  });

  it("returns null — not a partial panel — when the file fails its integrity checks", async () => {
    const corrupt = FIXTURE.replace(/(INDICATOR="PCPI_CP_04_IX"[^>]*><Obs TIME_PERIOD="2025-06" OBS_VALUE=")[^"]+/, "$11");
    const r = await getCpiGroupPanel(asFetch(async () => ok(corrupt)));
    expect(r.panel).toBeNull();
    expect(r.issues.length).toBeGreaterThan(0);
  });

  it("does not try to parse an absurdly large body", async () => {
    const r = await getCpiGroupPanel(asFetch(async () => ok("x".repeat(2_000_001))));
    expect(r.panel).toBeNull();
    expect(r.issues[0]).toMatch(/larger than expected/);
  });
});

function wbBody(rows: { c: string; y: string; v: number | null; ind?: string }[]) {
  return [
    { page: 1, pages: 1, per_page: 500, total: rows.length, lastupdated: "2026-10-08" },
    rows.map((r) => ({ indicator: { id: r.ind ?? WB_INFLATION_INDICATOR }, countryiso3code: r.c, date: r.y, value: r.v })),
  ];
}

describe("parseWorldBankInflation", () => {
  it("keeps real negatives (Sri Lanka 2025 deflation) and orders years ascending", () => {
    const out = parseWorldBankInflation(wbBody([
      { c: "LKA", y: "2025", v: -4.76 },
      { c: "LKA", y: "2024", v: -0.43 },
      { c: "PAK", y: "2025", v: 3.55 },
      { c: "PAK", y: "2024", v: 12.63 },
    ]))!;
    expect(out.series.LKA).toEqual([{ year: 2024, value: -0.43 }, { year: 2025, value: -4.76 }]);
    expect(out.lastUpdated).toBe("2026-10-08");
  });

  it("keeps a null INSIDE the observed range as a gap, and drops years after the newest published value", () => {
    const out = parseWorldBankInflation(wbBody([
      { c: "PAK", y: "2026", v: null }, // not yet published anywhere: not a gap
      { c: "PAK", y: "2025", v: 3.55 },
      { c: "IND", y: "2026", v: null },
      { c: "IND", y: "2025", v: null }, // India missing for a year others have: a real gap
      { c: "IND", y: "2024", v: 4.95 },
    ]))!;
    expect(out.series.PAK).toEqual([{ year: 2025, value: 3.55 }]);
    expect(out.series.IND).toEqual([{ year: 2024, value: 4.95 }, { year: 2025, value: null }]);
  });

  it("ignores rows for a different indicator or an unlisted country", () => {
    const out = parseWorldBankInflation(wbBody([
      { c: "PAK", y: "2025", v: 3.55 },
      { c: "PAK", y: "2025", v: 99, ind: "NY.GDP.MKTP.KD.ZG" },
      { c: "USA", y: "2025", v: 2.9 },
    ]))!;
    expect(out.series.PAK).toEqual([{ year: 2025, value: 3.55 }]);
    expect(out.series.USA).toBeUndefined();
  });

  it("returns null for a malformed or empty response", () => {
    expect(parseWorldBankInflation(null)).toBeNull();
    expect(parseWorldBankInflation([{}, null])).toBeNull();
    expect(parseWorldBankInflation(wbBody([]))).toBeNull();
    expect(parseWorldBankInflation(wbBody([{ c: "PAK", y: "2025", v: null }]))).toBeNull();
  });
});

describe("getWorldBankInflation", () => {
  it("asks for the one inflation indicator for all four countries in a single request", async () => {
    const f = vi.fn<(url: string) => Promise<Response>>(async () => ok(JSON.stringify(wbBody([{ c: "PAK", y: "2025", v: 3.55 }]))));
    await getWorldBankInflation(asFetch(f));
    expect(f).toHaveBeenCalledTimes(1);
    const url = String(f.mock.calls[0][0]);
    expect(url).toContain("PAK;IND;BGD;LKA");
    expect(url).toContain(WB_INFLATION_INDICATOR);
  });

  it("returns null on HTTP failure or a thrown error", async () => {
    expect(await getWorldBankInflation(asFetch(async () => new Response("", { status: 503 })))).toBeNull();
    expect(await getWorldBankInflation(asFetch(async () => { throw new Error("timeout"); }))).toBeNull();
  });
});
