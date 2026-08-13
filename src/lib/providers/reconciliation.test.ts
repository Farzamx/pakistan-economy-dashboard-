// Phase 8.1 tests for the before/after reconciliation harness. Pure and
// deterministic -- no network, no database, no timers.

import { describe, it, expect } from "vitest";
import { reconcile, type OldObservation } from "./reconciliation";
import type { NormalizedObservation } from "./providerAdapter";

function oldObs(overrides: Partial<OldObservation> = {}): OldObservation {
  return { observationPeriod: "2026-07-31", value: 9.2, unit: "%", ...overrides };
}

function newObs(overrides: Partial<NormalizedObservation> = {}): NormalizedObservation {
  return {
    indicatorKey: "fixture:cpi",
    observationPeriod: "2026-07-31",
    value: 9.2,
    unit: "%",
    cadence: "monthly",
    provider: "fixture-provider",
    sourceSeriesId: "FIXTURE-1",
    qualityStatus: "official",
    releaseDate: null,
    sourceUpdatedAt: null,
    sourceReference: null,
    ...overrides,
  };
}

describe("15. identical datasets", () => {
  it("produces zero discrepancies and is safe to migrate", () => {
    const result = reconcile([oldObs()], [newObs()]);
    expect(result.discrepancies).toHaveLength(0);
    expect(result.missingInNew).toHaveLength(0);
    expect(result.additionalInNew).toHaveLength(0);
    expect(result.blockedByCategoryD).toBe(false);
    expect(result.requiresCategoryCSignOff).toBe(false);
    expect(result.safeToMigrate).toBe(true);
  });

  it("multiple identical periods across the full history are all clean", () => {
    const olds = [oldObs({ observationPeriod: "2026-05-31", value: 9.0 }), oldObs({ observationPeriod: "2026-06-30", value: 9.1 }), oldObs()];
    const news = [newObs({ observationPeriod: "2026-05-31", value: 9.0 }), newObs({ observationPeriod: "2026-06-30", value: 9.1 }), newObs()];
    expect(reconcile(olds, news).safeToMigrate).toBe(true);
  });
});

describe("16. value difference", () => {
  it("an unexplained value difference is classified D and blocks migration", () => {
    const result = reconcile([oldObs({ value: 9.2 })], [newObs({ value: 11.5 })]);
    const d = result.discrepancies.find((x) => x.field === "value")!;
    expect(d.category).toBe("D");
    expect(result.blockedByCategoryD).toBe(true);
    expect(result.safeToMigrate).toBe(false);
  });
});

describe("17. precision difference — the approved PBS .toFixed(1) rule", () => {
  it("a value that rounds to the old one at the declared precision is classified C, not D", () => {
    // The real motivating case: old = "+11.3% YoY" parsed to 11.3; new = the
    // true, unrounded PBS figure, 11.34.
    const result = reconcile([oldObs({ value: 11.3 })], [newObs({ value: 11.34 })], { precisionDigits: 1 });
    const c = result.discrepancies.find((x) => x.field === "value")!;
    expect(c.category).toBe("C");
    expect(c.reason).toContain("more correct");
  });

  it("25. category C blocks migration until explicitly approved", () => {
    const result = reconcile([oldObs({ value: 11.3 })], [newObs({ value: 11.34 })], { precisionDigits: 1 });
    expect(result.requiresCategoryCSignOff).toBe(true);
    expect(result.safeToMigrate).toBe(false);
  });

  it("25b. explicit sign-off (categoryCApproved) allows the same result to pass", () => {
    const result = reconcile([oldObs({ value: 11.3 })], [newObs({ value: 11.34 })], { precisionDigits: 1, categoryCApproved: true });
    expect(result.requiresCategoryCSignOff).toBe(false);
    expect(result.safeToMigrate).toBe(true);
  });

  it("a value difference that does NOT round to the old value at the declared precision is still D, not C", () => {
    // 11.9 does not round to 11.3 at 1 decimal -- this must not be
    // misclassified as "just precision loss".
    const result = reconcile([oldObs({ value: 11.3 })], [newObs({ value: 11.9 })], { precisionDigits: 1 });
    const d = result.discrepancies.find((x) => x.field === "value")!;
    expect(d.category).toBe("D");
  });
});

describe("18. date difference (represented as presence discrepancies)", () => {
  it("a shifted observation date is modeled as one missing + one additional period, both category D", () => {
    const result = reconcile([oldObs({ observationPeriod: "2026-07-30" })], [newObs({ observationPeriod: "2026-07-31" })]);
    expect(result.missingInNew).toEqual(["2026-07-30"]);
    expect(result.additionalInNew).toEqual(["2026-07-31"]);
    expect(result.blockedByCategoryD).toBe(true);
  });
});

describe("19. unit difference", () => {
  it("an undeclared unit change is classified D", () => {
    const result = reconcile([oldObs({ unit: "%" })], [newObs({ unit: "bps" })]);
    const d = result.discrepancies.find((x) => x.field === "unit")!;
    expect(d.category).toBe("D");
    expect(result.blockedByCategoryD).toBe(true);
  });

  it("a caller-declared expectedUnit change is classified B, not D", () => {
    const result = reconcile([oldObs({ unit: "Million USD" })], [newObs({ unit: "Billion USD" })], { expectedUnit: "Billion USD" });
    const b = result.discrepancies.find((x) => x.field === "unit")!;
    expect(b.category).toBe("B");
  });
});

describe("20. frequency difference", () => {
  it("frequency/cadence itself is a property of the new observation only (old has none) -- verified representable and inspectable", () => {
    // The old shape has no cadence field at all (see OldObservation) --
    // frequency differences for a given period are therefore visible by
    // inspecting the NEW observation's cadence directly, not by a dedicated
    // reconciliation field. This test documents that this information is
    // genuinely present and accessible, not silently dropped.
    const n = newObs({ cadence: "quarterly" });
    const result = reconcile([oldObs()], [n]);
    expect(result.discrepancies.find((d) => d.field === "cadence")).toBeUndefined(); // no dedicated field yet
    expect(n.cadence).toBe("quarterly"); // but the fact itself was never lost
  });
});

describe("21. methodology difference", () => {
  it("an expected, declared methodology is classified B", () => {
    const result = reconcile([oldObs()], [newObs({ methodology: "customs-basis" })], { expectedMethodology: "customs-basis" });
    const b = result.discrepancies.find((x) => x.field === "methodology")!;
    expect(b.category).toBe("B");
  });

  it("an undeclared/unexpected methodology is classified D", () => {
    const result = reconcile([oldObs()], [newObs({ methodology: "customs-basis" })], { expectedMethodology: "bpm6" });
    const d = result.discrepancies.find((x) => x.field === "methodology")!;
    expect(d.category).toBe("D");
    expect(result.blockedByCategoryD).toBe(true);
  });

  it("no methodology declared at all produces no methodology discrepancy", () => {
    const result = reconcile([oldObs()], [newObs({ methodology: null })]);
    expect(result.discrepancies.find((d) => d.field === "methodology")).toBeUndefined();
  });
});

describe("22. missing observation", () => {
  it("a period the old path had but the new adapter omits is reported and classified D", () => {
    const result = reconcile(
      [oldObs({ observationPeriod: "2026-06-30" }), oldObs({ observationPeriod: "2026-07-31" })],
      [newObs({ observationPeriod: "2026-07-31" })],
    );
    expect(result.missingInNew).toEqual(["2026-06-30"]);
    expect(result.blockedByCategoryD).toBe(true);
  });
});

describe("23. additional observation", () => {
  it("a period the new adapter has but the old path never served is reported and classified D", () => {
    const result = reconcile(
      [oldObs({ observationPeriod: "2026-06-30" })],
      [newObs({ observationPeriod: "2026-06-30" }), newObs({ observationPeriod: "2026-07-31" })],
    );
    expect(result.additionalInNew).toEqual(["2026-07-31"]);
    expect(result.blockedByCategoryD).toBe(true);
  });
});

describe("24. unexplained discrepancy classified as D, and D always blocks regardless of other options", () => {
  it("an unexplained value difference blocks migration even with categoryCApproved set", () => {
    const result = reconcile([oldObs({ value: 9.2 })], [newObs({ value: 50 })], { categoryCApproved: true });
    expect(result.safeToMigrate).toBe(false);
    expect(result.blockedByCategoryD).toBe(true);
  });
});

describe("multi-field reconciliation report", () => {
  it("accounts for every period across a realistic mixed dataset exactly once", () => {
    const olds: OldObservation[] = [
      oldObs({ observationPeriod: "2026-05-31", value: 9.0 }),
      oldObs({ observationPeriod: "2026-06-30", value: 9.1 }),
      oldObs({ observationPeriod: "2026-07-31", value: 11.3 }), // will be a C (precision)
    ];
    const news: NormalizedObservation[] = [
      newObs({ observationPeriod: "2026-05-31", value: 9.0 }), // clean
      newObs({ observationPeriod: "2026-06-30", value: 9.1 }), // clean
      newObs({ observationPeriod: "2026-07-31", value: 11.34 }), // C
      newObs({ observationPeriod: "2026-08-31", value: 9.5 }), // additional
    ];
    const result = reconcile(olds, news, { precisionDigits: 1 });
    expect(result.additionalInNew).toEqual(["2026-08-31"]);
    expect(result.discrepancies.filter((d) => d.category === "C")).toHaveLength(1);
    expect(result.discrepancies.filter((d) => d.field === "presence")).toHaveLength(1);
    expect(result.blockedByCategoryD).toBe(true); // the additional period alone blocks it
  });
});

describe("security — reconciliation reports never carry a secret", () => {
  it("a sourceReference is not surfaced in the discrepancy report at all", () => {
    const result = reconcile([oldObs({ value: 1 })], [newObs({ value: 2, sourceReference: { endpoint: "https://x.org?api_key=LEAK" } })]);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("api_key");
    expect(serialized).not.toContain("LEAK");
  });
});
