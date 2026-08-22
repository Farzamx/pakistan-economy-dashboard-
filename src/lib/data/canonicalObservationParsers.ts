// Pure value parsers for canonical (PBS-sourced) actual_value strings —
// split out of canonicalObservation.ts (Phase 9.2 freshness audit) so they
// can be unit-tested directly: canonicalObservation.ts is "server-only"
// (it touches Supabase), and this project has no existing pattern for
// testing a server-only module's logic in isolation, so pure functions with
// no I/O live here instead — mirroring the same client-safe/server-only
// split sbp.ts/sbpServer.ts already established for the same reason.
//
// Each parser handles the exact actual_value format written by the
// corresponding sync module. The format conventions are:
//   syncCpiFromPbs:          "+11.3% YoY" | "11.3% YoY" | "-2.1% YoY"
//   syncLsmFromPbs:          "+6.1% YoY"  | "-1.4% YoY"
//   syncLsmYoYFromEasyData:  "+6.1% YoY"  | "-1.4% YoY"
//   syncTradeBalanceFromPbs: "-$2.84B"    | "+$0.30B"    (trade balance, signed)
//                            "$2.69B"                    (exports, always positive)
//                            "$5.47B"                    (imports, always positive)

export function parsePercentYoY(v: string): number | null {
  // Accepts "+11.3% YoY", "11.3% YoY", "-2.1% YoY"
  const m = v.match(/^([+-]?)([\d.]+)\s*%/);
  if (!m) return null;
  const n = parseFloat(m[2]);
  if (isNaN(n)) return null;
  return m[1] === "-" ? -n : n;
}

export function parseBillionsUsd(v: string): number | null {
  // Accepts "-$2.84B", "+$0.30B", "$2.84B", "$5.47B" (sign before the
  // dollar sign) AND "$-3.98B" (sign after the dollar sign) — Phase 9.2
  // freshness audit found the Trade Balance sync writes the latter form
  // (confirmed live: both the 2026-06 and 2026-07 releases are stored as
  // "$-4.68B"/"$-3.98B"), which the original sign-before-dollar-only regex
  // silently failed to parse — returning null, and permanently blocking the
  // canonical override for every negative Trade Balance release (Exports/
  // Imports are unaffected in practice since they're always positive, but
  // the same class of bug would hit them too if a sync script ever emitted
  // a signed value in this order). Two independent optional sign groups
  // (one on each side of the optional "$") — at most one is ever
  // non-empty for a real value, so there is no ambiguity in practice.
  const m = v.match(/^([+-]?)\$?([+-]?)([\d.]+)B$/i);
  if (!m) return null;
  const sign = m[1] || m[2];
  const n = parseFloat(m[3]);
  if (isNaN(n)) return null;
  return sign === "-" ? -n : n;
}

/** Series slug -> parser. Keys here are the authoritative list of series canonicalObservation.ts's getLatestCanonicalObservation() will resolve a value for. */
export const CANONICAL_VALUE_PARSERS: Record<string, (v: string) => number | null> = {
  "cpi-inflation-release":                parsePercentYoY,
  "core-inflation-release":               parsePercentYoY,
  "large-scale-manufacturing-lsm-growth": parsePercentYoY,
  "trade-balance":                        parseBillionsUsd,
  "exports-release":                      parseBillionsUsd,
  "imports-release":                      parseBillionsUsd,
};
