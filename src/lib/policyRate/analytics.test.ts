// The Interest Rate page's calculations, pinned against the REAL policy-rate history and hand-worked values.
// The expected figures below were worked out by hand from the 38 SBP observations (see __fixtures__/policyRateHistory.ts), not read back from the code.

import { describe, expect, it } from "vitest";
import { policyRateAt } from "@/lib/inflation/analytics";
import {
  changeRows,
  cleanDecisions,
  cumulativeChanges,
  cycleOutcomes,
  differenceSeries,
  findCycles,
  inflationKnownAt,
  lastObservationPerMonth,
  longestKnownHold,
  monthRange,
  policyRateOnDate,
  rangeStartDate,
  rateChanges,
  rateLevels,
  rateStats,
  realPolicyRateSeries,
  realRate,
  regimeSegments,
  spreadAtAuctions,
  summarizeSeries,
  termSpread,
  turningPoints,
} from "./analytics";
import { HEADLINE_2026, REAL_POLICY_RATE, monthly } from "./__fixtures__/policyRateHistory";

const real = cleanDecisions(REAL_POLICY_RATE);
const changes = rateChanges(real.decisions);

describe("cleaning the series", () => {
  it("keeps all 38 real observations and finds exactly the two repeated-value rows", () => {
    expect(real.decisions).toHaveLength(38);
    expect(real.repeats.map((r) => r.date)).toEqual(["2020-04-17", "2020-05-18"]);
    expect(real.rejected).toBe(0);
    expect(real.sameDateDuplicates).toBe(0);
  });

  it("sorts, lets the last of two same-date rows win, and counts what it dropped", () => {
    const c = cleanDecisions([
      { date: "2020-02-01", value: 9 },
      { date: "2019-01-01", value: 8 },
      { date: "2020-02-01", value: 10 },
    ]);
    expect(c.decisions).toEqual([{ date: "2019-01-01", value: 8 }, { date: "2020-02-01", value: 10 }]);
    expect(c.sameDateDuplicates).toBe(1);
  });

  it("rejects what is not a date or not a finite number, rather than guessing", () => {
    const c = cleanDecisions([
      { date: "2020-02", value: 9 }, // not a full ISO date
      { date: "2020-02-01", value: Number.NaN },
      { date: "2020-02-01", value: Infinity },
      { date: "2020-03-01", value: 9 },
    ]);
    expect(c.decisions).toEqual([{ date: "2020-03-01", value: 9 }]);
    expect(c.rejected).toBe(3);
  });

  it("empty input is empty", () => {
    expect(cleanDecisions([])).toEqual({ decisions: [], repeats: [], rejected: 0, sameDateDuplicates: 0 });
  });
});

describe("rate changes", () => {
  it("the real history has 35 changes (22 hikes, 13 cuts): the first row is a starting level and the two repeats are not changes", () => {
    expect(changes).toHaveLength(35);
    expect(changes.filter((c) => c.direction === "hike")).toHaveLength(22);
    expect(changes.filter((c) => c.direction === "cut")).toHaveLength(13);
    expect(changes.some((c) => c.change === 0)).toBe(false);
    expect(changes.map((c) => c.date)).not.toContain("2020-04-17");
    expect(changes.map((c) => c.date)).not.toContain("2020-05-18");
  });

  it("every change is exactly new − old, in percentage points, and they chain", () => {
    for (const [i, c] of changes.entries()) {
      expect(c.change).toBe(Math.round((c.to - c.from) * 1e4) / 1e4);
      if (i > 0) expect(c.from).toBe(changes[i - 1].to);
    }
  });

  it("the changes add up to the whole move from the first rate to the last (12 − 5.75 = 6.25 pp)", () => {
    const sum = changes.reduce((s, c) => s + c.change, 0);
    expect(sum).toBeCloseTo(6.25, 10);
    expect(changes[0]).toMatchObject({ date: "2018-01-29", from: 5.75, to: 6, change: 0.25, direction: "hike" });
    expect(changes.at(-1)).toMatchObject({ date: "2026-10-26", from: 11.5, to: 12, change: 0.5, direction: "hike" });
  });

  it("no change, one observation, or no data", () => {
    expect(rateChanges([])).toEqual([]);
    expect(rateChanges([{ date: "2020-01-01", value: 7 }])).toEqual([]);
    expect(rateChanges([{ date: "2020-01-01", value: 7 }, { date: "2020-06-01", value: 7 }])).toEqual([]);
  });
});

describe("tightening and easing cycles (runs of same-direction changes)", () => {
  const cycles = findCycles(changes);

  it("the real history has exactly five cycles, alternating, with the hand-worked figures", () => {
    expect(cycles).toHaveLength(5);
    expect(cycles.map((c) => c.direction)).toEqual(["tightening", "easing", "tightening", "easing", "tightening"]);
    expect(cycles.map((c) => [c.startDate, c.endDate, c.changes, c.startRate, c.endRate, c.totalChange, c.spanMonths])).toEqual([
      ["2018-01-29", "2019-07-17", 9, 5.75, 13.25, 7.5, 18],
      ["2020-03-18", "2020-06-26", 5, 13.25, 7, -6.25, 3],
      ["2021-09-21", "2023-06-27", 11, 7, 22, 15, 21],
      ["2024-06-11", "2025-12-16", 8, 22, 10.5, -11.5, 18],
      ["2026-04-28", "2026-10-26", 2, 10.5, 12, 1.5, 6],
    ]);
  });

  it("only the newest cycle is flagged latest", () => {
    expect(cycles.map((c) => c.latest)).toEqual([false, false, false, false, true]);
  });

  it("the changes in all cycles account for every change exactly once", () => {
    expect(cycles.reduce((s, c) => s + c.changes, 0)).toBe(changes.length);
  });

  it("a long pause does not split a run; an opposite change does", () => {
    const c = findCycles(rateChanges(cleanDecisions([
      { date: "2020-01-01", value: 7 },
      { date: "2020-02-01", value: 8 }, // hike
      { date: "2022-02-01", value: 9 }, // hike, two years later: same run
      { date: "2022-03-01", value: 8.5 }, // cut: new run
    ]).decisions));
    expect(c.map((x) => [x.direction, x.changes])).toEqual([["tightening", 2], ["easing", 1]]);
    expect(c[0].spanMonths).toBe(24);
  });

  it("a single change is a one-change cycle spanning 0 months; no changes means no cycles", () => {
    const one = findCycles(rateChanges(cleanDecisions([{ date: "2020-01-01", value: 7 }, { date: "2020-02-15", value: 8 }]).decisions));
    expect(one).toHaveLength(1);
    expect(one[0]).toMatchObject({ changes: 1, spanMonths: 0, latest: true });
    expect(findCycles([])).toEqual([]);
  });
});

describe("summary statistics", () => {
  const stats = rateStats(real.decisions, "2026-11-07");

  it("current rate, how long it has been in effect, and the previous level", () => {
    expect(stats?.current).toEqual({ value: 12, since: "2026-10-26" });
    expect(stats?.previous).toEqual({ value: 11.5, until: "2026-10-26" });
  });

  it("highest is 22% from 27 Jun 2023 until the next change on 11 Jun 2024; lowest is the 5.75% start", () => {
    expect(stats?.highest).toEqual({ value: 22, from: "2023-06-27", until: "2024-06-11" });
    expect(stats?.lowest).toEqual({ value: 5.75, from: "2016-05-23", until: "2018-01-29" });
    expect(stats?.range).toBe(16.25);
  });

  it("counts and the largest moves", () => {
    expect(stats).toMatchObject({ changeCount: 35, hikes: 22, cuts: 13 });
    expect(stats?.largestHike).toMatchObject({ date: "2023-03-03", change: 3 });
    expect(stats?.largestCut).toMatchObject({ date: "2024-11-05", change: -2.5 });
  });

  it("the time-weighted mean equals an independent day-by-day average", () => {
    // Oracle: walk every calendar day from the first observation to the as-of date and average the rate in effect that day.
    const day = (s: string) => Math.floor(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 86_400_000);
    const start = day("2016-05-23");
    const end = day("2026-11-07");
    let sum = 0;
    for (let d = start; d < end; d++) {
      let rate = real.decisions[0].value;
      for (const o of real.decisions) if (day(o.date) <= d) rate = o.value;
      sum += rate;
    }
    expect(stats?.timeWeightedMean).toBeCloseTo(sum / (end - start), 9);
  });

  it("the average is not dragged by the number of observations: two rows 1 day apart barely matter", () => {
    const s = rateStats(cleanDecisions([{ date: "2020-01-01", value: 10 }, { date: "2020-01-02", value: 20 }, { date: "2021-01-01", value: 10 }]).decisions, "2022-01-01");
    // 1 day at 10, 365 days at 20, 365 days at 10 over 731 days
    expect(s?.timeWeightedMean).toBeCloseTo((10 * 1 + 20 * 365 + 10 * 365) / 731, 9);
  });

  it("an as-of date before the newest observation is clamped to it, never extrapolated backwards", () => {
    const early = rateStats(real.decisions, "2000-01-01");
    expect(early?.asOf).toBe("2000-01-01");
    expect(Number.isFinite(early?.timeWeightedMean)).toBe(true);
  });

  it("one observation: no previous level, mean is that rate; none: null", () => {
    const one = rateStats([{ date: "2020-01-01", value: 7 }], "2020-06-01");
    expect(one?.previous).toBeNull();
    expect(one?.timeWeightedMean).toBe(7);
    expect(one?.current).toEqual({ value: 7, since: "2020-01-01" });
    expect(rateStats([], "2020-01-01")).toBeNull();
  });

  it("a rate that returns to an earlier level keeps the FIRST date it reached it, and 'until' is the next different value", () => {
    const s = rateStats(cleanDecisions([{ date: "2020-01-01", value: 5 }, { date: "2020-02-01", value: 9 }, { date: "2020-03-01", value: 5 }, { date: "2020-04-01", value: 9 }]).decisions, "2020-05-01");
    expect(s?.highest).toEqual({ value: 9, from: "2020-02-01", until: "2020-03-01" });
    expect(s?.lowest).toEqual({ value: 5, from: "2020-01-01", until: "2020-02-01" });
  });
});

describe("real policy rate (exact Fisher, ex-post)", () => {
  it("is ((1 + i)/(1 + π) − 1) × 100: 12% against 9.6% inflation is 2.1898%, not the simple difference 2.4", () => {
    expect(realRate(12, 9.6)).toBeCloseTo(2.18978, 4);
    expect(realRate(12, 9.6)).not.toBeCloseTo(2.4, 1);
  });

  it("at high inflation the simple difference is badly off: 22% against 38% is −11.59%, not −16", () => {
    expect(realRate(22, 38)).toBeCloseTo(-11.5942, 3);
  });

  it("zero inflation leaves the nominal rate; equal rates give zero; negative real rates are negative", () => {
    expect(realRate(7, 0)).toBeCloseTo(7, 12);
    expect(realRate(9.6, 9.6)).toBeCloseTo(0, 12);
    expect(realRate(5, 10)).toBeLessThan(0);
  });

  const hl = HEADLINE_2026; // Jan–Oct 2026; Sep 10.3, Oct 9.6

  it("one point per inflation month using the policy rate in effect that month, to the horizon", () => {
    const s = realPolicyRateSeries(real.decisions, hl, "2026-10");
    expect(s).toHaveLength(10);
    // Jan–Mar 2026: 10.5 (the Dec 2025 cut); Apr 2026 is the 28 Apr hike to 11.5 — counted for the whole of April (the shared step rule)
    expect(s.find((p) => p.month === "2026-03")).toMatchObject({ policy: 10.5, inflation: 7 });
    expect(s.find((p) => p.month === "2026-04")?.policy).toBe(11.5);
    expect(s.find((p) => p.month === "2026-10")).toMatchObject({ policy: 12, inflation: 9.6 });
    expect(s.find((p) => p.month === "2026-10")?.real).toBeCloseTo(2.18978, 4);
  });

  it("a month after the horizon is left out; a month before the first rate has no real rate; nothing is filled in", () => {
    expect(realPolicyRateSeries(real.decisions, hl, "2026-06").at(-1)?.month).toBe("2026-06");
    const before = realPolicyRateSeries(real.decisions, monthly("2016-01", [4, 4, 4, 4, 4, 4]), "2016-06"); // first rate is 23 May 2016
    expect(before.map((p) => p.month)).toEqual(["2016-05", "2016-06"]);
    const gap = realPolicyRateSeries(real.decisions, [hl[0], hl[2]], "2026-10"); // Feb missing
    expect(gap.map((p) => p.month)).toEqual(["2026-01", "2026-03"]);
  });
});

describe("inflation known at the time of a change", () => {
  const infl = hl();
  function hl() {
    return HEADLINE_2026;
  }

  it("is the CPI of the month BEFORE the decision month (PBS publishes at the start of the next month)", () => {
    expect(inflationKnownAt("2026-10-26", infl)).toEqual({ month: "2026-09", value: 10.3 });
    expect(inflationKnownAt("2026-04-28", infl)).toEqual({ month: "2026-03", value: 7 });
  });

  it("crosses the year boundary", () => {
    expect(inflationKnownAt("2026-01-15", monthly("2025-12", [5]))?.month).toBe("2025-12");
  });

  it("is null, not the nearest month, when that exact month is missing", () => {
    expect(inflationKnownAt("2026-03-10", [infl[0], infl[2]])).toBeNull(); // needs Feb
    expect(inflationKnownAt("2016-05-23", infl)).toBeNull();
  });

  it("change rows carry the inflation known then and the real rate AFTER the change", () => {
    const rows = changeRows(changes.slice(-2), infl);
    expect(rows[1]).toMatchObject({ date: "2026-10-26", to: 12, inflationMonth: "2026-09", inflation: 10.3 });
    expect(rows[1].realAfter).toBeCloseTo(realRate(12, 10.3), 10);
    const unknown = changeRows(changes.slice(0, 1), infl)[0]; // 2018: not in the fixture
    expect(unknown.inflation).toBeNull();
    expect(unknown.realAfter).toBeNull();
  });
});

describe("what inflation did around each cycle (observed, not attributed)", () => {
  it("reports inflation at the first and last change and 12 months after the last, only where those months exist", () => {
    // Monthly CPI from Oct 2025: 4, 4.2, 4.5, 5, 5.5, 6, 6.5, 7, ... so Feb 2026 = 5.5, Apr 2026 = 6.5 and May 2027 = 13.
    const infl = monthly("2025-10", [4, 4.2, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14]);
    const cycles = findCycles(rateChanges(cleanDecisions([{ date: "2026-01-10", value: 9 }, { date: "2026-03-10", value: 10 }, { date: "2026-05-20", value: 11 }]).decisions));
    const [o] = cycleOutcomes(cycles, infl);
    expect(o).toMatchObject({ startDate: "2026-03-10", endDate: "2026-05-20", twelveMonthsAfterMonth: "2027-05" });
    expect(o.inflationAtStart).toBe(5.5); // known at 10 Mar 2026 = February 2026
    expect(o.inflationAtEnd).toBe(6.5); // known at 20 May 2026 = April 2026
    expect(o.inflationTwelveMonthsAfter).toBe(13); // May 2027
  });

  it("a 12-months-after month beyond the data is null", () => {
    const [o] = cycleOutcomes(findCycles(rateChanges(cleanDecisions([{ date: "2026-01-10", value: 9 }, { date: "2026-03-10", value: 10 }]).decisions)), monthly("2026-01", [5, 5.5, 6, 6.5]));
    expect(o.inflationTwelveMonthsAfter).toBeNull();
  });
});

describe("aligning irregular and external series", () => {
  it("takes the LAST observation in each calendar month (auction dates) and skips months with none", () => {
    const m = lastObservationPerMonth([
      { date: "2026-08-05", value: 11 },
      { date: "2026-08-19", value: 11.2 },
      { date: "2026-10-14", value: 11.89 },
      { date: "bad", value: 1 },
    ]);
    expect(m).toEqual([{ month: "2026-08", value: 11.2 }, { month: "2026-10", value: 11.89 }]);
  });

  it("the difference uses only months present in BOTH series", () => {
    const d = differenceSeries(monthly("2026-01", [12, 12, 11]), monthly("2026-02", [3.9, 3.88, 3.7]));
    expect(d).toEqual([{ month: "2026-02", value: 8.1 }, { month: "2026-03", value: 7.12 }]);
  });

  it("monthRange is inclusive and crosses year ends", () => {
    expect(monthRange("2025-11", "2026-02")).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
    expect(monthRange("2026-02", "2026-02")).toEqual(["2026-02"]);
  });
});

// ═══ G.9: dates, holds, cumulative changes, regimes. Expected figures were worked out independently of this code (a separate script over
// the 38 real observations, then checked by hand against the history); none is read back from the functions under test. ═══

const AS_OF = "2026-11-11";

describe("the rate in effect ON a date (not at month-end)", () => {
  const d = real.decisions;
  it("is the latest observation dated on or before the day, and an observation takes effect on its own date", () => {
    expect(policyRateOnDate(d, "2016-05-22")).toBeNull(); // the day before the first observation
    expect(policyRateOnDate(d, "2016-05-23")).toBe(5.75);
    expect(policyRateOnDate(d, "2026-10-25")).toBe(11.5); // the day before the 26 Oct 2026 increase
    expect(policyRateOnDate(d, "2026-10-26")).toBe(12);
    expect(policyRateOnDate(d, AS_OF)).toBe(12);
  });
  it("does not blur a change later in the same month, which the month-end rule does", () => {
    expect(policyRateOnDate(d, "2026-10-14")).toBe(11.5); // an October auction before the increase
    expect(policyRateAt(d, "2026-10")).toBe(12); // the month-end rule says 12 for all of October
  });
});

describe("yield minus the policy rate in effect on the auction day", () => {
  const d = real.decisions;
  it("uses the rate in effect that day: the 14 Oct 2026 bill at 11.89% was 0.39 pp ABOVE the 11.50% then in effect, not 0.11 below today's 12%", () => {
    const [s] = spreadAtAuctions([{ date: "2026-10-14", value: 11.89 }], d);
    expect(s).toEqual({ date: "2026-10-14", yield: 11.89, policy: 11.5, spread: 0.39 });
    expect(11.89 - 12).toBeCloseTo(-0.11, 10); // what comparing with today's rate would have said
  });
  it("skips auctions before the first policy observation and malformed rows; sorts by date", () => {
    const out = spreadAtAuctions([{ date: "2026-10-14", value: 11.89 }, { date: "2016-01-06", value: 6.1 }, { date: "bad", value: 1 }, { date: "2016-06-01", value: 5.9 }, { date: "2016-07-01", value: Number.NaN }], d);
    expect(out.map((x) => x.date)).toEqual(["2016-06-01", "2026-10-14"]);
    expect(out[0].spread).toBe(0.15); // 5.9 against 5.75
  });
  it("an auction on the very day of a change is compared with the NEW rate", () => {
    expect(spreadAtAuctions([{ date: "2026-10-26", value: 11.9 }], d)[0]).toMatchObject({ policy: 12, spread: -0.1 });
  });
});

describe("the term spread between two maturities", () => {
  const short = [{ date: "2026-09-02", value: 11.5 }, { date: "2026-09-16", value: 11.6 }, { date: "2026-09-30", value: 11.7 }, { date: "2026-10-14", value: 11.89 }];
  it("pairs each long auction with the latest short auction ON OR BEFORE it, never a later one", () => {
    const out = termSpread([{ date: "2026-10-07", value: 12.74 }], short);
    expect(out).toEqual([{ date: "2026-10-07", long: 12.74, short: 11.7, shortDate: "2026-09-30", lagDays: 7, spread: 1.04 }]);
  });
  it("a short auction on the same day is used (lag 0), and one the day AFTER is not", () => {
    expect(termSpread([{ date: "2026-10-14", value: 12.9 }], short)[0]).toMatchObject({ shortDate: "2026-10-14", lagDays: 0, spread: 1.01 });
    expect(termSpread([{ date: "2026-10-13", value: 12.9 }], short)[0]).toMatchObject({ shortDate: "2026-09-30", lagDays: 13 });
  });
  it("leaves out a long auction whose nearest earlier short auction is older than the limit, or that has none (nothing is filled)", () => {
    expect(termSpread([{ date: "2026-10-30", value: 13 }], short, 21)[0]).toMatchObject({ shortDate: "2026-10-14", lagDays: 16, spread: 1.11 }); // 16 days after 14 Oct is allowed ...
    expect(termSpread([{ date: "2026-11-30", value: 13 }], short, 21)).toEqual([]); // ... 47 days is not
    expect(termSpread([{ date: "2026-08-01", value: 13 }], short)).toEqual([]); // before any short auction
  });
  it("a limit of 21 days admits 21 and rejects 22", () => {
    expect(termSpread([{ date: "2026-11-04", value: 13 }], short, 21)).toHaveLength(1); // 14 Oct + 21 d
    expect(termSpread([{ date: "2026-11-05", value: 13 }], short, 21)).toHaveLength(0);
  });
});

describe("how long each rate level lasted (real history, to 11 Nov 2026)", () => {
  const levels = rateLevels(real.decisions, AS_OF);
  it("36 levels for 35 changes; the two repeated rows do not start a level", () => {
    expect(levels).toHaveLength(36);
    expect(levels.filter((l) => l.until !== null)).toHaveLength(35);
    expect(levels.filter((l) => l.current)).toHaveLength(1);
  });
  it("matches hand-counted durations", () => {
    const at = (from: string) => levels.find((l) => l.from === from);
    expect(at("2016-05-23")).toMatchObject({ rate: 5.75, until: "2018-01-29", days: 616, enteredBy: "start" });
    expect(at("2020-06-26")).toMatchObject({ rate: 7, until: "2021-09-21", days: 452, enteredBy: "cut" });
    expect(at("2023-06-27")).toMatchObject({ rate: 22, until: "2024-06-11", days: 350, enteredBy: "hike" });
    expect(at("2020-04-16")).toMatchObject({ rate: 9, until: "2020-05-16", days: 30 }); // the 17 Apr repeat is inside this level
    expect(at("2026-10-26")).toMatchObject({ rate: 12, until: null, days: 16, current: true });
  });
  it("the longest completed hold is the first (616 days); the current level is excluded from 'completed'", () => {
    const completed = levels.filter((l) => !l.current);
    expect(completed.reduce((a, b) => (b.days > a.days ? b : a)).from).toBe("2016-05-23");
  });
  it("the days of all levels add up to the span from the first observation to the as-of date (a check that can fail)", () => {
    expect(levels.reduce((s, l) => s + l.days, 0)).toBe(3824);
  });
  it("is empty without data, and a single level when the rate never changed", () => {
    expect(rateLevels([], AS_OF)).toEqual([]);
    expect(rateLevels([{ date: "2026-01-01", value: 9 }, { date: "2026-02-01", value: 9 }], "2026-03-02")).toEqual([{ rate: 9, from: "2026-01-01", until: null, days: 60, enteredBy: "start", current: true }]);
  });
  it("never counts days before the newest observation if the as-of date is earlier than it", () => {
    const l = rateLevels([{ date: "2026-01-01", value: 9 }, { date: "2026-02-01", value: 10 }], "2026-01-15");
    expect(l.at(-1)).toMatchObject({ from: "2026-02-01", days: 0 });
  });
});

describe("the longest hold whose start is known", () => {
  const levels = rateLevels(real.decisions, AS_OF);
  it("is the 452 days at 7.00% (26 Jun 2020 to 21 Sep 2021), not the 616 days at the start of the series, whose beginning is unknown", () => {
    expect(longestKnownHold(levels)).toMatchObject({ rate: 7, from: "2020-06-26", until: "2021-09-21", days: 452 });
    expect(Math.max(...levels.map((l) => l.days))).toBe(616); // the start-of-series level IS longer, and is deliberately not chosen
  });
  it("ignores the level still in effect and is null when nothing qualifies", () => {
    expect(longestKnownHold(levels.filter((l) => l.current || l.enteredBy === "start"))).toBeNull();
    expect(longestKnownHold([])).toBeNull();
  });
});

describe("cumulative increases and cuts", () => {
  const cum = cumulativeChanges(changes, real.decisions[0].date);
  it("starts at zero on the first date, then one step per change", () => {
    expect(cum[0]).toEqual({ date: "2016-05-23", increases: 0, cuts: 0, net: 0 });
    expect(cum).toHaveLength(36);
  });
  it("totals 24.00 pp of increases and 17.75 pp of cuts, a net of 6.25 pp (12.00 − 5.75)", () => {
    expect(cum.at(-1)).toEqual({ date: "2026-10-26", increases: 24, cuts: -17.75, net: 6.25 });
  });
  it("increases never fall, cuts never rise, and net always equals their sum", () => {
    for (let i = 1; i < cum.length; i++) {
      expect(cum[i].increases).toBeGreaterThanOrEqual(cum[i - 1].increases);
      expect(cum[i].cuts).toBeLessThanOrEqual(cum[i - 1].cuts);
      expect(cum[i].net).toBeCloseTo(cum[i].increases + cum[i].cuts, 10);
    }
  });
  it("matches known waypoints: after the 2019-07-17 peak, 7.5 pp up; after the 2020 easing, 7.5 pp up and 6.25 pp down", () => {
    expect(cum.find((c) => c.date === "2019-07-17")).toMatchObject({ increases: 7.5, cuts: 0, net: 7.5 });
    expect(cum.find((c) => c.date === "2020-06-26")).toMatchObject({ increases: 7.5, cuts: -6.25, net: 1.25 });
  });
});

describe("regimes: tightening, easing and holding", () => {
  const cycles = findCycles(changes);
  const segs = regimeSegments(cycles, real.decisions[0].date, real.decisions[0].value, AS_OF, real.decisions.at(-1)?.date);
  it("alternates holds and the five cycles in time order: hold, T, hold, E, hold, T, hold, E, hold, T, hold", () => {
    expect(segs.map((s) => s.kind)).toEqual(["hold", "tightening", "hold", "easing", "hold", "tightening", "hold", "easing", "hold", "tightening", "hold"]);
  });
  it("matches hand-counted spans", () => {
    expect(segs[0]).toMatchObject({ kind: "hold", from: "2016-05-23", to: "2018-01-29", days: 616, startRate: 5.75, endRate: 5.75 });
    expect(segs[1]).toMatchObject({ kind: "tightening", from: "2018-01-29", to: "2019-07-17", days: 534, changes: 9, startRate: 5.75, endRate: 13.25, cycleIndex: 0 });
    expect(segs[3]).toMatchObject({ kind: "easing", from: "2020-03-18", to: "2020-06-26", days: 100, changes: 5, startRate: 13.25, endRate: 7, cycleIndex: 1 });
    expect(segs[6]).toMatchObject({ kind: "hold", from: "2023-06-27", to: "2024-06-11", days: 350, startRate: 22, endRate: 22 });
    expect(segs[9]).toMatchObject({ kind: "tightening", from: "2026-04-28", to: "2026-10-26", days: 181, changes: 2 });
    expect(segs[10]).toMatchObject({ kind: "hold", from: "2026-10-26", to: AS_OF, days: 16, open: true });
  });
  it("is contiguous and covers first date to as-of exactly, with no overlap (a check that can fail)", () => {
    expect(segs[0].from).toBe("2016-05-23");
    for (let i = 1; i < segs.length; i++) expect(segs[i].from).toBe(segs[i - 1].to);
    expect(segs.at(-1)?.to).toBe(AS_OF);
    expect(segs.reduce((s, x) => s + x.days, 0)).toBe(3824);
    expect(segs.filter((s) => s.open)).toHaveLength(1);
  });
  it("a hold at the very start is omitted when the first change is on the first date's heels, and a single-change cycle has zero length", () => {
    const only = findCycles(rateChanges(cleanDecisions([{ date: "2026-01-10", value: 9 }, { date: "2026-03-10", value: 10 }]).decisions));
    const s = regimeSegments(only, "2026-01-10", 9, "2026-03-10", "2026-03-10");
    expect(s.map((x) => [x.kind, x.days])).toEqual([["hold", 59], ["tightening", 0]]);
  });
  it("without cycles the whole span is one open hold", () => {
    expect(regimeSegments([], "2026-01-01", 9, "2026-01-31")).toEqual([{ kind: "hold", from: "2026-01-01", to: "2026-01-31", days: 30, startRate: 9, endRate: 9, changes: 0, cycleIndex: null, open: true }]);
  });
  it("turning points are the rate at the end of each run; only the newest is unconfirmed", () => {
    const tp = turningPoints(cycles);
    expect(tp.map((t) => [t.kind, t.rate, t.confirmed])).toEqual([["peak", 13.25, true], ["trough", 7, true], ["peak", 22, true], ["trough", 10.5, true], ["peak", 12, false]]);
    expect(tp[2].date).toBe("2023-06-27");
  });
});

describe("summarising a monthly series", () => {
  it("finds the latest, the highest and the lowest, resolving ties to the earliest month, and counts months above and below zero", () => {
    const s = summarizeSeries(monthly("2026-01", [-3, 2, 2, -3, 0, 1]));
    expect(s?.latest).toEqual({ month: "2026-06", value: 1 });
    expect(s?.highest).toEqual({ month: "2026-02", value: 2 });
    expect(s?.lowest).toEqual({ month: "2026-01", value: -3 });
    expect([s?.above, s?.below, s?.months]).toEqual([3, 2, 6]); // 0 is neither
  });
  it("is null for an empty series", () => {
    expect(summarizeSeries([])).toBeNull();
  });
});

describe("the date a range starts on", () => {
  it("is the first day of the earliest of N calendar months ending with the newest date's month, and null for all", () => {
    expect(rangeStartDate("2026-10-26", "12")).toBe("2025-11-01");
    expect(rangeStartDate("2026-10-26", "24")).toBe("2024-11-01");
    expect(rangeStartDate("2026-01-05", "12")).toBe("2025-02-01");
    expect(rangeStartDate("2026-10-26", "all")).toBeNull();
  });
});
