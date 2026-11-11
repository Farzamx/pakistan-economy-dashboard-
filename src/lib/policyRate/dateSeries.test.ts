// Rows for a time-axis chart from series observed on different dates: nothing is resampled, a step holds, an observed line breaks across a long gap.

import { describe, expect, it } from "vitest";
import { MS_PER_DAY, asOfObservation, buildDateChart, timeTicks, toTs, tsToIso } from "./dateSeries";

const POLICY = [{ date: "2026-01-10", value: 10 }, { date: "2026-04-20", value: 11 }, { date: "2026-09-01", value: 12 }];
const BILL = [{ date: "2026-02-05", value: 10.4 }, { date: "2026-02-19", value: 10.5 }, { date: "2026-03-05", value: 10.6 }, { date: "2026-10-01", value: 12.1 }];

describe("dates and timestamps", () => {
  it("round-trips an ISO date through midnight UTC", () => {
    expect(tsToIso(toTs("2026-10-26"))).toBe("2026-10-26");
    expect(toTs("2026-10-27") - toTs("2026-10-26")).toBe(MS_PER_DAY);
  });
});

describe("the latest observation on or before a date", () => {
  const pts = [{ date: "2026-01-10", value: 1 }, { date: "2026-03-01", value: 2 }];
  it("returns null before the first, the exact day on a hit, and the previous one between", () => {
    expect(asOfObservation(pts, "2026-01-09")).toBeNull();
    expect(asOfObservation(pts, "2026-01-10")).toEqual(pts[0]);
    expect(asOfObservation(pts, "2026-02-15")).toEqual(pts[0]);
    expect(asOfObservation(pts, "2026-03-01")).toEqual(pts[1]);
    expect(asOfObservation(pts, "2030-01-01")).toEqual(pts[1]);
    expect(asOfObservation([], "2026-01-01")).toBeNull();
  });
});

describe("building rows for a time axis", () => {
  const built = buildDateChart(
    [{ key: "policy", kind: "step", points: POLICY }, { key: "bill", kind: "observed", points: BILL }],
    { to: "2026-11-11", maxGapDays: 75 },
  );
  const row = (iso: string) => built.rows.find((r) => r.t === toTs(iso));

  it("one row per distinct date, ascending, ending on the last day shown", () => {
    const ts = built.rows.map((r) => r.t);
    expect([...ts].sort((a, b) => a - b)).toEqual(ts);
    expect(new Set(ts).size).toBe(ts.length);
    expect(ts[0]).toBe(toTs("2026-01-10"));
    expect(ts.at(-1)).toBe(toTs("2026-11-11"));
    expect(built.rows).toHaveLength(3 + 4 + 1); // 3 policy dates + 4 bill dates + the end date
  });

  it("a STEP series holds its value across other series' dates and out to the end (the rate in effect), never blank", () => {
    expect(row("2026-02-05")?.policy).toBe(10);
    expect(row("2026-04-20")?.policy).toBe(11);
    expect(row("2026-10-01")?.policy).toBe(12);
    expect(row("2026-11-11")?.policy).toBe(12);
    expect(built.rows.every((r) => typeof r.policy === "number")).toBe(true);
  });

  it("an OBSERVED series has a value only on its own dates (null elsewhere, never 0 and never filled)", () => {
    expect(row("2026-02-19")?.["bill#0"]).toBe(10.5);
    expect(row("2026-04-20")?.["bill#0"]).toBeNull();
    expect(row("2026-04-20")?.["bill#1"]).toBeNull();
    expect(built.rows.every((r) => r["bill#0"] !== 0 && r["bill#1"] !== 0)).toBe(true);
  });

  it("breaks the line across a gap longer than the limit: 5 Mar to 1 Oct (210 days) makes two stretches", () => {
    expect(built.segments.filter((s) => s.base === "bill").map((s) => [s.key, s.length])).toEqual([["bill#0", 3], ["bill#1", 1]]);
    expect(row("2026-03-05")?.["bill#1"]).toBeNull(); // the first stretch does not reach into the second
    expect(row("2026-10-01")?.["bill#1"]).toBe(12.1);
    expect(row("2026-10-01")?.["bill#0"]).toBeNull();
  });

  it("joins neighbours exactly at the limit and breaks one day over it", () => {
    const at = (gap: number) => buildDateChart([{ key: "x", kind: "observed", points: [{ date: "2026-01-01", value: 1 }, { date: tsToIso(toTs("2026-01-01") + gap * MS_PER_DAY), value: 2 }] }], { to: "2026-12-31", maxGapDays: 75 }).segments.length;
    expect(at(75)).toBe(1);
    expect(at(76)).toBe(2);
  });
});

describe("a window that opens in the middle of the history", () => {
  const built = buildDateChart([{ key: "policy", kind: "step", points: POLICY }, { key: "bill", kind: "observed", points: BILL }], { from: "2026-03-01", to: "2026-11-11" });
  it("starts with the rate that was ALREADY in effect on the first day shown (carried in), not blank until the next change", () => {
    expect(built.rows[0].t).toBe(toTs("2026-03-01"));
    expect(built.rows[0].policy).toBe(10);
  });
  it("drops observed points before the window and keeps those inside", () => {
    expect(built.rows.some((r) => r.t === toTs("2026-02-19"))).toBe(false);
    expect(built.rows.find((r) => r.t === toTs("2026-03-05"))?.["bill#0"]).toBe(10.6);
  });
  it("a step series with no observation yet at the window start begins at its first observation", () => {
    const b = buildDateChart([{ key: "policy", kind: "step", points: POLICY }], { from: "2025-06-01", to: "2026-03-01" });
    expect(b.rows[0]).toMatchObject({ t: toTs("2026-01-10"), policy: 10 }); // no row, and no invented value, before it exists
    expect(b.rows.some((r) => r.t < toTs("2026-01-10"))).toBe(false);
    expect(b.fromTs).toBe(toTs("2025-06-01")); // the axis still opens where the reader asked
  });
});

describe("malformed input and empty series", () => {
  it("ignores malformed dates and non-finite values, and sorts out-of-order input", () => {
    const b = buildDateChart([{ key: "x", kind: "observed", points: [{ date: "2026-02-01", value: 2 }, { date: "bad", value: 1 }, { date: "2026-01-01", value: Number.NaN }, { date: "2026-01-15", value: 1 }] }], { to: "2026-03-01" });
    expect(b.rows.map((r) => tsToIso(r.t))).toEqual(["2026-01-15", "2026-02-01"]);
  });
  it("a series with no points produces no segment and no row", () => {
    const b = buildDateChart([{ key: "x", kind: "observed", points: [] }, { key: "y", kind: "step", points: [] }], { to: "2026-03-01" });
    expect(b.rows).toEqual([]);
    expect(b.segments).toEqual([]);
  });
});

describe("axis ticks", () => {
  const span = (a: string, b: string, n: number) => timeTicks(toTs(a), toTs(b), n);
  it("uses whole years labelled by year for a long span, calendar-aligned, within the limit", () => {
    const t = span("2016-05-23", "2026-11-11", 8);
    expect(t.map((x) => x.label)).toEqual(["2018", "2020", "2022", "2024", "2026"]);
    expect(t.length).toBeLessThanOrEqual(8);
  });
  it("uses months for a short span and labels them with the year's last two digits", () => {
    const t = span("2026-01-01", "2026-06-30", 8);
    expect(t.map((x) => x.label)).toEqual(["Jan '26", "Feb '26", "Mar '26", "Apr '26", "May '26", "Jun '26"]);
  });
  it("every tick lies inside the axis, ascending, and a narrow chart gets fewer ticks", () => {
    const wide = span("2016-05-23", "2026-11-11", 12);
    const narrow = span("2016-05-23", "2026-11-11", 4);
    expect(narrow.length).toBeLessThan(wide.length);
    for (const t of wide) {
      expect(t.ts).toBeGreaterThanOrEqual(toTs("2016-05-23"));
      expect(t.ts).toBeLessThanOrEqual(toTs("2026-11-11"));
    }
    expect(wide.map((x) => x.ts)).toEqual([...wide.map((x) => x.ts)].sort((a, b) => a - b));
  });
  it("returns nothing for an empty or reversed axis", () => {
    expect(span("2026-01-01", "2026-01-01", 6)).toEqual([]);
    expect(span("2026-02-01", "2026-01-01", 6)).toEqual([]);
  });
});
