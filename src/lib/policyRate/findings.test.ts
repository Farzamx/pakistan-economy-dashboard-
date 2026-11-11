import { describe, expect, it } from "vitest";
import { buildFindings } from "./findings";
import { buildPolicyRateViewModel, type RawPolicyRateInputs } from "./viewModel";
import { REAL_POLICY_RATE, monthEndRaw } from "./__fixtures__/policyRateHistory";
import { formatDate, pct, shortDate, signedPp, spanText } from "./format";

const base: RawPolicyRateInputs = {
  policy: REAL_POLICY_RATE,
  headline: monthEndRaw("2026-01", [5.9, 6.4, 7.0, 8.0, 9.1, 9.4, 9.0, 10.0, 10.3, 9.6]),
  core: monthEndRaw("2026-01", [6.5, 7.0, 7.4, 8.0, 8.4, 8.6, 8.7, 8.6, 8.6, 7.8]),
  tbill: [{ date: "2026-10-14", value: 11.89 }],
  pib: null,
  fedFunds: monthEndRaw("2026-09", [3.9, 3.88]),
  kpiValue: 12,
  asOf: "2026-11-07",
  source: null,
};
const findings = buildFindings(buildPolicyRateViewModel(base));
const byId = Object.fromEntries(findings.map((f) => [f.id, f]));

describe("findings from the real history", () => {
  it("states the current rate, when it took effect, and the change that set it", () => {
    expect(byId.current.text).toBe("The policy rate is 12.00%, in effect since 26 Oct 2026; the change on that date was +0.50 pp from 11.50%.");
  });

  it("describes the latest run of changes", () => {
    expect(byId["latest-cycle"].text).toBe("The latest run of changes is a tightening run: 2 increases between 28 Apr 2026 and 26 Oct 2026, +1.50 pp in total (10.50% to 12.00%).");
  });

  it("counts the changes and says plainly that holds are not in the series", () => {
    expect(byId.history.text).toContain("35 rate changes: 22 increases and 13 cuts, in 5 runs (3 tightening, 2 easing)");
    expect(byId.history.text).toContain("Meetings that left the rate unchanged are not in the series.");
  });

  it("peak and trough with the dates they began and ended", () => {
    expect(byId.peak.text).toContain("highest rate in the series is 22.00%, from 27 Jun 2023 until 11 Jun 2024");
    expect(byId.peak.text).toContain("lowest is 5.75%, from 23 May 2016 until 29 Jan 2018");
  });

  it("the largest single moves", () => {
    expect(byId.largest.text).toContain("+3.00 pp on 3 Mar 2023 (17.00% to 20.00%)");
    expect(byId.largest.text).toContain("−2.50 pp on 5 Nov 2024 (17.50% to 15.00%)");
  });

  it("the real policy rate is called ex-post, against headline inflation, and not a market or expected rate", () => {
    expect(byId["real-now"].text).toContain("Against headline inflation of 9.6% in Oct 2026, the real policy rate is 2.19% (positive)");
    expect(byId["real-now"].text).toContain("not a market or expected real rate");
  });

  it("the T-bill statement says these are different instruments", () => {
    expect(byId.tbill.text).toContain("3-month T-bill auction yield in the data (14 Oct 2026) was 11.89%, 0.11 pp below the current policy rate");
    expect(byId.tbill.text).toContain("different instruments");
  });

  it("the US gap is stated as a difference between two policy rates", () => {
    expect(byId["us-gap"].text).toBe("In Oct 2026 Pakistan's policy rate was 8.12 pp above the US effective federal funds rate.");
  });
});

describe("what findings must never do", () => {
  it("never uses causal, predictive or advisory language", () => {
    for (const f of findings) {
      expect(f.text, f.id).not.toMatch(/\b(because|caused|causes|due to|led to|leads to|result of|resulted|forced|thanks to|as a consequence|will|should|expect(s|ed)? to|likely|forecast|predict)/i);
    }
  });

  it("every finding names its period and source", () => {
    for (const f of findings) {
      expect(f.period.length, f.id).toBeGreaterThan(0);
      expect(f.source.length, f.id).toBeGreaterThan(0);
    }
    expect(new Set(findings.map((f) => f.id)).size).toBe(findings.length);
  });

  it("omits a statement it cannot compute rather than estimating it", () => {
    const noInfl = buildFindings(buildPolicyRateViewModel({ ...base, headline: null, core: null, tbill: null, fedFunds: null }));
    const ids = noInfl.map((f) => f.id);
    expect(ids).not.toContain("real-now");
    expect(ids).not.toContain("real-range");
    expect(ids).not.toContain("tbill");
    expect(ids).not.toContain("us-gap");
    expect(ids).toContain("current");
  });

  it("is empty when there is no policy-rate data at all", () => {
    expect(buildFindings(buildPolicyRateViewModel({ ...base, policy: null }))).toEqual([]);
  });

  it("a negative real rate is described as negative", () => {
    const m = buildPolicyRateViewModel({ ...base, headline: monthEndRaw("2026-01", [20, 20, 20, 20, 20, 20, 20, 20, 20, 20]) });
    expect(buildFindings(m).find((f) => f.id === "real-now")?.text).toContain("(negative)");
  });
});

describe("formatters", () => {
  it("dates read the same everywhere", () => {
    expect(formatDate("2026-10-26")).toBe("26 Oct 2026");
    expect(formatDate("2016-05-03")).toBe("3 May 2016");
    expect(shortDate("2026-10-26")).toBe("26 Oct '26");
    expect(formatDate("not a date")).toBe("not a date");
  });

  it("signed changes use a real plus or minus and never print -0", () => {
    expect(signedPp(0.5)).toBe("+0.50");
    expect(signedPp(-1.25)).toBe("−1.25");
    expect(signedPp(0)).toBe("0.00");
    expect(signedPp(-0.001)).toBe("0.00");
    expect(signedPp(3, 1)).toBe("+3.0");
  });

  it("percentages and spans", () => {
    expect(pct(12)).toBe("12.00%");
    expect(pct(-11.594, 1)).toBe("−11.6%");
    expect(spanText(0)).toBe("within one month");
    expect(spanText(1)).toBe("1 month");
    expect(spanText(18)).toBe("18 months");
    expect(spanText(24)).toBe("2 years");
    expect(spanText(30)).toBe("2.5 years");
  });
});
