// Centralized comparison-compatibility gate — Phase 7.
//
// Pure, synchronous, zero I/O — deliberately importable from both server
// code (the API route, comparisonData.ts) and client code (the free-form
// selector), so an incompatible pair can be rejected BEFORE any fetch, not
// just after. This is the ONE place unit/frequency compatibility logic
// lives; nothing else in the comparison subsystem re-implements it.
//
// VALIDATE -> MERGE -> DISPLAY, not FETCH -> MERGE -> HOPE: comparisonData.ts
// and the API route both call validateComparisonCompatibility() and refuse
// to call mergeSeries() when the verdict is incompatible.
//
// DESIGN DECISION WORTH FLAGGING (see the Phase 7 report's Compatibility
// Model section): unit mismatches are NEVER hard-blocking here, only
// advisory (`requiresNormalization`). This was not assumed — it was
// determined by auditing every currently-shipped curated comparison
// (comparisonRegistry.ts). Five of the fourteen existing curated pairs
// deliberately cross unit categories (e.g. USD/PKR [an exchange rate] vs
// Total SBP Reserves [a USD stock]; CPI Inflation [%] vs M2 Money Supply [T
// PKR]; Gold [$/oz] vs USD/PKR [PKR] and vs T-Bill Yield [%]) — this is
// clearly the product's own intentional design (each has its own
// "whyItMatters" copy explaining the cross-asset relationship), not an
// oversight, and ComparisonChart.tsx already renders these safely on two
// independently-labelled Y-axes in "raw" mode (see that file's `sameAxis`
// logic) rather than implying the two lines share a scale. A hard-reject
// rule would have broken 5 of 14 real, deliberately-curated comparisons.
// FREQUENCY mismatches are different: no existing curated comparison pairs
// annual with anything else, so rejecting that combination breaks nothing
// real and closes a genuine gap (see FrequencyCompatibility below).

import type { ComparisonFrequency, ComparisonSeriesConfig } from "./comparisonRegistry";

/**
 * Semantic grouping of the project's existing unit vocabulary — not a new
 * vocabulary. Every string below is a unit that already appears in
 * comparisonRegistry.ts/seriesOptions.ts today; this only names what kind of
 * quantity each one is, so two series can be compared as "same kind" or
 * "different kind" instead of by string equality.
 */
export type UnitCategory =
  | "percent"
  | "currency-level-usd"
  | "currency-level-pkr"
  | "exchange-rate-pkr-per-usd"
  | "commodity-price-usd"
  | "unknown";

const UNIT_CATEGORY_BY_STRING: Record<string, UnitCategory> = {
  "%": "percent",
  "PKR": "exchange-rate-pkr-per-usd",
  "B USD": "currency-level-usd",
  "T PKR": "currency-level-pkr",
  "$/oz": "commodity-price-usd",
};

/** Fails loud (returns "unknown") rather than guessing at a category for a unit string this registry has never declared. */
export function classifyUnit(unit: string): UnitCategory {
  return UNIT_CATEGORY_BY_STRING[unit] ?? "unknown";
}

export type FrequencyCompatibility = "direct" | "forward-fill-alignment" | "incompatible";

/**
 * monthly<->monthly / quarterly<->quarterly / annual<->annual: directly
 * compatible, same key grid.
 *
 * monthly<->quarterly: compatible via forward-fill alignment — NOT a new
 * transformation invented for Phase 7. mergeSeries() already forward-fills
 * sparse "as-needed" monthly series (e.g. the policy rate) onto the monthly
 * key grid; a quarterly observation's own date ("2016-06-30") already slices
 * to a valid monthly key ("2016-06"), so it lands in the correct month and
 * the other two months of its quarter are forward-filled by the exact same
 * existing mechanism, now with origin tracking (see mergeSeries in
 * comparisonData.ts) so the UI can tell observed apart from carried-forward.
 *
 * annual<->monthly / annual<->quarterly: INCOMPATIBLE. This is the alignment
 * bug the Phase 0 audit flagged (an annual "2024" key can never naturally
 * align with a monthly "2024-01" key). No curated comparison in this
 * registry pairs an annual series with a non-annual one, and no
 * defensible, already-supported transformation exists in this architecture
 * to turn one annual figure into 12 monthly ones without fabricating data
 * that was never published — so this is rejected outright rather than
 * inventing an aggregation/repetition rule.
 */
export function classifyFrequencyPair(a: ComparisonFrequency, b: ComparisonFrequency): FrequencyCompatibility {
  if (a === b) return "direct";
  if ((a === "monthly" && b === "quarterly") || (a === "quarterly" && b === "monthly")) return "forward-fill-alignment";
  return "incompatible";
}

/** The minimal shape the gate needs — satisfied by both ComparisonSeriesConfig (authoring metadata) and SeriesFetchResult (runtime fetch result), so ONE function validates both the pre-fetch and post-fetch checks. */
export interface CompatibilityInput {
  unit: string;
  frequency: ComparisonFrequency;
}

export interface CompatibilityResult {
  compatible: boolean;
  unitCategoryA: UnitCategory;
  unitCategoryB: UnitCategory;
  sameUnitCategory: boolean;
  frequencyCompatibility: FrequencyCompatibility;
  /** True when the pair is compatible but crosses unit categories — the free-form UI should show dual axes / recommend a normalized chart mode rather than imply the raw values share a scale. */
  requiresNormalization: boolean;
  /** Always populated, whether compatible or not — the human-readable explanation the free-form selector and API error responses surface directly. */
  reason: string;
}

export function validateComparisonCompatibility(a: CompatibilityInput, b: CompatibilityInput): CompatibilityResult {
  const unitCategoryA = classifyUnit(a.unit);
  const unitCategoryB = classifyUnit(b.unit);
  const sameUnitCategory = unitCategoryA === unitCategoryB;
  const frequencyCompatibility = classifyFrequencyPair(a.frequency, b.frequency);

  if (unitCategoryA === "unknown" || unitCategoryB === "unknown") {
    return {
      compatible: false,
      unitCategoryA,
      unitCategoryB,
      sameUnitCategory,
      frequencyCompatibility,
      requiresNormalization: false,
      reason: `Unit "${unitCategoryA === "unknown" ? a.unit : b.unit}" is not recognized by the comparison compatibility gate.`,
    };
  }

  if (frequencyCompatibility === "incompatible") {
    return {
      compatible: false,
      unitCategoryA,
      unitCategoryB,
      sameUnitCategory,
      frequencyCompatibility,
      requiresNormalization: false,
      reason: `These series have incompatible frequencies (${a.frequency} vs ${b.frequency}) and no data transformation exists to align them without fabricating observations that were never published.`,
    };
  }

  const requiresNormalization = !sameUnitCategory;
  return {
    compatible: true,
    unitCategoryA,
    unitCategoryB,
    sameUnitCategory,
    frequencyCompatibility,
    requiresNormalization,
    reason: requiresNormalization
      ? `These series use different units (${a.unit} vs ${b.unit}) — shown on separate axes; consider % change or indexed view to compare them directly.`
      : frequencyCompatibility === "forward-fill-alignment"
        ? `Compatible: same unit, aligned via forward-fill (${a.frequency} vs ${b.frequency}).`
        : "Compatible: same unit and frequency.",
  };
}

/** Convenience overload for the common case of two full ComparisonSeriesConfig objects (curated comparisons, the free-form selector's static options). */
export function validateSeriesConfigCompatibility(a: ComparisonSeriesConfig, b: ComparisonSeriesConfig): CompatibilityResult {
  return validateComparisonCompatibility(a, b);
}
