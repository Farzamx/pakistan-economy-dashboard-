// Row model + pure sort/filter logic for the homepage indicators table
// (PEIC redesign Phase 3). No React, no I/O — so the ordering and matching
// rules are unit-testable on their own (indicatorRows.test.ts).

import type { FreshnessResult } from "@/lib/freshness/freshnessEngine";

export interface IndicatorRow {
  /** Unique row id. NOT the slug: two indicators (3M T-Bill, 3Y PIB) legitimately share one detail page. */
  id: string;
  /** The indicator's existing detail-page slug. */
  slug: string;
  name: string;
  /** Thematic group, used for the grouped default ordering. */
  group: string;
  /** Formatted latest value, exactly as the existing Kpi carries it. */
  value: string;
  unit: string;
  /** Numeric form of `value`, for numeric sorting; null when it isn't a plain number. */
  numericValue: number | null;
  /** The existing change string, e.g. "-0.8 pp vs Aug 2026"; null when there is no prior period. */
  change: string | null;
  /** Observation period, formatted for display ("Sep 2026"). */
  period: string;
  /** Raw observation date ("YYYY-MM-DD" or "YYYY") for sorting; null when unknown. */
  observationDate: string | null;
  source: string;
  freshnessLabel: string;
  freshnessSeverity: FreshnessSeverity;
}

export type SortKey = "name" | "value" | "period" | "source" | "freshness";
export type SortDirection = "asc" | "desc";

/** The freshness engine's own severity scale (freshnessEngine.ts). */
export type FreshnessSeverity = FreshnessResult["severity"];

const SEVERITY_ORDER: Record<FreshnessSeverity, number> = { healthy: 0, caution: 1, problem: 2 };

/** Case-insensitive substring match over the fields a reader can see. */
export function matchesQuery(row: IndicatorRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    row.name.toLowerCase().includes(q) ||
    row.group.toLowerCase().includes(q) ||
    row.source.toLowerCase().includes(q) ||
    row.unit.toLowerCase().includes(q)
  );
}

/**
 * Sorted copy of `rows`. Never mutates the input.
 *
 * Missing data always sorts last, in both directions: a row with no
 * observation date or no numeric value is not "smallest", it is unknown, and
 * burying unknowns at the bottom keeps them from masquerading as extremes.
 */
export function sortRows(rows: IndicatorRow[], key: SortKey, direction: SortDirection): IndicatorRow[] {
  const dir = direction === "asc" ? 1 : -1;
  const compare = (a: IndicatorRow, b: IndicatorRow): number => {
    switch (key) {
      case "value": {
        // Values across indicators carry different units (%, USD bn, index
        // points), so this orders within whatever the reader has filtered to
        // — it is a convenience, not a claim that the magnitudes are
        // comparable. Hence the unit stays visible in every row.
        if (a.numericValue === null && b.numericValue === null) return 0;
        if (a.numericValue === null) return 1;
        if (b.numericValue === null) return -1;
        return (a.numericValue - b.numericValue) * dir;
      }
      case "period": {
        if (!a.observationDate && !b.observationDate) return 0;
        if (!a.observationDate) return 1;
        if (!b.observationDate) return -1;
        return a.observationDate.localeCompare(b.observationDate) * dir;
      }
      case "source":
        return a.source.localeCompare(b.source) * dir;
      case "freshness":
        return (SEVERITY_ORDER[a.freshnessSeverity] - SEVERITY_ORDER[b.freshnessSeverity]) * dir;
      case "name":
      default:
        return a.name.localeCompare(b.name) * dir;
    }
  };
  // Ties keep their incoming (grouped) order: Array.prototype.sort is
  // stable per spec, so equal rows never shuffle between renders.
  return [...rows].sort(compare);
}

/** Parses the leading number out of a formatted value ("1,234.5" -> 1234.5), or null. */
export function toNumericValue(value: string): number | null {
  const m = value.replace(/,/g, "").match(/^-?\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}
