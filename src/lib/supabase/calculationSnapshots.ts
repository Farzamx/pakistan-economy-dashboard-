"use client";

// CRUD layer for calculation_snapshots (supabase/migrations/0046_calculation_snapshots.sql).
// Same browser-client + RLS pattern as preferences.ts / economicProfile.ts.
// Single integration point: ReportDownloadButton.tsx calls
// saveCalculationSnapshot() alongside PDF generation when a tool passes it
// a snapshotPayload — no per-tool CRUD wiring needed beyond that one prop.

import { createClient } from "@/lib/supabase/client";

export interface CalculationSnapshotPayload {
  toolId: string;
  inputs: Record<string, unknown>;
  assumptions: Record<string, unknown>;
  outputs: Record<string, unknown>;
}

export interface CalculationSnapshot extends CalculationSnapshotPayload {
  id: string;
  createdAt: string;
}

/** Fire-and-forget from the caller's perspective — errors are thrown, not swallowed, so ReportDownloadButton can decide whether to surface or ignore them (a failed snapshot should never block the PDF the user actually asked for). */
export async function saveCalculationSnapshot(userId: string, payload: CalculationSnapshotPayload, profileSchemaVersion?: number): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("calculation_snapshots").insert({
    user_id: userId,
    tool_id: payload.toolId,
    profile_schema_version: profileSchemaVersion ?? null,
    inputs: payload.inputs,
    assumptions: payload.assumptions,
    outputs: payload.outputs,
  });
  if (error) throw error;
}

export async function getCalculationSnapshots(toolId?: string, limit = 20): Promise<CalculationSnapshot[]> {
  const supabase = createClient();
  let query = supabase.from("calculation_snapshots").select("id, tool_id, inputs, assumptions, outputs, created_at").order("created_at", { ascending: false }).limit(limit);
  if (toolId) query = query.eq("tool_id", toolId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id as string,
    toolId: row.tool_id as string,
    inputs: row.inputs as Record<string, unknown>,
    assumptions: row.assumptions as Record<string, unknown>,
    outputs: row.outputs as Record<string, unknown>,
    createdAt: row.created_at as string,
  }));
}

/** True if the most recent snapshot for `toolId` was created on today's UTC calendar date — used by automatic (non-user-triggered) snapshot writers like Health Score's daily history capture, so they don't insert more than once per day. */
export async function hasSnapshotToday(toolId: string): Promise<boolean> {
  const recent = await getCalculationSnapshots(toolId, 1);
  if (recent.length === 0) return false;
  const todayUtc = new Date().toISOString().slice(0, 10);
  return recent[0].createdAt.slice(0, 10) === todayUtc;
}
