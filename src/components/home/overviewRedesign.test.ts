// Unit tests for the Overview redesign's pure modules: formatting, the release-calendar grouping and the macro summary template.
// No rendering, no I/O.

import { describe, expect, it } from "vitest";
import type { IntelligenceSignal } from "@/lib/intelligence/types";
import { buildMacroSummary } from "./macroSummary";
import { addDays, cleanSourceName, dropInterbank, endOfWeek, extractMonthYear, formatHeadlineTime, formatObservation, formatShortDay, pktDateIso, splitChange } from "./overviewFormat";
import { buildReleaseRows, groupReleaseRows, nextReleaseBySeries, type ReleaseEventInput } from "./releaseGroups";
import { splitComparison, statusFor } from "./valueDisplay";

describe("one date format", () => {
  it("monthly series show the month, never a month-end day", () => {
    expect(formatObservation("2026-10-31", "Monthly")).toBe("Oct 2026");
    expect(formatObservation("2026-10-31", "Quarterly")).toBe("Oct 2026");
  });
  it("daily and weekly series show the day", () => {
    expect(formatObservation("2026-11-16", "Daily")).toBe("16 Nov 2026");
    expect(formatObservation("2026-11-12", "Weekly")).toBe("12 Nov 2026");
    expect(formatObservation("2026-11-06", "As-Needed")).toBe("6 Nov 2026");
  });
  it("annual series are fiscal years; a bare year stays a year; unknown is a dash", () => {
    expect(formatObservation("2025-06-30", "Annual")).toBe("FY2025");
    expect(formatObservation("2024", undefined)).toBe("2024");
    expect(formatObservation(null)).toBe("—");
    expect(formatObservation(undefined)).toBe("—");
  });
  it("never produces a two-digit year", () => {
    for (const [d, f] of [["2026-10-31", "Monthly"], ["2026-11-16", "Daily"], ["2025-06-30", "Annual"]] as const) {
      expect(formatObservation(d, f)).toMatch(/\d{4}|FY\d{4}/);
      expect(formatObservation(d, f)).not.toMatch(/'\d{2}\b/);
    }
  });
});

describe("source names are institutions, not files", () => {
  it("strips file names and fallback notes", () => {
    expect(cleanSourceName("SBP Forex_Arch.xlsx")).toBe("SBP");
    expect(cleanSourceName("SBP Forex_Arch.xlsx (fallback)")).toBe("SBP");
    expect(cleanSourceName("SBP EasyData (fallback)")).toBe("SBP");
    expect(cleanSourceName("PBS Official Releases")).toBe("PBS");
    expect(cleanSourceName("Yahoo Finance (fallback)")).toBe("Yahoo Finance");
    expect(cleanSourceName("World Bank")).toBe("World Bank");
    expect(cleanSourceName(undefined)).toBe("");
  });
});

describe("change strings: direction is a glyph, not a colour", () => {
  it("splits the sign off and keeps the rest", () => {
    expect(splitChange("-0.7 pp vs Sep 2026")).toEqual({ direction: "down", text: "0.7 pp vs Sep 2026" });
    expect(splitChange("+0.50 pp vs 28 Apr 2026")).toEqual({ direction: "up", text: "0.50 pp vs 28 Apr 2026" });
    expect(splitChange("0.00 pp vs last week")).toEqual({ direction: "flat", text: "0.00 pp vs last week" });
    expect(splitChange("1,234.5 vs prev")?.direction).toBe("up");
  });
  it("brings dates in data-layer change strings to the page's one format", () => {
    expect(splitChange("0.0B vs 24 Jul '26")).toEqual({ direction: "flat", text: "0.0B vs 24 Jul 2026" });
    expect(splitChange("+1.2% vs Mar '26")?.text).toBe("1.2% vs Mar 2026");
    expect(splitChange("-0.03 vs prev close · interbank Nov 16, 2026")?.text).toBe("0.03 vs prev close · interbank 16 Nov 2026");
    expect(splitChange("-35.20 vs prev close · Nov 16")?.text).toBe("35.20 vs prev close · 16 Nov");
    // already in the page format: untouched (the "20" of a year is not a day)
    expect(splitChange("-0.7 pp vs Sep 2026")?.text).toBe("0.7 pp vs Sep 2026");
    expect(splitChange("+0.50 pp vs 28 Apr 2026")?.text).toBe("0.50 pp vs 28 Apr 2026");
  });
  it("returns null for strings with no leading number (so a provider's text sentinel is never shown as a change)", () => {
    expect(splitChange("fallback snapshot — live rate unavailable")).toBeNull();
    expect(splitChange("YoY change")).toBeNull();
    expect(splitChange("No prior period")).toBeNull();
    expect(splitChange(undefined)).toBeNull();
  });
});

describe("FX market quotes are not labelled interbank", () => {
  it("drops the word from both shapes of the Yahoo FX change string (fxRates.ts)", () => {
    expect(dropInterbank("-0.03 vs prev close · interbank Nov 16, 2026")).toBe("-0.03 vs prev close · Nov 16, 2026");
    expect(splitChange(dropInterbank("-0.03 vs prev close · interbank Nov 16, 2026"))?.text).toBe("0.03 vs prev close · 16 Nov 2026");
    expect(dropInterbank("interbank · Nov 16, 2026")).toBe("Nov 16, 2026");
    expect(dropInterbank("+1.25 vs prev close")).toBe("+1.25 vs prev close");
    expect(dropInterbank(undefined)).toBeUndefined();
  });
});

describe("change colour applies to the figure, not the comparison", () => {
  it("splits the figure from the comparison text", () => {
    expect(splitComparison("0.50 pp vs 28 Apr 2026")).toEqual({ figure: "0.50 pp", comparison: "vs 28 Apr 2026" });
    expect(splitComparison("0.03 vs prev close · 16 Nov 2026")).toEqual({ figure: "0.03", comparison: "vs prev close · 16 Nov 2026" });
    expect(splitComparison("1.9%")).toEqual({ figure: "1.9%", comparison: null });
  });
});

describe("status", () => {
  it("names the freshness engine's verdict", () => {
    expect(statusFor("current", false)).toEqual({ tone: "current", label: "Current" });
    expect(statusFor("delayed-release", false)).toEqual({ tone: "delayed", label: "Delayed" });
    expect(statusFor("ingestion-lagging", false).label).toBe("Delayed");
    expect(statusFor("stale", false)).toEqual({ tone: "stale", label: "Stale" });
    expect(statusFor("source-unavailable", false).tone).toBe("stale");
    expect(statusFor(undefined, false).label).toBe("Current");
  });
  it("a series with a release on today's calendar is Due today whatever its freshness state (Trade Balance and LSM were showing Stale)", () => {
    for (const state of ["current", "stale", "delayed-release", "ingestion-lagging", "source-unavailable", undefined] as const) {
      expect(statusFor(state, true)).toEqual({ tone: "due", label: "Due today" });
    }
  });
});

describe("Pakistan dates", () => {
  it("today is the Pakistan date, not UTC", () => {
    // 20:30 UTC on 15 Nov is already 16 Nov in Karachi (UTC+5).
    expect(pktDateIso(new Date("2026-11-15T20:30:00Z"))).toBe("2026-11-16");
    expect(pktDateIso(new Date("2026-11-15T18:30:00Z"))).toBe("2026-11-15");
  });
  it("week ends on Sunday; day arithmetic has no timezone shift", () => {
    expect(endOfWeek("2026-11-16")).toBe("2026-11-22"); // a Monday
    expect(endOfWeek("2026-11-22")).toBe("2026-11-22"); // a Sunday
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(formatShortDay("2026-11-16")).toBe("Mon 16 Nov");
  });
  it("headline times: clock for today, day-month otherwise, null for garbage", () => {
    expect(formatHeadlineTime("2026-11-16T03:14:00Z", "2026-11-16")).toBe("08:14");
    expect(formatHeadlineTime("2026-11-14T09:54:00Z", "2026-11-16")).toBe("14 Nov");
    expect(formatHeadlineTime("not a date", "2026-11-16")).toBeNull();
  });
  it("finds the period in a release title", () => {
    expect(extractMonthYear("CPI Inflation — October 2026")).toEqual({ long: "October 2026", short: "Oct" });
    expect(extractMonthYear("SPI Weekly Inflation Release")).toBeNull();
  });
});

const ev = (date: string, slug: string, title: string, importance: "High" | "Medium" | "Low" = "Medium"): ReleaseEventInput => ({
  eventDate: date,
  title,
  importance,
  series: { slug, title: title.replace(/\s*[—-]\s*\w+ \d{4}$/, "") },
});

describe("release calendar grouping", () => {
  const today = "2026-11-16";
  const events = [
    ev("2026-11-16", "exports-release", "Exports — October 2026"),
    ev("2026-11-16", "imports-release", "Imports — October 2026"),
    ev("2026-11-16", "trade-balance", "Trade Balance — October 2026"),
    ev("2026-11-16", "large-scale-manufacturing-lsm-growth", "Large Scale Manufacturing — September 2026"),
    ev("2026-11-19", "spi-weekly-inflation-release", "SPI Weekly Inflation Release", "Low"),
    ev("2026-12-01", "cpi-inflation-release", "CPI Inflation Release — November 2026", "High"),
    ev("2026-12-01", "core-inflation-release", "Core Inflation Release — November 2026"),
    ev("2026-12-09", "worker-remittances", "Worker Remittances — November 2026"),
    ev("2026-11-10", "worker-remittances", "Worker Remittances — October 2026"), // past: never shown
  ];

  it("merges exports, imports and trade balance into one row, and CPI with core inflation", () => {
    const rows = buildReleaseRows(events, today);
    const trade = rows.find((r) => r.title === "Foreign trade statistics");
    expect(trade?.subtitle).toBe("Exports, imports, trade balance · October 2026");
    expect(trade?.seriesSlugs.sort()).toEqual(["exports-release", "imports-release", "trade-balance"]);
    expect(trade?.pillLabel).toBe("Foreign trade (Oct)");
    const cpi = rows.find((r) => r.title === "CPI and core inflation");
    expect(cpi?.importance).toBe("High"); // the highest of the merged members
    expect(cpi?.subtitle).toBe("November 2026");
    expect(rows.filter((r) => r.title.includes("Exports"))).toHaveLength(0);
  });

  it("drops past events and sorts soonest first", () => {
    const rows = buildReleaseRows(events, today);
    expect(rows.map((r) => r.date)).toEqual([...rows.map((r) => r.date)].sort());
    expect(rows.some((r) => r.date < today)).toBe(false);
  });

  it("groups into Today / This week / Coming up, capped", () => {
    const g = groupReleaseRows(buildReleaseRows(events, today), today);
    expect(g.today.map((r) => r.title)).toEqual(["Foreign trade statistics", "Large Scale Manufacturing"]);
    expect(g.thisWeek.map((r) => r.title)).toEqual(["Weekly SPI"]);
    expect(g.thisWeek[0].subtitle).toBe("Thu 19 Nov · Sensitive Price Indicator");
    expect(g.comingUp.map((r) => r.title)).toEqual(["CPI and core inflation", "Worker remittances"]);
    expect(g.comingUp[0].subtitle).toBe("Tue 1 Dec · November 2026");
  });

  it("next release per series is the earliest date today or later", () => {
    const next = nextReleaseBySeries(events, today);
    expect(next.get("worker-remittances")).toBe("2026-12-09");
    expect(next.get("exports-release")).toBe("2026-11-16");
    expect(next.has("nothing")).toBe(false);
  });
});

describe("macro summary template", () => {
  const sig = (id: string, label: string, state: string, direction: IntelligenceSignal["direction"], availability: "Fresh" | "Stale" = "Fresh"): IntelligenceSignal => ({
    id,
    dimension: "Inflation",
    label,
    state,
    direction,
    confidence: "High",
    confidenceScore: 80,
    summary: "",
    evidence: [{ seriesId: "x", label, value: 1, unit: "%", observationPeriod: "2026-10-31", direction, changeAbsolute: 0, changePercent: 0, acceleration: "Unknown", availability, freshnessState: "current", freshnessReason: "", isFallback: false }],
    missingInputs: [],
    calculatedAt: "2026-11-16T00:00:00Z",
  });
  const signals = [
    sig("inflation", "Inflation", "falling", "Falling"),
    sig("monetary-policy", "Monetary Policy", "tightening", "Rising"),
    sig("growth", "Growth", "accelerating", "Rising", "Stale"),
    sig("liquidity-credit", "Liquidity & Credit", "insufficient-data", "Unknown"),
  ];

  it("builds a deterministic headline, counts rated dimensions and lists unrated ones", () => {
    const s = buildMacroSummary(signals, { growth: { text: "GDP growth 2.5% · 2025", note: "annual data" } }, { cpi: { value: "9.6", period: "Oct 2026" }, policyRate: { value: "12.00" }, realRate: "+2.4" });
    expect(s.headline).toBe("Inflation is falling while policy is tightening.");
    expect(s.ratedCount).toBe(3);
    expect(s.totalCount).toBe(4);
    expect(s.unrated).toEqual(["Liquidity & credit"]);
    expect(s.sentences[0]).toBe("CPI inflation was 9.6% in Oct 2026 against a 12.00% policy rate, a real policy rate of +2.4 pp.");
  });

  it("marks annual inputs and the page's own stale status on the row, in sentence case with a direction glyph", () => {
    const s = buildMacroSummary(
      signals,
      { growth: { text: "GDP growth 2.5% · 2025", note: "annual data", status: { tone: "stale" } }, inflation: { text: "CPI 9.6%", status: { tone: "delayed" } } },
      {},
    );
    const growth = s.rows.find((r) => r.id === "growth")!;
    expect(growth.state).toBe("Accelerating");
    expect(growth.caution).toBe("annual data · stale input");
    expect(growth.glyph).toBe("▲");
    expect(s.rows.find((r) => r.id === "inflation")?.caution).toBe("delayed input");
    expect(s.rows.find((r) => r.id === "monetary-policy")?.label).toBe("Monetary policy");
  });

  it("takes freshness ONLY from the page's status for the series it names, never from the engine's other evidence", () => {
    // The growth signal above carries evidence with availability "Stale"; the page says its input is current (or gives no status): no caution.
    const current = buildMacroSummary(signals, { growth: { text: "GDP growth 2.5% · 2025", status: { tone: "current" } } }, {});
    expect(current.rows.find((r) => r.id === "growth")?.caution).toBeNull();
    const none = buildMacroSummary(signals, { growth: { text: "GDP growth 2.5% · 2025" } }, {});
    expect(none.rows.find((r) => r.id === "growth")?.caution).toBeNull();
    // A release due today is not a caution: the new figure is expected, the strip and table already say "Due today".
    const due = buildMacroSummary(signals, { growth: { text: "x", status: { tone: "due" } } }, {});
    expect(due.rows.find((r) => r.id === "growth")?.caution).toBeNull();
  });

  it("Mixed and a policy hold are not directions: they take the neutral glyph whatever the direction field says", () => {
    const s = buildMacroSummary([sig("market-stress", "Market Stress", "mixed", "Falling"), sig("monetary-policy", "Monetary Policy", "held", "Rising")], {}, {});
    expect(s.rows.find((r) => r.id === "market-stress")?.glyph).toBe("◆");
    expect(s.rows.find((r) => r.id === "monetary-policy")?.glyph).toBe("◆");
  });

  it("is identical for identical inputs (no randomness, no clock)", () => {
    const a = buildMacroSummary(signals, {}, {});
    const b = buildMacroSummary(signals, {}, {});
    expect(a).toEqual(b);
  });
});
