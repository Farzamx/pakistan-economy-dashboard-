// The view model is where sources meet; these tests pin the cross-checks and
// the "degrade, never invent" behaviour.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseCpiGroupPanel } from "./pbsGroups";
import { buildGroupModel, buildInflationViewModel, type RawInflationInputs } from "./viewModel";

const panel = parseCpiGroupPanel(readFileSync(join(__dirname, "__fixtures__", "pbsCpiSample.xml"), "utf-8")).panel!;

function raw(over: Partial<RawInflationInputs> = {}): RawInflationInputs {
  const index = [...panel.headlineIndex].map(([m, v]) => ({ observationDate: `${m}-28`, indexValue: v }));
  return {
    headline: [{ date: "2026-08-31", value: 11.1 }, { date: "2026-09-30", value: 10.3 }, { date: "2026-10-31", value: 9.6 }],
    core: [{ date: "2026-09-30", value: 8.6 }, { date: "2026-10-31", value: 7.8 }],
    food: [{ date: "2026-10-31", value: 7.8 }],
    index,
    policy: [{ date: "2026-10-26", value: 12 }, { date: "2026-04-28", value: 11.5 }],
    panel,
    panelIssues: [],
    snapshot: {
      observationDate: "2026-10-31",
      groups: [
        { groupNo: 1, weightPct: 34.58, yoyPctChange: 7.74 },
        { groupNo: 7, weightPct: 5.91, yoyPctChange: 28.61 },
      ],
    },
    intl: null,
    ...over,
  };
}

describe("buildInflationViewModel", () => {
  const vm = buildInflationViewModel(raw());

  it("keeps rate series and the index as separate, correctly-typed series", () => {
    expect(vm.headline.map((p) => p.value)).toEqual([11.1, 10.3, 9.6]); // rates, %
    expect(vm.index.every((p) => p.value > 100)).toBe(true); // index levels
    expect(vm.index.map((p) => p.month)).toEqual(panel.months);
  });

  it("derives MoM from the index (lag 1) — a different series from YoY", () => {
    expect(vm.mom).toHaveLength(vm.index.length - 1);
    expect(Math.abs(vm.mom.at(-1)!.value)).toBeLessThan(5); // a monthly change is small
  });

  it("sets the as-of horizon to the latest published headline month", () => {
    expect(vm.horizon).toBe("2026-10");
  });

  it("sorts policy decisions chronologically", () => {
    expect(vm.policy.map((d) => d.date)).toEqual(["2026-04-28", "2026-10-26"]);
  });

  it("builds the group model from a valid panel", () => {
    expect(vm.groups).not.toBeNull();
    expect(Object.keys(vm.groups!.yoy)).toHaveLength(12);
    expect(vm.groups!.latestMonth).toBe("2026-10");
    expect(vm.groups!.weights[1]).toBeCloseTo(34.58, 1);
  });

  it("reports measured agreement between sources rather than asserting it", () => {
    const byId = Object.fromEntries(vm.checks.map((c) => [c.id, c]));
    expect(byId["index-sources"].status).toBe("ok");
    expect(byId["contribution-identity"].status).toBe("ok");
    expect(byId["snapshot-vs-sdmx"].status).toBe("ok");
    expect(byId["snapshot-vs-sdmx"].text).toContain("2 groups");
  });

  it("flags a source disagreement as a warning", () => {
    const bad = buildInflationViewModel(raw({ snapshot: { observationDate: "2026-10-31", groups: [{ groupNo: 1, weightPct: 34.58, yoyPctChange: 9.9 }] } }));
    expect(bad.checks.find((c) => c.id === "snapshot-vs-sdmx")!.status).toBe("warn");
  });
});

describe("buildInflationViewModel — degraded inputs", () => {
  it("without a panel: no group model, an explicit 'unavailable' check, the snapshot still carried", () => {
    const vm = buildInflationViewModel(raw({ panel: null, panelIssues: ["PBS CPI file request returned HTTP 403."] }));
    expect(vm.groups).toBeNull();
    expect(vm.snapshot?.rows).toHaveLength(2);
    expect(vm.checks.some((c) => c.id === "panel-unavailable" && c.status === "warn" && c.text.includes("403"))).toBe(true);
  });

  it("with every source missing, returns empty series — never invented ones", () => {
    const vm = buildInflationViewModel({ headline: null, core: null, food: null, index: null, policy: null, panel: null, panelIssues: [], snapshot: null, intl: null });
    expect(vm.headline).toEqual([]);
    expect(vm.index).toEqual([]);
    expect(vm.mom).toEqual([]);
    expect(vm.horizon).toBeNull();
    expect(vm.groups).toBeNull();
    expect(vm.snapshot).toBeNull();
  });

  it("collapses a repeated month to one point instead of double-counting", () => {
    const vm = buildInflationViewModel(raw({ headline: [{ date: "2026-10-30", value: 9.5 }, { date: "2026-10-31", value: 9.6 }] }));
    expect(vm.headline).toEqual([{ month: "2026-10", value: 9.6 }]);
  });

  it("treats an unparseable date as no data for that series, not a crash", () => {
    const vm = buildInflationViewModel(raw({ core: [{ date: "garbage", value: 1 }] }));
    expect(vm.core).toEqual([]);
  });
});

describe("buildGroupModel", () => {
  it("is JSON-serialisable (it crosses the server/client boundary)", () => {
    const model = buildGroupModel(panel)!;
    expect(JSON.parse(JSON.stringify(model)).latestMonth).toBe("2026-10");
  });

  it("food YoY for October 2026 matches PBS's own report (7.74%)", () => {
    const model = buildGroupModel(panel)!;
    expect(model.yoy[1].at(-1)!.value).toBeCloseTo(7.74, 2);
  });
});
