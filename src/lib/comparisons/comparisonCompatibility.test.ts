import { describe, it, expect } from "vitest";
import { validateComparisonCompatibility, validateSeriesConfigCompatibility, classifyUnit, classifyFrequencyPair, type CompatibilityInput } from "./comparisonCompatibility";
import { COMPARISONS } from "./comparisonRegistry";
import { ALL_SERIES_OPTIONS } from "./seriesOptions";

function series(unit: string, frequency: CompatibilityInput["frequency"]): CompatibilityInput {
  return { unit, frequency };
}

describe("classifyUnit", () => {
  it("recognizes every unit string actually used by the registry", () => {
    for (const opt of ALL_SERIES_OPTIONS) {
      expect(classifyUnit(opt.unit)).not.toBe("unknown");
    }
  });

  it("fails loud (returns 'unknown') for an unrecognized unit rather than guessing", () => {
    expect(classifyUnit("XYZ made up unit")).toBe("unknown");
  });
});

describe("classifyFrequencyPair", () => {
  it("monthly vs monthly -> direct", () => {
    expect(classifyFrequencyPair("monthly", "monthly")).toBe("direct");
  });
  it("quarterly vs quarterly -> direct", () => {
    expect(classifyFrequencyPair("quarterly", "quarterly")).toBe("direct");
  });
  it("annual vs annual -> direct", () => {
    expect(classifyFrequencyPair("annual", "annual")).toBe("direct");
  });
  it("monthly vs quarterly -> forward-fill-alignment (either order)", () => {
    expect(classifyFrequencyPair("monthly", "quarterly")).toBe("forward-fill-alignment");
    expect(classifyFrequencyPair("quarterly", "monthly")).toBe("forward-fill-alignment");
  });
  it("annual vs monthly -> incompatible (either order)", () => {
    expect(classifyFrequencyPair("annual", "monthly")).toBe("incompatible");
    expect(classifyFrequencyPair("monthly", "annual")).toBe("incompatible");
  });
  it("annual vs quarterly -> incompatible", () => {
    expect(classifyFrequencyPair("annual", "quarterly")).toBe("incompatible");
  });
});

describe("validateComparisonCompatibility — required test matrix", () => {
  it("1. percent vs percent -> allowed, same unit category", () => {
    const r = validateComparisonCompatibility(series("%", "monthly"), series("%", "monthly"));
    expect(r.compatible).toBe(true);
    expect(r.sameUnitCategory).toBe(true);
    expect(r.requiresNormalization).toBe(false);
  });

  it("2. percent vs currency -> allowed, but flagged as requiring normalization, NOT rejected", () => {
    // Deliberate design decision, not the naive "reject" a first read of the
    // brief might suggest -- see comparisonCompatibility.ts's file header.
    // Verified against the real registry: "inflation-vs-money-supply" (CPI
    // %, M2 T PKR) is an existing, shipped, deliberately-curated comparison.
    // A hard reject here would break it and four other real curated pairs.
    const r = validateComparisonCompatibility(series("%", "monthly"), series("B USD", "monthly"));
    expect(r.compatible).toBe(true);
    expect(r.sameUnitCategory).toBe(false);
    expect(r.requiresNormalization).toBe(true);
  });

  it("3. differently-denominated currencies -> allowed with normalization; no currency-conversion transformation exists or is invented", () => {
    const r = validateComparisonCompatibility(series("B USD", "monthly"), series("T PKR", "monthly"));
    expect(r.compatible).toBe(true);
    expect(r.requiresNormalization).toBe(true);
    expect(r.reason).not.toMatch(/convert|exchange rate applied/i);
  });

  it("4. monthly vs monthly -> allowed", () => {
    expect(validateComparisonCompatibility(series("%", "monthly"), series("%", "monthly")).compatible).toBe(true);
  });

  it("5. quarterly vs quarterly -> allowed", () => {
    expect(validateComparisonCompatibility(series("B USD", "quarterly"), series("B USD", "quarterly")).compatible).toBe(true);
  });

  it("6. annual vs annual -> allowed", () => {
    expect(validateComparisonCompatibility(series("%", "annual"), series("%", "annual")).compatible).toBe(true);
  });

  it("7. monthly vs quarterly -> allowed via explicit forward-fill alignment (not rejected, not silent)", () => {
    const r = validateComparisonCompatibility(series("B USD", "monthly"), series("B USD", "quarterly"));
    expect(r.compatible).toBe(true);
    expect(r.frequencyCompatibility).toBe("forward-fill-alignment");
  });

  it("8. annual vs monthly -> rejected (no transformation exists)", () => {
    const r = validateComparisonCompatibility(series("%", "annual"), series("%", "monthly"));
    expect(r.compatible).toBe(false);
    expect(r.frequencyCompatibility).toBe("incompatible");
  });

  it("21. unit metadata is present and used at runtime (this function requires it as an argument)", () => {
    const r = validateComparisonCompatibility(series("%", "monthly"), series("%", "monthly"));
    expect(r.unitCategoryA).toBe("percent");
    expect(r.unitCategoryB).toBe("percent");
  });

  it("22. frequency metadata is present and used at runtime", () => {
    const r = validateComparisonCompatibility(series("%", "annual"), series("%", "monthly"));
    expect(r.frequencyCompatibility).toBe("incompatible");
  });
});

describe("19. every curated comparison passes the centralized compatibility gate", () => {
  it("all 14 curated pairs are compatible (audited, not assumed)", () => {
    for (const def of COMPARISONS) {
      const r = validateSeriesConfigCompatibility(def.seriesA, def.seriesB);
      expect(r.compatible, `${def.slug}: ${r.reason}`).toBe(true);
    }
  });

  it("documents which curated pairs require normalization (cross-unit-category, by design)", () => {
    const crossUnit = COMPARISONS.filter((def) => !validateSeriesConfigCompatibility(def.seriesA, def.seriesB).sameUnitCategory).map((d) => d.slug);
    expect(crossUnit.sort()).toEqual([
      "gold-vs-treasury-bills",
      "gold-vs-usd-pkr",
      "inflation-vs-money-supply",
      "trade-balance-vs-usd-pkr",
      "usd-pkr-vs-forex-reserves",
    ]);
  });

  it("external-debt-vs-forex-reserves is the one curated pair using forward-fill alignment (quarterly vs monthly)", () => {
    const def = COMPARISONS.find((d) => d.slug === "external-debt-vs-forex-reserves")!;
    const r = validateSeriesConfigCompatibility(def.seriesA, def.seriesB);
    expect(r.frequencyCompatibility).toBe("forward-fill-alignment");
    expect(def.seriesA.frequency).toBe("quarterly"); // the real, corrected label (was mislabeled "monthly")
  });
});

describe("security — no secret-shaped value in any compatibility result", () => {
  it("reason strings never contain anything secret-shaped", () => {
    const r = validateComparisonCompatibility(series("%", "annual"), series("B USD", "monthly"));
    const serialized = JSON.stringify(r);
    expect(serialized).not.toMatch(/api_key/i);
    expect(serialized).not.toMatch(/CRON_SECRET|NOTIFICATION_WORKER_SECRET|SBP_EASYDATA_API_KEY/);
  });
});
