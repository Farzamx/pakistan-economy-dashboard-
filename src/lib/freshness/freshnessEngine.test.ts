import { describe, it, expect } from "vitest";
import { evaluateFreshness, FRESHNESS_SEVERITY, type ObservationInput, type SeriesDefinition, type FreshnessContext, type FreshnessState } from "./freshnessEngine";

const NOW = new Date("2026-08-12T12:00:00.000Z");

function series(overrides: Partial<SeriesDefinition> = {}): SeriesDefinition {
  return {
    seriesId: "sbp:testIndicator",
    provider: "sbp-easydata",
    cadence: "monthly",
    graceDays: 40,
    expectsReleaseDate: false,
    expectsSourceUpdatedAt: false,
    ...overrides,
  };
}

function obs(overrides: Partial<ObservationInput> = {}): ObservationInput {
  return {
    observationPeriod: null,
    value: null,
    releaseDate: null,
    sourceUpdatedAt: null,
    fetchedAt: null,
    vintage: null,
    ...overrides,
  };
}

function ctx(overrides: Partial<FreshnessContext> = {}): FreshnessContext {
  return { now: NOW, ...overrides };
}

describe("evaluateFreshness — core states", () => {
  it("current: a recent observation well within cadence", () => {
    const r = evaluateFreshness(obs({ observationPeriod: "2026-07-31" }), series({ cadence: "monthly", graceDays: 40 }), ctx());
    expect(r.state).toBe("current");
    expect(r.severity).toBe("healthy");
  });

  it("observation within cadence: right at the boundary of the nominal interval is still current", () => {
    // monthly cadence interval = 31 days; period + 31 days = due date.
    const r = evaluateFreshness(obs({ observationPeriod: "2026-07-12" }), series({ cadence: "monthly", graceDays: 40 }), ctx());
    expect(r.state).toBe("current");
  });

  it("stale: a three-month-old canonical row (regression #2)", () => {
    const r = evaluateFreshness(obs({ observationPeriod: "2026-05-01" }), series({ cadence: "monthly", graceDays: 40 }), ctx());
    expect(r.state).toBe("stale");
    expect(r.severity).toBe("problem");
  });

  it("awaiting-release: calendar knows the next release hasn't happened yet", () => {
    const r = evaluateFreshness(
      obs({ observationPeriod: "2026-07-31" }),
      series({ cadence: "monthly", graceDays: 40 }),
      ctx({ evidence: { calendarNextReleaseDate: "2026-09-01" } }),
    );
    expect(r.state).toBe("awaiting-release");
    expect(r.severity).toBe("healthy");
    expect(r.expectedDateSource).toBe("calendar");
  });

  it("delayed-release: the expected window has passed with no evidence of publication, within the remaining buffer", () => {
    // monthly cadence, due date = 2026-05-01 + 31d = 2026-06-01; now is
    // 2026-08-12, so 72 days overdue. graceDays=110 is a TOTAL tolerance
    // (Model A) -- remaining buffer past the due date is 110-31=79, so 72
    // still lands in delayed-release, not stale.
    const r = evaluateFreshness(obs({ observationPeriod: "2026-05-01" }), series({ cadence: "monthly", graceDays: 110 }), ctx());
    expect(r.state).toBe("delayed-release");
    expect(r.severity).toBe("caution");
  });

  it("ingestion-lagging: evidence.knownLatestSourcePeriod is newer than what's served", () => {
    const r = evaluateFreshness(
      obs({ observationPeriod: "2026-06-30" }),
      series({ cadence: "monthly", graceDays: 40 }),
      ctx({ evidence: { knownLatestSourcePeriod: "2026-07-31" } }),
    );
    expect(r.state).toBe("ingestion-lagging");
    expect(r.severity).toBe("caution");
  });

  it("ingestion-lagging: source_updated_at newer than fetched_at is independent evidence of the same state", () => {
    const r = evaluateFreshness(
      obs({ observationPeriod: "2026-05-01", sourceUpdatedAt: "2026-08-10T00:00:00.000Z", fetchedAt: "2026-08-01T00:00:00.000Z" }),
      series({ cadence: "monthly", graceDays: 90 }),
      ctx(),
    );
    expect(r.state).toBe("ingestion-lagging");
  });

  it("market-closed: weekend, served period matches the last trading day", () => {
    const saturday = new Date("2026-08-15T12:00:00.000Z"); // confirmed Saturday
    const r = evaluateFreshness(
      obs({ observationPeriod: "2026-08-14" }), // the preceding Friday
      series({ cadence: "daily", graceDays: 3, marketType: "forex" }),
      ctx({ now: saturday }),
    );
    expect(r.state).toBe("market-closed");
    expect(r.severity).toBe("healthy");
  });

  it("weekend behavior: a genuinely stale FX value is NOT hidden behind a weekend excuse", () => {
    const saturday = new Date("2026-08-15T12:00:00.000Z");
    const r = evaluateFreshness(
      obs({ observationPeriod: "2026-06-01" }), // predates the weekend by months
      series({ cadence: "daily", graceDays: 3, marketType: "forex" }),
      ctx({ now: saturday }),
    );
    expect(r.state).not.toBe("market-closed");
    expect(r.state).toBe("stale");
  });

  it("holiday behavior: Dec 25 (fixed holiday) behaves like a closure day", () => {
    const christmas = new Date("2026-12-25T12:00:00.000Z");
    const r = evaluateFreshness(
      obs({ observationPeriod: "2026-12-24" }), // preceding trading day
      series({ cadence: "daily", graceDays: 3, marketType: "forex" }),
      ctx({ now: christmas }),
    );
    expect(r.state).toBe("market-closed");
  });

  it("source-unavailable: expected refresh window passed and the last ingestion attempt failed", () => {
    const r = evaluateFreshness(
      obs({ observationPeriod: "2026-05-01" }),
      series({ cadence: "monthly", graceDays: 90 }),
      ctx({ evidence: { lastIngestionAttemptFailed: true } }),
    );
    expect(r.state).toBe("source-unavailable");
    expect(r.severity).toBe("caution");
  });

  it("validation-failed: decisive regardless of how old/new the observation is", () => {
    const r = evaluateFreshness(
      obs({ observationPeriod: "2026-08-12", validationFailed: true, validationFailureReason: "value out of expected range" }),
      series(),
      ctx(),
    );
    expect(r.state).toBe("validation-failed");
    expect(r.severity).toBe("problem");
    expect(r.evidence.join(" ")).toContain("out of expected range");
  });
});

describe("evaluateFreshness — honesty around missing/null metadata", () => {
  it("missing release_date never fabricates a release date", () => {
    const r = evaluateFreshness(obs({ observationPeriod: "2026-07-31", releaseDate: null }), series({ cadence: "monthly", graceDays: 40 }), ctx());
    expect(r.state).toBe("current");
    // Nothing in the result claims a release date exists.
    expect(JSON.stringify(r)).not.toMatch(/"releaseDate":"\d/);
  });

  it("missing source_updated_at never triggers ingestion-lagging", () => {
    const r = evaluateFreshness(
      obs({ observationPeriod: "2026-05-01", sourceUpdatedAt: null, fetchedAt: "2026-08-01T00:00:00.000Z" }),
      series({ cadence: "monthly", graceDays: 90 }),
      ctx(),
    );
    expect(r.state).not.toBe("ingestion-lagging");
  });

  it("null historical provenance (never-ingested series) degrades to awaiting-release/delayed-release, not a crash", () => {
    const r = evaluateFreshness(obs({ observationPeriod: null }), series({ cadence: "monthly", graceDays: 40 }), ctx());
    expect(["awaiting-release", "delayed-release", "ingestion-lagging", "source-unavailable"]).toContain(r.state);
  });

  it("malformed/incomplete metadata (all nulls) fails safely rather than throwing", () => {
    expect(() => evaluateFreshness(obs(), series(), ctx())).not.toThrow();
    const r = evaluateFreshness(obs(), series(), ctx());
    expect(r.state).toBeDefined();
    expect(r.severity).toBeDefined();
  });
});

describe("evaluateFreshness — boundary conditions", () => {
  it("exactly at the grace-period boundary is still delayed-release, not stale", () => {
    // Monthly, graceDays=40 is a TOTAL tolerance from observationPeriod
    // (Model A). Due date = 2026-05-01 + 31d = 2026-06-01. Remaining buffer
    // past the due date = 40 - 31 = 9 days -> boundary = 2026-06-10 (day 40
    // from the observation period itself).
    const r = evaluateFreshness(obs({ observationPeriod: "2026-05-01" }), series({ cadence: "monthly", graceDays: 40 }), ctx({ now: new Date("2026-06-10T00:00:00.000Z") }));
    expect(r.state).toBe("delayed-release");
  });

  it("one day past the grace-period boundary escalates to stale", () => {
    const r = evaluateFreshness(obs({ observationPeriod: "2026-05-01" }), series({ cadence: "monthly", graceDays: 40 }), ctx({ now: new Date("2026-06-11T00:00:00.000Z") }));
    expect(r.state).toBe("stale");
  });

  it("as-needed cadence with no calendar evidence uses grace-only aging (matches policyRate's real-world behavior)", () => {
    const r = evaluateFreshness(obs({ observationPeriod: "2026-05-01" }), series({ cadence: "as-needed", graceDays: 120 }), ctx());
    expect(r.state).toBe("current"); // ~103 days old, within a 120-day grace and no fixed due date
  });
});

describe("evaluateFreshness — Phase 5.1: corrected cadence/grace semantics (Model A: graceDays is a TOTAL tolerance from observationPeriod, matching systemHealth.ts, never additional tolerance stacked on a cadence-derived due date)", () => {
  const PERIOD = "2026-05-01";
  const MONTHLY_GRACE_TOTAL = 40; // systemHealth.ts's validated Monthly SLA: "one release cycle [~30d] + ~10 day buffer"

  function atDaysAfterPeriod(days: number): Date {
    const d = new Date(`${PERIOD}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d;
  }

  it("day 31 (the cadence-derived due date itself) is still current — the due date is 'on schedule', not yet overdue", () => {
    const r = evaluateFreshness(obs({ observationPeriod: PERIOD }), series({ cadence: "monthly", graceDays: MONTHLY_GRACE_TOTAL }), ctx({ now: atDaysAfterPeriod(31) }));
    expect(r.state).toBe("current");
  });

  it("day 40 (the full 40-day total tolerance, matching systemHealth.ts exactly) is still delayed-release, not stale", () => {
    const r = evaluateFreshness(obs({ observationPeriod: PERIOD }), series({ cadence: "monthly", graceDays: MONTHLY_GRACE_TOTAL }), ctx({ now: atDaysAfterPeriod(40) }));
    expect(r.state).toBe("delayed-release");
  });

  it("day 41 (one day past the 40-day total tolerance) escalates to stale", () => {
    const r = evaluateFreshness(obs({ observationPeriod: PERIOD }), series({ cadence: "monthly", graceDays: MONTHLY_GRACE_TOTAL }), ctx({ now: atDaysAfterPeriod(41) }));
    expect(r.state).toBe("stale");
  });

  it("day 60 is stale — this is dataFreshness.ts's OLD flat delayedAt threshold, which has no special meaning in the new engine", () => {
    const r = evaluateFreshness(obs({ observationPeriod: PERIOD }), series({ cadence: "monthly", graceDays: MONTHLY_GRACE_TOTAL }), ctx({ now: atDaysAfterPeriod(60) }));
    expect(r.state).toBe("stale");
  });

  it("day 71 is stale — this was the PREVIOUS (buggy) implementation's boundary (31 + 40, additive); it is no longer a boundary of any kind", () => {
    const r = evaluateFreshness(obs({ observationPeriod: PERIOD }), series({ cadence: "monthly", graceDays: MONTHLY_GRACE_TOTAL }), ctx({ now: atDaysAfterPeriod(71) }));
    expect(r.state).toBe("stale");
  });

  it("day 72+ remains stale, identically to day 41 onward — no further tiers", () => {
    const r = evaluateFreshness(obs({ observationPeriod: PERIOD }), series({ cadence: "monthly", graceDays: MONTHLY_GRACE_TOTAL }), ctx({ now: atDaysAfterPeriod(72) }));
    expect(r.state).toBe("stale");
  });

  it("policyRate's 120-day as-needed grace is untouched by this fix: as-needed already had no cadence interval to double-count", () => {
    // as-needed's CADENCE_INTERVAL_DAYS is 0, so dueDate is always null and
    // the !dueDate branch (unaffected by this fix) already treated grace as
    // a pure total -- this test documents that no change was needed here,
    // per the explicit instruction not to alter it without evidence.
    const day106 = evaluateFreshness(obs({ observationPeriod: PERIOD }), series({ cadence: "as-needed", graceDays: 120 }), ctx({ now: atDaysAfterPeriod(106) }));
    const day120 = evaluateFreshness(obs({ observationPeriod: PERIOD }), series({ cadence: "as-needed", graceDays: 120 }), ctx({ now: atDaysAfterPeriod(120) }));
    const day121 = evaluateFreshness(obs({ observationPeriod: PERIOD }), series({ cadence: "as-needed", graceDays: 120 }), ctx({ now: atDaysAfterPeriod(121) }));
    expect(day106.state).toBe("current");
    expect(day120.state).toBe("current");
    expect(day121.state).toBe("stale");
  });

  it("a calendar-derived due date (not cadence-derived) gets the full graceDays as its buffer, with no interval subtracted", () => {
    // The subtraction only applies to cadence-derived due dates -- a
    // calendar-known release date is independent evidence, not built by
    // adding the cadence interval, so nothing was already "spent" reaching it.
    const r = evaluateFreshness(
      obs({ observationPeriod: PERIOD }),
      series({ cadence: "monthly", graceDays: 40 }),
      ctx({ now: atDaysAfterPeriod(45), evidence: { calendarNextReleaseDate: "2026-06-01" } }), // 45 days overdue vs a calendar date only 14 days in the past
    );
    // overdue-from-calendar-date = 45 - 31 = 14 days <= the full 40-day grace (no subtraction) -> still delayed-release, not stale.
    expect(r.state).toBe("delayed-release");
    expect(r.expectedDateSource).toBe("calendar");
  });
});

describe("evaluateFreshness — cache/delivery separation (regression suite)", () => {
  it("regression: a canonical database row must NOT automatically become 'current' merely because it was just read", () => {
    const freshDelivery = obs({ observationPeriod: "2026-05-01", vintage: NOW.toISOString(), fetchedAt: NOW.toISOString() });
    const r = evaluateFreshness(freshDelivery, series({ cadence: "monthly", graceDays: 40 }), ctx());
    expect(r.state).toBe("stale");
  });

  it("regression: sourceStatus is not even an input to this engine, so it cannot override an old observation's state", () => {
    // evaluateFreshness has no sourceStatus parameter at all -- this test
    // documents that fact by construction: the same old observation is
    // stale no matter how "live" the delivery metadata looks.
    const r1 = evaluateFreshness(obs({ observationPeriod: "2026-05-01" }), series({ cadence: "monthly", graceDays: 40 }), ctx());
    const r2 = evaluateFreshness(
      obs({ observationPeriod: "2026-05-01", vintage: NOW.toISOString(), fetchedAt: NOW.toISOString() }),
      series({ cadence: "monthly", graceDays: 40 }),
      ctx(),
    );
    expect(r1.state).toBe("stale");
    expect(r2.state).toBe("stale");
  });

  it("regression: cache freshness (vintage) does not determine data freshness", () => {
    const cachedButCurrent = obs({ observationPeriod: "2026-07-31", vintage: "2026-01-01T00:00:00.000Z" }); // stale cache entry, current data
    const freshButStaleData = obs({ observationPeriod: "2026-01-01", vintage: NOW.toISOString() }); // just fetched, old data
    const r1 = evaluateFreshness(cachedButCurrent, series({ cadence: "monthly", graceDays: 40 }), ctx());
    const r2 = evaluateFreshness(freshButStaleData, series({ cadence: "monthly", graceDays: 40 }), ctx());
    expect(r1.state).toBe("current"); // cached observation, current data
    expect(r2.state).toBe("stale"); // freshly fetched observation, stale data
  });

  it("regression: a successful fetch of an old observation must still be stale", () => {
    const r = evaluateFreshness(
      obs({ observationPeriod: "2026-01-15", fetchedAt: NOW.toISOString() }),
      series({ cadence: "monthly", graceDays: 40 }),
      ctx(),
    );
    expect(r.state).toBe("stale");
  });

  it("regression: an awaiting-release case is never called ingestion-lagging without positive evidence", () => {
    const r = evaluateFreshness(
      obs({ observationPeriod: "2026-07-31" }),
      series({ cadence: "monthly", graceDays: 40 }),
      ctx({ evidence: { calendarNextReleaseDate: "2026-09-01" } }), // no knownLatestSourcePeriod evidence at all
    );
    expect(r.state).toBe("awaiting-release");
    expect(r.state).not.toBe("ingestion-lagging");
  });

  it("regression: historical NULL release_date is never interpreted as a fabricated release date", () => {
    const r = evaluateFreshness(obs({ observationPeriod: "2026-07-31", releaseDate: null }), series({ cadence: "monthly", graceDays: 40 }), ctx());
    expect(r.expectedDateSource).not.toBe(null); // due date still computed from cadence...
    // ...but never claims to be release-date-derived when releaseDate is null.
    expect(r.reason).not.toContain("release_date");
  });
});

describe("evaluateFreshness — determinism", () => {
  it("identical inputs produce an identical verdict, called repeatedly", () => {
    const o = obs({ observationPeriod: "2026-05-01" });
    const s = series({ cadence: "monthly", graceDays: 40 });
    const c = ctx();
    const results = Array.from({ length: 5 }, () => evaluateFreshness(o, s, c));
    for (const r of results) {
      expect(r).toEqual(results[0]);
    }
  });

  it("does not mutate its inputs", () => {
    const o = obs({ observationPeriod: "2026-05-01" });
    const oCopy = { ...o };
    const s = series();
    const sCopy = { ...s };
    evaluateFreshness(o, s, ctx());
    expect(o).toEqual(oCopy);
    expect(s).toEqual(sCopy);
  });
});

describe("FRESHNESS_SEVERITY", () => {
  it("maps all eight states to exactly one of the three severities", () => {
    const states: FreshnessState[] = [
      "current",
      "market-closed",
      "awaiting-release",
      "delayed-release",
      "ingestion-lagging",
      "stale",
      "source-unavailable",
      "validation-failed",
    ];
    for (const s of states) {
      expect(["healthy", "caution", "problem"]).toContain(FRESHNESS_SEVERITY[s]);
    }
    expect(Object.keys(FRESHNESS_SEVERITY)).toHaveLength(8);
  });
});
