// Phase 6 contract tests — the authoritative read model.
//
// Tested at the read-model boundary rather than by mounting components: the
// invariant Phase 6 establishes ("an observation always travels with its
// verdict, and delivery status can never manufacture currency") lives in the
// data contract, not in JSX. The type-level half of the contract is proven by
// `tsc --noEmit` over the whole repo (a component that renders a migrated
// observation cannot omit `freshness` — DataQualityBadge's prop is required),
// plus the compile-time assertions at the bottom of this file.

import { describe, it, expect } from "vitest";
import { buildFreshnessAwareObservation, aggregateSeverity, FRESHNESS_STATE_LABEL, AGGREGATE_SEVERITY_LABEL, type DeliveryMetadata, type FreshnessAwareObservation } from "./readModel";
import type { ObservationInput, SeriesDefinition, FreshnessResult, FreshnessState } from "./freshnessEngine";

const NOW = new Date("2026-08-12T12:00:00.000Z");

function monthly(graceDays = 40): SeriesDefinition {
  return {
    seriesId: "sbp:testIndicator",
    provider: "sbp-easydata",
    cadence: "monthly",
    graceDays,
    expectsReleaseDate: false,
    expectsSourceUpdatedAt: false,
  };
}

function obs(overrides: Partial<ObservationInput> = {}): ObservationInput {
  return {
    observationPeriod: "2026-07-31",
    value: 1,
    releaseDate: null,
    sourceUpdatedAt: null,
    fetchedAt: null,
    vintage: null,
    ...overrides,
  };
}

function delivery(sourceStatus: DeliveryMetadata["sourceStatus"] = "live"): DeliveryMetadata {
  return { sourceStatus, vintage: NOW.toISOString(), fetchedAt: NOW.toISOString() };
}

describe("read model — observation and verdict are one object", () => {
  it("always attaches a freshness verdict", () => {
    const o = buildFreshnessAwareObservation(obs(), monthly(), delivery(), NOW);
    expect(o.freshness).toBeDefined();
    expect(o.freshness.state).toBeDefined();
    expect(o.freshness.severity).toBeDefined();
  });

  it("keeps delivery metadata strictly separate from the verdict", () => {
    const o = buildFreshnessAwareObservation(obs(), monthly(), delivery("cache-fresh"), NOW);
    expect(o.delivery.sourceStatus).toBe("cache-fresh");
    // The verdict object carries no notion of sourceStatus at all.
    expect(JSON.stringify(o.freshness)).not.toContain("cache-fresh");
  });
});

describe("Phase 6 regression suite — the defect class being eliminated", () => {
  it("1. an old canonical row is NOT current merely because the DB read succeeded", () => {
    const o = buildFreshnessAwareObservation(
      obs({ observationPeriod: "2026-01-01" }),
      monthly(),
      delivery("live"), // read succeeded
      NOW,
    );
    expect(o.freshness.state).toBe("stale");
    expect(o.freshness.severity).toBe("problem");
  });

  it("2. a stale observation produces stale freshness", () => {
    const o = buildFreshnessAwareObservation(obs({ observationPeriod: "2026-01-01" }), monthly(), delivery(), NOW);
    expect(o.freshness.state).toBe("stale");
  });

  it("3. a current observation produces current freshness", () => {
    const o = buildFreshnessAwareObservation(obs({ observationPeriod: "2026-07-31" }), monthly(), delivery(), NOW);
    expect(o.freshness.state).toBe("current");
  });

  it("4. sourceStatus cannot override freshness — every delivery status yields the same verdict for the same observation", () => {
    const statuses: DeliveryMetadata["sourceStatus"][] = ["live", "cache-fresh", "cache-stale", "fallback", "unavailable"];
    const verdicts = statuses.map((s) => buildFreshnessAwareObservation(obs({ observationPeriod: "2026-01-01" }), monthly(), delivery(s), NOW).freshness.state);
    expect(new Set(verdicts).size).toBe(1);
    expect(verdicts[0]).toBe("stale");
  });

  it("5. cache-fresh cannot make stale data current", () => {
    const o = buildFreshnessAwareObservation(obs({ observationPeriod: "2026-01-01" }), monthly(), delivery("cache-fresh"), NOW);
    expect(o.freshness.state).toBe("stale");
  });

  it("6. cache-stale does not automatically imply the DATA is stale", () => {
    // Degraded delivery, but the observation itself is the current period.
    const o = buildFreshnessAwareObservation(obs({ observationPeriod: "2026-07-31" }), monthly(), delivery("cache-stale"), NOW);
    expect(o.freshness.state).toBe("current");
    expect(o.delivery.sourceStatus).toBe("cache-stale");
  });

  it("7. the read model exposes the exact 8-state verdict, not a collapsed one", () => {
    const o = buildFreshnessAwareObservation(obs({ observationPeriod: "2026-01-01" }), monthly(), delivery(), NOW);
    expect(o.freshness.state).toBe("stale");
    expect(o.freshness.reasonCode).toBeTruthy();
    expect(o.freshness.evidence.length).toBeGreaterThan(0);
  });

  it("8. a stale observation never carries a 'Live' label", () => {
    const o = buildFreshnessAwareObservation(obs({ observationPeriod: "2026-01-01" }), monthly(), delivery("live"), NOW);
    const label = FRESHNESS_STATE_LABEL[o.freshness.state];
    expect(label).toBe("Stale");
    expect(label.toLowerCase()).not.toContain("live");
  });

  it("8b. no freshness label anywhere in the vocabulary is the word 'Live'", () => {
    for (const label of Object.values(FRESHNESS_STATE_LABEL)) {
      expect(label.toLowerCase()).not.toContain("live");
    }
    for (const label of Object.values(AGGREGATE_SEVERITY_LABEL)) {
      expect(label.toLowerCase()).not.toContain("live");
    }
  });

  it("9. global status does not report healthy merely because nothing is a fallback", () => {
    const healthy = buildFreshnessAwareObservation(obs({ observationPeriod: "2026-07-31" }), monthly(), delivery("live"), NOW).freshness;
    const staleButLive = buildFreshnessAwareObservation(obs({ observationPeriod: "2026-01-01" }), monthly(), delivery("live"), NOW).freshness;
    // Neither is a fallback; the old rule would have called this "Live".
    expect(aggregateSeverity([healthy, staleButLive])).toBe("problem");
    expect(AGGREGATE_SEVERITY_LABEL[aggregateSeverity([healthy, staleButLive])]).toBe("Stale");
  });

  it("10. ingestion-lagging is never produced without publication evidence", () => {
    const o = buildFreshnessAwareObservation(
      obs({ observationPeriod: "2026-01-01", releaseDate: null, sourceUpdatedAt: null }),
      monthly(),
      delivery(),
      NOW,
    );
    expect(o.freshness.state).not.toBe("ingestion-lagging");
  });

  it("11. historical NULL provenance does not fabricate release information", () => {
    const o = buildFreshnessAwareObservation(obs({ releaseDate: null, sourceUpdatedAt: null }), monthly(), delivery(), NOW);
    expect(o.freshness.expectedDateSource).not.toBe("calendar"); // cadence-derived only
    expect(JSON.stringify(o)).not.toMatch(/"releaseDate":"\d/);
  });

  it("12. every built observation includes freshness — there is no code path that omits it", () => {
    const cases: ObservationInput[] = [obs(), obs({ observationPeriod: null }), obs({ observationPeriod: "2020-01-01" })];
    for (const c of cases) {
      const o = buildFreshnessAwareObservation(c, monthly(), delivery(), NOW);
      expect(o.freshness).toBeDefined();
      expect(typeof o.freshness.state).toBe("string");
    }
  });
});

describe("aggregateSeverity — documented deterministic semantics", () => {
  function verdict(severity: FreshnessResult["severity"]): FreshnessResult {
    return {
      state: severity === "healthy" ? "current" : severity === "caution" ? "delayed-release" : "stale",
      severity,
      seriesId: "x",
      observationPeriod: "2026-07-31",
      expectedPeriodOrDate: null,
      expectedDateSource: null,
      ageDays: 0,
      reasonCode: "test",
      reason: "test",
      evidence: [],
    };
  }

  it("all healthy -> healthy", () => {
    expect(aggregateSeverity([verdict("healthy"), verdict("healthy")])).toBe("healthy");
  });

  it("any problem -> problem (worst case always surfaces)", () => {
    expect(aggregateSeverity([verdict("healthy"), verdict("caution"), verdict("problem")])).toBe("problem");
  });

  it("otherwise any caution -> caution", () => {
    expect(aggregateSeverity([verdict("healthy"), verdict("caution")])).toBe("caution");
  });

  it("empty input -> caution, never healthy (knowing nothing is not a clean bill of health)", () => {
    expect(aggregateSeverity([])).toBe("caution");
  });
});

describe("type-level contract", () => {
  it("13. FreshnessAwareObservation.freshness is non-optional (compile-time)", () => {
    // These assignments only compile because `freshness` is required and
    // present. Removing `freshness` from the object literal below is a
    // compile error, which is the enforcement Phase 6 relies on -- and
    // `tsc --noEmit` over the repo is what actually runs this check.
    const o: FreshnessAwareObservation = buildFreshnessAwareObservation(obs(), monthly(), delivery(), NOW);
    const required: FreshnessResult = o.freshness; // not `FreshnessResult | undefined`
    expect(required.state).toBeDefined();

    // Exhaustiveness: every one of the 8 states has a human label, so a new
    // state cannot be added without consciously naming it in the UI.
    const states: FreshnessState[] = [
      "current", "market-closed", "awaiting-release", "delayed-release",
      "ingestion-lagging", "stale", "source-unavailable", "validation-failed",
    ];
    for (const s of states) expect(FRESHNESS_STATE_LABEL[s]).toBeTruthy();
    expect(Object.keys(FRESHNESS_STATE_LABEL)).toHaveLength(8);
  });

  it("14. no secret-shaped value can reach the rendering contract", () => {
    const o = buildFreshnessAwareObservation(obs(), monthly(), delivery(), NOW);
    const serialized = JSON.stringify(o);
    expect(serialized).not.toMatch(/api_key/i);
    expect(serialized).not.toMatch(/SBP_EASYDATA_API_KEY/);
    expect(serialized).not.toMatch(/CRON_SECRET|NOTIFICATION_WORKER_SECRET/);
  });
});
