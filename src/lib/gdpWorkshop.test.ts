// GDP Breakdown Workshop — tests for the view-model rules.
//
// These pin the correctness constraints the workshop depends on: that sector
// shares are never normalised to 100%, that a missing observation is never
// drawn as a zero, that annual and quarterly series keep their own period
// labels, and that no level or contribution figure is derivable here.

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  GDP_DATA_LIMITATIONS,
  availablePeers,
  buildPeerComparison,
  buildSectorShares,
  latestN,
  periodLabel,
  quarterPeriodLabel,
  sectorShareNote,
  toAnnualPoints,
} from "./gdpWorkshop";

// Real values read from the live sources during the data audit.
const AGRI = [
  { month: "2023", value: 23.5 },
  { month: "2024", value: 23.73 },
  { month: "2025", value: 23.02 },
];
const IND = [
  { month: "2023", value: 20.5 },
  { month: "2024", value: 20.28 },
  { month: "2025", value: 20.06 },
];
const SRV = [
  { month: "2023", value: 50.4 },
  { month: "2024", value: 50.71 },
  { month: "2025", value: 50.93 },
];

describe("buildSectorShares", () => {
  it("keeps each sector's reported share untouched — no rebasing to 100%", () => {
    const pts = buildSectorShares(AGRI, IND, SRV);
    const latest = pts[pts.length - 1];
    expect(latest.agriculture).toBe(23.02);
    expect(latest.industry).toBe(20.06);
    expect(latest.services).toBe(50.93);
  });

  it("regression: the three shares total ~94%, and the residual is carried explicitly", () => {
    const latest = buildSectorShares(AGRI, IND, SRV).at(-1)!;
    expect(latest.total).toBeCloseTo(94.01, 2);
    expect(latest.total).not.toBeCloseTo(100, 1);
    expect(latest.residual).toBeCloseTo(5.99, 2);
    expect(latest.agriculture + latest.industry + latest.services + latest.residual).toBeCloseTo(100, 6);
  });

  it("drops a year unless all three sectors report it, so a gap never renders as a short stack", () => {
    const pts = buildSectorShares(
      [...AGRI, { month: "2026", value: 22.0 }],
      IND, // no 2026
      SRV,
    );
    expect(pts.map((p) => p.year)).toEqual(["2023", "2024", "2025"]);
  });

  it("returns oldest -> newest regardless of input order", () => {
    const pts = buildSectorShares([...AGRI].reverse(), IND, SRV);
    expect(pts.map((p) => p.year)).toEqual(["2023", "2024", "2025"]);
  });

  it("handles empty input without throwing", () => {
    expect(buildSectorShares([], [], [])).toEqual([]);
  });
});

describe("sectorShareNote", () => {
  it("reports the real total and residual from the data, not a hardcoded 94", () => {
    expect(sectorShareNote(buildSectorShares(AGRI, IND, SRV))).toEqual({
      latestTotal: 94.0,
      latestResidual: 6.0,
      latestYear: "2025",
    });
  });

  it("is null-safe when there is nothing to describe", () => {
    expect(sectorShareNote([])).toEqual({ latestTotal: null, latestResidual: null, latestYear: null });
  });
});

describe("buildPeerComparison", () => {
  const PAK = [{ month: "2024", value: 3.1 }, { month: "2025", value: 3.7 }];
  const INDIA = [{ month: "2024", value: 8.2 }, { month: "2025", value: 7.57 }];
  const BGD = [{ month: "2024", value: 4.2 }, { month: "2025", value: 3.49 }];

  it("aligns all three countries on the same years", () => {
    const pts = buildPeerComparison({ PAK, IND: INDIA, BGD }, 10);
    expect(pts).toEqual([
      { year: "2024", PAK: 3.1, IND: 8.2, BGD: 4.2 },
      { year: "2025", PAK: 3.7, IND: 7.57, BGD: 3.49 },
    ]);
  });

  it("a missing observation is null, never 0 — 0 would read as zero growth", () => {
    const pts = buildPeerComparison({ PAK, IND: [{ month: "2025", value: 7.57 }], BGD }, 10);
    const y2024 = pts.find((p) => p.year === "2024")!;
    expect(y2024.IND).toBeNull();
    expect(y2024.IND).not.toBe(0);
  });

  it("availablePeers names only the countries that actually have data", () => {
    const partial = buildPeerComparison({ PAK, BGD }, 10);
    expect(availablePeers(partial)).toEqual(["PAK", "BGD"]);
    expect(availablePeers(buildPeerComparison({ PAK, IND: INDIA, BGD }, 10))).toEqual(["PAK", "IND", "BGD"]);
  });

  it("Pakistan is available for this metric, so the comparison is not India/Bangladesh-only", () => {
    // All three come from the same World Bank indicator; the audit confirmed
    // 30 points each. If PAK ever dropped out, availablePeers would say so
    // and the page would name the peers it actually has.
    expect(availablePeers(buildPeerComparison({ PAK, IND: INDIA, BGD }, 10))).toContain("PAK");
  });

  it("keeps the most recent N years, oldest -> newest", () => {
    const long = Array.from({ length: 30 }, (_, i) => ({ month: String(1996 + i), value: i }));
    const pts = buildPeerComparison({ PAK: long }, 5);
    expect(pts.map((p) => p.year)).toEqual(["2021", "2022", "2023", "2024", "2025"]);
  });

  it("no country data yields an empty comparison rather than an empty-looking chart", () => {
    expect(buildPeerComparison({}, 10)).toEqual([]);
    expect(availablePeers([])).toEqual([]);
  });
});

describe("period labelling", () => {
  it("annual periods read as calendar years", () => {
    expect(periodLabel(toAnnualPoints([{ month: "1996", value: 1 }, { month: "2025", value: 3.7 }]))).toBe("1996–2025");
    expect(periodLabel([{ year: "2025" }])).toBe("2025");
    expect(periodLabel([])).toBeNull();
  });

  it("quarterly periods keep the source's fiscal-quarter labels, not calendar years", () => {
    const trend = [{ month: "Q1 FY17", value: 1 }, { month: "Q4 FY26", value: 2 }];
    expect(quarterPeriodLabel(trend)).toBe("Q1 FY17–Q4 FY26");
    // Must not be reformatted into calendar years — the source is fiscal.
    expect(quarterPeriodLabel(trend)).toMatch(/FY/);
    expect(quarterPeriodLabel([])).toBeNull();
  });
});

describe("latestN", () => {
  const s = [1, 2, 3, 4, 5];
  it("takes the most recent items, oldest -> newest", () => expect(latestN(s, 3)).toEqual([3, 4, 5]));
  it("returns a copy when asked for more than exists", () => {
    const out = latestN(s, 99);
    expect(out).toEqual(s);
    expect(out).not.toBe(s);
  });
  it("does not mutate its input", () => {
    latestN(s, 2);
    expect(s).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("data limitations are stated, not worked around", () => {
  it("names all four missing quantities", () => {
    const text = GDP_DATA_LIMITATIONS.map((l) => `${l.title} ${l.detail}`).join(" ").toLowerCase();
    expect(text).toContain("nominal");
    expect(text).toContain("real gdp level");
    expect(text).toContain("expenditure");
    expect(text).toContain("per-sector growth");
    expect(text).toContain("contribution");
  });

  it("the module exposes no level or contribution builder", async () => {
    const mod = await import("./gdpWorkshop");
    const names = Object.keys(mod).join(" ").toLowerCase();
    for (const forbidden of ["nominal", "level", "contribution", "expenditure"]) {
      expect(names, forbidden).not.toContain(forbidden);
    }
  });

  it("source check: the workshop page fetches only the audited GDP functions", () => {
    const page = fs.readFileSync(path.resolve(__dirname, "../app/gdp-breakdown-workshop/page.tsx"), "utf8");
    // Exactly the functions the audit verified.
    for (const fn of ["getGdpSectorComposition", "getGdpGrowthHistory", "getQuarterlyGdpKpi"]) {
      expect(page, fn).toContain(fn);
    }
    // No new provider or series smuggled in.
    for (const banned of ["NY.GDP.MKTP.CD", "NY.GDP.MKTP.KN", "fetchIndicator", "NE.CON", "NE.GDI"]) {
      expect(page, banned).not.toContain(banned);
    }
  });

  it("source check: no economic figure is hardcoded in the page", () => {
    const page = fs.readFileSync(path.resolve(__dirname, "../app/gdp-breakdown-workshop/page.tsx"), "utf8");
    // The audit's real values must come from the data layer, never literals.
    for (const literal of ["23.02", "20.06", "50.93", "3.7%", "7.57"]) {
      expect(page, literal).not.toContain(literal);
    }
  });
});
