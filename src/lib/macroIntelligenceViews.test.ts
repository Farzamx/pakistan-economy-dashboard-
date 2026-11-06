// Macro Intelligence presentation view-models (Phase C).
//
// Two jobs here. First, assert the view-models pass engine output through
// without inventing numbers — the whole methodological claim of the feature.
// Second, assert every link target actually exists, so a renamed route or a
// dropped dataset fails here instead of shipping a dead link.

import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  DATASET_LINKED_SERIES_IDS,
  LINKABLE_SERIES_IDS,
  buildConfidenceSeries,
  buildCoverageSeries,
  buildDimensionCards,
  buildSnapshotOptions,
  compressHistoryRuns,
  datasetIdForSeries,
  displaySummary,
  indicatorHrefForSeries,
  isRated,
  readableState,
  separateTransitions,
  summaryLeaksSentinel,
} from "./macroIntelligenceViews";
import { SEO_PAGES } from "./seoConfig";
import { DATASETS } from "./datasets/datasetRegistry";
import type { TimelinePoint, HistoricalTransition } from "./macroIntelligenceHistoricalAnalytics";
import type { IntelligenceSignal } from "./intelligence/types";

// ── Fixtures ──────────────────────────────────────────────────────────────

function point(date: string, states: Record<string, string>, classified: number, recorded: number): TimelinePoint {
  return {
    snapshotDate: date,
    computedAt: `${date}T06:00:00Z`,
    posture: "Mixed",
    deteriorationBreadth: "isolated",
    improvementBreadth: "isolated",
    counts: { improving: 0, deteriorating: 0, steady: 0, notRated: 0, insufficientData: 0, ratedWithData: 0 },
    states: states as TimelinePoint["states"],
    assessments: {},
    coverage: { classified, recorded },
  } as TimelinePoint;
}

function signal(over: Partial<IntelligenceSignal> = {}): IntelligenceSignal {
  return {
    id: "inflation",
    dimension: "Inflation",
    label: "Inflation",
    state: "easing",
    direction: "Falling",
    confidence: "High",
    confidenceScore: 90,
    summary: "s",
    evidence: [],
    missingInputs: [],
    calculatedAt: "2026-11-05T06:00:00Z",
    ...over,
  } as IntelligenceSignal;
}

function transition(over: Partial<HistoricalTransition>): HistoricalTransition {
  return {
    snapshotDate: "2026-11-01",
    computedAt: "2026-11-01T06:00:00Z",
    dimension: "Inflation",
    fromState: "rising",
    toState: "easing",
    fromAssessment: "deteriorating",
    toAssessment: "improving",
    kind: "improvement",
    involvesDataGap: false,
    persistedSnapshots: 3,
    ongoing: true,
    isTurningPoint: true,
    ...over,
  } as HistoricalTransition;
}

// ── Link integrity ────────────────────────────────────────────────────────

describe("evidence links point at things that exist", () => {
  it("every indicator link resolves to a real SEO page", () => {
    const slugs = new Set(SEO_PAGES.map((p) => p.slug));
    for (const seriesId of LINKABLE_SERIES_IDS) {
      const href = indicatorHrefForSeries(seriesId);
      expect(href, seriesId).not.toBeNull();
      expect(slugs.has(href!.slice(1)), `${seriesId} -> ${href}`).toBe(true);
    }
  });

  it("every dataset link resolves to a real catalogue entry", () => {
    const ids = new Set(DATASETS.map((d) => d.id));
    for (const seriesId of DATASET_LINKED_SERIES_IDS) {
      const id = datasetIdForSeries(seriesId);
      expect(id, seriesId).not.toBeNull();
      expect(ids.has(id!), `${seriesId} -> ${id}`).toBe(true);
    }
  });

  it("returns null rather than a broken link for an unmapped series", () => {
    expect(indicatorHrefForSeries("sbp:somethingNew")).toBeNull();
    // Gold and net liquid reserves have indicator pages but no dataset:
    // a null here is correct, not a gap to fill.
    expect(datasetIdForSeries("yahoo:goldMonthly")).toBeNull();
    expect(datasetIdForSeries("sbp-forex-arch:netLiquidReserves")).toBeNull();
  });
});

// ── Coverage series ───────────────────────────────────────────────────────

describe("buildCoverageSeries", () => {
  const timeline = [
    point("2026-11-01", { Inflation: "insufficient-data" }, 4, 7),
    point("2026-11-02", { Inflation: "easing" }, 5, 7),
  ];

  it("preserves the oldest-first order it is given, without re-sorting", () => {
    expect(buildCoverageSeries(timeline).map((p) => p.snapshotDate)).toEqual(["2026-11-01", "2026-11-02"]);
  });

  it("passes the engine's own counts through and derives only the difference", () => {
    const [first] = buildCoverageSeries(timeline);
    expect(first).toMatchObject({ classified: 4, recorded: 7, unclassified: 3 });
  });

  it("is empty for an empty history rather than throwing", () => {
    expect(buildCoverageSeries([])).toEqual([]);
  });
});

// ── Confidence series ─────────────────────────────────────────────────────

describe("buildConfidenceSeries", () => {
  it("keeps a null score null instead of substituting zero", () => {
    // Zero would read as "no confidence"; the engine means "not computed".
    const [row] = buildConfidenceSeries([signal({ state: "insufficient-data", confidenceScore: null })]);
    expect(row.score).toBeNull();
    expect(row.rated).toBe(false);
  });

  it("passes a real score through unchanged", () => {
    expect(buildConfidenceSeries([signal({ confidenceScore: 70 })])[0].score).toBe(70);
  });
});

// ── Transition separation ─────────────────────────────────────────────────

describe("separateTransitions", () => {
  it("routes a data-gap transition to coverage, never to economic or turning points", () => {
    const t = transition({ involvesDataGap: true, isTurningPoint: false, kind: "coverage-gained" });
    const out = separateTransitions([t]);
    expect(out.coverage).toHaveLength(1);
    expect(out.economic).toHaveLength(0);
    expect(out.turningPoints).toHaveLength(0);
  });

  it("keeps turning points out of the ordinary economic list", () => {
    const out = separateTransitions([transition({ isTurningPoint: true }), transition({ isTurningPoint: false, kind: "stabilisation" })]);
    expect(out.turningPoints).toHaveLength(1);
    expect(out.economic).toHaveLength(1);
  });

  it("prefers the coverage classification even if a gap transition were flagged a turning point", () => {
    // Defensive: a data gap must never be presentable as an economic reversal.
    const out = separateTransitions([transition({ involvesDataGap: true, isTurningPoint: true })]);
    expect(out.coverage).toHaveLength(1);
    expect(out.turningPoints).toHaveLength(0);
  });
});

// ── Dimension cards ───────────────────────────────────────────────────────

describe("buildDimensionCards", () => {
  it("counts persistence backward from the newest snapshot", () => {
    const timeline = [
      point("2026-11-01", { Inflation: "rising" }, 5, 7),
      point("2026-11-02", { Inflation: "easing" }, 5, 7),
      point("2026-11-03", { Inflation: "easing" }, 5, 7),
    ];
    const [card] = buildDimensionCards([signal({ state: "easing" })], timeline);
    expect(card.persistedSnapshots).toBe(2);
    // The run does not reach the oldest snapshot, so its start is known.
    expect(card.runReachesOldest).toBe(false);
  });

  it("flags a run that reaches the oldest snapshot so it renders as N+", () => {
    const timeline = [point("2026-11-01", { Inflation: "easing" }, 5, 7), point("2026-11-02", { Inflation: "easing" }, 5, 7)];
    const [card] = buildDimensionCards([signal({ state: "easing" })], timeline);
    expect(card.persistedSnapshots).toBe(2);
    expect(card.runReachesOldest).toBe(true);
  });

  it("breaks the run at a snapshot missing the dimension rather than counting through it", () => {
    const timeline = [
      point("2026-11-01", { Inflation: "easing" }, 5, 7),
      point("2026-11-02", {}, 5, 7),
      point("2026-11-03", { Inflation: "easing" }, 5, 7),
    ];
    expect(buildDimensionCards([signal({ state: "easing" })], timeline)[0].persistedSnapshots).toBe(1);
  });

  it("reports null persistence when the current state is absent from history", () => {
    const timeline = [point("2026-11-01", { Inflation: "rising" }, 5, 7)];
    const [card] = buildDimensionCards([signal({ state: "easing" })], timeline);
    expect(card.persistedSnapshots).toBeNull();
    expect(card.runReachesOldest).toBe(false);
  });

  it("reports null persistence with no history at all", () => {
    expect(buildDimensionCards([signal()], [])[0].persistedSnapshots).toBeNull();
  });

  it("derives usable-input counts from the engine's own arrays", () => {
    const s = signal({
      evidence: [{ seriesId: "a" }, { seriesId: "b" }, { seriesId: "c" }] as IntelligenceSignal["evidence"],
      missingInputs: ["c"],
    });
    const [card] = buildDimensionCards([s], []);
    expect(card.totalInputs).toBe(3);
    expect(card.usableCount).toBe(2);
  });
});

// ── Snapshot options ──────────────────────────────────────────────────────

describe("buildSnapshotOptions", () => {
  it("reverses the oldest-first timeline into newest-first options", () => {
    const timeline = [point("2026-11-01", {}, 4, 7), point("2026-11-02", {}, 5, 7)];
    expect(buildSnapshotOptions(timeline).map((o) => o.snapshotDate)).toEqual(["2026-11-02", "2026-11-01"]);
  });

  it("does not mutate the caller's timeline", () => {
    const timeline = [point("2026-11-01", {}, 4, 7), point("2026-11-02", {}, 5, 7)];
    buildSnapshotOptions(timeline);
    expect(timeline.map((p) => p.snapshotDate)).toEqual(["2026-11-01", "2026-11-02"]);
  });
});

// ── Insufficient-data summaries (Phase C.1 regression) ───────────────────
//
// Guards the defect found in Phase C: several engine rules interpolate
// `state` into prose, and directionWord() returns the literal
// "insufficient-data" when direction is Unknown, producing sentences like
// "Headline CPI inflation is insufficient-data versus the prior reading."

describe("displaySummary", () => {
  it("passes a genuine classification summary through untouched", () => {
    const s = signal({ state: "rising", summary: "Headline CPI inflation is rising, accelerating versus the prior reading." });
    expect(displaySummary(s)).toBe(s.summary);
  });

  it("passes the engine's OWN insufficient-data sentence through untouched", () => {
    // signalDefinitions.ts's insufficientSignal() already writes a correct
    // sentence; it must not be replaced, only the sentinel leak is.
    const s = signal({ state: "insufficient-data", summary: "Not enough fresh evidence to classify liquidity & credit this period." });
    expect(displaySummary(s)).toBe(s.summary);
  });

  it("replaces a summary that interpolated the raw sentinel into prose", () => {
    const s = signal({ label: "Inflation", state: "insufficient-data", summary: "Headline CPI inflation is insufficient-data versus the prior reading." });
    const out = displaySummary(s);
    expect(out).not.toContain("insufficient-data");
    expect(out).toContain("insufficient recent data");
    expect(out).toContain("inflation");
  });

  it("never lets the raw sentinel reach the rendered string, for any leaking template", () => {
    // Every template in signalDefinitions.ts that interpolates `state`.
    const leaking = [
      { label: "Inflation", summary: "Headline CPI inflation is insufficient-data versus the prior reading." },
      { label: "Monetary Policy", summary: "SBP's policy stance is insufficient-data — the policy rate moved (insufficient-data) at its latest reading." },
      { label: "External Sector", summary: "External sector position is insufficient-data, based on 2 of 6 tracked indicators." },
      { label: "Liquidity & Credit", summary: "Liquidity and credit conditions are insufficient-data, based on 0 of 2 tracked indicators." },
      { label: "Fiscal Conditions", summary: "Fiscal balance is insufficient-data versus its prior annual reading." },
      { label: "Growth", summary: "GDP growth is insufficient-data versus the prior annual reading." },
    ];
    for (const { label, summary } of leaking) {
      const out = displaySummary(signal({ label, state: "insufficient-data", summary }));
      expect(out, label).not.toContain("insufficient-data");
    }
  });

  it("does not imply bad economic news — insufficient evidence is not a negative verdict", () => {
    const out = displaySummary(signal({ label: "Inflation", state: "insufficient-data", summary: "Headline CPI inflation is insufficient-data versus the prior reading." }));
    // No directional or evaluative language about the economy itself.
    expect(out).not.toMatch(/\b(deteriorat|worsen|declin|weak|poor|negative|falling|rising|high|low)\w*\b/i);
    // And it says explicitly what kind of claim it is making.
    expect(out).toMatch(/not a judgement about economic conditions/i);
  });

  it("detects the sentinel leak independently of the replacement", () => {
    expect(summaryLeaksSentinel("GDP growth is insufficient-data versus the prior annual reading.")).toBe(true);
    expect(summaryLeaksSentinel("Not enough fresh evidence to classify growth this period.")).toBe(false);
    expect(summaryLeaksSentinel("GDP growth is accelerating versus the prior annual reading.")).toBe(false);
  });
});

describe("buildDimensionCards carries a safe summary", () => {
  it("exposes the engine summary verbatim AND the display-safe one", () => {
    const s = signal({ label: "Inflation", state: "insufficient-data", summary: "Headline CPI inflation is insufficient-data versus the prior reading." });
    const [card] = buildDimensionCards([s], []);
    // The engine's own value is preserved untouched for any consumer that
    // needs it; only what is rendered is corrected.
    expect(card.summary).toBe(s.summary);
    expect(card.displaySummary).not.toContain("insufficient-data");
  });
});

describe("no component renders an engine summary unguarded", () => {
  // A filesystem assertion rather than a render test: the rule is "every
  // presentation path that prints a signal summary routes it through
  // displaySummary()", and that is a property of the source, not of one
  // rendered tree. A new component printing {signal.summary} directly would
  // reintroduce the sentinel leak, and this fails immediately.
  const COMPONENTS = join(__dirname, "..", "components");

  function tsxFiles(dir: string): string[] {
    const out: string[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) out.push(...tsxFiles(full));
      else if (entry.name.endsWith(".tsx")) out.push(full);
    }
    return out;
  }

  it("renders no bare {signal.summary} / {card.summary} expression", () => {
    const offenders: string[] = [];
    for (const file of tsxFiles(COMPONENTS)) {
      const source = readFileSync(file, "utf-8");
      // A JSX expression printing the raw summary field directly.
      if (/\{\s*(signal|card|s)\.summary\s*\}/.test(source)) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });
});

// ── History run compression (Phase C.2) ──────────────────────────────────

describe("compressHistoryRuns", () => {
  const pt = (computedAt: string, state: string) => ({ computedAt, state });

  it("groups consecutive identical states and counts them", () => {
    const runs = compressHistoryRuns([
      pt("2026-11-01T06:00:00Z", "insufficient-data"),
      pt("2026-11-02T06:00:00Z", "insufficient-data"),
      pt("2026-11-03T06:00:00Z", "insufficient-data"),
      pt("2026-11-04T06:00:00Z", "improving"),
      pt("2026-11-05T06:00:00Z", "improving"),
      pt("2026-11-06T06:00:00Z", "deteriorating"),
    ]);
    expect(runs.map((r) => [r.state, r.count])).toEqual([
      ["insufficient-data", 3],
      ["improving", 2],
      ["deteriorating", 1],
    ]);
  });

  it("preserves the original snapshot count across all runs", () => {
    const points = Array.from({ length: 30 }, (_, i) => pt(`2026-10-${String(i + 1).padStart(2, "0")}T06:00:00Z`, i < 20 ? "a" : "b"));
    const runs = compressHistoryRuns(points);
    expect(runs.reduce((n, r) => n + r.count, 0)).toBe(30);
    expect(runs.flatMap((r) => r.points)).toHaveLength(30);
  });

  it("NEVER merges non-consecutive occurrences of the same state", () => {
    // Collapsing the two "a" runs would erase a real transition.
    const runs = compressHistoryRuns([pt("t1", "a"), pt("t2", "b"), pt("t3", "a")]);
    expect(runs.map((r) => [r.state, r.count])).toEqual([["a", 1], ["b", 1], ["a", 1]]);
  });

  it("preserves chronological order, oldest first", () => {
    const runs = compressHistoryRuns([pt("t1", "a"), pt("t2", "b"), pt("t3", "c")]);
    expect(runs.map((r) => r.state)).toEqual(["a", "b", "c"]);
    expect(runs[0].points[0].computedAt).toBe("t1");
  });

  it("keeps every underlying snapshot inspectable on its run", () => {
    const runs = compressHistoryRuns([pt("t1", "a"), pt("t2", "a"), pt("t3", "b")]);
    expect(runs[0].points.map((p) => p.computedAt)).toEqual(["t1", "t2"]);
    expect(runs[1].points.map((p) => p.computedAt)).toEqual(["t3"]);
  });

  it("handles empty history", () => {
    expect(compressHistoryRuns([])).toEqual([]);
  });

  it("handles a single snapshot without claiming an unknown start", () => {
    const runs = compressHistoryRuns([pt("t1", "a")]);
    expect(runs).toHaveLength(1);
    expect(runs[0].count).toBe(1);
    expect(runs[0].truncatedStart).toBe(false);
    expect(runs[0].ongoing).toBe(true);
  });

  it("marks the first run truncated and the last ongoing when history spans the window", () => {
    const runs = compressHistoryRuns([pt("t1", "a"), pt("t2", "a"), pt("t3", "b")]);
    expect(runs[0].truncatedStart).toBe(true);
    expect(runs[0].ongoing).toBe(false);
    expect(runs[1].truncatedStart).toBe(false);
    expect(runs[1].ongoing).toBe(true);
  });

  it("flags unclassifiable runs without converting any state to a number", () => {
    const runs = compressHistoryRuns([pt("t1", "insufficient-data"), pt("t2", "improving")]);
    expect(runs[0].rated).toBe(false);
    expect(runs[1].rated).toBe(true);
    // The label is a word, never an ordinal.
    expect(runs[0].stateLabel).toBe("insufficient data");
  });

  it("does not mutate the caller's points array", () => {
    const points = [pt("t1", "a"), pt("t2", "a")];
    compressHistoryRuns(points);
    expect(points).toHaveLength(2);
  });
});

// ── Small helpers ─────────────────────────────────────────────────────────

describe("state helpers", () => {
  it("treats only the engine's sentinel as unrated", () => {
    expect(isRated("tightening")).toBe(true);
    expect(isRated("insufficient-data")).toBe(false);
    expect(isRated(undefined)).toBe(false);
  });

  it("humanises a state for display without altering the stored value", () => {
    expect(readableState("pressure-easing")).toBe("pressure easing");
  });
});
