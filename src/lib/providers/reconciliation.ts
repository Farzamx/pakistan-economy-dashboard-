// Before/after reconciliation harness — Phase 8.1.
//
// Compares an existing provider's served observations against a future
// adapter's normalized output, using the Phase 7 taxonomy (A/B/C/D). Pure
// and deterministic: no network, no database, no timers — a reconciliation
// report is fully determined by its two input arrays and options. This is
// what a future provider-migration phase runs BEFORE any cutover; nothing
// in this file writes anywhere or calls anything live.
//
// Category semantics (approved Phase 8.1 decision):
//   A — expected normalization: values agree once known-expected effects
//       (unit rescale, rounding) are accounted for. Never migration-blocking.
//   B — provider/source change: a declared, EXPECTED difference (e.g. a
//       genuinely different methodology, or a unit the caller has
//       pre-approved as an intentional rescale). Not migration-blocking on
//       its own, but always reported so it's a documented decision, not an
//       assumption.
//   C — existing bug exposed by canonicalization: the new value is more
//       correct than the old one (the canonical example: the PBS
//       .toFixed(1) precision-loss finding from the Phase 8.0 review).
//       REQUIRES EXPLICIT SIGN-OFF (`options.categoryCApproved`) before a
//       migration may proceed even if every other discrepancy is clean.
//   D — unexplained discrepancy: anything this harness cannot confidently
//       explain via A/B/C. ALWAYS BLOCKS migration. Missing/additional
//       observations default to D — a human must explicitly account for
//       them (there is no automatic explanation this harness can safely
//       infer for "a period disappeared").

import type { NormalizedObservation } from "./providerAdapter";

export type DiscrepancyCategory = "A" | "B" | "C" | "D";
export type DiscrepancyField = "presence" | "value" | "unit" | "cadence" | "methodology" | "date";

export interface ReconciliationDiscrepancy {
  observationPeriod: string;
  field: DiscrepancyField;
  category: DiscrepancyCategory;
  oldValue: unknown;
  newValue: unknown;
  reason: string;
}

export interface OldObservation {
  observationPeriod: string;
  value: number;
  unit: string;
}

export interface ReconciliationOptions {
  /**
   * If set, a value difference where `round(new.value, precisionDigits) === old.value`
   * (within floating-point epsilon) is classified as category C — precision
   * loss consistent with the old path having rounded before persisting
   * (the PBS `.toFixed(1)` finding is the motivating real example). Absent
   * a match at this precision, a value difference is category D.
   */
  precisionDigits?: number;
  /** Required to let ANY category C discrepancy pass — the explicit sign-off this phase's brief mandates. Does not affect classification, only the final safeToMigrate/requiresCategoryCSignOff verdict. */
  categoryCApproved?: boolean;
  /** A unit change the caller has already reviewed and expects (e.g. a genuinely intentional rescale) — classified B instead of D. */
  expectedUnit?: string;
  /** A methodology the caller expects the new path to declare (e.g. distinguishing PBS customs-basis from SBP BPM6) — classified B instead of D when it matches; still D if the new value declares an UNEXPECTED methodology. */
  expectedMethodology?: string | null;
}

export interface ReconciliationResult {
  indicatorKey: string | null;
  discrepancies: ReconciliationDiscrepancy[];
  missingInNew: string[];
  additionalInNew: string[];
  /** True if any category D discrepancy exists, or any period is missing/additional. Always blocks migration regardless of options. */
  blockedByCategoryD: boolean;
  /** True if a category C discrepancy exists and options.categoryCApproved was not set. */
  requiresCategoryCSignOff: boolean;
  /** True only when there is nothing in blockedByCategoryD and no outstanding category-C sign-off requirement. */
  safeToMigrate: boolean;
}

const VALUE_EPSILON = 1e-9;

function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/**
 * Compares one series' old (currently-served) observations against a new
 * adapter's normalized output. Every period in either dataset is accounted
 * for exactly once — nothing is silently ignored.
 */
export function reconcile(
  oldObservations: OldObservation[],
  newObservations: NormalizedObservation[],
  options: ReconciliationOptions = {},
): ReconciliationResult {
  const oldByPeriod = new Map(oldObservations.map((o) => [o.observationPeriod, o]));
  const newByPeriod = new Map(newObservations.map((o) => [o.observationPeriod, o]));
  const allPeriods = Array.from(new Set([...oldByPeriod.keys(), ...newByPeriod.keys()])).sort();

  const discrepancies: ReconciliationDiscrepancy[] = [];
  const missingInNew: string[] = [];
  const additionalInNew: string[] = [];

  for (const period of allPeriods) {
    const oldObs = oldByPeriod.get(period);
    const newObs = newByPeriod.get(period);

    if (oldObs && !newObs) {
      missingInNew.push(period);
      discrepancies.push({
        observationPeriod: period, field: "presence", category: "D",
        oldValue: oldObs.value, newValue: undefined,
        reason: "Period present in the existing path but absent from the new adapter's output — never automatically explained.",
      });
      continue;
    }
    if (!oldObs && newObs) {
      additionalInNew.push(period);
      discrepancies.push({
        observationPeriod: period, field: "presence", category: "D",
        oldValue: undefined, newValue: newObs.value,
        reason: "Period present in the new adapter's output but absent from the existing path — could be genuinely new data or an adapter defect; requires review either way.",
      });
      continue;
    }
    if (!oldObs || !newObs) continue; // unreachable — satisfies the type checker

    if (oldObs.unit !== newObs.unit) {
      const isExpected = options.expectedUnit !== undefined && newObs.unit === options.expectedUnit;
      discrepancies.push({
        observationPeriod: period, field: "unit", category: isExpected ? "B" : "D",
        oldValue: oldObs.unit, newValue: newObs.unit,
        reason: isExpected
          ? `Unit change from "${oldObs.unit}" to "${newObs.unit}" matches the caller's declared expectedUnit — a reviewed, intentional rescale.`
          : `Unit changed from "${oldObs.unit}" to "${newObs.unit}" with no declared expectation — unexplained.`,
      });
    }

    if (Math.abs(oldObs.value - newObs.value) > VALUE_EPSILON) {
      if (options.precisionDigits !== undefined && Math.abs(roundTo(newObs.value, options.precisionDigits) - oldObs.value) <= VALUE_EPSILON) {
        discrepancies.push({
          observationPeriod: period, field: "value", category: "C",
          oldValue: oldObs.value, newValue: newObs.value,
          reason: `New value ${newObs.value} rounds to the old value ${oldObs.value} at ${options.precisionDigits} decimal digit(s) — consistent with the old path having lost precision before persisting (e.g. a display-string round-trip), not a genuine value disagreement. The new value is more correct.`,
        });
      } else {
        discrepancies.push({
          observationPeriod: period, field: "value", category: "D",
          oldValue: oldObs.value, newValue: newObs.value,
          reason: `Values differ (${oldObs.value} vs ${newObs.value}) with no declared precision or unit explanation — unexplained.`,
        });
      }
    }

    if (newObs.methodology !== undefined && newObs.methodology !== null) {
      const expected = options.expectedMethodology ?? null;
      const isExpected = newObs.methodology === expected;
      discrepancies.push({
        observationPeriod: period, field: "methodology", category: isExpected ? "B" : "D",
        oldValue: null, // the old path never carried a methodology tag at all -- see providerAdapter.ts's header
        newValue: newObs.methodology,
        reason: isExpected
          ? `New adapter declares methodology "${newObs.methodology}", matching the caller's expectedMethodology — an explicit, reviewed distinction the old path never represented.`
          : `New adapter declares methodology "${newObs.methodology}", which does not match the caller's expectedMethodology ("${expected}") — unexplained.`,
      });
    }
  }

  const hasCategoryD = discrepancies.some((d) => d.category === "D");
  const hasCategoryC = discrepancies.some((d) => d.category === "C");
  const blockedByCategoryD = hasCategoryD || missingInNew.length > 0 || additionalInNew.length > 0;
  const requiresCategoryCSignOff = hasCategoryC && !options.categoryCApproved;

  return {
    indicatorKey: newObservations[0]?.indicatorKey ?? null,
    discrepancies,
    missingInNew,
    additionalInNew,
    blockedByCategoryD,
    requiresCategoryCSignOff,
    safeToMigrate: !blockedByCategoryD && !requiresCategoryCSignOff,
  };
}
