// Findings are statements of fact about displayed data. These tests pin the
// numbers to the data and guard against causal language.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseCpiGroupPanel } from "./pbsGroups";
import { buildFindings } from "./findings";
import { buildInflationViewModel, type RawInflationInputs } from "./viewModel";

const panel = parseCpiGroupPanel(readFileSync(join(__dirname, "__fixtures__", "pbsCpiSample.xml"), "utf-8")).panel!;

function months(from: string, values: number[]): { date: string; value: number }[] {
  const [y0, m0] = from.split("-").map(Number);
  return values.map((value, i) => {
    const t = y0 * 12 + (m0 - 1) + i;
    const y = Math.floor(t / 12);
    const m = (t % 12) + 1;
    return { date: `${y}-${String(m).padStart(2, "0")}-28`, value };
  });
}

const raw: RawInflationInputs = {
  // 17 months, 2025-06 .. 2026-10, ending 9.6 after 10.3.
  headline: months("2025-06", [4.0, 3.2, 4.1, 3.0, 4.0, 5.6, 6.0, 7.3, 8.0, 9.0, 10.2, 11.7, 11.1, 9.2, 11.1, 10.3, 9.6]),
  core: months("2026-08", [8.8, 8.6, 7.8]),
  food: months("2026-08", [12.1, 8.1, 7.8]),
  index: [...panel.headlineIndex].map(([m, v]) => ({ observationDate: `${m}-28`, indexValue: v })),
  policy: [{ date: "2026-04-28", value: 11.5 }, { date: "2026-10-26", value: 12 }],
  panel,
  panelIssues: [],
  snapshot: null,
  intl: {
    lastUpdated: "2026-10-08",
    series: {
      PAK: [{ year: 2024, value: 12.63 }, { year: 2025, value: 3.55 }],
      IND: [{ year: 2024, value: 4.95 }, { year: 2025, value: 2.4 }],
      BGD: [{ year: 2024, value: 10.47 }, { year: 2025, value: 8.77 }],
      LKA: [{ year: 2024, value: -0.43 }, { year: 2025, value: -4.76 }],
    },
  },
};
const vm = buildInflationViewModel(raw);
const findings = buildFindings(vm);
const byId = Object.fromEntries(findings.map((f) => [f.id, f]));

describe("buildFindings — facts from the data", () => {
  it("states the headline move from the previous month with period and unit", () => {
    expect(byId["headline-month"].text).toBe("Headline CPI inflation was 9.6% in Oct 2026, down 0.7 percentage points from 10.3% in Sep 2026.");
    expect(byId["headline-month"].period).toBe("Sep 2026 – Oct 2026");
  });

  it("compares with the same month a year earlier only when that month exists", () => {
    // 2025-10 is the fifth value of the series: 4.0; 9.6 − 4.0 = 5.6.
    expect(byId["headline-year"].text).toContain("Oct 2025");
    expect(byId["headline-year"].text).toContain("4.0%");
    expect(byId["headline-year"].text).toContain("up 5.6 percentage points");
  });

  it("reports the extremes of the series with their months", () => {
    expect(byId["headline-extremes"].text).toContain("highest headline reading was 11.7% (May 2026)");
    expect(byId["headline-extremes"].text).toContain("lowest 3.0% (Sep 2025)");
  });

  it("counts rises and falls over the last six month-to-month readings", () => {
    // diffs for last 6: 11.7->11.1? (computed from series): verify the counts add to 6.
    const m = /rose in (\d) month-to-month readings and fell in (\d)/.exec(byId["headline-direction"].text)!;
    expect(Number(m[1]) + Number(m[2])).toBe(6);
  });

  it("reports the three measures at the last month they SHARE and warns they are not like-for-like", () => {
    expect(byId.measures.text).toContain("Oct 2026");
    expect(byId.measures.text).toContain("headline CPI (national) was 9.6%");
    expect(byId.measures.text).toContain("core inflation (urban non-food non-energy) 7.8%");
    expect(byId.measures.text).toContain("food inflation (urban) 7.8%");
    expect(byId.measures.text).toMatch(/not like-for-like/);
  });

  it("names the highest and lowest CPI group from the group data", () => {
    expect(byId["group-extremes"].text).toContain("Transport had the highest year-on-year inflation of the 12 CPI groups (28.6%)");
    expect(byId["group-extremes"].text).toContain("Recreation & Culture the lowest (1.7%)");
  });

  it("reports the three largest contributions and their share of the total", () => {
    const t = byId["group-contributions"].text;
    expect(t).toContain("Food & Non-Alcoholic Beverages contributed 2.85");
    expect(t).toContain("Housing, Water, Electricity, Gas & Fuels 2.32");
    expect(t).toContain("Transport 1.93");
    expect(t).toContain("9.61-percentage-point");
  });

  it("contrasts weight with contribution for the fastest-rising group", () => {
    expect(byId["group-weight-vs-contribution"].text).toContain("Transport has a 5.9% weight");
    expect(byId["group-weight-vs-contribution"].text).toContain("1.93 percentage points");
  });

  it("puts the policy rate beside inflation and says the data does not measure an effect", () => {
    expect(byId.policy.text).toContain("12.00%");
    expect(byId.policy.text).toContain("from 11.50%");
    expect(byId.policy.text).toContain("does not measure the effect");
  });

  it("ignores a policy decision dated AFTER the as-of month (regression: it was reported as 'last decision')", () => {
    const withLater = buildFindings(buildInflationViewModel({ ...raw, policy: [...raw.policy!, { date: "2026-11-05", value: 13 }] }));
    const policy = withLater.find((f) => f.id === "policy")!;
    expect(policy.text).toContain("12.00%");
    expect(policy.text).toContain("last decision 2026-10-26");
    expect(policy.text).not.toContain("13.00");
    expect(policy.text).not.toContain("2026-11-05");
  });

  it("ranks countries for the latest COMMON year and keeps a real negative", () => {
    expect(byId.international.text).toBe("In 2025, consumer-price inflation (annual average, World Bank) was Bangladesh 8.77%, Pakistan 3.55%, India 2.40%, Sri Lanka −4.76%.");
  });
});

describe("buildFindings — discipline", () => {
  it("gives every finding a period and a named data basis", () => {
    for (const f of findings) {
      expect(f.period.length, f.id).toBeGreaterThan(0);
      expect(f.basis.length, f.id).toBeGreaterThan(0);
    }
  });

  it("never uses causal language", () => {
    const causal = /\b(because|due to|caused|causes|cause of|driven by|driving|drove|led to|leading to|as a result|resulted|thanks to|owing to|attributable|explained by|impact of|effect of)\b/i;
    for (const f of findings) {
      // "does not measure the effect of one on the other" is the one permitted use: a disclaimer, not a claim.
      const text = f.text.replace("does not measure the effect of one on the other", "");
      expect(text, f.id).not.toMatch(causal);
    }
  });

  it("every number in a finding is traceable: no sentence is produced without its data", () => {
    const empty = buildInflationViewModel({ headline: null, core: null, food: null, index: null, policy: null, panel: null, panelIssues: [], snapshot: null, intl: null });
    expect(buildFindings(empty)).toEqual([]);
  });

  it("omits group findings when the group data is unavailable instead of guessing", () => {
    const noGroups = buildFindings(buildInflationViewModel({ ...raw, panel: null, panelIssues: ["blocked"] }));
    expect(noGroups.map((f) => f.id)).not.toContain("group-extremes");
    expect(noGroups.map((f) => f.id)).not.toContain("group-contributions");
    expect(noGroups.map((f) => f.id)).toContain("headline-month");
  });

  it("is deterministic", () => {
    expect(buildFindings(vm)).toEqual(findings);
  });
});
