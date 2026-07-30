// CPI monthly index — storage layer for the Purchasing Power Calculator
// (Decision Support Lab Phase 2, migration 0044). Same read/write split as
// cpiCategoryBreakdown.ts: a SECURITY DEFINER write RPC gated by the
// shared notification_worker internal secret, and a public read RPC
// returning the full series.

import { createPublicDataClient } from "@/lib/supabase/publicDataClient";

export interface CpiIndexPoint {
  observationDate: string; // "YYYY-MM-DD", last day of the index month
  indexValue: number; // National CPI, Base 2015-16 = 100
}

interface IndexRow {
  observation_date: string;
  index_value: number;
  source_url: string;
  computed_at: string;
}

/**
 * Reads the full monthly CPI index series (oldest first) — null if
 * migration 0044 hasn't been seeded/synced yet. Callers (the Purchasing
 * Power Calculator) must render an honest "not yet available" state in
 * that case, not fall back to fabricated index values.
 */
export async function getCpiMonthlyIndexSeries(): Promise<CpiIndexPoint[] | null> {
  const supabase = createPublicDataClient();
  const { data, error } = await supabase.rpc("get_cpi_monthly_index_series");
  if (error) {
    console.error(`[CpiMonthlyIndex] get_cpi_monthly_index_series failed: ${error.message}`);
    return null;
  }
  const rows = data as IndexRow[] | null;
  if (!rows || rows.length === 0) return null;
  return rows.map((r) => ({ observationDate: r.observation_date, indexValue: r.index_value }));
}

export interface CpiIndexUpsertRow {
  observationDate: string;
  indexValue: number;
}

export async function storeCpiMonthlyIndex(
  rows: CpiIndexUpsertRow[],
  sourceUrl: string,
  internalSecret: string,
): Promise<{ success: boolean; error?: string }> {
  if (rows.length === 0) return { success: true };

  const supabase = createPublicDataClient();
  const payload = rows.map((r) => ({ observation_date: r.observationDate, index_value: r.indexValue }));

  const { data, error } = await supabase.rpc("store_cpi_monthly_index", {
    p_internal_secret: internalSecret,
    p_rows: payload,
    p_source_url: sourceUrl,
  });
  if (error) {
    console.error(`[CpiMonthlyIndex] store_cpi_monthly_index failed: ${error.message}`);
    return { success: false, error: error.message };
  }
  const result = data as { success: boolean } | null;
  return { success: result?.success ?? false };
}
