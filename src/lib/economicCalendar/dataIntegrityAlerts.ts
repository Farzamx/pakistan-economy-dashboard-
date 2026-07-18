// Data Integrity Alerts — write/read wrapper around data_integrity_alerts
// (migration 0041), the write/read/resolve RPCs it defines. Same pattern as
// sourceHealthTracker.ts: best-effort writes that never throw (a logging
// failure must never fail the sync pipeline that's calling it), used by
// postReleaseVerification.ts and read by the admin monitoring surface.

import { createPublicDataClient } from "@/lib/supabase/publicDataClient";

export type MismatchType = "value" | "observation_date" | "period" | "source_unreachable" | "other";

export interface LogIntegrityAlertParams {
  economicEventId: string;
  seriesSlug: string;
  eventDate: string;
  releasedActualValue: string;
  mismatchType: MismatchType;
  detail: string;
  releasedObservationDate?: string | null;
  freshValue?: string | null;
  freshObservationDate?: string | null;
}

function workerSecret(): string {
  const secret = process.env.NOTIFICATION_WORKER_SECRET;
  if (!secret) throw new Error("NOTIFICATION_WORKER_SECRET is not configured");
  return secret;
}

/** Records (or refreshes, if the same open alert already exists — see the RPC's dedup logic) a data-integrity mismatch. Best-effort — never throws. */
export async function logDataIntegrityAlert(params: LogIntegrityAlertParams): Promise<void> {
  try {
    const supabase = createPublicDataClient();
    const { error } = await supabase.rpc("log_data_integrity_alert", {
      p_internal_secret: workerSecret(),
      p_economic_event_id: params.economicEventId,
      p_series_slug: params.seriesSlug,
      p_event_date: params.eventDate,
      p_released_actual_value: params.releasedActualValue,
      p_mismatch_type: params.mismatchType,
      p_detail: params.detail,
      p_released_observation_date: params.releasedObservationDate ?? null,
      p_fresh_value: params.freshValue ?? null,
      p_fresh_observation_date: params.freshObservationDate ?? null,
    });
    if (error) {
      console.error(`[DataIntegrity] log_data_integrity_alert failed for ${params.seriesSlug}: ${error.message}`);
    }
  } catch (err) {
    console.error(`[DataIntegrity] log_data_integrity_alert threw for ${params.seriesSlug}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export interface DataIntegrityAlertRecord {
  id: string;
  economicEventId: string;
  seriesSlug: string;
  eventDate: string;
  releasedActualValue: string;
  releasedObservationDate: string | null;
  freshValue: string | null;
  freshObservationDate: string | null;
  mismatchType: MismatchType;
  detail: string;
  status: "open" | "acknowledged" | "resolved" | "dismissed";
  detectedAt: string;
  resolvedAt: string | null;
  resolutionNote: string | null;
}

interface AlertRow {
  id: string;
  economic_event_id: string;
  series_slug: string;
  event_date: string;
  released_actual_value: string;
  released_observation_date: string | null;
  fresh_value: string | null;
  fresh_observation_date: string | null;
  mismatch_type: string;
  detail: string;
  status: string;
  detected_at: string;
  resolved_at: string | null;
  resolution_note: string | null;
}

/** Returns alerts for the internal monitoring surface. Returns [] on any error rather than throwing — callers must handle missing data gracefully. */
export async function getDataIntegrityAlerts(
  status: "open" | "acknowledged" | "resolved" | "dismissed" | "all" = "open",
  limit = 100,
): Promise<DataIntegrityAlertRecord[]> {
  try {
    const supabase = createPublicDataClient();
    const { data, error } = await supabase.rpc("get_data_integrity_alerts", {
      p_internal_secret: workerSecret(),
      p_status: status,
      p_limit: limit,
    });
    if (error) {
      console.error(`[DataIntegrity] get_data_integrity_alerts failed: ${error.message}`);
      return [];
    }
    return ((data ?? []) as AlertRow[]).map((r) => ({
      id: r.id,
      economicEventId: r.economic_event_id,
      seriesSlug: r.series_slug,
      eventDate: r.event_date,
      releasedActualValue: r.released_actual_value,
      releasedObservationDate: r.released_observation_date,
      freshValue: r.fresh_value,
      freshObservationDate: r.fresh_observation_date,
      mismatchType: r.mismatch_type as MismatchType,
      detail: r.detail,
      status: r.status as DataIntegrityAlertRecord["status"],
      detectedAt: r.detected_at,
      resolvedAt: r.resolved_at,
      resolutionNote: r.resolution_note,
    }));
  } catch (err) {
    console.error(`[DataIntegrity] get_data_integrity_alerts threw: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }
}

/** Marks an alert acknowledged/resolved/dismissed after manual review. Throws on failure — this is an explicit admin action, not a best-effort background write. */
export async function resolveDataIntegrityAlert(
  alertId: string,
  newStatus: "acknowledged" | "resolved" | "dismissed",
  resolutionNote?: string,
): Promise<void> {
  const supabase = createPublicDataClient();
  const { error } = await supabase.rpc("resolve_data_integrity_alert", {
    p_internal_secret: workerSecret(),
    p_alert_id: alertId,
    p_new_status: newStatus,
    p_resolution_note: resolutionNote ?? null,
  });
  if (error) throw new Error(`resolve_data_integrity_alert failed: ${error.message}`);
}
