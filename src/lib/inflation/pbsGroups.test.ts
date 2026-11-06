// The PBS SDMX parser is the gate in front of every category chart: a file that
// does not describe a coherent CPI basket must be REJECTED, not drawn.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CPI_GROUP_COUNT, LASPEYRES_TOLERANCE, parseCpiGroupPanel } from "./pbsGroups";

const REAL = readFileSync(join(__dirname, "__fixtures__", "pbsCpiSample.xml"), "utf-8");

/** Rewrite one series' observations in the real fixture. */
function mutateSeries(xml: string, indicator: string, fn: (month: string, value: number) => number | null): string {
  return xml.replace(new RegExp(`(<Series [^>]*INDICATOR="${indicator}"[^>]*>)([\\s\\S]*?)(</Series>)`), (_m, open, body, close) => {
    const next = (body as string).replace(/<Obs TIME_PERIOD="([^"]+)" OBS_VALUE="([^"]+)"\/>/g, (_o, t, v) => {
      const out = fn(t, Number(v));
      return out === null ? "" : `<Obs TIME_PERIOD="${t}" OBS_VALUE="${out}"/>`;
    });
    return `${open}${next}${close}`;
  });
}

describe("parseCpiGroupPanel — the real PBS file", () => {
  const { panel, issues } = parseCpiGroupPanel(REAL);

  it("is accepted with no issues", () => {
    expect(issues).toEqual([]);
    expect(panel).not.toBeNull();
  });

  it("covers 17 months, June 2025 – October 2026, for every series", () => {
    expect(panel!.months).toHaveLength(17);
    expect(panel!.months[0]).toBe("2025-06");
    expect(panel!.months.at(-1)).toBe("2026-10");
    for (const g of panel!.groups) expect([...g.index.keys()].sort()).toEqual(panel!.months);
  });

  it("returns the 12 groups in PBS order with PBS's published fixed weights", () => {
    expect(panel!.groups).toHaveLength(CPI_GROUP_COUNT);
    expect(panel!.groups.map((g) => g.groupNo)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    // Weights as printed in PBS's monthly report (2 dp): the SDMX values round to them.
    const published = [34.58, 1.02, 8.6, 23.63, 4.1, 2.79, 5.91, 2.21, 1.59, 3.79, 6.92, 4.87];
    panel!.groups.forEach((g, i) => expect(g.weight).toBeCloseTo(published[i], 1));
    expect(panel!.groups.reduce((s, g) => s + g.weight, 0)).toBeCloseTo(100, 1);
  });

  it("reads an index LEVEL (base 2015-16 = 100), never a rate", () => {
    expect(panel!.headlineIndex.get("2026-10")).toBeCloseTo(307.62, 1);
    for (const g of panel!.groups) for (const v of g.index.values()) expect(v).toBeGreaterThan(100);
  });

  it("satisfies the fixed-weight identity in every month", () => {
    const wSum = panel!.groups.reduce((s, g) => s + g.weight, 0);
    for (const m of panel!.months) {
      const agg = panel!.groups.reduce((s, g) => s + g.weight * (g.index.get(m) as number), 0) / wSum;
      expect(Math.abs(agg - (panel!.headlineIndex.get(m) as number))).toBeLessThan(LASPEYRES_TOLERANCE);
    }
  });
});

describe("parseCpiGroupPanel — rejects an incoherent file", () => {
  it("rejects a file with no headline index", () => {
    const r = parseCpiGroupPanel(REAL.replace(/INDICATOR="PCPI_IX"/, 'INDICATOR="SOMETHING_ELSE"'));
    expect(r.panel).toBeNull();
    expect(r.issues[0]).toMatch(/PCPI_IX/);
  });

  it("rejects a missing group series", () => {
    const r = parseCpiGroupPanel(REAL.replace(/INDICATOR="PCPI_CP_07_IX"/, 'INDICATOR="PCPI_CP_07_XX"'));
    expect(r.panel).toBeNull();
    expect(r.issues.join(" ")).toMatch(/Group 7/);
  });

  it("rejects a group missing a month rather than reading it as zero", () => {
    const r = parseCpiGroupPanel(mutateSeries(REAL, "PCPI_CP_03_IX", (m, v) => (m === "2026-03" ? null : v)));
    expect(r.panel).toBeNull();
    expect(r.issues.join(" ")).toMatch(/Group 3.*cover exactly/);
  });

  it("rejects non-constant weights (the fixed-weight identity would not hold)", () => {
    const r = parseCpiGroupPanel(mutateSeries(REAL, "PCPI_CP_01_WT", (m, v) => (m === "2026-10" ? v + 1 : v)));
    expect(r.panel).toBeNull();
    expect(r.issues.join(" ")).toMatch(/not constant/);
  });

  it("rejects groups that do not reproduce the headline (identity violated)", () => {
    // Nudge one group's index in one month by +5 points: ~1.7 index points on the aggregate.
    const r = parseCpiGroupPanel(mutateSeries(REAL, "PCPI_CP_04_IX", (m, v) => (m === "2026-01" ? v + 5 : v)));
    expect(r.panel).toBeNull();
    expect(r.issues.join(" ")).toMatch(/do not reproduce the headline.*2026-01/);
  });

  it("rejects an implausible index value", () => {
    const r = parseCpiGroupPanel(mutateSeries(REAL, "PCPI_CP_09_IX", (m, v) => (m === "2025-12" ? 9 : v)));
    expect(r.panel).toBeNull();
    expect(r.issues.join(" ")).toMatch(/implausible/);
  });

  it("never returns a panel together with issues", () => {
    for (const bad of ["", "<garbage/>", REAL.slice(0, 3000)]) {
      const r = parseCpiGroupPanel(bad);
      expect(r.panel === null).toBe(r.issues.length > 0);
    }
  });

  it("ignores observations with non-numeric values instead of treating them as zero", () => {
    const xml = REAL.replace(/(INDICATOR="PCPI_CP_02_IX"[^>]*><Obs TIME_PERIOD="2025-06" OBS_VALUE=")[^"]+/, "$1NaN");
    const r = parseCpiGroupPanel(xml);
    expect(r.panel).toBeNull();
    expect(r.issues.join(" ")).toMatch(/Group 2/);
  });
});
