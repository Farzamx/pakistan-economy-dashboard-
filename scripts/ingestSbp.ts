// Local Ingestion Runner — Institutional Data Core, Wave 1 (SBP slice).
//
// Why this runs locally: easydata.sbp.org.pk is fronted by Cloudflare
// bot-management, which challenges every request from Vercel, GitHub
// Actions, AND Supabase Edge Functions — confirmed by direct testing (see
// cron_run_log job "network-diag-probe"). This machine has always reached
// SBP EasyData successfully, so it is today's ingestion execution
// environment. This is explicitly temporary: nothing in the logic below is
// Windows-specific (that lives entirely in how the OS schedules `npm run
// ingest:sbp` — see docs/local-ingestion-setup.md). Moving execution to a
// VPS/Linux/Docker/GitHub Actions/cron later means changing WHERE this
// command runs, never what it does.
//
// Flow per indicator:
//   1. Fetch the indicator's full history live from SBP EasyData (reusing
//      sbp.ts's existing fetch/parse logic unchanged via
//      fetchSbpSeriesForIngestion — no parallel parser to drift out of sync).
//   2. Read what's already canonical in Supabase for this indicator (one
//      round trip).
//   3. Diff in memory. Only genuinely new or revised periods get written —
//      an indicator with no real change costs exactly one read round trip
//      and nothing else. This is what makes daily (or twice-daily, or
//      re-run-by-accident) execution safe: unchanged data is never
//      re-inserted, so the ledger never bloats and nothing is ever
//      duplicated (idempotent by construction, reinforced server-side by
//      ingest_raw_observation/resolve_canonical_observation's own
//      unchanged-value short-circuit).
//   4. One indicator's failure (network blip, malformed response, etc.)
//      never aborts the run — it's caught, logged, retried a bounded number
//      of times, and the loop moves on to the next indicator.
//   5. A concise summary is printed and persisted to cron_run_log (the same
//      table/RPC every other scheduled job in this project already uses —
//      visible at /admin/system-health).
//
// Usage: npm run ingest:sbp

import { config as loadEnv } from "dotenv";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getAllSbpIndicatorKeys, fetchSbpSeriesForIngestion, fetchFoodInflationUrbanForIngestion, type SbpSeries } from "@/lib/data/sbp";
import { getCanonicalSbpHistory } from "@/lib/data/sbpCanonicalStore";
import { canonicalIndicatorKey, primaryProviderFor, FOOD_INFLATION_URBAN_INDICATOR_KEY, FOOD_INFLATION_URBAN_PROVIDER_ID } from "@/lib/data/canonicalResolutionConfig";
import { logCronRun } from "@/lib/cronLogging";

// The 20 homepage KPI indicators, plus any extra series that are real SBP
// EasyData data rendered on a public page but aren't part of the
// SbpIndicatorKey/CONFIGS union (see sbp.ts's FOOD_INFLATION_URBAN_SERIES_KEY
// comment for why). Production Readiness Audit (Phase 6A.3) finding: Urban
// Food Inflation was still calling SBP EasyData live from
// /pakistan-food-inflation's render path — this generic descriptor is what
// lets one ingestion loop cover both without special-casing the extra series.
interface IngestibleSeries {
  label: string;
  indicatorKey: string;
  provider: string;
  fetch: (sinceDate?: string) => Promise<SbpSeries>;
}

// Production Readiness Audit (Phase 6A.3), section 15: the WRITE side was
// already incremental (diff against existing canonical rows, skip
// unchanged), but the FETCH side wasn't — every run pulled each
// indicator's entire 2016-present history from SBP regardless, which is
// most of why a fully "0 updated" run still took ~29s (21 full-history
// HTTP round trips). This buffer is subtracted from the latest already-
// ingested period to compute a start_date for SBP's own start_date param,
// so a normal run only downloads the last ~2 months — enough to catch a
// late revision to a recently-published period without re-downloading a
// decade of unchanged history every single day. The first run for any
// indicator (no existing canonical rows) still does a full backfill.
const INCREMENTAL_LOOKBACK_DAYS = 60;

function incrementalStartDate(existing: { observationPeriod: string }[]): string | undefined {
  if (existing.length === 0) return undefined; // first run for this indicator — full backfill
  const latest = existing[existing.length - 1].observationPeriod;
  const d = new Date(latest);
  d.setDate(d.getDate() - INCREMENTAL_LOOKBACK_DAYS);
  return d.toISOString().slice(0, 10);
}

function extraSeries(): IngestibleSeries[] {
  return [
    {
      label: "foodInflationUrban",
      indicatorKey: FOOD_INFLATION_URBAN_INDICATOR_KEY,
      provider: FOOD_INFLATION_URBAN_PROVIDER_ID,
      fetch: fetchFoodInflationUrbanForIngestion,
    },
  ];
}

const JOB_NAME = "sbp-local-ingestion";
const MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 3000;
const VALUE_EPSILON = 1e-9;

loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY not set — check .env.local");
  }
  return createClient(url, anonKey);
}

type IndicatorStatus = "unchanged" | "updated" | "failed";

interface IndicatorOutcome {
  label: string;
  status: IndicatorStatus;
  periodsWritten: number;
  latestPeriod?: string;
  error?: string;
}

function allIngestibleSeries(): IngestibleSeries[] {
  const main: IngestibleSeries[] = getAllSbpIndicatorKeys().map((key) => ({
    label: key,
    indicatorKey: canonicalIndicatorKey(key),
    provider: primaryProviderFor(key),
    fetch: (sinceDate?: string) => fetchSbpSeriesForIngestion(key, sinceDate),
  }));
  return [...main, ...extraSeries()];
}

async function fetchWithRetry(series: IngestibleSeries, sinceDate?: string): Promise<SbpSeries> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await series.fetch(sinceDate);
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_RETRIES) {
        const delay = RETRY_BASE_DELAY_MS * (attempt + 1);
        console.warn(`    retry ${attempt + 1}/${MAX_RETRIES} for ${series.label} in ${delay}ms: ${err instanceof Error ? err.message : String(err)}`);
        await sleep(delay);
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

async function ingestSeries(
  supabase: SupabaseClient,
  internalSecret: string,
  runId: string,
  series: IngestibleSeries,
): Promise<IndicatorOutcome> {
  const { label, indicatorKey, provider } = series;

  // Read what's already canonical FIRST — its latest period drives both
  // the incremental fetch window (below) and the unchanged/changed diff.
  const existing = await getCanonicalSbpHistory(indicatorKey, 5000);
  const existingByPeriod = new Map(existing.map((r) => [r.observationPeriod, r]));

  const live = await fetchWithRetry(series, incrementalStartDate(existing));

  const changedPoints = live.history.filter((p) => {
    const prior = existingByPeriod.get(p.date);
    return !prior || Math.abs(prior.value - p.value) > VALUE_EPSILON || prior.unit !== live.unit;
  });

  if (changedPoints.length === 0) {
    return { label, status: "unchanged", periodsWritten: 0, latestPeriod: live.latestDate };
  }

  let written = 0;
  for (const point of changedPoints) {
    const { data: rawResult, error: rawError } = await supabase.rpc("ingest_raw_observation", {
      p_internal_secret: internalSecret,
      p_indicator_key: indicatorKey,
      p_provider: provider,
      p_observation_period: point.date,
      p_value: point.value,
      p_unit: live.unit,
      p_series_name: live.seriesName,
      // A faithful per-observation audit record (seriesKey + the exact
      // date/value/unit this row represents), not the full ~120-row SBP
      // response for every single period — that would bloat raw_payload
      // ~120x for no audit benefit, since every period's own row already
      // carries its own value/unit/observation_period as real columns.
      p_raw_payload: { seriesKey: live.seriesKey, observationDate: point.date, observationValue: point.value, unit: live.unit },
      p_ingestion_run_id: runId,
    });
    if (rawError) throw new Error(`ingest_raw_observation failed for ${label}@${point.date}: ${rawError.message}`);

    const { error: canonError } = await supabase.rpc("resolve_canonical_observation", {
      p_internal_secret: internalSecret,
      p_indicator_key: indicatorKey,
      p_observation_period: point.date,
      p_value: point.value,
      p_unit: live.unit,
      p_source_provider: provider,
      p_source_raw_observation_id: (rawResult as { raw_observation_id?: string } | null)?.raw_observation_id ?? null,
      p_series_name: live.seriesName,
      p_confidence: "official",
    });
    if (canonError) throw new Error(`resolve_canonical_observation failed for ${label}@${point.date}: ${canonError.message}`);
    written++;
  }

  return { label, status: "updated", periodsWritten: written, latestPeriod: live.latestDate };
}

async function logSourceHealth(supabase: SupabaseClient, internalSecret: string, label: string, outcome: IndicatorOutcome): Promise<void> {
  try {
    const { error } = await supabase.rpc("log_source_health", {
      p_internal_secret: internalSecret,
      p_source_name: "sbp-easydata",
      p_source_type: "api",
      p_series_slug: label,
      p_succeeded: outcome.status !== "failed",
      p_latency_ms: null,
      p_observation_date: outcome.latestPeriod ?? null,
      p_error_text: outcome.error ?? null,
      p_is_fallback: false,
      p_cron_job_name: JOB_NAME,
    });
    if (error) console.warn(`    [source-health] log failed for ${label}: ${error.message}`);
  } catch (err) {
    console.warn(`    [source-health] log threw for ${label}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// Production Readiness Audit (Phase 6A.3), section 15: the loop below used
// to be a plain sequential for-loop — 21 indicators x ~1.5s of SBP network
// latency each is ~30s dominated entirely by round-trip time, not payload
// size (confirmed: making the fetch incremental, above, didn't meaningfully
// change wall-clock time — SBP's own per-request latency is the real cost).
// Bounded concurrency (not full 21-way — this project's own audit of the
// canonical-DB read path found that unbounded high concurrency needs
// retries to stay reliable; a modest batch size gets most of the speedup
// with much less concurrent load on both SBP and Supabase).
const INGEST_CONCURRENCY = 5;

async function processWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker(): Promise<void> {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function main(): Promise<void> {
  const startedAt = new Date();
  const runId = randomUUID();

  const internalSecret = process.env.NOTIFICATION_WORKER_SECRET;
  if (!internalSecret) {
    console.error("[ingest:sbp] NOTIFICATION_WORKER_SECRET is not set — cannot write to Supabase. Check .env.local.");
    process.exit(1);
  }

  const supabase = getSupabase();
  const series = allIngestibleSeries();

  console.log(`[ingest:sbp] Started — run ${runId} — ${startedAt.toISOString()}`);
  console.log(`[ingest:sbp] Fetching ${series.length} indicators from SBP EasyData...`);
  console.log("");

  const outcomes = await processWithConcurrency(series, INGEST_CONCURRENCY, async (s): Promise<IndicatorOutcome> => {
    try {
      const outcome = await ingestSeries(supabase, internalSecret, runId, s);
      if (outcome.status === "unchanged") {
        console.log(`  · ${s.label}: no change (latest=${outcome.latestPeriod ?? "n/a"})`);
      } else {
        console.log(`  ✓ ${s.label}: updated — ${outcome.periodsWritten} period(s) written, latest=${outcome.latestPeriod}`);
      }
      await logSourceHealth(supabase, internalSecret, s.label, outcome);
      return outcome;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const outcome: IndicatorOutcome = { label: s.label, status: "failed", periodsWritten: 0, error: message };
      console.error(`  ✗ ${s.label}: FAILED — ${message}`);
      await logSourceHealth(supabase, internalSecret, s.label, outcome);
      return outcome;
    }
  });

  const unchanged = outcomes.filter((o) => o.status === "unchanged").length;
  const updated = outcomes.filter((o) => o.status === "updated").length;
  const failed = outcomes.filter((o) => o.status === "failed").length;
  const durationSec = ((Date.now() - startedAt.getTime()) / 1000).toFixed(1);

  const summaryLines = [
    `Fetched ${outcomes.length} indicators`,
    `${unchanged} unchanged`,
    `${updated} updated`,
    `${failed} failed`,
    `Finished in ${durationSec}s`,
  ];
  if (updated > 0) {
    summaryLines.push(`Updated: ${outcomes.filter((o) => o.status === "updated").map((o) => o.label).join(", ")}`);
  }
  if (failed > 0) {
    summaryLines.push(`Failed: ${outcomes.filter((o) => o.status === "failed").map((o) => `${o.label} (${o.error})`).join("; ")}`);
  }

  console.log("");
  console.log(`[ingest:sbp] ${summaryLines.join(" | ")}`);

  // A run only counts as a full "failure" when every indicator failed —
  // partial success (some updated/unchanged, a few failed) is still a
  // "success" run overall, matching requirement 5 (one bad indicator never
  // aborts the pipeline) while still surfacing failures in the summary text.
  const overallStatus = outcomes.length > 0 && failed === outcomes.length ? "failure" : "success";
  await logCronRun(JOB_NAME, startedAt, overallStatus, summaryLines.join(" | "));

  process.exit(overallStatus === "failure" ? 1 : 0);
}

main().catch((err) => {
  console.error("[ingest:sbp] Fatal error:", err instanceof Error ? (err.stack ?? err.message) : String(err));
  process.exit(1);
});
