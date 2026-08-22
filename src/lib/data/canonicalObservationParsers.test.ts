// Phase 9.2 freshness audit — regression tests for canonicalObservationParsers.ts's
// value parsers (used by canonicalObservation.ts, which is server-only and
// has no existing test-isolation pattern in this project — see that file's
// header). parseBillionsUsd is the one that had a confirmed bug: the
// Trade Balance PBS sync writes actual_value as "$-X.XXB" (dollar before
// sign), which the original sign-before-dollar-only regex silently failed
// to parse, permanently blocking the canonical override for every negative
// Trade Balance release (confirmed live for the 2026-06 and 2026-07
// releases: "$-4.68B" and "$-3.98B").

import { describe, it, expect } from "vitest";
import { parseBillionsUsd, parsePercentYoY } from "./canonicalObservationParsers";

describe("parseBillionsUsd", () => {
  it("parses sign-before-dollar negative values (Current Account's own historical convention)", () => {
    expect(parseBillionsUsd("-$2.84B")).toBe(-2.84);
  });

  it("parses sign-before-dollar positive values", () => {
    expect(parseBillionsUsd("+$0.30B")).toBe(0.3);
  });

  it("parses plain positive values with no sign (Exports/Imports' own convention)", () => {
    expect(parseBillionsUsd("$2.96B")).toBe(2.96);
    expect(parseBillionsUsd("$6.94B")).toBe(6.94);
  });

  it("REGRESSION: parses dollar-before-sign negative values — the confirmed live Trade Balance format", () => {
    expect(parseBillionsUsd("$-3.98B")).toBe(-3.98);
    expect(parseBillionsUsd("$-4.68B")).toBe(-4.68);
  });

  it("parses dollar-before-sign positive values for symmetry", () => {
    expect(parseBillionsUsd("$+0.30B")).toBe(0.3);
  });

  it("parses values with no dollar sign at all (defensive, matches the original regex's tolerance)", () => {
    expect(parseBillionsUsd("2.84B")).toBe(2.84);
    expect(parseBillionsUsd("-2.84B")).toBe(-2.84);
  });

  it("returns null for genuinely malformed input, never a fabricated number", () => {
    expect(parseBillionsUsd("N/A")).toBeNull();
    expect(parseBillionsUsd("")).toBeNull();
    expect(parseBillionsUsd("2.84 billion")).toBeNull();
  });
});

describe("parsePercentYoY (unaffected by the sign-position bug — no dollar sign involved)", () => {
  it("parses signed and unsigned percentages", () => {
    expect(parsePercentYoY("+11.3% YoY")).toBe(11.3);
    expect(parsePercentYoY("11.3% YoY")).toBe(11.3);
    expect(parsePercentYoY("-2.1% YoY")).toBe(-2.1);
    expect(parsePercentYoY("-3.5% YoY")).toBe(-3.5);
  });

  it("returns null for malformed input", () => {
    expect(parsePercentYoY("N/A")).toBeNull();
  });
});
