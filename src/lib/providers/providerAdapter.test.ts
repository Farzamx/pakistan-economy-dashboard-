// Phase 8.1 tests for the provider adapter contract (validation only —
// no adapter implementation exists yet; see this module's own header).

import { describe, it, expect } from "vitest";
import { validateNormalizedObservation, type NormalizedObservation } from "./providerAdapter";

function obs(overrides: Partial<NormalizedObservation> = {}): NormalizedObservation {
  return {
    indicatorKey: "sbp:cpiInflation",
    observationPeriod: "2026-07-31",
    value: 9.2,
    unit: "%",
    cadence: "monthly",
    provider: "sbp-easydata",
    sourceSeriesId: "TS_GP_PT_CPI_M.P00011516",
    qualityStatus: "official",
    releaseDate: null,
    sourceUpdatedAt: null,
    sourceReference: { endpoint: "https://easydata.sbp.org.pk/api/v1/series/TS_GP_PT_CPI_M.P00011516/data" },
    ...overrides,
  };
}

describe("validateNormalizedObservation", () => {
  it("1. accepts a valid normalized observation", () => {
    expect(validateNormalizedObservation(obs())).toEqual({ valid: true });
  });

  it("2. rejects a missing required field (indicatorKey)", () => {
    const r = validateNormalizedObservation(obs({ indicatorKey: "" }));
    expect(r.valid).toBe(false);
    expect(r.reason).toContain("indicatorKey");
  });

  it("2b. rejects a missing required field (unit)", () => {
    expect(validateNormalizedObservation(obs({ unit: "" })).valid).toBe(false);
  });

  it("2c. rejects a missing required field (sourceSeriesId)", () => {
    expect(validateNormalizedObservation(obs({ sourceSeriesId: "" })).valid).toBe(false);
  });

  it("3. rejects an invalid numeric value (NaN)", () => {
    const r = validateNormalizedObservation(obs({ value: NaN }));
    expect(r.valid).toBe(false);
    expect(r.reason).toContain("value");
  });

  it("3b. rejects an invalid numeric value (Infinity)", () => {
    expect(validateNormalizedObservation(obs({ value: Infinity })).valid).toBe(false);
  });

  it("4. rejects an invalid observation date (wrong format)", () => {
    const r = validateNormalizedObservation(obs({ observationPeriod: "31-07-2026" }));
    expect(r.valid).toBe(false);
    expect(r.reason).toContain("observationPeriod");
  });

  it("4b. rejects an invalid observation date (not a date at all)", () => {
    expect(validateNormalizedObservation(obs({ observationPeriod: "not-a-date" })).valid).toBe(false);
  });

  it("5. unit handling: accepts any non-empty declared unit string", () => {
    expect(validateNormalizedObservation(obs({ unit: "B USD" })).valid).toBe(true);
    expect(validateNormalizedObservation(obs({ unit: "T PKR" })).valid).toBe(true);
  });

  it("6. frequency/cadence handling: accepts every SeriesCadence member", () => {
    for (const cadence of ["real-time", "hourly", "daily", "weekly", "monthly", "quarterly", "annual", "as-needed"] as const) {
      expect(validateNormalizedObservation(obs({ cadence })).valid).toBe(true);
    }
  });

  it("7. methodology handling: absent, null, and a declared string are all valid", () => {
    expect(validateNormalizedObservation(obs({ methodology: undefined })).valid).toBe(true);
    expect(validateNormalizedObservation(obs({ methodology: null })).valid).toBe(true);
    expect(validateNormalizedObservation(obs({ methodology: "customs-basis" })).valid).toBe(true);
  });

  it("8. provenance handling: a well-formed, credential-free sourceReference is valid", () => {
    expect(validateNormalizedObservation(obs({ sourceReference: { endpoint: "https://example.org/series/X" } })).valid).toBe(true);
  });

  it("8b. provenance handling: null sourceReference is valid (not every provider exposes one)", () => {
    expect(validateNormalizedObservation(obs({ sourceReference: null })).valid).toBe(true);
  });

  it("9. release_date null behavior: null is valid and never fabricated by this validator", () => {
    const r = validateNormalizedObservation(obs({ releaseDate: null }));
    expect(r.valid).toBe(true);
  });

  it("9b. rejects a malformed non-null releaseDate", () => {
    expect(validateNormalizedObservation(obs({ releaseDate: "July 2026" })).valid).toBe(false);
  });

  it("10. source_updated_at null behavior: null is valid", () => {
    expect(validateNormalizedObservation(obs({ sourceUpdatedAt: null })).valid).toBe(true);
  });

  it("10b. accepts a well-formed ISO timestamp", () => {
    expect(validateNormalizedObservation(obs({ sourceUpdatedAt: "2026-07-31T12:00:00.000Z" })).valid).toBe(true);
  });

  it("10c. rejects a malformed non-null sourceUpdatedAt", () => {
    expect(validateNormalizedObservation(obs({ sourceUpdatedAt: "last Tuesday" })).valid).toBe(false);
  });
});

describe("security — sourceReference can never smuggle a credential through validation", () => {
  it("rejects a sourceReference containing an api_key query parameter", () => {
    const r = validateNormalizedObservation(obs({ sourceReference: { endpoint: "https://api.example.org/data?api_key=SECRET123" } }));
    expect(r.valid).toBe(false);
    expect(r.reason).toContain("credential-shaped");
  });

  it("rejects a sourceReference containing a Bearer token", () => {
    const r = validateNormalizedObservation(obs({ sourceReference: { header: "Authorization: Bearer abc123xyz" } }));
    expect(r.valid).toBe(false);
  });

  it("rejects a credential-shaped value nested inside sourceReference", () => {
    const r = validateNormalizedObservation(obs({ sourceReference: { meta: { rawUrl: "https://x.org?apikey=abc" } } }));
    expect(r.valid).toBe(false);
  });

  it("never includes the rejected value's context in a way that duplicates a real secret pattern beyond what was passed in", () => {
    const r = validateNormalizedObservation(obs({ sourceReference: { endpoint: "https://x.org?api_key=NOT-A-REAL-SECRET" } }));
    expect(r.valid).toBe(false);
    // The reason surfaces exactly what was rejected -- this test documents
    // that behavior rather than asserting secrecy the validator never claimed;
    // real adapters must never construct such a value in the first place
    // (see ingestSbp.ts's sbpSourceReference for the correct pattern).
    expect(r.reason).toBeDefined();
  });
});
