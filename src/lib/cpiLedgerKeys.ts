// The per-key row of get_canonical_freshness_summary (the existing public read RPC: one row per indicator with its latest
// canonical observation period and the vintage at which that became canonical), camel-cased. Shared by the ledger-currency
// evaluator and the read-only status script so neither redefines it.

export interface LedgerKeyState {
  key: string;
  /** "YYYY-MM-DD" or null if the key has no rows. */
  latestPeriod: string | null;
  /** ISO timestamp the latest period became canonical, or null. */
  vintage: string | null;
}

interface FreshnessSummaryRow {
  indicator_key: string;
  latest_observation_period: string | null;
  vintage: string | null;
}

export function ledgerKeysFromSummary(rows: readonly FreshnessSummaryRow[]): LedgerKeyState[] {
  return rows.map((r) => ({ key: r.indicator_key, latestPeriod: r.latest_observation_period, vintage: r.vintage }));
}
