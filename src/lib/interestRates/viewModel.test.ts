// The dashboard view model and the CSV writer: what the page shows is dated, sourced, sized and consistent with the datasets.

import { describe, expect, it } from "vitest";
import { csvText } from "@/components/interestRates/CsvButton";
import { buildDashboard, monthsBefore, toAuctionRecords } from "./viewModel";
import { tbillAuctions } from "./dataset";

const m = buildDashboard();

describe("view model", () => {
  it("every tile carries a date and a kind; the corridor tile shows its band, not a single number", () => {
    for (const t of m.tiles) {
      expect(t.dateLabel.length).toBeGreaterThan(0);
      expect(t.kind).toBeTruthy();
    }
    expect(m.tiles.find((t) => t.id === "corridor")).toMatchObject({ value: null, display: "11% – 13%" });
    expect(m.tiles.find((t) => t.id === "walr")!.dateLabel).toBe("Oct 2026 (provisional)");
  });

  it("the real policy rate tile agrees with the Fisher formula used elsewhere on the page", () => {
    expect(m.tiles.find((t) => t.id === "real")!.value).toBeCloseTo((1.12 / 1.096 - 1) * 100, 10);
  });

  it("monthly chart points are labelled with the number of days averaged", () => {
    expect(m.overview.kibor6mMonthly.at(-1)!.note).toMatch(/^monthly average of \d+ daily fixings$/);
    expect(m.corridor.orrMonthly.at(-1)!.note).toMatch(/^monthly average of \d+ days$/);
  });

  it("the lag table covers lags 0, 1, 3, 6 and 12 for three rates, each with its sample size", () => {
    expect(m.transmission.lags).toHaveLength(3);
    for (const t of m.transmission.lags) {
      expect(t.rows.map((r) => r.lag)).toEqual([0, 1, 3, 6, 12]);
      for (const r of t.rows) expect(r.n).toBeGreaterThan(200);
    }
  });

  it("every statistic and period comparison reports n", () => {
    for (const s of m.stats) expect(s.stats!.n).toBeGreaterThan(0);
    for (const p of m.periods) for (const x of p.metrics) expect(x.stats === null || x.stats.n > 0).toBe(true);
    expect(m.periods[0].period.definition).toMatch(/^Calendar months Jul 2016 to Jun 2018 inclusive\. Policy rate 5\.75% /);
  });

  it("the coverage matrix lists observed and derived series separately and every row has a source", () => {
    expect(m.coverage.filter((r) => r.kind === "Derived").length).toBe(6);
    for (const r of m.coverage) expect(r.source.length).toBeGreaterThan(0);
  });

  it("auction records for the curve explorer keep yields and outcomes and set unknown amounts to null, never zero", () => {
    const recs = toAuctionRecords("tbill", tbillAuctions());
    expect(recs.at(-1)!.auctionDate).toBe("2026-11-25");
    const t = recs.at(-1)!.tenors["3M"]!;
    expect(t.outcome).toBe("accepted");
    expect([t.offered, t.acceptedCompetitive, t.target]).toEqual([null, null, null]);
  });

  it("monthsBefore clamps to the month's last day", () => {
    expect(monthsBefore("2026-03-31", 1)).toBe("2026-02-28");
    expect(monthsBefore("2026-11-25", 24)).toBe("2024-11-25");
  });
});

describe("CSV writer", () => {
  it("writes provenance notes first, quotes commas, keeps nulls empty and neutralises formula-like text", () => {
    const t = csvText({ head: ["date", "value", "note"], rows: [["2026-01-02", 12.5, "a, b"], ["2026-01-03", null, "=HYPERLINK(1)"], ["2026-01-04", -0.49, "-x"]], notes: ["Source: SBP"] });
    expect(t).toBe('# Source: SBP\r\ndate,value,note\r\n2026-01-02,12.5,"a, b"\r\n2026-01-03,,\'=HYPERLINK(1)\r\n2026-01-04,-0.49,\'-x\r\n');
  });
});
