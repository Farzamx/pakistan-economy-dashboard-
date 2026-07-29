// CPI category breakdown — storage layer for the Personal Inflation
// Calculator's underlying data (migration 0043). Same read/write split as
// weeklyIntelligence.ts: a SECURITY DEFINER write RPC gated by the shared
// notification_worker internal secret, and a public read RPC. The write
// side is called from syncCpiFromPbs.ts (same PBS PDF fetch that already
// produces the headline CPI/Core figures — see parseCpiCategoryTable there).

import { createPublicDataClient } from "@/lib/supabase/publicDataClient";
import { CPI_GROUPS, canonicalGroupName } from "@/lib/personalInflation/cpiGroups";

export interface CpiCategoryRow {
  groupNo: number;
  groupName: string;
  weightPct: number;
  yoyPctChange: number;
}

export interface CpiCategoryBreakdown {
  observationDate: string;
  sourcePdfUrl: string;
  computedAt: string;
  groups: CpiCategoryRow[];
}

interface BreakdownRow {
  observation_date: string;
  group_no: number;
  group_name: string;
  weight_pct: number;
  yoy_pct_change: number;
  source_pdf_url: string;
  computed_at: string;
}

/**
 * Reads the latest full 12-group CPI category breakdown — null if migration
 * 0043 hasn't been seeded/synced yet. Callers (the Personal Inflation
 * Calculator) must render an honest "not yet available" state in that case,
 * not fall back to fabricated weights.
 */
export async function getLatestCpiCategoryBreakdown(): Promise<CpiCategoryBreakdown | null> {
  const supabase = createPublicDataClient();
  const { data, error } = await supabase.rpc("get_latest_cpi_category_breakdown");
  if (error) {
    console.error(`[CpiCategoryBreakdown] get_latest_cpi_category_breakdown failed: ${error.message}`);
    return null;
  }
  const rows = data as BreakdownRow[] | null;
  if (!rows || rows.length === 0) return null;

  return {
    observationDate: rows[0].observation_date,
    sourcePdfUrl: rows[0].source_pdf_url,
    computedAt: rows[0].computed_at,
    groups: rows
      .map((r) => ({
        groupNo: r.group_no,
        groupName: r.group_name,
        weightPct: r.weight_pct,
        yoyPctChange: r.yoy_pct_change,
      }))
      .sort((a, b) => a.groupNo - b.groupNo),
  };
}

/**
 * Plausibility gate before writing — mirrors the "never write dubious data"
 * rule already applied to the headline CPI/Core extraction in
 * syncCpiFromPbs.ts. All 12 official groups must be present exactly once,
 * weights must sum close to 100 (PBS rounds each to 2dp, so a small
 * tolerance is expected), and YoY changes must fall in a plausible range.
 */
export function validateCpiCategoryRows(rows: CpiCategoryRow[]): { valid: boolean; reason?: string } {
  if (rows.length !== CPI_GROUPS.length) {
    return { valid: false, reason: `Expected ${CPI_GROUPS.length} groups, got ${rows.length}.` };
  }
  const seen = new Set<number>();
  for (const row of rows) {
    if (row.groupNo < 1 || row.groupNo > CPI_GROUPS.length) {
      return { valid: false, reason: `Group number ${row.groupNo} out of range.` };
    }
    if (seen.has(row.groupNo)) return { valid: false, reason: `Duplicate group number ${row.groupNo}.` };
    seen.add(row.groupNo);
    if (row.yoyPctChange < -50 || row.yoyPctChange > 150) {
      return { valid: false, reason: `Group ${row.groupNo} YoY change ${row.yoyPctChange} outside plausible range.` };
    }
    if (row.weightPct <= 0 || row.weightPct > 100) {
      return { valid: false, reason: `Group ${row.groupNo} weight ${row.weightPct} outside plausible range.` };
    }
  }
  const weightSum = rows.reduce((s, r) => s + r.weightPct, 0);
  if (Math.abs(weightSum - 100) > 2) {
    return { valid: false, reason: `Group weights sum to ${weightSum.toFixed(2)}, expected ~100.` };
  }
  return { valid: true };
}

export async function storeCpiCategoryBreakdown(
  rows: CpiCategoryRow[],
  observationDate: string,
  sourcePdfUrl: string,
  internalSecret: string,
): Promise<{ success: boolean; error?: string }> {
  const check = validateCpiCategoryRows(rows);
  if (!check.valid) {
    console.error(`[CpiCategoryBreakdown] Refusing to store implausible category breakdown: ${check.reason}`);
    return { success: false, error: check.reason };
  }

  const supabase = createPublicDataClient();
  const payload = rows.map((r) => ({
    group_no: r.groupNo,
    group_name: canonicalGroupName(r.groupNo),
    weight_pct: r.weightPct,
    yoy_pct_change: r.yoyPctChange,
  }));

  const { data, error } = await supabase.rpc("store_cpi_category_breakdown", {
    p_internal_secret: internalSecret,
    p_observation_date: observationDate,
    p_groups: payload,
    p_source_pdf_url: sourcePdfUrl,
  });
  if (error) {
    console.error(`[CpiCategoryBreakdown] store_cpi_category_breakdown failed: ${error.message}`);
    return { success: false, error: error.message };
  }
  const result = data as { success: boolean } | null;
  return { success: result?.success ?? false };
}
