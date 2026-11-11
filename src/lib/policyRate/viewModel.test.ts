// The Interest Rate view model, built from the REAL policy-rate history plus small, clearly-labelled inputs for the other series.

import { describe, expect, it } from "vitest";
import { buildPolicyRateViewModel, type PolicySourceInfo, type RawPolicyRateInputs } from "./viewModel";
import { REAL_POLICY_RATE, monthEndRaw } from "./__fixtures__/policyRateHistory";
import { realRate } from "./analytics";

const SOURCE: PolicySourceInfo = { status: "ledger", seriesKey: "TS_GP_IR_SIRPR_AH.SBPOL0030", seriesName: "SBP Policy (Target) Rate", latestObservation: "2026-10-26", lastStoredAt: "2026-10-29T03:22:25+00:00", observations: 38 };

// Headline YoY Jan–Oct 2026, illustrative except Sep 10.3 / Oct 9.6. Core is illustrative throughout.
const HEADLINE = monthEndRaw("2026-01", [5.9, 6.4, 7.0, 8.0, 9.1, 9.4, 9.0, 10.0, 10.3, 9.6]);
const CORE = monthEndRaw("2026-01", [6.5, 7.0, 7.4, 8.0, 8.4, 8.6, 8.7, 8.6, 8.6, 7.8]);

function raw(over: Partial<RawPolicyRateInputs> = {}): RawPolicyRateInputs {
  return {
    policy: REAL_POLICY_RATE,
    headline: HEADLINE,
    core: CORE,
    tbill: [
      { date: "2026-09-02", value: 11.5 },
      { date: "2026-09-30", value: 11.7 },
      { date: "2026-10-14", value: 11.89 },
    ],
    pib: [{ date: "2026-10-07", value: 12.74 }],
    fedFunds: monthEndRaw("2026-08", [4.1, 4.0, 3.88]),
    kpiValue: 12,
    asOf: "2026-11-07",
    source: SOURCE,
    ...over,
  };
}

describe("the model from the real history", () => {
  const m = buildPolicyRateViewModel(raw());

  it("carries the 38 observations, the 2 repeats, 35 changes and 5 cycles", () => {
    expect(m.decisions).toHaveLength(38);
    expect(m.repeats).toHaveLength(2);
    expect(m.changes).toHaveLength(35);
    expect(m.cycles).toHaveLength(5);
    expect(m.stats?.current).toEqual({ value: 12, since: "2026-10-26" });
  });

  it("the monthly policy series runs from the first observation's month to the horizon, one point per month, as a step", () => {
    expect(m.horizon).toBe("2026-10");
    expect(m.policyMonthly[0]).toEqual({ month: "2016-05", value: 5.75 });
    expect(m.policyMonthly.at(-1)).toEqual({ month: "2026-10", value: 12 });
    expect(m.policyMonthly).toHaveLength(126); // May 2016 .. Oct 2026 inclusive
    const at = (mo: string) => m.policyMonthly.find((p) => p.month === mo)?.value;
    expect(at("2023-06")).toBe(22); // decision 27 Jun 2023
    expect(at("2024-05")).toBe(22); // still 22 until 11 Jun 2024
    expect(at("2024-06")).toBe(20.5);
    expect(at("2018-02")).toBe(6); // the 29 Jan 2018 move holds through February
  });

  it("the real policy rate is exact Fisher against each inflation month, for headline and for core", () => {
    const oct = m.realHeadline.at(-1);
    expect(oct).toMatchObject({ month: "2026-10", policy: 12, inflation: 9.6 });
    expect(oct?.real).toBeCloseTo(realRate(12, 9.6), 10);
    expect(m.realCore.at(-1)?.real).toBeCloseTo(realRate(12, 7.8), 10);
    expect(m.realHeadline).toHaveLength(10);
  });

  it("each rate change carries the inflation known then (CPI of the previous month)", () => {
    const last = m.changeRows.at(-1);
    expect(last).toMatchObject({ date: "2026-10-26", inflationMonth: "2026-09", inflation: 10.3 });
    expect(m.changeRows[0].inflation).toBeNull(); // 2018: no inflation supplied
  });

  it("T-bill and PIB are the last auction of each month, kept as market rates apart from the policy rate", () => {
    expect(m.tbill).toEqual([{ month: "2026-09", value: 11.7 }, { month: "2026-10", value: 11.89 }]);
    expect(m.tbillLatest).toEqual({ date: "2026-10-14", value: 11.89 });
    expect(m.pibLatest).toEqual({ date: "2026-10-07", value: 12.74 });
    // spread = market yield − policy rate in effect that month (Sep: 11.7 − 11.5, Oct: 11.89 − 12)
    expect(m.tbillSpread).toEqual([{ month: "2026-09", value: 0.2 }, { month: "2026-10", value: -0.11 }]);
    expect(m.pibSpread).toEqual([{ month: "2026-10", value: 0.74 }]);
  });

  it("the US comparison is the policy rate minus the federal funds rate, only for months both exist", () => {
    expect(m.usDifferential).toEqual([{ month: "2026-08", value: 7.4 }, { month: "2026-09", value: 7.5 }, { month: "2026-10", value: 8.12 }]);
  });

  it("every data check passes on the real history, including the repeated rows being reported", () => {
    const by = Object.fromEntries(m.checks.map((c) => [c.id, c]));
    expect(by["series-integrity"].status).toBe("ok");
    expect(by["not-future"].status).toBe("ok");
    expect(by["changes-sum"]).toBeUndefined(); // a check that cannot fail is not shown as a check
    expect(by["plausible-range"].status).toBe("ok");
    expect(by["kpi-matches"].status).toBe("ok");
    expect(by["repeated-rows"]).toMatchObject({ status: "info" });
    expect(by["repeated-rows"].text).toContain("17 Apr 2020");
    expect(by["repeated-rows"].text).toContain("18 May 2020");
    expect(m.checks.some((c) => c.status === "warn")).toBe(false);
  });

  it("is plain data: it survives a JSON round trip (it crosses the server/client boundary)", () => {
    expect(JSON.parse(JSON.stringify(m))).toEqual(m);
  });
});

describe("the horizon and the step", () => {
  it("runs to the latest headline month when inflation is newer than the last rate change (the rate holds until a new one)", () => {
    const m = buildPolicyRateViewModel(raw({ headline: monthEndRaw("2026-01", [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5]) })); // to Feb 2027
    expect(m.horizon).toBe("2027-02");
    expect(m.policyMonthly.at(-1)).toEqual({ month: "2027-02", value: 12 });
  });

  it("stops at the last rate observation when there is no newer inflation (the step is never extended past the data)", () => {
    const m = buildPolicyRateViewModel(raw({ headline: null, core: null }));
    expect(m.horizon).toBe("2026-10");
    expect(m.realHeadline).toEqual([]);
  });
});

describe("missing and bad inputs", () => {
  it("no policy data: an honest empty model with a warning, not zeros", () => {
    for (const policy of [null, []]) {
      const m = buildPolicyRateViewModel(raw({ policy }));
      expect(m.stats).toBeNull();
      expect(m.changes).toEqual([]);
      expect(m.policyMonthly).toEqual([]);
      expect(m.horizon).toBeNull();
      expect(m.checks.find((c) => c.id === "policy-unavailable")?.status).toBe("warn");
    }
  });

  it("optional series that are missing leave their sections empty without affecting the rest", () => {
    const m = buildPolicyRateViewModel(raw({ tbill: null, pib: null, fedFunds: null }));
    expect(m.tbill).toEqual([]);
    expect(m.tbillLatest).toBeNull();
    expect(m.usDifferential).toEqual([]);
    expect(m.changes).toHaveLength(35);
  });

  it("malformed policy rows are rejected and reported, never repaired", () => {
    const m = buildPolicyRateViewModel(raw({ policy: [...REAL_POLICY_RATE, { date: "garbage", value: 99 }, { date: "2026-11-01", value: Number.NaN }] }));
    expect(m.decisions).toHaveLength(38);
    expect(m.checks.find((c) => c.id === "series-integrity")).toMatchObject({ status: "warn" });
    expect(m.checks.find((c) => c.id === "series-integrity")?.text).toContain("2 rejected");
  });

  it("a headline figure that disagrees with the newest observation is flagged", () => {
    const m = buildPolicyRateViewModel(raw({ kpiValue: 11.5 }));
    expect(m.checks.find((c) => c.id === "kpi-matches")).toMatchObject({ status: "warn" });
  });

  it("an observation dated after the generation day is flagged (a check that can fail)", () => {
    const m = buildPolicyRateViewModel(raw({ policy: [...REAL_POLICY_RATE, { date: "2026-12-01", value: 12 }], kpiValue: 12 }));
    expect(m.checks.find((c) => c.id === "not-future")).toMatchObject({ status: "warn" });
    expect(m.checks.find((c) => c.id === "not-future")?.text).toContain("1 Dec 2026");
  });

  it("an implausible rate is flagged", () => {
    const m = buildPolicyRateViewModel(raw({ policy: [...REAL_POLICY_RATE, { date: "2026-11-02", value: 55 }] }));
    expect(m.checks.find((c) => c.id === "plausible-range")).toMatchObject({ status: "warn" });
  });

  it("a revised value for an existing date replaces the earlier one (the later row wins) and is reported", () => {
    const revised = REAL_POLICY_RATE.map((r) => (r.date === "2026-10-26" ? { ...r, value: 12.25 } : r));
    const m = buildPolicyRateViewModel(raw({ policy: [...REAL_POLICY_RATE, { date: "2026-10-26", value: 12.25 }], kpiValue: 12.25 }));
    expect(m.stats?.current.value).toBe(12.25);
    expect(m.checks.find((c) => c.id === "series-integrity")?.text).toContain("1 duplicate date");
    expect(buildPolicyRateViewModel(raw({ policy: revised, kpiValue: 12.25 })).stats?.current.value).toBe(12.25);
  });
});

describe("G.9: figures for the charts, kept on their own dates", () => {
  const m = buildPolicyRateViewModel(raw());

  it("carries the as-of date and the auctions exactly as observed, ascending, one per date (not binned to months)", () => {
    expect(m.asOf).toBe("2026-11-07");
    expect(m.tbillAuctions.map((a) => a.date)).toEqual(["2026-09-02", "2026-09-30", "2026-10-14"]);
    expect(m.pibAuctions).toEqual([{ date: "2026-10-07", value: 12.74 }]);
  });

  it("the spread is taken against the rate in effect ON the auction day: 14 Oct 2026 was +0.39 pp over 11.50%, not −0.11 against today's 12%", () => {
    expect(m.tbillSpreadAt).toEqual([
      { date: "2026-09-02", yield: 11.5, policy: 11.5, spread: 0 },
      { date: "2026-09-30", yield: 11.7, policy: 11.5, spread: 0.2 },
      { date: "2026-10-14", yield: 11.89, policy: 11.5, spread: 0.39 },
    ]);
    expect(m.pibSpreadAt).toEqual([{ date: "2026-10-07", yield: 12.74, policy: 11.5, spread: 1.24 }]);
    // the older month-end figure is kept unchanged for compatibility, but it is not what the page shows
    expect(m.tbillSpread.at(-1)?.value).toBe(-0.11);
  });

  it("the term spread pairs the 7 Oct PIB with the 30 Sep bill (7 days earlier): 12.74 − 11.70 = +1.04 pp", () => {
    expect(m.termSpreadAt).toEqual([{ date: "2026-10-07", long: 12.74, short: 11.7, shortDate: "2026-09-30", lagDays: 7, spread: 1.04 }]);
  });

  it("levels, cumulative totals, regimes and turning points come from the real history", () => {
    expect(m.levels).toHaveLength(36);
    expect(m.levels.at(-1)).toMatchObject({ rate: 12, current: true, days: 12, from: "2026-10-26" });
    expect(m.cumulative.at(-1)).toEqual({ date: "2026-10-26", increases: 24, cuts: -17.75, net: 6.25 });
    expect(m.regimes.map((r) => r.kind)).toEqual(["hold", "tightening", "hold", "easing", "hold", "tightening", "hold", "easing", "hold", "tightening", "hold"]);
    expect(m.regimes.reduce((s, r) => s + r.days, 0)).toBe(3820); // 23 May 2016 .. 7 Nov 2026
    expect(m.turningPoints.map((t) => t.rate)).toEqual([13.25, 7, 22, 10.5, 12]);
  });

  it("summarises the real policy rate and the US gap", () => {
    expect(m.realSummary.headline?.latest.month).toBe("2026-10");
    expect(m.realSummary.headline?.months).toBe(10);
    expect(m.realSummary.core?.months).toBe(10);
    expect(m.usGapSummary).toMatchObject({ months: 3, above: 3, below: 0, highest: { month: "2026-10", value: 8.12 }, lowest: { month: "2026-08", value: 7.4 } });
  });

  it("without the optional series it degrades to empty values, not zeros, and the policy-only figures remain", () => {
    const bare = buildPolicyRateViewModel(raw({ tbill: null, pib: null, fedFunds: null, headline: null, core: null }));
    expect(bare.tbillAuctions).toEqual([]);
    expect(bare.termSpreadAt).toEqual([]);
    expect(bare.realSummary).toEqual({ headline: null, core: null });
    expect(bare.usGapSummary).toBeNull();
    expect(bare.levels).toHaveLength(36);
  });

  it("with no policy data every new field is empty, never invented", () => {
    const none = buildPolicyRateViewModel(raw({ policy: null }));
    expect([none.levels, none.cumulative, none.regimes, none.turningPoints, none.tbillSpreadAt]).toEqual([[], [], [], [], []]);
  });

  it("survives a JSON round trip (it crosses the server/client boundary)", () => {
    expect(JSON.parse(JSON.stringify(m))).toEqual(m);
  });
});

describe("source information passes through untouched", () => {
  it("is carried as given, or null", () => {
    expect(buildPolicyRateViewModel(raw()).source).toEqual(SOURCE);
    expect(buildPolicyRateViewModel(raw({ source: null })).source).toBeNull();
  });
});
